#!/usr/bin/env python3
"""
claude-md-management: 참조 무결성 검사기

CLAUDE.md 안의 백틱(`...`)으로 감싼 토큰 중 파일 경로처럼 보이는 것과
API 엔드포인트(`/api/...`)처럼 보이는 것을 뽑아, 실제 저장소에 그 파일이
존재하는지 / 백엔드 소스 어딘가에 그 경로 문자열이 실제로 매핑되어
있는지를 기계적으로 확인한다.

이 스크립트는 "확실히 죽은 참조"만 걸러내는 1차 필터다 — 사람 판단이
필요한 중복/모순/포맷/장황함 검사는 스킬 본문(SKILL.md)에서 Claude가
직접 Read/Grep으로 수행한다.

사용법:
    python3 check_references.py <repo_root> [claude_md_path]
"""
import os
import re
import sys

# 파일 경로로 취급하지 않을 확장자/패턴 (설정값, JSON 필드명 등 오탐 방지)
PATH_LIKE_RE = re.compile(
    r"^[A-Za-z0-9_.\-]+(?:/[A-Za-z0-9_.\-]+)+$"
)
KNOWN_ROOT_PREFIXES = (
    "frontend/", "backend/", "mobile/", "DESIGN_PROMPTS/", ".claude/",
    "mcp-server/",
)
API_PATH_RE = re.compile(r"^/api/[A-Za-z0-9_\-/{}:.]*$")


def extract_backtick_tokens(text):
    return re.findall(r"`([^`\n]+)`", text)


def looks_like_repo_path(token):
    if not PATH_LIKE_RE.match(token):
        return False
    return token.startswith(KNOWN_ROOT_PREFIXES)


def looks_like_api_path(token):
    # "GET /api/x" 나 "POST /api/x" 형태도 잡아낸다
    parts = token.split()
    candidate = parts[-1] if parts else token
    return bool(API_PATH_RE.match(candidate))


def check_file_exists(repo_root, rel_path):
    # 경로 끝에 붙는 조사/구두점 등 잡음 제거
    rel_path = rel_path.rstrip(".,;:)")
    full = os.path.join(repo_root, rel_path)
    return os.path.exists(full), rel_path


MAPPING_ANNOTATION_RE = re.compile(
    r'@(?:RequestMapping|GetMapping|PostMapping|PutMapping|DeleteMapping|PatchMapping)\b'
    r'(?:\s*\(\s*(?:value\s*=\s*)?"([^"]*)"|\s*\(\s*\)|(?!\s*\())'
)


def _segment_matches(doc_segment, code_segment):
    """
    CLAUDE.md는 라우트 파라미터를 `:id`(프론트 관례)로, Spring 코드는 `{id}`로 쓴다.
    둘 다 "이 세그먼트는 동적 파라미터"라는 뜻이므로 같은 것으로 취급한다.
    """
    doc_dynamic = doc_segment.startswith(":") or (doc_segment.startswith("{") and doc_segment.endswith("}"))
    code_dynamic = code_segment.startswith("{") and code_segment.endswith("}")
    if doc_dynamic and code_dynamic:
        return True
    return doc_segment == code_segment


def _extract_realized_paths(java_source):
    """
    한 컨트롤러 파일에서 클래스 레벨 @RequestMapping과 메서드 레벨 매핑을 조합해
    실제로 존재하는 전체 경로 목록을 만든다. 정밀한 어노테이션 파서는 아니지만,
    "클래스 prefix + 메서드 path가 서로 다른 줄에 있어서 리터럴 grep이 못 찾는다"는
    실제 문제(이 프로젝트의 컨트롤러가 전부 이 스타일 — @RequestMapping 다음에
    @RequiredArgsConstructor 등 다른 애노테이션이 끼어든 뒤에 class 선언이 나옴)를
    해결하기에는 충분하다.

    클래스 prefix와 메서드 prefix를 구분하는 기준은 "@Xxx(...) 다음 줄이 그대로
    class 선언인가"가 아니라, "이 @RequestMapping이 파일에서 첫 class 선언보다
    앞에 있는가"다.
    """
    class_pos_match = re.search(r'\bclass\s+\w+', java_source)
    class_pos = class_pos_match.start() if class_pos_match else len(java_source)

    class_prefix = ""
    method_mappings = []
    for match in MAPPING_ANNOTATION_RE.finditer(java_source):
        path = match.group(1) or ""
        is_request_mapping = java_source[match.start():match.start() + 20].startswith("@RequestMapping")
        if is_request_mapping and match.start() < class_pos:
            class_prefix = path
        else:
            method_mappings.append(path)

    if not method_mappings:
        # 메서드 레벨 매핑이 하나도 없으면(드묾) 클래스 prefix 자체를 하나의 경로로 취급
        return [class_prefix] if class_prefix else []

    realized = []
    for path in method_mappings:
        combined = (class_prefix.rstrip("/") + "/" + path.lstrip("/")).replace("//", "/")
        realized.append(combined if combined else class_prefix)
    return realized


def check_api_path_referenced(repo_root, api_path):
    """
    CLAUDE.md에 적힌 API 경로가 백엔드 컨트롤러의 실제 매핑(클래스 prefix + 메서드 path
    조합)과 세그먼트 단위로 일치하는지 확인한다. 문자열 하나로 이어붙여 grep하는 방식은
    Spring의 클래스/메서드 분리 어노테이션 구조상 대부분 실패하므로 쓰지 않는다.
    """
    # "GET /api/x" 나 "GET/POST /api/x" 처럼 HTTP 메서드가 앞에 붙은 표기 제거 —
    # 실제 경로는 공백으로 나뉜 마지막 조각이다(looks_like_api_path와 동일 로직).
    parts = api_path.split()
    api_path = (parts[-1] if parts else api_path).rstrip(".,;:)")
    doc_segments = [s for s in api_path.split("/") if s]
    if not doc_segments:
        return None

    backend_src = os.path.join(repo_root, "backend", "src", "main", "java")
    if not os.path.isdir(backend_src):
        return None

    for root, _dirs, files in os.walk(backend_src):
        for fname in files:
            if not fname.endswith("Controller.java"):
                continue
            try:
                with open(os.path.join(root, fname), encoding="utf-8") as f:
                    source = f.read()
            except Exception:
                continue
            for realized_path in _extract_realized_paths(source):
                code_segments = [s for s in realized_path.split("/") if s]
                if len(code_segments) != len(doc_segments):
                    continue
                if all(_segment_matches(d, c) for d, c in zip(doc_segments, code_segments)):
                    return True
    return False


def main():
    if len(sys.argv) < 2:
        print("사용법: python3 check_references.py <repo_root> [claude_md_path]")
        sys.exit(1)
    repo_root = os.path.abspath(sys.argv[1])
    claude_md_path = sys.argv[2] if len(sys.argv) > 2 else os.path.join(repo_root, "CLAUDE.md")

    with open(claude_md_path, encoding="utf-8") as f:
        text = f.read()

    tokens = extract_backtick_tokens(text)

    seen_paths = {}
    seen_apis = {}
    missing_paths = []
    unresolved_apis = []

    for tok in tokens:
        tok = tok.strip()
        if looks_like_repo_path(tok):
            if tok in seen_paths:
                continue
            exists, cleaned = check_file_exists(repo_root, tok)
            seen_paths[tok] = exists
            if not exists:
                missing_paths.append(cleaned)
        elif looks_like_api_path(tok):
            if tok in seen_apis:
                continue
            found = check_api_path_referenced(repo_root, tok)
            seen_apis[tok] = found
            if found is False:
                unresolved_apis.append(tok)

    print(f"검사한 파일 경로 토큰: {len(seen_paths)}개, 존재하지 않는 것: {len(missing_paths)}개")
    if missing_paths:
        print("\n[의심되는 죽은 파일 경로 — CLAUDE.md에는 있지만 저장소에는 없음]")
        for p in missing_paths:
            print(f"  - {p}")

    print(f"\n검사한 API 경로 토큰: {len(seen_apis)}개, 백엔드에서 못 찾은 것: {len(unresolved_apis)}개")
    if unresolved_apis:
        print("\n[의심되는 죽은 API 경로 — 백엔드 소스 어디에도 이 prefix가 없음]")
        for p in unresolved_apis:
            print(f"  - {p}")

    if not missing_paths and not unresolved_apis:
        print("\n기계적으로 검사 가능한 참조는 모두 살아있음 — 남은 건 사람(Claude) 판단 몫.")


if __name__ == "__main__":
    main()
