import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { BiliUser, getCurrentUser, logoutLocally } from "@/services/api/auth";

interface AuthState {
  user?: BiliUser;
  isRefreshing: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      user: undefined,
      isRefreshing: false,
      refresh: async () => {
        set({ isRefreshing: true });
        try {
          const user = await getCurrentUser();
          set({ user: user?.isLogin ? user : undefined });
        } finally {
          set({ isRefreshing: false });
        }
      },
      signOut: async () => {
        await logoutLocally();
        set({ user: undefined });
      },
    }),
    {
      name: "biu-auth",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ user }) => ({ user }),
    },
  ),
);
