/** Mirrors of the Happiness backend's public response shapes (subset of fields actually used). */

export interface PhotoSummary {
  id: number;
  memberId: number;
  memberName: string | null;
  memberAvatarUrl: string | null;
  memberProfileName: string | null;
  title: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  description: string | null;
  imageRatio: string | null;
  likesCount: number;
  savesCount: number;
  sharesCount: number;
  colorMood: string | null;
  genre: string | null;
  subGenres: string[];
  createdAt: string;
}

/** GET /api/photos wraps results as { status, data }; single-photo GET matches the same envelope. */
export interface PhotoListEnvelope {
  status: string;
  data: PhotoSummary[];
}

export interface PhotoDetailEnvelope {
  status: string;
  data: PhotoSummary;
}

export interface PortfolioMember {
  id: number;
  name: string;
  profileName: string;
  bio: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  websiteUrl: string | null;
  location: string | null;
  specialties: string | null;
  publicProfile: boolean;
  createdAt: string;
}

export interface SeriesSummary {
  id: number;
  title: string;
  description: string | null;
  photoCount: number;
  coverImageUrl: string | null;
}

/** GET /api/portfolio/{profileName} returns this object directly, with no status/data wrapper. */
export interface PortfolioResponse {
  member: PortfolioMember;
  photos: PhotoSummary[];
  series: SeriesSummary[];
  photoCount: number;
  followerCount: number;
  followingCount: number;
  totalLikes: number;
}

/** GET /api/portfolio/{profileName}/config returns this object directly. */
export interface PortfolioConfigResponse {
  template: string;
  styleJson: string | null;
  sectionsJson: string | null;
}
