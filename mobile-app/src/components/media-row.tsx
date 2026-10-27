import { Pressable, StyleSheet, View } from "react-native";

import { Image } from "expo-image";

import { ThemedText } from "@/components/themed-text";
import { Spacing } from "@/constants/theme";
import { Track } from "@/domain/music";
import { usePlayerStore } from "@/features/player/player-store";
import { useTheme } from "@/hooks/use-theme";

export function MediaRow({ track, index }: { track: Track; index?: number }) {
  const theme = useTheme();
  const playTrack = usePlayerStore(state => state.playTrack);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`播放 ${track.title}`}
      onPress={() => playTrack(track)}
      style={({ pressed }) => [styles.row, { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.75 : 1 }]}
    >
      {index !== undefined ? <ThemedText style={styles.index}>{index}</ThemedText> : null}
      <Image
        source={track.artworkUrl}
        style={[styles.cover, { backgroundColor: theme.backgroundSelected }]}
        contentFit="cover"
      />
      <View style={styles.meta}>
        <ThemedText numberOfLines={1}>{track.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {track.artist}
        </ThemedText>
      </View>
      <ThemedText style={{ color: theme.primary }}>▶</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 70,
    borderRadius: 16,
    padding: Spacing.two,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  index: { width: 24, textAlign: "center" },
  cover: { width: 52, height: 52, borderRadius: 12 },
  meta: { flex: 1, minWidth: 0 },
});
