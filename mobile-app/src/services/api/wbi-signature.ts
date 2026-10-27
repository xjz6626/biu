import SparkMD5 from "spark-md5";

export function createWbiSignature(
  params: Record<string, string | number | undefined>,
  mixinKey: string,
  timestamp = Math.floor(Date.now() / 1000),
) {
  const signed = { ...params, wts: timestamp };
  const query = (Object.entries(signed).filter(([, value]) => value !== undefined) as [string, string | number][])
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value).replace(/[!'()*]/g, ""))}`)
    .join("&");
  return { ...signed, w_rid: SparkMD5.hash(query + mixinKey) };
}
