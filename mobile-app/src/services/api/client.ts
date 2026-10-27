import { Platform } from "react-native";

export const API_BASE_URL = "https://api.bilibili.com";
export const PASSPORT_BASE_URL = "https://passport.bilibili.com";
const BILIBILI_URL = "https://www.bilibili.com";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly code?: number,
  ) {
    super(message);
  }
}

export interface BiliResponse<T> {
  code: number;
  message?: string;
  data?: T;
}

async function getCookieHeader() {
  if (Platform.OS === "web") return undefined;
  const { default: CookieManager } = await import("@preeternal/react-native-cookie-manager");
  const cookies = await CookieManager.get(BILIBILI_URL);
  return Object.values(cookies)
    .map(cookie => `${cookie.name}=${cookie.value}`)
    .join("; ");
}

async function syncResponseCookies(response: Response, url: string) {
  if (Platform.OS === "web") return;
  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) return;
  const { default: CookieManager } = await import("@preeternal/react-native-cookie-manager");
  await CookieManager.setFromResponse(url, setCookie);
  await CookieManager.flush();
}

export async function biliGet<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  baseUrl = API_BASE_URL,
) {
  const url = new URL(path, baseUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) url.searchParams.set(key, String(value));
  });

  const cookie = await getCookieHeader();
  const response = await fetch(url.toString(), {
    credentials: "include",
    headers: {
      Accept: "application/json",
      Referer: "https://www.bilibili.com/",
      ...(cookie ? { Cookie: cookie } : {}),
    },
  });

  if (!response.ok) throw new ApiError(`网络请求失败 (${response.status})`);
  await syncResponseCookies(response, url.toString());
  const payload = (await response.json()) as BiliResponse<T>;
  if (payload.code !== 0) throw new ApiError(payload.message || "Bilibili 接口请求失败", payload.code);
  return payload.data;
}

export async function getBilibiliCookie(name: string) {
  if (Platform.OS === "web") return undefined;
  const { default: CookieManager } = await import("@preeternal/react-native-cookie-manager");
  const cookies = await CookieManager.get(BILIBILI_URL);
  return cookies[name]?.value;
}

export async function clearBilibiliCookies() {
  if (Platform.OS === "web") return;
  const { default: CookieManager } = await import("@preeternal/react-native-cookie-manager");
  await CookieManager.clearAll();
}
