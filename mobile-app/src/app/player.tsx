import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Image } from "expo-image";
import { router } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { usePlayerController } from "@/features/player/player-provider";
import { selectCurrentTrack, usePlayerStore } from "@/features/player/player-store";
import { useTheme } from "@/hooks/use-theme";

export default function PlayerScreen() {
  const theme = useTheme();
  const track = usePlayerStore(selectCurrentTrack);
  const isPlaying = usePlayerStore(state => state.isPlaying);
  const { previous, toggle, next } = usePlayerController();
  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <Pressable onPress={() => router.back()}>
          <ThemedText style={styles.close}>⌄</ThemedText>
        </Pressable>
        <Image
          source={track?.artworkUrl}
          style={[styles.cover, { backgroundColor: theme.backgroundElement }]}
          contentFit="cover"
        />
        <View style={styles.meta}>
          <ThemedText type="subtitle" numberOfLines={2}>
            {track?.title ?? "还没有播放音乐"}
          </ThemedText>
          <ThemedText themeColor="textSecondary">{track?.artist ?? "从推荐或榜单选择一首歌曲"}</ThemedText>
        </View>
        <View style={styles.controls}>
          <Pressable onPress={previous}>
            <ThemedText style={styles.sideControl}>❙◀</ThemedText>
          </Pressable>
          <Pressable onPress={toggle} style={[styles.play, { backgroundColor: theme.primary }]}>
            <ThemedText style={styles.playText}>{isPlaying ? "❚❚" : "▶"}</ThemedText>
          </Pressable>
          <Pressable onPress={next}>
            <ThemedText style={styles.sideControl}>▶❙</ThemedText>
          </Pressable>
        </View>
        <ThemedText type="section">歌词</ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.lyrics}>
          歌词将在获得歌曲信息后自动匹配并滚动显示。
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, padding: 20, gap: 20 },
  close: { fontSize: 34 },
  cover: { width: "100%", aspectRatio: 1, borderRadius: 28 },
  meta: { gap: 6 },
  controls: { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  sideControl: { fontSize: 28 },
  play: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  playText: { color: "#fff", fontSize: 28 },
  lyrics: { textAlign: "center", paddingTop: 12 },
});
