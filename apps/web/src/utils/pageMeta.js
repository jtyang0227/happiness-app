/**
 * 페이지별 <title>/description/Open Graph 메타를 설정하고, 되돌리는 함수를 반환한다.
 *
 * 주의: SPA라 JS를 실행하는 크롤러(구글 등)에만 반영된다. 카카오톡·슬랙 등 메신저 링크 미리보기는
 * HTML을 그대로 읽으므로 이 값을 보지 못한다 — 서버 측 메타 주입이 필요하다(기획서 P1 메모 참고).
 */
export function applyPageMeta({ title, description, image, url, type = 'website' }) {
  const touched = [];
  const set = (attr, key, content) => {
    if (content == null || content === '') return;
    let el = document.head.querySelector(`meta[${attr}="${key}"]`);
    const created = !el;
    if (created) {
      el = document.createElement('meta');
      el.setAttribute(attr, key);   // 이전 구현은 이 속성을 빠뜨려 매번 이름 없는 meta만 쌓였다
      document.head.appendChild(el);
    }
    touched.push({ el, created, prev: el.getAttribute('content') });
    el.setAttribute('content', content);
  };

  const prevTitle = document.title;
  if (title) document.title = title;
  set('name', 'description', description);
  set('property', 'og:title', title);
  set('property', 'og:description', description);
  set('property', 'og:url', url);
  set('property', 'og:image', image);
  set('property', 'og:type', type);

  return () => {
    document.title = prevTitle;
    touched.forEach(({ el, created, prev }) => {
      if (created) el.remove();
      else el.setAttribute('content', prev ?? '');
    });
  };
}
