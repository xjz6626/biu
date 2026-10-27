import { Track } from "@/domain/music";

import { biliGet } from "./client";

interface HistoryItem {
  title: string;
  cover?: string;
  author_name?: string;
  duration?: number;
  progress?: number;
  view_at: number;
  history: { bvid?: string; cid?: number; business?: string };
}

interface HistoryData {
  list?: HistoryItem[];
  has_more?: boolean;
}

export interface HistoryTrack extends Track {
  viewedAt: number;
  progress?: number;
}

export async function getPlaybackHistory(page = 1) {
  const data = await biliGet<HistoryData>("/x/web-interface/history/search", { business: "archive", pn: page });
  const tracks: HistoryTrack[] = (data?.list ?? [])
    .filter(item => Boolean(item.history?.bvid))
    .map(item => ({
      id: `bvid:${item.history.bvid}`,
      source: "bilibili-video",
      bvid: item.history.bvid,
      cid: item.history.cid,
      title: item.title,
      artist: item.author_name || "未知 UP 主",
      artworkUrl: item.cover?.startsWith("//") ? `https:${item.cover}` : item.cover,
      duration: item.duration,
      progress: item.progress,
      viewedAt: item.view_at,
    }));
  return { tracks, hasMore: Boolean(data?.has_more) };
}
