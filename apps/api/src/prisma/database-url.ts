/**
 * Spring(application-prod.yml: sslmode=require + NonValidatingFactory)과 같은 SSL 동작으로 맞춘다.
 *
 * pg 8.x(pg-connection-string 2.x)는 `sslmode=require`·`prefer`·`verify-ca`를 `verify-full`로 취급해
 * 인증서 체인까지 검증한다. Supabase 서버 인증서는 Node 기본 신뢰 목록에 없는 Supabase 루트 CA로
 * 서명돼 있어, Supabase 대시보드에서 복사한 `...?sslmode=require` 주소를 그대로 넣으면
 * "self-signed certificate in certificate chain"으로 DB 연결이 실패한다(health는 DB를 안 봐 UP).
 * → 사용자가 따로 정하지 않았으면(`uselibpqcompat`·`sslrootcert` 없음) libpq 의미(암호화만, 검증 안 함)로 바꾼다.
 */
export function normalizeDatabaseUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return raw; // 파싱 못 하는 형식은 그대로 둔다
  }
  const mode = url.searchParams.get('sslmode');
  if (!mode || !['require', 'prefer', 'verify-ca'].includes(mode)) return raw;
  if (url.searchParams.has('uselibpqcompat') || url.searchParams.has('sslrootcert')) return raw;
  url.searchParams.set('uselibpqcompat', 'true');
  return url.toString();
}
