import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  RiCloseLine,
  RiLockFill,
  RiLockUnlockFill,
  RiPauseFill,
  RiPlayFill,
  RiSkipBackFill,
  RiSkipForwardFill,
} from "@remixicon/react";
import clx from "classnames";

import {
  createBroadcastChannel,
  type MiniPlayerMainStateSnapshot,
  type MiniPlayerMessageFromMini,
} from "@/common/utils/mini-player";
import IconButton from "@/components/icon-button";
import { getLyricsByBili } from "@/components/lyrics/get-lyrics";
import { useSettings } from "@/store/settings";
import { StoreNameMap } from "@shared/store";

type LyricLine = {
  time: number;
  text: string;
};

type DesktopPlayState = Partial<
  Pick<MiniPlayerMainStateSnapshot, "aid" | "bvid" | "cid" | "cover" | "duration" | "isPlaying" | "playId" | "title">
>;
type DesktopPlayerCommand = NonNullable<MiniPlayerMessageFromMini["data"]>["type"];

const DEFAULT_OFFSET = 0;
const FALLBACK_TEXT = "听你想听的";
const COLOR_PRESETS = ["#60a5fa", "#ffffff", "#22c55e", "#f97316", "#f43f5e", "#a78bfa"];

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const isSamePlayState = (prev: DesktopPlayState, next: DesktopPlayState) => {
  return (
    prev.playId === next.playId &&
    prev.bvid === next.bvid &&
    prev.cid === next.cid &&
    prev.aid === next.aid &&
    prev.title === next.title &&
    prev.cover === next.cover &&
    prev.duration === next.duration &&
    prev.isPlaying === next.isPlaying
  );
};

export default function DesktopLyrics() {
  const [currentTime, setCurrentTime] = useState(0);
  const [playState, setPlayState] = useState<DesktopPlayState>({});
  const [isLocked, setIsLocked] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [lyrics, setLyrics] = useState<LyricLine[]>([]);
  const [offset, setOffset] = useState(DEFAULT_OFFSET);
  const [isLoading, setIsLoading] = useState(false);

  const bcRef = useRef<BroadcastChannel | null>(null);
  const hoverTimerRef = useRef<number | undefined>(undefined);
  const lockedBadgeRef = useRef<HTMLButtonElement | null>(null);

  const fontSize = useSettings(s => s.desktopLyricsFontSize) || 36;
  const fontColor = useSettings(s => s.desktopLyricsColor) || "#60a5fa";
  const fontFamily = useSettings(s => s.desktopLyricsFontFamily) || "system-ui";
  const updateSettings = useSettings(s => s.update);

  // 强制透明背景，阻止全局 Theme 或 HeroUI 设置的不透明背板遮挡桌面。
  useEffect(() => {
    document.documentElement.style.setProperty("background", "transparent", "important");
    document.body.style.setProperty("background", "transparent", "important");
    const rootEl = document.getElementById("root");
    if (rootEl) {
      rootEl.style.setProperty("background", "transparent", "important");
    }

    return () => {
      document.documentElement.style.removeProperty("background");
      document.body.style.removeProperty("background");
      rootEl?.style.removeProperty("background");
    };
  }, []);

  const showControls = isHovered && !isLocked;

  const handleMouseEnter = useCallback(() => {
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    setIsHovered(true);
    if (isLocked) {
      void window.electron.setDesktopLyricsIgnoreMouseEvents(false);
    }
  }, [isLocked]);

  const handleMouseLeave = useCallback(() => {
    if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = window.setTimeout(() => {
      setIsHovered(false);
      if (isLocked) {
        void window.electron.setDesktopLyricsIgnoreMouseEvents(true, { forward: true });
      }
    }, 360);
  }, [isLocked]);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!isLocked) return;

      const badgeRect = lockedBadgeRef.current?.getBoundingClientRect();
      const isOverUnlockBadge = badgeRect
        ? event.clientX >= badgeRect.left - 8 &&
          event.clientX <= badgeRect.right + 8 &&
          event.clientY >= badgeRect.top - 8 &&
          event.clientY <= badgeRect.bottom + 8
        : event.clientX >= window.innerWidth - 120 && event.clientY <= 48;

      void window.electron.setDesktopLyricsIgnoreMouseEvents(!isOverUnlockBadge, { forward: true });
    },
    [isLocked],
  );

  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) window.clearTimeout(hoverTimerRef.current);
    };
  }, []);

  const parseLrc = useCallback((raw?: string | null) => {
    if (!raw) return [] as LyricLine[];
    const result: LyricLine[] = [];
    const lines = raw.split(/\r?\n/);
    const timeTagPattern = /\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\]/g;

    lines.forEach(line => {
      const text = line.replace(timeTagPattern, "").trim();
      if (!text) return;

      let match: RegExpExecArray | null;
      while ((match = timeTagPattern.exec(line)) !== null) {
        const minutes = Number(match[1]);
        const seconds = Number(match[2]);
        const millis = match[3] ? Number(match[3].padEnd(3, "0")) : 0;

        if (Number.isNaN(minutes) || Number.isNaN(seconds) || Number.isNaN(millis)) continue;

        result.push({
          time: Math.max(0, minutes * 60 * 1000 + seconds * 1000 + millis),
          text,
        });
      }

      timeTagPattern.lastIndex = 0;
    });

    return result.toSorted((a, b) => a.time - b.time);
  }, []);

  const postPlayerCommand = useCallback((type: DesktopPlayerCommand) => {
    const channel = bcRef.current;
    if (!channel) return;

    channel.postMessage({
      from: "mini",
      data: { type },
      ts: Date.now(),
    } satisfies MiniPlayerMessageFromMini);
  }, []);

  const controlPlayer = useCallback(
    async (command: "prev" | "next" | "toggle") => {
      const isSent = await window.electron.controlPlayer(command);
      if (!isSent) {
        postPlayerCommand(command === "toggle" ? "togglePlay" : command);
      }
    },
    [postPlayerCommand],
  );

  useEffect(() => {
    const channel = createBroadcastChannel();
    bcRef.current = channel;
    channel.postMessage({ from: "mini", data: { type: "init" }, ts: Date.now() } satisfies MiniPlayerMessageFromMini);

    channel.onmessage = ev => {
      const { from, state } = ev.data || {};
      if (from !== "main" || !state) return;

      const nextState = state as MiniPlayerMainStateSnapshot;
      if (typeof nextState.currentTime === "number") {
        setCurrentTime(nextState.currentTime);
      }

      setPlayState(prev => {
        const next: DesktopPlayState = {
          aid: nextState.aid,
          bvid: nextState.bvid,
          cid: nextState.cid,
          cover: nextState.cover,
          duration: nextState.duration,
          isPlaying: nextState.isPlaying,
          playId: nextState.playId,
          title: nextState.title,
        };

        return isSamePlayState(prev, next) ? prev : next;
      });
    };

    return () => {
      channel.close();
      bcRef.current = null;
    };
  }, []);

  useEffect(() => {
    return window.electron.onDesktopLyricsLockChange(nextLocked => {
      setIsLocked(nextLocked);
      if (nextLocked) {
        setIsHovered(false);
      }
    });
  }, []);

  useEffect(() => {
    let canceled = false;
    setOffset(DEFAULT_OFFSET);

    const fetchLyrics = async () => {
      if (!playState.cid) {
        setLyrics([]);
        setIsLoading(false);
        return;
      }

      const cidAsNumber = Number(playState.cid);
      if (Number.isNaN(cidAsNumber)) {
        setLyrics([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const store = await window.electron.getStore(StoreNameMap.LyricsCache);
        const key = playState.bvid ? `${playState.bvid}-${playState.cid}` : "";
        const cached = key && store && typeof store === "object" ? store[key] : null;

        if (cached) {
          setOffset(typeof cached.offset === "number" ? cached.offset : DEFAULT_OFFSET);
          if (cached.lyrics) {
            if (canceled) return;
            setLyrics(parseLrc(cached.lyrics));
            setIsLoading(false);
            return;
          }
        }

        const params: { aid?: number; bvid?: string; cid: number } = { cid: cidAsNumber };
        if (playState.bvid) params.bvid = playState.bvid;
        if (playState.aid) params.aid = Number(playState.aid);

        const body = await getLyricsByBili(params);
        if (canceled) return;
        setLyrics(body?.length ? body : []);
      } catch {
        if (canceled) return;
        setLyrics([]);
      } finally {
        if (!canceled) setIsLoading(false);
      }
    };

    void fetchLyrics();

    return () => {
      canceled = true;
    };
  }, [playState.aid, playState.bvid, playState.cid, parseLrc]);

  const currentMs = currentTime * 1000 + offset;
  const activeIndex = useMemo(() => {
    if (!lyrics.length) return -1;
    for (let i = lyrics.length - 1; i >= 0; i -= 1) {
      if (currentMs >= lyrics[i].time) return i;
    }
    return 0;
  }, [currentMs, lyrics]);

  const activeLine = activeIndex >= 0 ? lyrics[activeIndex] : null;
  const previousLine = activeIndex > 0 ? lyrics[activeIndex - 1] : null;
  const nextLine = activeIndex >= 0 ? lyrics[activeIndex + 1] : null;
  const followingLine = activeIndex >= 0 ? lyrics[activeIndex + 2] : null;
  const secondaryLine = nextLine || previousLine || followingLine;
  const hasTrack = Boolean(playState.playId || playState.title);
  const hasLyrics = lyrics.length > 0;
  const activeText = activeLine?.text || (isLoading ? "正在匹配歌词" : hasTrack ? "暂无歌词" : FALLBACK_TEXT);
  const secondaryText =
    secondaryLine?.text || (hasTrack ? "可在歌词面板调整偏移和歌词源" : "打开音乐，让歌词停在桌面上");
  const nextTime =
    nextLine?.time ??
    (playState.duration ? playState.duration * 1000 : activeLine?.time ? activeLine.time + 6000 : 6000);
  const lineDuration = Math.max(1200, nextTime - (activeLine?.time ?? 0));
  const lineProgress = activeLine ? clamp(((currentMs - activeLine.time) / lineDuration) * 100, 0, 100) : 0;
  const totalProgress = playState.duration ? clamp((currentTime / playState.duration) * 100, 0, 100) : 0;
  const displayTitle = playState.title || "Biu Desktop Lyrics";

  const lyricStyle = useMemo<React.CSSProperties>(
    () => ({
      WebkitTextStroke: "1px rgba(0,0,0,0.72)",
      fontFamily,
      fontSize: `${clamp(fontSize, 20, 64)}px`,
      paintOrder: "stroke fill",
      textShadow: "0 3px 8px rgba(0,0,0,0.95), 0 0 18px rgba(0,0,0,0.5)",
    }),
    [fontFamily, fontSize],
  );

  const secondaryStyle = useMemo<React.CSSProperties>(
    () => ({
      WebkitTextStroke: "0.7px rgba(0,0,0,0.65)",
      fontFamily,
      fontSize: `${clamp(fontSize * 0.56, 15, 28)}px`,
      paintOrder: "stroke fill",
      textShadow: "0 2px 6px rgba(0,0,0,0.85)",
    }),
    [fontFamily, fontSize],
  );

  const lockToggle = () => {
    const nextLocked = !isLocked;
    void window.electron.setDesktopLyricsLock(nextLocked);

    if (nextLocked) {
      setIsHovered(false);
      void window.electron.setDesktopLyricsIgnoreMouseEvents(true, { forward: true });
    } else {
      void window.electron.setDesktopLyricsIgnoreMouseEvents(false);
    }
  };

  const closeWindow = () => {
    void window.electron.toggleDesktopLyrics();
  };

  const handleColorChange = (nextColor: string) => {
    updateSettings({ desktopLyricsColor: nextColor });
  };

  return (
    <div
      className={clx(
        "relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden px-5 py-3 transition-colors duration-300 select-none",
        {
          "window-drag": !isLocked,
          "window-no-drag": isLocked,
          "bg-black/24": showControls,
        },
      )}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onMouseMove={handleMouseMove}
    >
      <button
        ref={lockedBadgeRef}
        type="button"
        className={clx(
          "window-no-drag pointer-events-auto absolute top-2 right-3 rounded-full border border-white/12 bg-black/55 px-2.5 py-1 text-[11px] text-white/80 shadow-md backdrop-blur-md transition-all duration-200 hover:border-white/25 hover:bg-black/70 hover:text-white",
          {
            "opacity-100": isLocked,
            "pointer-events-none opacity-0": !isLocked,
          },
        )}
        onMouseEnter={() => {
          if (isLocked) {
            void window.electron.setDesktopLyricsIgnoreMouseEvents(false);
          }
        }}
        onMouseLeave={() => {
          if (isLocked) {
            void window.electron.setDesktopLyricsIgnoreMouseEvents(true, { forward: true });
          }
        }}
        onClick={() => {
          void window.electron.setDesktopLyricsLock(false);
          void window.electron.setDesktopLyricsIgnoreMouseEvents(false);
        }}
      >
        已锁定 · 点击解锁
      </button>

      <div className="flex w-full flex-col items-center gap-1 text-center">
        <div
          className={clx(
            "window-no-drag pointer-events-auto mb-1 flex max-w-[calc(100vw-24px)] items-center gap-1.5 rounded-full border border-white/15 bg-black/58 px-2.5 py-1.5 text-white shadow-lg backdrop-blur-md transition-all duration-200",
            {
              "translate-y-0 opacity-100": showControls,
              "pointer-events-none -translate-y-1 opacity-0": !showControls,
            },
          )}
        >
          {playState.cover && (
            <img src={playState.cover} alt="" className="h-7 w-7 rounded-md object-cover shadow-sm" draggable={false} />
          )}
          <div className="mx-1 flex max-w-56 min-w-0 items-center gap-1.5 text-xs text-white/80" title={displayTitle}>
            <span
              className={clx("h-1.5 w-1.5 shrink-0 rounded-full", {
                "bg-emerald-300 shadow-[0_0_10px_rgba(110,231,183,0.85)]": playState.isPlaying,
                "bg-white/35": !playState.isPlaying,
              })}
            />
            <span className="truncate">{displayTitle}</span>
          </div>
          <div className="mx-1 h-5 w-px bg-white/20" />
          <IconButton
            tooltip="上一首"
            onPress={() => controlPlayer("prev")}
            className="h-[34px] w-[34px] min-w-[34px] text-white"
          >
            <RiSkipBackFill size={17} />
          </IconButton>
          <IconButton
            tooltip={playState.isPlaying ? "暂停" : "播放"}
            onPress={() => controlPlayer("toggle")}
            className="h-[34px] w-[34px] min-w-[34px] text-white"
          >
            {playState.isPlaying ? <RiPauseFill size={17} /> : <RiPlayFill size={17} />}
          </IconButton>
          <IconButton
            tooltip="下一首"
            onPress={() => controlPlayer("next")}
            className="h-[34px] w-[34px] min-w-[34px] text-white"
          >
            <RiSkipForwardFill size={17} />
          </IconButton>
          <div className="mx-1 h-5 w-px bg-white/20" />
          <div className="flex items-center gap-0.5 px-1">
            {COLOR_PRESETS.map(color => {
              const isSelected = color.toLowerCase() === fontColor.toLowerCase();

              return (
                <button
                  key={color}
                  type="button"
                  aria-label={`切换歌词颜色 ${color}`}
                  title={color}
                  className="flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  onClick={() => handleColorChange(color)}
                >
                  <span
                    className={clx("block h-[18px] w-[18px] rounded-full border", {
                      "border-white shadow-[0_0_0_2px_rgba(255,255,255,0.25)]": isSelected,
                      "border-white/30": !isSelected,
                    })}
                    style={{ backgroundColor: color }}
                  />
                </button>
              );
            })}
          </div>
          <div className="mx-1 h-5 w-px bg-white/20" />
          <IconButton
            tooltip={isLocked ? "解锁桌面歌词" : "锁定并鼠标穿透"}
            onPress={lockToggle}
            className="h-[34px] w-[34px] min-w-[34px] text-white"
          >
            {isLocked ? <RiLockFill size={17} /> : <RiLockUnlockFill size={17} />}
          </IconButton>
          <IconButton
            tooltip="关闭桌面歌词"
            onPress={closeWindow}
            className="h-[34px] w-[34px] min-w-[34px] text-white"
          >
            <RiCloseLine size={19} />
          </IconButton>
        </div>

        <div
          className={clx(
            "max-w-[min(92vw,960px)] text-balance text-white/62 transition-all duration-300",
            isLoading ? "animate-pulse" : "opacity-80",
          )}
          style={secondaryStyle}
        >
          {secondaryText}
        </div>

        <div
          className={clx("relative max-w-[min(96vw,1080px)] overflow-hidden px-3 py-1", {
            "opacity-80 grayscale": hasTrack && !hasLyrics && !isLoading,
          })}
        >
          <span
            className="block max-w-full leading-tight font-bold text-balance break-words whitespace-normal text-white/30"
            style={lyricStyle}
            title={activeText}
          >
            {activeText}
          </span>
          <span
            aria-hidden
            className="absolute inset-x-3 top-1 block max-w-[calc(100%-24px)] leading-tight font-bold text-balance break-words whitespace-normal transition-[clip-path] duration-150 ease-linear"
            style={{
              ...lyricStyle,
              clipPath: `inset(0 ${100 - lineProgress}% 0 0)`,
              color: fontColor,
            }}
          >
            {activeText}
          </span>
          <span
            aria-hidden
            className="absolute inset-x-3 top-1 block max-w-[calc(100%-24px)] leading-tight font-bold text-balance break-words whitespace-normal opacity-80 blur-[7px] transition-[clip-path] duration-150 ease-linear"
            style={{
              ...lyricStyle,
              clipPath: `inset(0 ${100 - lineProgress}% 0 0)`,
              color: fontColor,
            }}
          >
            {activeText}
          </span>
        </div>

        <div
          className={clx("mt-1 h-1 w-[min(72vw,520px)] overflow-hidden rounded-full bg-white/14 transition-opacity", {
            "opacity-100": showControls,
            "opacity-0": !showControls,
          })}
        >
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${totalProgress}%`, backgroundColor: fontColor }}
          />
        </div>
      </div>
    </div>
  );
}
