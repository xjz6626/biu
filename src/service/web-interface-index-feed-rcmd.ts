import { apiRequest } from "./request";

export interface WebIndexFeedRcmdParams {
  /** 推荐相关性，通常为 4 */
  fresh_type?: number;
  /** 当前翻页号，从 1 开始 */
  fresh_idx?: number;
  /** 首页推荐版本 */
  feed_version?: "V2";
  /** 单页数量，最大通常为 30 */
  ps?: number;
  /** Web 首页位置 */
  web_location?: number;
}

export interface WebIndexFeedRcmdResponse {
  code?: number;
  message?: string;
  ttl?: number;
  data?: {
    item?: WebIndexFeedRcmdItem[];
    mid?: number;
  };
}

export interface WebIndexFeedRcmdItem {
  id?: number;
  aid?: number;
  bvid?: string;
  cid?: number;
  goto?: string;
  uri?: string;
  pic?: string;
  title?: string;
  duration?: number;
  pubdate?: number;
  owner?: {
    mid?: number;
    name?: string;
    face?: string;
  };
  stat?: {
    view?: number;
    like?: number;
    danmaku?: number;
  };
  is_followed?: number;
  rcmd_reason?: {
    content?: string;
    reason_type?: number;
  } | null;
  track_id?: string;
  pos?: number;
  room_info?: unknown;
  ogv_info?: unknown;
  business_info?: unknown;
}

export function getIndexFeedRcmd(params: WebIndexFeedRcmdParams) {
  return apiRequest.get<WebIndexFeedRcmdResponse>("/x/web-interface/wbi/index/top/feed/rcmd", {
    params,
    useWbi: true,
  });
}
