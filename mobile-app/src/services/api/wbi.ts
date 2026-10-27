import { biliGet } from "./client";
import { createWbiSignature } from "./wbi-signature";

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41,
  13, 37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34,
  44, 52,
];

interface NavWbiData {
  wbi_img?: { img_url?: string; sub_url?: string };
}

let keyCache: { value: string; expiresAt: number } | undefined;

const fileKey = (url?: string) => url?.slice(url.lastIndexOf("/") + 1, url.lastIndexOf(".")) ?? "";

async function getMixinKey() {
  if (keyCache && keyCache.expiresAt > Date.now()) return keyCache.value;
  const nav = await biliGet<NavWbiData>("/x/web-interface/nav");
  const source = fileKey(nav?.wbi_img?.img_url) + fileKey(nav?.wbi_img?.sub_url);
  const value = MIXIN_KEY_ENC_TAB.map(index => source[index])
    .join("")
    .slice(0, 32);
  if (!value) throw new Error("获取 WBI 签名密钥失败");
  keyCache = { value, expiresAt: Date.now() + 10 * 60 * 1000 };
  return value;
}

export async function signWbiParams(params: Record<string, string | number | undefined>) {
  const mixinKey = await getMixinKey();
  return createWbiSignature(params, mixinKey);
}
