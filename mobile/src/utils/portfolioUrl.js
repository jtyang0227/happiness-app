export function getPortfolioUrl(profileName) {
  if (!profileName) return null;
  const base = __DEV__ ? 'http://localhost:3000' : 'https://app.example.com';
  return `${base}/portfolio/${profileName}`;
}
