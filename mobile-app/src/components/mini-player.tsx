import { Pressable, StyleSheet, View } from "react-native";

import { Image } from "expo-image";
import { router } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { usePlayerController } from "@/features/player/player-provider";
import { selectCurrentTrack, usePlayerStore } from "@/features/player/player-store";
import { useTheme } from "@/hooks/use-theme";

export function MiniPlayer() {
  const theme = useTheme();
  const track = usePlayerStore(selectCurrentTrack);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const { toggle, next } = usePlayerController();
  if (!track) return null;

  return (
    <Pressable
      onPress={() => router.push("/player")}
      style={[styles.root, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
    >
      <Image source={track.artworkUrl} style={[styles.cover, { backgroundColor: theme.backgroundSelected }]} />
      <View style={styles.meta}>
        <ThemedText numberOfLines={1}>{track.title}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {track.artist}
        </ThemedText>
      </View>
      <Pressable
        accessibilityLabel={isPlaying ? "暂停" : "播放"}
        hitSlop={12}
        onPress={event => {
          event.stopPropagation();
          toggle();
        }}
      >
        <ThemedText style={styles.control}>{isPlaying ? "❚❚" : "▶"}</ThemedText>
      </Pressable>
      <Pressable
        accessibilityLabel="下一首"
        hitSlop={12}
        onPress={event => {
          event.stopPropagation();
          next();
        }}
      >
        <ThemedText style={styles.control}>▶❙</ThemedText>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 66,
    height: 64,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 18,
    padding: 7,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 8,
  },
  cover: { width: 50, height: 50, borderRadius: 12 },
  meta: { flex: 1 },
  control: { fontSize: 20, minWidth: 32, textAlign: "center" },
});
