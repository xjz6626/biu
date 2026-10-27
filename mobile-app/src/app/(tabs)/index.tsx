import { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";

import { router } from "expo-router";

import { MediaRow } from "@/components/media-row";
import { Screen } from "@/components/screen";
import { ThemedText } from "@/components/themed-text";
import { demoTracks } from "@/data/demo-tracks";
import { useAuthStore } from "@/features/auth/auth-store";
import { useTheme } from "@/hooks/use-theme";

export default function RecommendScreen() {
  const theme = useTheme();
  const user = useAuthStore(state => state.user);
  const refreshUser = useAuthStore(state => state.refresh);
  useEffect(() => {
    void refreshUser().catch(() => undefined);
  }, [refreshUser]);
  return (
    <Screen
      title={user?.uname ? `晚上好，${user.uname}` : "晚上好"}
      subtitle="发现今天值得听的音乐"
      action={
        !user?.isLogin ? (
          <Pressable onPress={() => router.push("/login")} style={[styles.login, { backgroundColor: theme.primary }]}>
            <ThemedText type="smallBold" style={styles.loginText}>
              登录
            </ThemedText>
          </Pressable>
        ) : undefined
      }
    >
      <ThemedText type="section">为你推荐</ThemedText>
      {demoTracks.map(track => (
        <MediaRow key={track.id} track={track} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  login: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 18 },
  loginText: { color: "#fff" },
});
