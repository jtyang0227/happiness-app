import { WEB_ORIGIN } from '../../constants/config';

export function getPortfolioUrl(profileName) {
  if (!profileName) return null;
  return `${WEB_ORIGIN}/portfolio/${profileName}`;
}
