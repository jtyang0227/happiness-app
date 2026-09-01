/**
 * Seeds a small, deterministic dataset for happiness-mcp-server's evaluation.xml.
 * Run against a FRESH backend (H2 in-memory resets on restart) before running
 * the evaluation, so the answers in evaluation.xml stay stable and reproducible.
 *
 * Usage: node eval/seed.mjs [API_BASE_URL]  (default http://localhost:8080/api)
 */

const BASE = process.argv[2] || "http://localhost:8080/api";
const PASSWORD = "password123";

async function post(path, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${path} -> ${res.status}: ${text}`);
  return json;
}

async function signupAndLogin(name, email, profileName) {
  await post("/auth/signup", {
    name, email, password: PASSWORD, profileName,
    tel: "", instagramId: "", termsAgreed: true,
  });
  const login = await post("/auth/login", { email, password: PASSWORD });
  return { token: login.data.accessToken, memberId: login.data.member.id };
}

async function createPhoto(token, memberId, fields) {
  const res = await post("/photos", { memberId, ...fields }, token);
  return res.data.id;
}

async function createSeries(token, memberId, title, description) {
  const res = await post("/series", { memberId, title, description }, token);
  return res.id;
}

async function addPhotoToSeries(token, seriesId, photoId, displayOrder) {
  await post(`/series/${seriesId}/photos`, { photoId, displayOrder }, token);
}

(async () => {
  console.log(`Seeding against ${BASE} ...`);

  const luna = await signupAndLogin("루나 김", "luna.eval@test.com", "luna-eval");
  const marco = await signupAndLogin("마르코 정", "marco.eval@test.com", "marco-eval");

  console.log("luna memberId =", luna.memberId, " marco memberId =", marco.memberId);

  // Luna: 3 wedding photos (one heavily-liked via direct like calls), 1 landscape
  const lunaPhoto1 = await createPhoto(luna.token, luna.memberId, {
    title: "첫 만남의 순간", description: "웨딩 촬영 시리즈 1편",
    imageUrl: "https://picsum.photos/seed/luna-wedding-1/800/600",
    colorMood: "ROMANTIC", genre: "WEDDING",
  });
  const lunaPhoto2 = await createPhoto(luna.token, luna.memberId, {
    title: "반지 교환", description: "웨딩 촬영 시리즈 2편",
    imageUrl: "https://picsum.photos/seed/luna-wedding-2/800/600",
    colorMood: "ROMANTIC", genre: "WEDDING",
  });
  const lunaPhoto3 = await createPhoto(luna.token, luna.memberId, {
    title: "축하의 순간", description: "웨딩 촬영 시리즈 3편",
    imageUrl: "https://picsum.photos/seed/luna-wedding-3/800/600",
    colorMood: "VIBRANT", genre: "WEDDING",
  });
  const lunaPhoto4 = await createPhoto(luna.token, luna.memberId, {
    title: "새벽 산 능선", description: "설악산 일출 풍경",
    imageUrl: "https://picsum.photos/seed/luna-landscape-1/800/600",
    colorMood: "COOL", genre: "LANDSCAPE",
  });

  // Marco: 2 street photos, 1 food photo
  const marcoPhoto1 = await createPhoto(marco.token, marco.memberId, {
    title: "골목길의 우산", description: "비 오는 날의 스트리트 스냅",
    imageUrl: "https://picsum.photos/seed/marco-street-1/800/600",
    colorMood: "MUTED", genre: "STREET",
  });
  const marcoPhoto2 = await createPhoto(marco.token, marco.memberId, {
    title: "지하철 계단", description: "출근길 스트리트 스냅",
    imageUrl: "https://picsum.photos/seed/marco-street-2/800/600",
    colorMood: "DRAMATIC", genre: "STREET",
  });
  const marcoPhoto3 = await createPhoto(marco.token, marco.memberId, {
    title: "야시장 국수", description: "타이베이 야시장 음식 사진",
    imageUrl: "https://picsum.photos/seed/marco-food-1/800/600",
    colorMood: "WARM", genre: "FOOD",
  });

  // Give lunaPhoto3 the most likes among Luna's wedding photos (3 distinct likers)
  const liker1 = await signupAndLogin("좋아요러1", "liker1.eval@test.com", "liker1-eval");
  const liker2 = await signupAndLogin("좋아요러2", "liker2.eval@test.com", "liker2-eval");
  const liker3 = await signupAndLogin("좋아요러3", "liker3.eval@test.com", "liker3-eval");
  for (const liker of [liker1, liker2, liker3]) {
    await fetch(`${BASE}/photos/${lunaPhoto3}/likes?memberId=${liker.memberId}`, {
      method: "POST", headers: { Authorization: `Bearer ${liker.token}` },
    });
  }
  // lunaPhoto1 gets exactly 1 like
  await fetch(`${BASE}/photos/${lunaPhoto1}/likes?memberId=${liker1.memberId}`, {
    method: "POST", headers: { Authorization: `Bearer ${liker1.token}` },
  });

  // Luna's series bundling her 3 wedding photos
  const weddingSeriesId = await createSeries(luna.token, luna.memberId, "봄날의 웨딩", "3월에 진행한 웨딩 촬영 컬렉션");
  await addPhotoToSeries(luna.token, weddingSeriesId, lunaPhoto1, 1);
  await addPhotoToSeries(luna.token, weddingSeriesId, lunaPhoto2, 2);
  await addPhotoToSeries(luna.token, weddingSeriesId, lunaPhoto3, 3);

  console.log(JSON.stringify({
    luna: { memberId: luna.memberId, profileName: "luna-eval", photos: [lunaPhoto1, lunaPhoto2, lunaPhoto3, lunaPhoto4], seriesId: weddingSeriesId },
    marco: { memberId: marco.memberId, profileName: "marco-eval", photos: [marcoPhoto1, marcoPhoto2, marcoPhoto3] },
  }, null, 2));
  console.log("Seed complete.");
})().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
