import { useCallback, useEffect, useMemo, useState } from "react";

import { addToast, Button } from "@heroui/react";

import { postRelationModify, UserRelationAction } from "@/service/relation-modify";
import { getSpaceWbiAccRelation } from "@/service/space-wbi-acc-relation";
import { usePlayList } from "@/store/play-list";

const FOLLOWED_ATTRIBUTES = new Set([2, 6]);

const MusicFollowButton = () => {
  const list = usePlayList(s => s.list);
  const playId = usePlayList(s => s.playId);
  const playItem = useMemo(() => list.find(item => item.id === playId), [list, playId]);
  const ownerMid = playItem?.source === "local" ? undefined : playItem?.ownerMid;
  const [isFollowed, setIsFollowed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let canceled = false;

    const refresh = async () => {
      if (!ownerMid) {
        setIsFollowed(false);
        return;
      }

      try {
        const res = await getSpaceWbiAccRelation({ mid: ownerMid });
        if (canceled) return;
        setIsFollowed(FOLLOWED_ATTRIBUTES.has(res.data?.relation?.attribute));
      } catch {
        if (canceled) return;
        setIsFollowed(false);
      }
    };

    void refresh();

    return () => {
      canceled = true;
    };
  }, [ownerMid]);

  const handleToggleFollow = useCallback(async () => {
    if (!ownerMid || isLoading) return;

    const nextValue = !isFollowed;
    setIsFollowed(nextValue);
    setIsLoading(true);

    try {
      const res = await postRelationModify({
        act: nextValue ? UserRelationAction.Follow : UserRelationAction.Unfollow,
        fid: ownerMid,
        re_src: 14,
      });

      if (res.code !== 0) {
        setIsFollowed(!nextValue);
        addToast({ title: nextValue ? "关注失败" : "取消关注失败", color: "danger" });
      }
    } catch {
      setIsFollowed(!nextValue);
      addToast({ title: nextValue ? "关注失败" : "取消关注失败", color: "danger" });
    } finally {
      setIsLoading(false);
    }
  }, [isFollowed, isLoading, ownerMid]);

  if (!ownerMid) return null;

  return (
    <Button
      size="sm"
      radius="full"
      variant={isFollowed ? "flat" : "solid"}
      color={isFollowed ? "default" : "primary"}
      isLoading={isLoading}
      onPress={handleToggleFollow}
      className="h-5 min-w-10 px-2 text-[11px]"
    >
      {isFollowed ? "已关注" : "关注"}
    </Button>
  );
};

export default MusicFollowButton;
