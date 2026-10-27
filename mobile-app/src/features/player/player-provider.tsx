import { createContext, PropsWithChildren, use, useEffect, useMemo, useRef } from "react";

import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from "expo-audio";

import { resolveTrackAudio } from "@/services/api/player";

import { selectCurrentTrack, usePlayerStore } from "./player-store";

interface PlayerController {
  toggle: () => void;
  next: () => void;
  previous: () => void;
}

const PlayerContext = createContext<PlayerController | null>(null);

export function PlayerProvider({ children }: PropsWithChildren) {
  const track = usePlayerStore(selectCurrentTrack);
  const requestedPlaying = usePlayerStore(state => state.isPlaying);
  const setPlaying = usePlayerStore(state => state.setPlaying);
  const nextTrack = usePlayerStore(state => state.next);
  const previousTrack = usePlayerStore(state => state.previous);
  const player = useAudioPlayer(null, { updateInterval: 500 });
  const status = useAudioPlayerStatus(player);
  const loadedTrackId = useRef<string | undefined>(undefined);

  useEffect(() => {
    void setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: "doNotMix",
    });
  }, []);

  useEffect(() => {
    if (!track || loadedTrackId.current === track.id) return;
    let cancelled = false;
    void resolveTrackAudio(track).then(audioUrl => {
      if (cancelled) return;
      loadedTrackId.current = track.id;
      player.replace({ uri: audioUrl, headers: { Referer: "https://www.bilibili.com/" } });
      player.setActiveForLockScreen(true, {
        title: track.title,
        artist: track.artist,
        artworkUrl: track.artworkUrl,
      });
      player.play();
    });
    return () => {
      cancelled = true;
    };
  }, [player, track]);

  useEffect(() => {
    if (!track || loadedTrackId.current !== track.id) return;
    if (requestedPlaying && !status.playing) player.play();
    if (!requestedPlaying && status.playing) player.pause();
  }, [player, requestedPlaying, status.playing, track]);

  useEffect(() => {
    if (status.didJustFinish) nextTrack();
  }, [nextTrack, status.didJustFinish]);

  const controller = useMemo<PlayerController>(
    () => ({
      toggle: () => setPlaying(!usePlayerStore.getState().isPlaying),
      next: nextTrack,
      previous: previousTrack,
    }),
    [nextTrack, previousTrack, setPlaying],
  );

  return <PlayerContext.Provider value={controller}>{children}</PlayerContext.Provider>;
}

export function usePlayerController() {
  const value = use(PlayerContext);
  if (!value) throw new Error("usePlayerController must be used inside PlayerProvider");
  return value;
}
