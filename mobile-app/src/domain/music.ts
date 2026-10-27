export type MusicSource = "bilibili-video" | "bilibili-audio";

export interface Track {
  id: string;
  source: MusicSource;
  title: string;
  artist: string;
  artworkUrl?: string;
  audioUrl?: string;
  bvid?: string;
  cid?: number;
  duration?: number;
}

export interface RankSection {
  id: string;
  title: string;
  tracks: Track[];
}
