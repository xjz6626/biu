import { useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router";

import { addToast } from "@heroui/react";
import { RiStarFill, RiStarLine } from "@remixicon/react";

import { addToDefaultFavoriteFolder, removeFromDefaultFavoriteFolder } from "@/common/utils/default-favorite";
import IconButton from "@/components/icon-button";
import { useMusicFavStore } from "@/store/music-fav";
import { usePlayList } from "@/store/play-list";
import { useUser } from "@/store/user";

const MusicFavButton = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const list = usePlayList(s => s.list);
  const playId = usePlayList(s => s.playId);
  const playItem = useMemo(() => list.find(item => item.id === playId), [list, playId]);
  const isFav = useMusicFavStore(s => s.isFav);
  const refreshIsFav = useMusicFavStore(s => s.refreshIsFav);
  const user = useUser(s => s.user);
  const userMid = user?.mid;

  useEffect(() => {
    refreshIsFav();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playItem]);

  const handleOpen = async () => {
    if (!playItem) return;
    if (!userMid) {
      addToast({ title: "请先登录", color: "warning" });
      return;
    }

    const rid = playItem.type === "mv" ? playItem.aid : playItem.sid;
    if (!rid) {
      addToast({ title: "当前内容无法收藏", color: "warning" });
      return;
    }

    try {
      const target = {
        rid,
        type: playItem.type === "mv" ? 2 : 12,
        userMid,
      } as const;

      const res = isFav ? await removeFromDefaultFavoriteFolder(target) : await addToDefaultFavoriteFolder(target);

      if (res.code === 0) {
        await refreshIsFav();
        if (location.pathname.startsWith("/collection/")) {
          const searchParams = new URLSearchParams(location.search);
          searchParams.set("refresh", Date.now().toString());

          navigate(
            {
              pathname: location.pathname,
              search: `?${searchParams.toString()}`,
            },
            {
              replace: true,
            },
          );
        }
      } else {
        addToast({ title: res.message || "收藏失败", color: "danger" });
      }
    } catch (error) {
      addToast({
        title: error instanceof Error ? error.message : "收藏失败",
        color: "danger",
      });
    }
  };

  return (
    <IconButton onPress={handleOpen}>
      {isFav ? <RiStarFill size={18} className="text-primary" /> : <RiStarLine size={18} />}
    </IconButton>
  );
};

export default MusicFavButton;
