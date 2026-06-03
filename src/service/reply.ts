import { apiRequest } from "./request";

export interface ReplyJumpUrlItem {
  title?: string;
  click_report?: string;
}

export interface ReplyItem {
  rpid: number;
  oid: number;
  member?: {
    mid?: string;
    uname?: string;
  };
  content?: {
    message?: string;
    jump_url?: Record<string, ReplyJumpUrlItem>;
  };
  reply_control?: {
    is_up_top?: boolean;
  };
}

export interface ReplyResponse {
  code: number;
  message: string;
  data?: {
    replies?: ReplyItem[];
    upper?: {
      top?: ReplyItem;
    };
  };
}

export interface ReplyRequestParams {
  type: number;
  oid: number;
  sort?: number;
  pn?: number;
  ps?: number;
}

export function getReply(params: ReplyRequestParams): Promise<ReplyResponse> {
  return apiRequest.get<ReplyResponse>("/x/v2/reply", {
    params,
  });
}
