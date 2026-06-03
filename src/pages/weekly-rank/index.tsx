import React, { useCallback, useEffect, useState } from "react";

import { addToast, Button, Chip, Spinner } from "@heroui/react";
import { RiExternalLinkLine, RiPlayFill, RiRefreshLine } from "@remixicon/react";

import MusicListItem from "@/components/music-list-item";
import ScrollContainer from "@/components/scroll-container";
import {
  getLatestWeeklyRank,
  type WeeklyRankData,
  type WeeklyRankEntry,
  type WeeklyRankEntryType,
} from "@/service/weekly-vocal-rank";
import { usePlayList } from "@/store/play-list";

const SECTION_COLORS: Record<string, "danger" | "primary" | "secondary" | "success" | "warning" | "default"> = {
  "Super Hit": "danger",
  OP: "warning",
  主榜: "primary",
  "Pick Up": "secondary",
  ED: "warning",
};

const TYPE_LABELS: Record<WeeklyRankEntryType, string> = {
  rank: "排名",
  "super-hit": "SH",
  op: "OP",
  ed: "ED",
};

const getSectionColor = (title: string) => {
  if (SECTION_COLORS[title]) return SECTION_COLORS[title];
  if (title.includes("历史回顾")) return "success";
  return "default";
};

const WeeklyRankEntryRow = ({ entry }: { entry: WeeklyRankEntry }) => {
  const handlePlay = useCallback(() => {
    usePlayList.getState().play({
      type: "mv",
      bvid: entry.bvid,
      title: entry.title,
      cover: entry.cover,
      ownerName: entry.author,
      ownerMid: entry.authorMid,
    });
  }, [entry.author, entry.authorMid, entry.bvid, entry.cover, entry.title]);

  return (
    <MusicListItem
      hidePubTime
      index={entry.type === "rank" ? entry.label : TYPE_LABELS[entry.type]}
      title={entry.title}
      type="mv"
      bvid={entry.bvid}
      cover={entry.cover}
      upName={entry.author}
      upMid={entry.authorMid}
      playCount={entry.playCount}
      duration={entry.duration}
      onPress={handlePlay}
      menus={[]}
    />
  );
};

const WeeklyRank = () => {
  const [data, setData] = useState<WeeklyRankData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (force = false) => {
    try {
      setLoading(true);
      const nextData = await getLatestWeeklyRank({ force });
      setData(nextData);
    } catch (error) {
      addToast({
        title: error instanceof Error ? error.message : "加载榜单失败",
        color: "danger",
      });
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handlePlayAll = useCallback(() => {
    const entries = data?.sections.flatMap(section => section.entries) ?? [];
    const items = entries.map(entry => ({
      type: "mv" as const,
      bvid: entry.bvid,
      title: entry.title,
      cover: entry.cover,
      ownerName: entry.author,
      ownerMid: entry.authorMid,
    }));
    if (!items.length) {
      addToast({ title: "暂无可播放内容", color: "warning" });
      return;
    }
    usePlayList.getState().addList(items);
    addToast({ title: `已添加 ${items.length} 首到播放列表`, color: "success" });
  }, [data]);

  const openVideo = useCallback(() => {
    if (!data?.video.bvid) return;
    window.electron.openExternal(`https://www.bilibili.com/video/${data.video.bvid}`);
  }, [data?.video.bvid]);

  return (
    <ScrollContainer enableBackToTop className="h-full w-full px-5 pb-8">
      <div className="border-divider bg-background/90 sticky top-0 z-10 border-b py-4 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold">榜单记录</h1>
            <div className="text-foreground-500 mt-1 flex flex-wrap items-center gap-2 text-sm">
              <span>{data?.video.title ?? "周刊虚拟歌手中文曲排行榜"}</span>
              {data?.total ? <span>共 {data.total} 条</span> : null}
              {data?.commentAuthor ? <span>评论：{data.commentAuthor}</span> : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="flat"
              startContent={<RiExternalLinkLine size={16} />}
              isDisabled={!data?.video.bvid}
              onPress={openVideo}
            >
              原视频
            </Button>
            <Button
              size="sm"
              color="primary"
              startContent={<RiPlayFill size={16} />}
              isDisabled={!data?.total}
              onPress={handlePlayAll}
              className="dark:text-black"
            >
              全部播放
            </Button>
            <Button
              isIconOnly
              size="sm"
              variant="flat"
              aria-label="刷新"
              isLoading={loading}
              onPress={() => load(true)}
            >
              <RiRefreshLine size={16} />
            </Button>
          </div>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex h-[50vh] items-center justify-center">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="space-y-5 py-5">
          {data?.sections.map(section => (
            <section key={section.title} className="border-divider overflow-hidden rounded-lg border">
              <div className="bg-default-50 border-divider flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                  <Chip size="sm" color={getSectionColor(section.title)} variant="flat">
                    {section.title}
                  </Chip>
                  <span className="text-foreground-500 text-sm">{section.entries.length} 条</span>
                </div>
              </div>
              <div className="p-2">
                {section.entries.map(entry => (
                  <WeeklyRankEntryRow key={entry.id} entry={entry} />
                ))}
              </div>
            </section>
          ))}
          {!loading && !data?.sections.length && (
            <div className="text-foreground-500 flex h-[40vh] items-center justify-center">暂无榜单记录</div>
          )}
        </div>
      )}
    </ScrollContainer>
  );
};

export default WeeklyRank;
