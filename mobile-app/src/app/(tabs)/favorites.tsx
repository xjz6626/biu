import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { Image } from "expo-image";
import { router } from "expo-router";

import { Screen } from "@/components/screen";
import { ThemedText } from "@/components/themed-text";
import { useAuthStore } from "@/features/auth/auth-store";
import { useTheme } from "@/hooks/use-theme";
import { FavoriteFolder, getFavoriteFolders } from "@/services/api/favorites";

export default function FavoritesScreen() {
  const theme = useTheme();
  const user = useAuthStore(state => state.user);
  const [folders, setFolders] = useState<FavoriteFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    if (!user?.mid) return;
    setLoading(true);
    setError(undefined);
    try {
      setFolders(await getFavoriteFolders(user.mid));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "加载收藏夹失败");
    } finally {
      setLoading(false);
    }
  }, [user?.mid]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Screen title="我的收藏" subtitle="收藏夹会在登录后自动同步">
      {!user?.isLogin ? (
        <Pressable
          onPress={() => router.push("/login")}
          style={[styles.loginCard, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
        >
          <ThemedText type="section">登录 Bilibili</ThemedText>
          <ThemedText themeColor="textSecondary">同步创建与订阅的收藏夹、稍后再看内容。</ThemedText>
          <ThemedText style={{ color: theme.primary }}>开始登录 →</ThemedText>
        </Pressable>
      ) : null}
      {loading ? <ActivityIndicator size="large" color={theme.primary} /> : null}
      {error ? <ThemedText style={{ color: theme.primary }}>{error}</ThemedText> : null}
      {folders.map(folder => (
        <View
          key={`${folder.collected ? "collected" : "created"}:${folder.id}`}
          style={[styles.folder, { backgroundColor: theme.backgroundElement }]}
        >
          <Image
            source={folder.cover}
            style={[styles.cover, { backgroundColor: theme.backgroundSelected }]}
            contentFit="cover"
          />
          <View style={styles.meta}>
            <ThemedText numberOfLines={1}>{folder.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {folder.mediaCount} 个内容 · {folder.collected ? folder.ownerName || "收藏" : "我创建的"}
            </ThemedText>
          </View>
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loginCard: { padding: 20, gap: 10, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth },
  folder: { minHeight: 76, padding: 10, borderRadius: 16, flexDirection: "row", alignItems: "center", gap: 12 },
  cover: { width: 58, height: 58, borderRadius: 12 },
  meta: { flex: 1 },
});
