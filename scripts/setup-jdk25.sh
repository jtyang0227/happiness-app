#!/usr/bin/env bash
# JDK 25 설치 및 Gradle 전역 설정 (macOS / Linux)
set -e

ADOPTIUM_API="https://api.adoptium.net/v3/assets/latest/25/hotspot"
GRADLE_PROPS="$HOME/.gradle/gradle.properties"

find_jdk25() {
  # IntelliJ / Toolbox 관리 경로 (macOS)
  for d in "$HOME/.jdk"/jdk-25* "$HOME/.jdk"/jdk25*; do
    [ -f "$d/Contents/Home/bin/java" ] && echo "$d/Contents/Home" && return
    [ -f "$d/bin/java" ] && echo "$d" && return
  done
  # 시스템 설치 경로 (macOS)
  for d in /Library/Java/JavaVirtualMachines/jdk-25* \
            /Library/Java/JavaVirtualMachines/temurin-25*; do
    [ -f "$d/Contents/Home/bin/java" ] && echo "$d/Contents/Home" && return
  done
  # SDKMAN
  for d in "$HOME/.sdkman/candidates/java"/25*; do
    [ -f "$d/bin/java" ] && echo "$d" && return
  done
  return 1
}

install_jdk25() {
  local OS ARCH URL DEST
  OS="$(uname -s | tr '[:upper:]' '[:lower:]')"
  ARCH="$(uname -m)"
  [ "$ARCH" = "arm64" ] && ARCH="aarch64" || ARCH="x64"
  [ "$OS" = "darwin" ] && OS="mac"

  echo "Adoptium에서 OpenJDK 25 다운로드 중..."
  URL=$(curl -fsSL "${ADOPTIUM_API}?architecture=${ARCH}&image_type=jdk&os=${OS}&vendor=eclipse" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['binary']['package']['link'])")

  DEST="$(mktemp -d)/jdk25.tar.gz"
  curl -fL "$URL" -o "$DEST"
  mkdir -p "$HOME/.jdk"
  tar -xzf "$DEST" -C "$HOME/.jdk/"
  rm "$DEST"
}

JDK_PATH="$(find_jdk25 2>/dev/null || true)"

if [ -z "$JDK_PATH" ]; then
  install_jdk25
  JDK_PATH="$(find_jdk25)"
fi

echo "✓ JDK 25: $JDK_PATH"
echo "  $("$JDK_PATH/bin/java" -version 2>&1 | head -1)"

# ~/.gradle/gradle.properties 에 org.gradle.java.home 설정
mkdir -p "$(dirname "$GRADLE_PROPS")"
touch "$GRADLE_PROPS"

if grep -q "^org.gradle.java.home" "$GRADLE_PROPS"; then
  sed -i.bak "s|^org.gradle.java.home=.*|org.gradle.java.home=$JDK_PATH|" "$GRADLE_PROPS"
else
  echo "org.gradle.java.home=$JDK_PATH" >> "$GRADLE_PROPS"
fi

echo "✓ ~/.gradle/gradle.properties 업데이트 완료"
echo "  Gradle이 JDK 25를 사용합니다."
