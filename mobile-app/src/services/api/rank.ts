import AsyncStorage from "@react-native-async-storage/async-storage";

import { RankSection, Track } from "@/domain/music";

import { biliGet } from "./client";
import { parseRankReply } from "./rank-parser";
import { signWbiParams } from "./wbi";

const WEEKLY_UP_MID = 156489;
const CACHE_KEY = "biu-weekly-rank-v1";
const TITLE_PATTERN = /周刊虚拟歌手中文曲排行榜[♪#\s]*(\d+)/;

interface SpaceVideo {
  aid: number;
  bvid: string;
  title: string;
  pic: string;
  created: number;
}

interface SpaceSearchData {
  list?: { vlist?: SpaceVideo[] };
}

interface JumpUrlItem {
  title?: string;
}

interface Reply {
  content?: { message?: string; jump_url?: Record<string, JumpUrlItem> };
  reply_control?: { is_up_top?: boolean };
}

interface ReplyData {
  replies?: Reply[];
  upper?: { top?: Reply };
}

interface VideoDetail {
  bvid: string;
  title: string;
  pic?: string;
  duration?: number;
  owner?: { name?: string };
}

export interface WeeklyRank {
  issue?: number;
  title: string;
  bvid: string;
  publishedAt?: number;
  sections: RankSection[];
}

interface RankCache {
  expiresAt: number;
  value: WeeklyRank;
}

const getNextSundayNoon = () => {
  const next = new Date();
  const days = (7 - next.getDay()) % 7;
  next.setDate(next.getDate() + days);
  next.setHours(12, 0, 0, 0);
  if (next.getTime() <= Date.now()) next.setDate(next.getDate() + 7);
  return next.getTime();
};

async function readCache() {
  const raw = await AsyncStorage.getItem(CACHE_KEY);
  if (!raw) return undefined;
  try {
    const cache = JSON.parse(raw) as RankCache;
    if (cache.expiresAt > Date.now()) return cache.value;
  } catch {
    // Invalid caches are replaced by the next successful request.
  }
  await AsyncStorage.removeItem(CACHE_KEY);
  return undefined;
}

async function enrichTracks(sections: RankSection[]) {
  const tracks = sections.flatMap(section => section.tracks);
  for (let offset = 0; offset < tracks.length; offset += 6) {
    const batch = tracks.slice(offset, offset + 6);
    const details = await Promise.allSettled(
      batch.map(track => biliGet<VideoDetail>("/x/web-interface/view", { bvid: track.bvid })),
    );
    details.forEach((result, index) => {
      if (result.status !== "fulfilled" || !result.value) return;
      const detail = result.value;
      Object.assign(batch[index], {
        title: detail.title || batch[index].title,
        artist: detail.owner?.name || batch[index].artist,
        artworkUrl: detail.pic,
        duration: detail.duration,
      } satisfies Partial<Track>);
    });
  }
  return sections;
}

export async function getLatestWeeklyRank(force = false): Promise<WeeklyRank> {
  if (!force) {
    const cached = await readCache();
    if (cached) return cached;
  }

  const searchParams = await signWbiParams({
    mid: WEEKLY_UP_MID,
    pn: 1,
    ps: 20,
    order: "pubdate",
    keyword: "周刊虚拟歌手中文曲排行榜",
  });
  const searchData = await biliGet<SpaceSearchData>("/x/space/wbi/arc/search", searchParams);
  const video = searchData?.list?.vlist?.find(item => TITLE_PATTERN.test(item.title));
  if (!video) throw new Error("没有找到最新周刊投稿");

  const replyData = await biliGet<ReplyData>("/x/v2/reply", { type: 1, oid: video.aid, sort: 2, pn: 1, ps: 20 });
  const replies = [...(replyData?.upper?.top ? [replyData.upper.top] : []), ...(replyData?.replies ?? [])];
  const reply =
    replies.find(item => item.reply_control?.is_up_top && item.content?.message?.includes("【主榜】")) ??
    replies.find(item => item.content?.message?.includes("【主榜】"));
  if (!reply) throw new Error("没有找到榜单评论");

  const sections = await enrichTracks(parseRankReply(reply));
  const issue = video.title.match(TITLE_PATTERN)?.[1];
  const value: WeeklyRank = {
    issue: issue ? Number(issue) : undefined,
    title: video.title,
    bvid: video.bvid,
    publishedAt: video.created,
    sections,
  };
  await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ value, expiresAt: getNextSundayNoon() } satisfies RankCache));
  return value;
}
