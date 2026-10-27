import { biliGet } from "./client";

export interface FavoriteFolder {
  id: number;
  title: string;
  cover?: string;
  mediaCount: number;
  ownerName?: string;
  collected: boolean;
}

interface FavoriteFolderItem {
  id: number;
  title: string;
  cover?: string;
  media_count?: number;
  state?: number;
  upper?: { name?: string };
}

interface FolderListData {
  list?: FavoriteFolderItem[] | null;
}

const mapFolder = (item: FavoriteFolderItem, collected: boolean): FavoriteFolder => ({
  id: item.id,
  title: item.title,
  cover: item.cover?.startsWith("//") ? `https:${item.cover}` : item.cover,
  mediaCount: item.media_count ?? 0,
  ownerName: item.upper?.name,
  collected,
});

export async function getFavoriteFolders(userMid: number) {
  const [created, collected] = await Promise.all([
    biliGet<FolderListData>("/x/v3/fav/folder/created/list", { up_mid: userMid, pn: 1, ps: 50 }),
    biliGet<FolderListData>("/x/v3/fav/folder/collected/list", { up_mid: userMid, pn: 1, ps: 50, platform: "web" }),
  ]);
  return [
    ...(created?.list ?? [])
      .filter(item => item.state === undefined || item.state === 0)
      .map(item => mapFolder(item, false)),
    ...(collected?.list ?? [])
      .filter(item => item.state === undefined || item.state === 0)
      .map(item => mapFolder(item, true)),
  ];
}
