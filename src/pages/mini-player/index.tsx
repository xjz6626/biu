import { memo, useEffect, useMemo, useRef, useState } from "react";

import { Button, Slider } from "@heroui/react";
import {
  RiExpandDiagonalLine,
  RiPauseCircleFill,
  RiPlayCircleFill,
  RiSkipBackFill,
  RiSkipForwardFill,
  RiVolumeDownLine,
  RiVolumeMuteLine,
  RiVolumeUpLine,
} from "@remixicon/react";
import clx from "classnames";
import { useShallow } from "zustand/react/shallow";

import { getPlayModeList } from "@/common/constants/audio";
import { createBroadcastChannel, toggleMiniMode } from "@/common/utils/mini-player";
import Image from "@/components/image";
import { usePlayProgress } from "@/store/play-progress";

import { usePlayState } from "./play-state";
import { useStyle } from "./use-style";

const PlayModeList = getPlayModeList(16);

const CoverView = memo(() => {
  const cover = usePlayState(s => s.cover);
  if (!cover) return null;
  return (
    <div className="relative h-full w-[100px] flex-shrink-0">
      <Image
        removeWrapper
        radius="none"
        src={cover}
        width={100}
        height="100%"
        params="672w_378h_1c.avif"
        loading="eager"
        decoding="async"
        style={{ transform: "translateZ(0)", backfaceVisibility: "hidden", willChange: "transform", contain: "paint" }}
      />
      <div className="from-background pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l to-transparent" />
    </div>
  );
});

const MiniPlayer = () => {
  const { isSingle, isPlaying, title, duration, playMode } = usePlayState(
    useShallow(state => ({
      isSingle: state.isSingle,
      isPlaying: state.isPlaying,
      title: state.title,
      duration: state.duration,
      playMode: state.playMode,
    })),
  );
  const currentTime = usePlayProgress(s => s.currentTime);
  const setCurrentTime = usePlayProgress(s => s.setCurrentTime);
  const updatePlayState = usePlayState(state => state.update);
  const bcRef = useRef<BroadcastChannel>(null);

  const postMessage = (type: string, state?: any) => {
    if (!bcRef.current) return;
    bcRef.current.postMessage({
      from: "mini",
      data: {
        type,
        state,
      },
      ts: Date.now(),
    });
  };

  useStyle();

  const playModeIcon = useMemo(() => {
    return PlayModeList.find(item => item.value === playMode)?.icon;
  }, [playMode]);

  useEffect(() => {
    bcRef.current = createBroadcastChannel();
    postMessage("init");

    bcRef.current.onmessage = ev => {
      const { from, state } = ev.data || {};
      if (from !== "main" || !state) return;

      updatePlayState(state);
      if (typeof state.currentTime === "number") {
        setCurrentTime(state.currentTime);
      }
      if (typeof state.volume === "number") {
        updatePlayState({ volume: state.volume });
      }
      if (typeof state.isMuted === "boolean") {
        updatePlayState({ isMuted: state.isMuted });
      }
    };

    return () => {
      if (!bcRef.current) return;
      bcRef.current.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSeek = (v: number) => {
    postMessage("seek", { currentTime: v });
  };

  const togglePlayMode = () => {
    postMessage("togglePlayMode");
  };

  const prev = () => {
    postMessage("prev");
  };

  const togglePlay = () => {
    postMessage("togglePlay");
  };

  const next = () => {
    postMessage("next");
  };

  // 音量控制（状态从主窗口同步，命令通过 BroadcastChannel 发送）
  const volume = usePlayState(s => s.volume);
  const isMuted = usePlayState(s => s.isMuted);
  const prevVolumeRef = useRef(volume);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const lastVolumeClickRef = useRef(0);

  const volumeIcon = useMemo(() => {
    if (isMuted || volume === 0) return <RiVolumeMuteLine size={18} />;
    if (volume > 0.5) return <RiVolumeUpLine size={18} />;
    return <RiVolumeDownLine size={18} />;
  }, [isMuted, volume]);

  const displayVolume = isMuted ? 0 : volume;

  const handleVolumeSliderChange = (v: number) => {
    const val = v as number;

    // 从静音拉到非零 → 先发取消静音
    if (isMuted && val > 0) {
      postMessage("toggleMute");
    }

    // 拉到 0 → 保存当前音量后静音
    if (val === 0 && !isMuted) {
      prevVolumeRef.current = volume;
      postMessage("toggleMute");
    }

    postMessage("setVolume", { volume: val });
  };

  const handleVolumeClick = () => {
    const now = Date.now();
    if (now - lastVolumeClickRef.current < 300) {
      // 双击 → 静音切换
      if (!isMuted) {
        prevVolumeRef.current = volume;
        postMessage("setVolume", { volume: 0 });
        postMessage("toggleMute");
      } else {
        postMessage("setVolume", { volume: prevVolumeRef.current });
        postMessage("toggleMute");
      }
      setShowVolumeSlider(false);
      window.electron.setMiniSize(false);
    } else {
      // 单击 → 切换音量滑块
      const next = !showVolumeSlider;
      setShowVolumeSlider(next);
      window.electron.setMiniSize(next);
    }
    lastVolumeClickRef.current = now;
  };

  return (
    <div className="window-drag rounded-medium bg-background flex h-screen w-screen flex-col overflow-hidden select-none">
      {/* 主卡片区域 - 固定 100px */}
      <div className="flex h-[100px] shrink-0 items-center">
        <CoverView />
        <div className="flex min-w-0 flex-1 flex-col space-y-1 px-2">
          <div className="flex min-w-0 flex-col">
            {title ? (
              <span className="truncate text-center text-sm font-medium">{title}</span>
            ) : (
              <span className="text-center text-sm text-zinc-500">暂无播放内容</span>
            )}
          </div>
          <div className="window-no-drag mt-1 flex items-center">
            <Slider
              aria-label="播放进度"
              minValue={0}
              maxValue={duration}
              value={currentTime}
              onChange={v => {
                handleSeek(v as number);
              }}
              isDisabled={!title}
              size="sm"
              className="flex-1"
              classNames={{
                trackWrapper: "group",
                track: "h-[4px] cursor-pointer",
                thumb: clx("w-3 h-3 after:h-2 after:bg-primary opacity-0", {
                  "group-hover:opacity-100": Boolean(title),
                }),
              }}
            />
          </div>
          <div className="flex items-center justify-between space-x-1">
            <Button
              isIconOnly
              size="sm"
              variant="light"
              disableAnimation
              onPress={togglePlayMode}
              className="hover:text-primary window-no-drag"
              aria-label="播放模式"
            >
              {playModeIcon}
            </Button>
            <Button
              isIconOnly
              size="sm"
              variant="light"
              disableAnimation
              onPress={handleVolumeClick}
              className={clx("hover:text-primary window-no-drag", { "text-primary": showVolumeSlider })}
              aria-label="音量"
              title={`音量: ${Math.round(displayVolume * 100)}%`}
            >
              {volumeIcon}
            </Button>

            <div className="flex items-center space-x-1">
              <Button
                isDisabled={!title || isSingle}
                isIconOnly
                size="sm"
                variant="light"
                disableAnimation
                onPress={prev}
                className="hover:text-primary window-no-drag"
              >
                <RiSkipBackFill size={18} />
              </Button>
              <Button
                isDisabled={!title}
                isIconOnly
                size="sm"
                variant="light"
                disableAnimation
                onPress={() => {
                  togglePlay();
                }}
                className="hover:text-primary window-no-drag"
              >
                {isPlaying ? <RiPauseCircleFill size={28} /> : <RiPlayCircleFill size={28} />}
              </Button>
              <Button
                isDisabled={!title || isSingle}
                isIconOnly
                size="sm"
                variant="light"
                disableAnimation
                onPress={() => {
                  next();
                }}
                className="hover:text-primary window-no-drag"
              >
                <RiSkipForwardFill size={18} />
              </Button>
            </div>

            <Button
              isIconOnly
              size="sm"
              variant="light"
              disableAnimation
              onPress={toggleMiniMode}
              className="hover:text-primary window-no-drag"
            >
              <RiExpandDiagonalLine size={16} />
            </Button>
          </div>
        </div>
      </div>

      {/* 音量调节条 — 卡片下方 flex 行 */}
      {showVolumeSlider && (
        <div className="window-no-drag bg-background flex shrink-0 items-center space-x-2 border-t border-white/10 px-3 py-2">
          <RiVolumeMuteLine size={14} className="shrink-0 text-white/50" />
          <Slider
            aria-label="音量"
            color="primary"
            radius="full"
            size="sm"
            value={displayVolume}
            minValue={0}
            maxValue={1}
            step={0.01}
            onChange={handleVolumeSliderChange}
            className="flex-1"
            classNames={{
              track: "h-[4px]",
              thumb: "w-3 h-3 after:hidden",
            }}
          />
          <span className="w-8 shrink-0 text-right text-xs text-white/60 tabular-nums">
            {Math.round(displayVolume * 100)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default MiniPlayer;
