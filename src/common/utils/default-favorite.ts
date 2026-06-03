import { isDefaultFav } from "@/common/utils/fav";
import { getFavFolderCreatedListAll } from "@/service/fav-folder-created-list-all";
import { postFavFolderDeal } from "@/service/fav-folder-deal";
import { getAudioCreatedFavList } from "@/service/medialist-gateway-base-created";
import { postCollResourceDeal } from "@/service/medialist-gateway-coll-resource-deal";

export type DefaultFavoriteTargetType = 2 | 12;

interface BaseParams {
  rid: number | string;
  type: DefaultFavoriteTargetType;
  userMid: number | string;
}

interface FavoriteFolder {
  id: number;
  title: string;
  attr?: number;
}

const pickDefaultFolder = (folders: FavoriteFolder[]) => {
  return folders.find(folder => isDefaultFav(folder.attr)) ?? folders[0];
};

const getCreatedVideoFolders = async ({ rid, type, userMid }: BaseParams) => {
  const res = await getFavFolderCreatedListAll({
    up_mid: userMid,
    rid,
    type,
  });

  return res.data?.list?.map(item => ({ id: item.id, title: item.title, attr: item.attr })) ?? [];
};

const getCreatedAudioFolders = async ({ rid, type, userMid }: BaseParams) => {
  const res = await getAudioCreatedFavList({
    rid,
    type,
    up_mid: userMid,
    pn: 1,
    ps: 100,
  });

  return (
    res.data?.list
      ?.filter(item => item.state === 0)
      .map(item => ({ id: item.id, title: item.title, attr: item.attr })) ?? []
  );
};

const getDefaultFolder = async (params: BaseParams) => {
  const folders = params.type === 12 ? await getCreatedAudioFolders(params) : await getCreatedVideoFolders(params);
  return pickDefaultFolder(folders);
};

export const addToDefaultFavoriteFolder = async (params: BaseParams) => {
  const folder = await getDefaultFolder(params);

  if (!folder) {
    throw new Error("还没有可用的收藏夹");
  }

  if (params.type === 12) {
    return postCollResourceDeal({
      rid: params.rid,
      type: params.type,
      add_media_ids: String(folder.id),
      del_media_ids: "",
    });
  }

  return postFavFolderDeal({
    rid: params.rid,
    type: params.type,
    platform: "web",
    ga: 1,
    gaia_source: "web_normal",
    add_media_ids: String(folder.id),
    del_media_ids: "",
  });
};

export const removeFromDefaultFavoriteFolder = async (params: BaseParams) => {
  const folder = await getDefaultFolder(params);

  if (!folder) {
    throw new Error("还没有可用的收藏夹");
  }

  if (params.type === 12) {
    return postCollResourceDeal({
      rid: params.rid,
      type: params.type,
      add_media_ids: "",
      del_media_ids: String(folder.id),
    });
  }

  return postFavFolderDeal({
    rid: params.rid,
    type: params.type,
    platform: "web",
    ga: 1,
    gaia_source: "web_normal",
    add_media_ids: "",
    del_media_ids: String(folder.id),
  });
};
