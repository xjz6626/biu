import { useCallback, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from "react-native";

import { MediaRow } from "@/components/media-row";
import { Screen } from "@/components/screen";
import { ThemedText } from "@/components/themed-text";
import { Track } from "@/domain/music";
import { useTheme } from "@/hooks/use-theme";
import { searchMusic } from "@/services/api/search";

export default function SearchScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const search = useCallback(async () => {
    const keyword = query.trim();
    if (!keyword || loading) return;
    setLoading(true);
    setError(undefined);
    try {
      const data = await searchMusic(keyword);
      setResults(data.tracks);
    } catch (reason) {
      setResults([]);
      setError(reason instanceof Error ? reason.message : "搜索失败");
    } finally {
      setLoading(false);
    }
  }, [loading, query]);

  return (
    <Screen title="搜索" subtitle="搜索 B 站音乐与 UP 主">
      <View style={styles.searchRow}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => void search()}
          returnKeyType="search"
          placeholder="歌曲、视频或 UP 主"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border },
          ]}
        />
        <Pressable onPress={() => void search()} style={[styles.button, { backgroundColor: theme.primary }]}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <ThemedText type="smallBold" style={styles.buttonText}>
              搜索
            </ThemedText>
          )}
        </Pressable>
      </View>
      {error ? <ThemedText style={{ color: theme.primary }}>{error}</ThemedText> : null}
      {!loading && query && !error && !results.length ? (
        <ThemedText themeColor="textSecondary">输入关键词并搜索音乐分区内容。</ThemedText>
      ) : null}
      {results.map(track => (
        <MediaRow key={track.id} track={track} />
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchRow: { flexDirection: "row", gap: 10 },
  input: {
    flex: 1,
    height: 48,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  button: { width: 68, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#fff" },
});
