import { create } from "zustand";

import type { PlayMode } from "@/common/constants/audio";

interface State {
  isPlaying: boolean;
  isSingle: boolean;
  title?: string;
  cover?: string;
  duration: number;
  playMode?: PlayMode;
  volume: number;
  isMuted: boolean;
}

interface Action {
  update: (state: Partial<State>) => void;
}

export const usePlayState = create<State & Action>(set => ({
  isPlaying: false,
  isSingle: false,
  duration: 0,
  volume: 0.5,
  isMuted: false,
  update: state => set(s => ({ ...s, ...state })),
}));
