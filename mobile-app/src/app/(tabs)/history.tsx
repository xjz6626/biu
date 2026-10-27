import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";

import { MediaRow } from "@/components/media-row";
import { Screen } from "@/components/screen";
import { ThemedText } from "@/components/themed-text";
import { useAuthStore } from "@/features/auth/auth-store";
import { useTheme } from "@/hooks/use-theme";
import { getPlaybackHistory, HistoryTrack } from "@/services/api/history";

export default function HistoryScreen() {
  const theme = useTheme();
  const user = useAuthStore(state => state.user);
  const [tracks, setTracks] = useState<HistoryTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    if (!user?.isLogin) return;
    setLoading(true);
    setError(undefined);
    try {
      setTracks((await getPlaybackHistory()).tracks);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "加载历史记录失败");
    } finally {
      setLoading(false);
    }
  }, [user?.isLogin]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen
      title="历史记录"
      subtitle="继续上次没有听完的内容"
      action={
        user?.isLogin ? (
          <Pressable onPress={() => void load()} style={[styles.refresh, { borderColor: theme.border }]}>
            <ThemedText type="smallBold">刷新</ThemedText>
          </Pressable>
        ) : undefined
      }
    >
      {!user?.isLogin ? (
        <ThemedText themeColor="textSecondary">登录后同步 Bilibili 播放历史；本机播放进度也会保存在这里。</ThemedText>
      ) : null}
      {loading ? <ActivityIndicator size="large" color={theme.primary} /> : null}
      {error ? <ThemedText style={{ color: theme.primary }}>{error}</ThemedText> : null}
      {tracks.map(track => (
        <MediaRow key={`${track.id}:${track.viewedAt}`} track={track} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  refresh: { borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16, paddingVertical: 9, borderRadius: 18 },
});
