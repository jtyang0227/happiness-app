# JDK 25 설치 및 Gradle 전역 설정 (Windows PowerShell)
# 실행: .\scripts\setup-jdk25.ps1

$ErrorActionPreference = 'Stop'
$GradleProps = "$env:USERPROFILE\.gradle\gradle.properties"

function Find-Jdk25 {
  $candidates = @(
    "C:\Java\jdk-25",
    "$env:USERPROFILE\.jdk\jdk-25",
    "C:\Program Files\Eclipse Adoptium\jdk-25*",
    "C:\Program Files\Java\jdk-25*"
  )
  foreach ($pattern in $candidates) {
    $dirs = Get-Item $pattern -ErrorAction SilentlyContinue
    foreach ($dir in $dirs) {
      $java = Join-Path $dir.FullName "bin\java.exe"
      if (Test-Path $java) { return $dir.FullName }
    }
  }
  return $null
}

function Install-Jdk25 {
  Write-Host "Adoptium에서 OpenJDK 25 다운로드 중..."
  $api = "https://api.adoptium.net/v3/assets/latest/25/hotspot?architecture=x64&image_type=jdk&os=windows&vendor=eclipse"
  $info = Invoke-RestMethod $api
  $url  = $info[0].binary.package.link
  $zip  = "C:\Java\openjdk-25-install.zip"
  New-Item -ItemType Directory -Force -Path "C:\Java" | Out-Null
  Invoke-WebRequest -Uri $url -OutFile $zip -UseBasicParsing
  Write-Host "압축 해제 중..."
  Expand-Archive -Path $zip -DestinationPath "C:\Java\" -Force
  $extracted = Get-ChildItem "C:\Java\" -Directory | Where-Object { $_.Name -like "jdk-25*" } | Select-Object -First 1
  $target = "C:\Java\jdk-25"
  if ($extracted.FullName -ne $target) {
    if (Test-Path $target) { Remove-Item $target -Recurse -Force }
    Rename-Item $extracted.FullName $target
  }
  Remove-Item $zip -Force
  Write-Host "설치 완료: $target"
}

$jdkPath = Find-Jdk25
if (-not $jdkPath) {
  Install-Jdk25
  $jdkPath = Find-Jdk25
}

if (-not $jdkPath) {
  Write-Error "JDK 25를 찾거나 설치할 수 없습니다."
  exit 1
}

$version = & "$jdkPath\bin\java.exe" -version 2>&1 | Select-Object -First 1
Write-Host "✓ JDK 25: $jdkPath"
Write-Host "  $version"

# ~\.gradle\gradle.properties 에 org.gradle.java.home 설정
New-Item -ItemType Directory -Force -Path (Split-Path $GradleProps) | Out-Null
if (-not (Test-Path $GradleProps)) { New-Item -ItemType File $GradleProps | Out-Null }

$content = Get-Content $GradleProps -Raw -ErrorAction SilentlyContinue
$line    = "org.gradle.java.home=$($jdkPath -replace '\\', '/')"

if ($content -match '(?m)^org\.gradle\.java\.home=') {
  $content = $content -replace '(?m)^org\.gradle\.java\.home=.*', $line
} else {
  $content = $content.TrimEnd() + "`n$line`n"
}
Set-Content $GradleProps $content -Encoding utf8

Write-Host "✓ $GradleProps 업데이트 완료"
Write-Host "  Gradle이 JDK 25를 사용합니다."
