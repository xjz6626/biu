export type RecommendItemBadge = "followedUp" | "vocaloid";

export interface RecommendItem {
  id: string | number;
  aid?: number;
  bvid?: string;
  title: string;
  cover: string;
  author?: string;
  authorMid?: number;
  playCount?: number;
  duration?: number;
  badges?: RecommendItemBadge[];
}
