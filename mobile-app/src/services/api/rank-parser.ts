import { RankSection } from "../../domain/music";

const SECTION_PATTERN = /^【(.+?)】$/;
const RANK_PATTERN = /^(\d+)\s+(BV[0-9A-Za-z]+)/;
const OP_ED_PATTERN = /^(OP|ED)[:：]\s*(BV[0-9A-Za-z]+)/i;
const SUPER_HIT_PATTERN = /^SH\s+(BV[0-9A-Za-z]+)/i;

export interface RankReplyInput {
  content?: {
    message?: string;
    jump_url?: Record<string, { title?: string }>;
  };
}

export function parseRankReply(reply: RankReplyInput) {
  const sections: RankSection[] = [];
  let current: RankSection | undefined;
  const jumpUrls = reply.content?.jump_url;

  for (const rawLine of (reply.content?.message ?? "").split(/\r?\n/)) {
    const line = rawLine.trim();
    const sectionMatch = line.match(SECTION_PATTERN);
    if (sectionMatch) {
      current = { id: `section:${sections.length}:${sectionMatch[1]}`, title: sectionMatch[1], tracks: [] };
      sections.push(current);
      continue;
    }
    if (!current) continue;
    const rankMatch = line.match(RANK_PATTERN);
    const opEdMatch = line.match(OP_ED_PATTERN);
    const superHitMatch = line.match(SUPER_HIT_PATTERN);
    const bvid = rankMatch?.[2] ?? opEdMatch?.[2] ?? superHitMatch?.[1];
    if (!bvid) continue;
    const label = rankMatch?.[1] ?? opEdMatch?.[1]?.toUpperCase() ?? "SH";
    current.tracks.push({
      id: `bvid:${bvid}`,
      source: "bilibili-video",
      bvid,
      title: jumpUrls?.[bvid]?.title?.trim() || `${label} · ${bvid}`,
      artist: current.title,
    });
  }
  return sections.filter(section => section.tracks.length > 0);
}
