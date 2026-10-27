import * as SecureStore from "expo-secure-store";

import { biliGet, clearBilibiliCookies, PASSPORT_BASE_URL } from "./client";

const REFRESH_TOKEN_KEY = "biu-refresh-token";

export interface QrLoginCode {
  url: string;
  qrcode_key: string;
}

export interface QrLoginPollResult {
  url: string;
  refresh_token: string;
  timestamp: number;
  code: 0 | 86038 | 86090 | 86101;
  message: string;
}

export interface BiliUser {
  isLogin: boolean;
  mid: number;
  uname: string;
  face: string;
  vipStatus: number;
}

export async function createQrLoginCode() {
  return biliGet<QrLoginCode>("/x/passport-login/web/qrcode/generate", {}, PASSPORT_BASE_URL);
}

export async function pollQrLogin(qrcodeKey: string) {
  const result = await biliGet<QrLoginPollResult>(
    "/x/passport-login/web/qrcode/poll",
    { qrcode_key: qrcodeKey },
    PASSPORT_BASE_URL,
  );
  if (result?.code === 0 && result.refresh_token) {
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, result.refresh_token);
  }
  return result;
}

export async function getCurrentUser() {
  return biliGet<BiliUser>("/x/web-interface/nav");
}

export async function logoutLocally() {
  await Promise.all([clearBilibiliCookies(), SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY)]);
}
