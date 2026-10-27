import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { MediaRow } from "@/components/media-row";
import { Screen } from "@/components/screen";
import { ThemedText } from "@/components/themed-text";
import { usePlayerStore } from "@/features/player/player-store";
import { useTheme } from "@/hooks/use-theme";
import { getLatestWeeklyRank, WeeklyRank } from "@/services/api/rank";

export default function RankScreen() {
  const theme = useTheme();
  const setQueue = usePlayerStore(state => state.setQueue);
  const [rank, setRank] = useState<WeeklyRank>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const load = useCallback(async (force = false) => {
    setLoading(true);
    setError(undefined);
    try {
      setRank(await getLatestWeeklyRank(force));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "加载榜单失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const allTracks = rank?.sections.flatMap(section => section.tracks) ?? [];
  return (
    <Screen
      title="榜单记录"
      subtitle={rank?.issue ? `周刊虚拟歌手中文曲排行榜 #${rank.issue}` : "周刊虚拟歌手中文曲排行榜"}
    >
      <View style={styles.actions}>
        <Pressable
          disabled={!allTracks.length}
          onPress={() => setQueue(allTracks)}
          style={[styles.button, { backgroundColor: theme.primary, opacity: allTracks.length ? 1 : 0.5 }]}
        >
          <ThemedText type="smallBold" style={styles.buttonText}>
            全部播放
          </ThemedText>
        </Pressable>
        <Pressable
          disabled={loading}
          onPress={() => void load(true)}
          style={[styles.secondaryButton, { borderColor: theme.border }]}
        >
          <ThemedText type="smallBold">刷新</ThemedText>
        </Pressable>
      </View>
      {loading && !rank ? <ActivityIndicator size="large" color={theme.primary} /> : null}
      {error ? <ThemedText style={{ color: theme.primary }}>{error}</ThemedText> : null}
      {rank?.sections.map(section => (
        <View key={section.id} style={styles.section}>
          <ThemedText type="section">{section.title}</ThemedText>
          {section.tracks.map((track, index) => (
            <MediaRow key={track.id} track={track} index={index + 1} />
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 10 },
  button: { paddingHorizontal: 18, paddingVertical: 11, borderRadius: 18 },
  secondaryButton: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  buttonText: { color: "#fff" },
  section: { gap: 8 },
});
