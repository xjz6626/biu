import { Track } from "@/domain/music";

import { biliGet } from "./client";
import { signWbiParams } from "./wbi";

interface SearchVideoItem {
  bvid: string;
  title: string;
  author: string;
  pic: string;
  mid: number;
  duration?: string | number;
}

interface SearchVideoData {
  result?: SearchVideoItem[];
  numResults?: number;
}

const stripHtml = (value: string) =>
  value
    .replace(/<[^>]+>/g, "")
    .replaceAll("&quot;", '"')
    .trim();
const httpsUrl = (value?: string) => (value?.startsWith("//") ? `https:${value}` : value);

export async function searchMusic(keyword: string, page = 1) {
  const params = await signWbiParams({
    search_type: "video",
    keyword,
    page,
    page_size: 20,
    order: "totalrank",
    tids: 3,
  });
  const data = await biliGet<SearchVideoData>("/x/web-interface/wbi/search/type", params);
  const tracks: Track[] = (data?.result ?? []).map(item => ({
    id: `bvid:${item.bvid}`,
    source: "bilibili-video",
    bvid: item.bvid,
    title: stripHtml(item.title),
    artist: item.author,
    artworkUrl: httpsUrl(item.pic),
  }));
  return { tracks, total: data?.numResults ?? tracks.length };
}
