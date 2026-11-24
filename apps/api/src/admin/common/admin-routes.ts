/** 등록된 라우트 목록(부트스트랩 때 express 라우터에서 채움) — 없는 경로와 메서드만 다른 경로를 Spring처럼 구분하려고 쓴다 */
interface RouteLayer { route?: { path?: string; methods?: Record<string, boolean> }; match?: (path: string) => boolean }

let layers: RouteLayer[] = [];

export function captureRoutes(expressApp: { router?: { stack?: RouteLayer[] }; _router?: { stack?: RouteLayer[] } }) {
  const stack = expressApp.router?.stack ?? expressApp._router?.stack ?? [];
  layers = stack.filter((l) => l.route && typeof l.match === 'function');
}

export function pathHasOtherMethod(path: string): boolean {
  return layers.some((l) => {
    try {
      return l.match!(path);
    } catch {
      return false;
    }
  });
}
