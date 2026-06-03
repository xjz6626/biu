import { getReply, type ReplyItem, type ReplyJumpUrlItem } from "./reply";
import { getSpaceWbiArcSearch, type SpaceArcVListItem } from "./space-wbi-arc-search";
import { getWebInterfaceView, type WebInterfaceViewData } from "./web-interface-view";

const WEEKLY_UP_MID = 156489;
const WEEKLY_TITLE_RE = /周刊虚拟歌手中文曲排行榜[♪#\s]*(\d+)/;
const SECTION_RE = /^【(.+?)】$/;
const RANK_LINE_RE = /^(\d+)\s+(BV[0-9A-Za-z]+)/;
const OP_ED_LINE_RE = /^(OP|ED)[:：]\s*(BV[0-9A-Za-z]+)/i;
const SUPER_HIT_LINE_RE = /^SH\s+(BV[0-9A-Za-z]+)(?:\s+(.+))?$/i;
const WEEKLY_RANK_CACHE_KEY = "weekly-vocal-rank-cache";
const WEEKLY_RANK_CACHE_VERSION = 2;
const DETAIL_CONCURRENCY = 6;

export interface WeeklyRankVideo {
  aid: number;
  bvid: string;
  title: string;
  cover?: string;
  pubdate?: number;
  issue?: number;
}

export type WeeklyRankEntryType = "rank" | "super-hit" | "op" | "ed";

export interface WeeklyRankEntry {
  id: string;
  section: string;
  type: WeeklyRankEntryType;
  label: string;
  rank?: number;
  bvid: string;
  aid?: number;
  title: string;
  cover?: string;
  author?: string;
  authorMid?: number;
  playCount?: number;
  duration?: number;
}

export interface WeeklyRankSection {
  title: string;
  entries: WeeklyRankEntry[];
}

export interface WeeklyRankData {
  video: WeeklyRankVideo;
  commentAuthor?: string;
  commentMessage: string;
  sections: WeeklyRankSection[];
  total: number;
}

interface WeeklyRankCache {
  version: number;
  expiresAt: number;
  data: WeeklyRankData;
}

const normalizeVideo = (item: SpaceArcVListItem): WeeklyRankVideo => {
  const issue = item.title.match(WEEKLY_TITLE_RE)?.[1];
  return {
    aid: item.aid,
    bvid: item.bvid,
    title: item.title,
    cover: item.pic,
    pubdate: item.created,
    issue: issue ? Number(issue) : undefined,
  };
};

export async function getLatestWeeklyRankVideo() {
  const res = await getSpaceWbiArcSearch({
    mid: WEEKLY_UP_MID,
    pn: 1,
    ps: 20,
    order: "pubdate",
    keyword: "周刊虚拟歌手中文曲排行榜",
  });

  if (res.code !== 0) {
    throw new Error(res.message || "获取周刊投稿失败");
  }

  const item = res.data?.list?.vlist?.find(video => WEEKLY_TITLE_RE.test(video.title));
  if (!item) {
    throw new Error("没有找到周刊投稿");
  }

  return normalizeVideo(item);
}

const getJumpTitle = (jumpUrl: Record<string, ReplyJumpUrlItem> | undefined, bvid: string) => {
  return jumpUrl?.[bvid]?.title?.trim() || bvid;
};

const getJumpAid = (jumpUrl: Record<string, ReplyJumpUrlItem> | undefined, bvid: string) => {
  const aid = Number(jumpUrl?.[bvid]?.click_report);
  return Number.isFinite(aid) && aid > 0 ? aid : undefined;
};

const createSection = (sections: WeeklyRankSection[], title: string) => {
  let section = sections.find(item => item.title === title);
  if (!section) {
    section = { title, entries: [] };
    sections.push(section);
  }
  return section;
};

export function parseWeeklyRankComment(reply: ReplyItem): WeeklyRankSection[] {
  const message = reply.content?.message ?? "";
  const jumpUrl = reply.content?.jump_url;
  const sections: WeeklyRankSection[] = [];
  let currentSection: WeeklyRankSection | undefined;
  let entryIndex = 0;

  message.split(/\r?\n/).forEach(rawLine => {
    const line = rawLine.trim();
    if (!line) return;

    const sectionMatch = line.match(SECTION_RE);
    if (sectionMatch) {
      currentSection = createSection(sections, sectionMatch[1]);
      return;
    }

    if (!currentSection) return;

    const superHitMatch = line.match(SUPER_HIT_LINE_RE);
    if (currentSection.title === "Super Hit" && superHitMatch) {
      const bvid = superHitMatch[1];
      currentSection.entries.push({
        id: `${currentSection.title}-${entryIndex++}-${bvid}`,
        section: currentSection.title,
        type: "super-hit",
        label: "SH",
        bvid,
        aid: getJumpAid(jumpUrl, bvid),
        title: getJumpTitle(jumpUrl, bvid),
      });
      return;
    }

    const opEdMatch = line.match(OP_ED_LINE_RE);
    if (opEdMatch) {
      const bvid = opEdMatch[2];
      const label = opEdMatch[1].toUpperCase();
      currentSection.entries.push({
        id: `${currentSection.title}-${entryIndex++}-${label}-${bvid}`,
        section: currentSection.title,
        type: label === "OP" ? "op" : "ed",
        label,
        bvid,
        aid: getJumpAid(jumpUrl, bvid),
        title: getJumpTitle(jumpUrl, bvid),
      });
      return;
    }

    const rankMatch = line.match(RANK_LINE_RE);
    if (rankMatch) {
      const rank = Number(rankMatch[1]);
      const bvid = rankMatch[2];
      currentSection.entries.push({
        id: `${currentSection.title}-${entryIndex++}-${rank}-${bvid}`,
        section: currentSection.title,
        type: "rank",
        label: String(rank),
        rank,
        bvid,
        aid: getJumpAid(jumpUrl, bvid),
        title: getJumpTitle(jumpUrl, bvid),
      });
    }
  });

  return orderWeeklyRankSections(sections.filter(section => section.entries.length > 0));
}

const orderWeeklyRankSections = (sections: WeeklyRankSection[]) => {
  const opEntries: WeeklyRankEntry[] = [];
  const superHitSections: WeeklyRankSection[] = [];
  const edEntries: WeeklyRankEntry[] = [];
  const middleSections: WeeklyRankSection[] = [];

  sections.forEach(section => {
    if (section.title === "Super Hit") {
      superHitSections.push(section);
      return;
    }

    if (section.title !== "OP/ED") {
      middleSections.push(section);
      return;
    }

    section.entries.forEach(entry => {
      if (entry.type === "op") {
        opEntries.push({ ...entry, section: "OP" });
      } else if (entry.type === "ed") {
        edEntries.push({ ...entry, section: "ED" });
      }
    });
  });

  return [
    ...(opEntries.length ? [{ title: "OP", entries: opEntries }] : []),
    ...superHitSections,
    ...middleSections,
    ...(edEntries.length ? [{ title: "ED", entries: edEntries }] : []),
  ];
};

const isRankReply = (reply: ReplyItem) => {
  const message = reply.content?.message ?? "";
  return message.includes("【主榜】") && /BV[0-9A-Za-z]+/.test(message);
};

const findRankReply = (replies: ReplyItem[]) => {
  return replies.find(reply => reply.reply_control?.is_up_top && isRankReply(reply)) ?? replies.find(isRankReply);
};

const normalizeDetail = (detail: WebInterfaceViewData) => ({
  aid: detail.aid,
  title: detail.title,
  cover: detail.pic,
  author: detail.owner?.name,
  authorMid: detail.owner?.mid,
  playCount: detail.stat?.view,
  duration: detail.duration,
});

const enrichWeeklyRankEntries = async (sections: WeeklyRankSection[]) => {
  const bvids = Array.from(new Set(sections.flatMap(section => section.entries.map(entry => entry.bvid))));
  const detailMap = new Map<string, ReturnType<typeof normalizeDetail>>();

  for (let i = 0; i < bvids.length; i += DETAIL_CONCURRENCY) {
    const batch = bvids.slice(i, i + DETAIL_CONCURRENCY);
    const results = await Promise.allSettled(batch.map(bvid => getWebInterfaceView({ bvid })));
    results.forEach((result, index) => {
      if (result.status !== "fulfilled" || result.value.code !== 0 || !result.value.data) return;
      detailMap.set(batch[index], normalizeDetail(result.value.data));
    });
  }

  return sections.map(section => ({
    ...section,
    entries: section.entries.map(entry => {
      const detail = detailMap.get(entry.bvid);
      if (!detail) return entry;
      return {
        ...entry,
        ...detail,
        title: detail.title || entry.title,
        aid: detail.aid || entry.aid,
      };
    }),
  }));
};

export async function getWeeklyRank(video: WeeklyRankVideo): Promise<WeeklyRankData> {
  const res = await getReply({
    type: 1,
    oid: video.aid,
    sort: 2,
    pn: 1,
    ps: 20,
  });

  if (res.code !== 0) {
    throw new Error(res.message || "获取评论失败");
  }

  const replies = [...(res.data?.upper?.top ? [res.data.upper.top] : []), ...(res.data?.replies ?? [])];
  const reply = findRankReply(replies);
  if (!reply) {
    throw new Error("没有找到榜单评论");
  }

  const sections = await enrichWeeklyRankEntries(parseWeeklyRankComment(reply));

  return {
    video,
    commentAuthor: reply.member?.uname,
    commentMessage: reply.content?.message ?? "",
    sections,
    total: sections.reduce((sum, section) => sum + section.entries.length, 0),
  };
}

export async function getLatestWeeklyRank(options: { force?: boolean } = {}) {
  return getLatestWeeklyRankWithCache(options);
}

const getNextSundayNoon = (now = new Date()) => {
  const next = new Date(now);
  const day = now.getDay();
  const daysUntilSunday = (7 - day) % 7;
  next.setDate(now.getDate() + daysUntilSunday);
  next.setHours(12, 0, 0, 0);

  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 7);
  }

  return next.getTime();
};

const readWeeklyRankCache = () => {
  try {
    const raw = localStorage.getItem(WEEKLY_RANK_CACHE_KEY);
    if (!raw) return null;
    const cache = JSON.parse(raw) as WeeklyRankCache;
    if (
      cache?.version !== WEEKLY_RANK_CACHE_VERSION ||
      !cache?.data ||
      !cache.expiresAt ||
      cache.expiresAt <= Date.now()
    ) {
      localStorage.removeItem(WEEKLY_RANK_CACHE_KEY);
      return null;
    }
    return cache.data;
  } catch {
    localStorage.removeItem(WEEKLY_RANK_CACHE_KEY);
    return null;
  }
};

const writeWeeklyRankCache = (data: WeeklyRankData) => {
  const cache: WeeklyRankCache = {
    version: WEEKLY_RANK_CACHE_VERSION,
    expiresAt: getNextSundayNoon(),
    data,
  };
  localStorage.setItem(WEEKLY_RANK_CACHE_KEY, JSON.stringify(cache));
};

export async function getLatestWeeklyRankWithCache(options: { force?: boolean } = {}) {
  if (!options.force) {
    const cache = readWeeklyRankCache();
    if (cache) return cache;
  }

  const video = await getLatestWeeklyRankVideo();
  const data = await getWeeklyRank(video);
  writeWeeklyRankCache(data);
  return data;
}
