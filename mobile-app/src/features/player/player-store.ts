import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { Track } from "@/domain/music";

interface PlayerState {
  queue: Track[];
  currentIndex: number;
  isPlaying: boolean;
  setQueue: (tracks: Track[], startIndex?: number) => void;
  setPlaying: (playing: boolean) => void;
  playTrack: (track: Track) => void;
  next: () => void;
  previous: () => void;
}

export const usePlayerStore = create<PlayerState>()(
  persist(
    set => ({
      queue: [],
      currentIndex: -1,
      isPlaying: false,
      setQueue: (queue, currentIndex = queue.length ? 0 : -1) =>
        set({ queue, currentIndex, isPlaying: queue.length > 0 }),
      setPlaying: isPlaying => set({ isPlaying }),
      playTrack: track =>
        set(state => {
          const existingIndex = state.queue.findIndex(item => item.id === track.id);
          if (existingIndex >= 0) return { currentIndex: existingIndex, isPlaying: true };
          return { queue: [...state.queue, track], currentIndex: state.queue.length, isPlaying: true };
        }),
      next: () =>
        set(state => ({
          currentIndex: state.queue.length ? (state.currentIndex + 1) % state.queue.length : -1,
          isPlaying: state.queue.length > 0,
        })),
      previous: () =>
        set(state => ({
          currentIndex: state.queue.length ? (state.currentIndex - 1 + state.queue.length) % state.queue.length : -1,
          isPlaying: state.queue.length > 0,
        })),
    }),
    {
      name: "biu-player",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ queue, currentIndex }) => ({ queue, currentIndex }),
    },
  ),
);

export const selectCurrentTrack = (state: PlayerState) => state.queue[state.currentIndex];
