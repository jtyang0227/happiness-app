# 12. 사이드 이펙트 검증 리포트

작성일: 2026-06-19  
검증 대상: 이미지 에디터 SPA (11_IMAGE_EDITOR.md 구현 결과)

---

## 검증 항목 및 결과

### A. Import 유효성 — 모두 정상

| 항목 | 결과 |
|------|------|
| ExportModal → `uploadApi.uploadImage` | ✅ 정상 |
| ExportModal → `photoApi.create` | ✅ 정상 |
| ImageEditorPage → `photoApi.getOne` | ✅ 정상 |
| CenterCanvas → `buildChannelLUTs`, `renderWithChannelLUTs`, `applyEffects`, `generateGrainTile` | ✅ 정상 |
| editorReducer → 7종 DEFAULT_* 상수 | ✅ 정상 |
| AdjustPanel → 6종 DEFAULT_* 상수 | ✅ 정상 |

### B. App.jsx 라우팅 — 정상

| 항목 | 결과 |
|------|------|
| `/editor` STANDALONE_PATHS exact match | ✅ 정상 (하위 경로 없으므로 문제 없음) |
| 기존 라우트 순서 무결성 | ✅ 정상 |

### C. Header.jsx — 정상

| 항목 | 결과 |
|------|------|
| BottomNav 분리 (NAV_ITEMS ≠ BOTTOM_NAV_ITEMS) | ✅ 정상 |
| `/editor` active 상태 충돌 | ✅ 정상 |

### D. EditorContext/Reducer 안전성

| 항목 | 결과 | 조치 |
|------|------|------|
| `crypto.randomUUID()` fallback | ✅ 정상 | 삼항 fallback 구현됨 |
| objectUrl 메모리 누수 | ⚠️ → ✅ 수정 완료 | EditorProvider 언마운트 시 revoke 추가 |
| Undo/Redo deep copy | ✅ 정상 | |

### E. CenterCanvas 렌더링

| 항목 | 결과 | 조치 |
|------|------|------|
| renderCanvas 이중 실행 구조 | ⚠️ → ✅ 수정 완료 | stable ref 패턴으로 리팩터링 |
| imgElRef null 체크 | ✅ 정상 | 3중 null 체크 확인 |

### F. ExportModal 비동기

| 항목 | 결과 | 조치 |
|------|------|------|
| `photoApi.create` memberId 누락 | ⚠️ → ✅ 수정 완료 | useAuth() 추가, memberId 전달 |

---

## 수정 사항 (커밋: fix/22219ef)

### F-1: ExportModal — memberId 누락 (긴급)

**문제**: 갤러리 업로드 시 `photoApi.create({ imageUrl, title })`에 `memberId` 미포함 → 백엔드 400/500 에러 발생 가능.  
**수정**: `useAuth()` import 추가, `user?.id`를 `memberId`로 전달.

```jsx
// Before
await photoApi.create({ imageUrl: url, title: filename });

// After
await photoApi.create({ imageUrl: url, title: filename, memberId: user?.id });
```

### D-2: EditorContext — objectUrl 메모리 누수

**문제**: EditorProvider 언마운트 시 `images[]`의 모든 `objectUrl`이 revoke되지 않음.  
**수정**: cleanup effect 추가.

```jsx
useEffect(() => {
  return () => {
    state.images.forEach(img => {
      if (img.objectUrl) URL.revokeObjectURL(img.objectUrl);
    });
  };
}, []); // runs only on unmount
```

### E-1: CenterCanvas — renderCanvas stable ref 패턴

**문제**: `useCallback([currentEditState, zoom])`으로 정의된 `renderCanvas`가 매 편집마다 새 함수 참조를 생성. `useEffect` 의존성 배열에 `renderCanvas` 포함 시 이중 트리거 구조.  
**수정**: `useRef`로 stable 함수를 만들고, `editStateRef`/`zoomRef`로 최신 값을 참조.

```jsx
// Before
const renderCanvas = useCallback(() => { /* uses currentEditState, zoom directly */ }, [currentEditState, zoom]);

// After
const editStateRef = useRef(currentEditState);
const zoomRef      = useRef(zoom);
editStateRef.current = currentEditState;  // always up-to-date
zoomRef.current      = zoom;

const renderCanvas = useRef(() => {
  // reads editStateRef.current, zoomRef.current — always latest, no stale closure
}).current;
```

---

## 결론

- **전체 13개 항목 검증** → 10개 정상, 3개 수정 완료
- `npm run build` 성공 확인 (140.77 kB gzip)
- 실질적 기능 동작에 영향을 주는 버그는 **F-1 (memberId 누락)** 1건만 해당
- D-2, E-1은 코드 품질/메모리 개선 사항
