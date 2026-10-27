import { Track } from "@/domain/music";

import { biliGet } from "./client";
import { signWbiParams } from "./wbi";

interface ViewData {
  cid: number;
}

interface DashAudio {
  id: number;
  baseUrl?: string;
  base_url?: string;
  bandwidth?: number;
  backupUrl?: string[];
  backup_url?: string[];
}

interface PlayUrlData {
  dash?: { audio?: DashAudio[] };
}

export async function resolveTrackAudio(track: Track) {
  if (track.audioUrl) return track.audioUrl;
  if (!track.bvid) throw new Error("歌曲缺少 BVID");
  const view = await biliGet<ViewData>("/x/web-interface/view", { bvid: track.bvid });
  if (!view?.cid) throw new Error("无法获取视频分P信息");
  const params = await signWbiParams({ bvid: track.bvid, cid: view.cid, fnval: 16, fnver: 0, fourk: 1 });
  const playData = await biliGet<PlayUrlData>("/x/player/wbi/playurl", params);
  const streams = playData?.dash?.audio ?? [];
  const best = streams.toSorted((left, right) => (right.bandwidth ?? right.id) - (left.bandwidth ?? left.id))[0];
  const url = best?.baseUrl ?? best?.base_url ?? best?.backupUrl?.[0] ?? best?.backup_url?.[0];
  if (!url) throw new Error("无法解析音频播放地址");
  return url;
}
