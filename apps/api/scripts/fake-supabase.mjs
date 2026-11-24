// 계약 테스트용 가짜 Supabase Storage — 업로드(POST /storage/v1/object/{bucket}/{key})와 삭제(DELETE /storage/v1/object/{bucket})를
// 받아 메모리에 기록한다. GET /__log 로 받은 요청 목록, DELETE /__log 로 비우기. 외부 네트워크 없이 업로드 성공 경로를 확인하려고 쓴다.
import http from 'node:http';
const port = Number(process.env.FAKE_SUPABASE_PORT ?? 54321);
let log = [];
http.createServer((req, res) => {
  const chunks = [];
  req.on('data', (c) => chunks.push(c));
  req.on('end', () => {
    const body = Buffer.concat(chunks);
    if (req.url === '/__log') {
      if (req.method === 'DELETE') log = [];
      res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify(log));
      return;
    }
    log.push({ method: req.method, url: req.url, contentType: req.headers['content-type'] ?? null, auth: req.headers.authorization ?? null,
      upsert: req.headers['x-upsert'] ?? null, size: body.length, body: req.method === 'DELETE' ? body.toString() : undefined });
    res.writeHead(200, { 'Content-Type': 'application/json' }).end('{"Key":"ok"}');
  });
}).listen(port, () => console.log(`fake supabase on ${port}`));
