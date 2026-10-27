import { ColorValue, StyleSheet, Text } from "react-native";

import { Tabs } from "expo-router";

import { MiniPlayer } from "@/components/mini-player";
import { useTheme } from "@/hooks/use-theme";

const tabIcon = (symbol: string, color: ColorValue) => <Text style={[styles.icon, { color }]}>{symbol}</Text>;

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.primary,
          tabBarStyle: { backgroundColor: theme.backgroundElement, borderTopColor: theme.border },
        }}
      >
        <Tabs.Screen name="index" options={{ title: "推荐", tabBarIcon: ({ color }) => tabIcon("♫", color) }} />
        <Tabs.Screen name="search" options={{ title: "搜索", tabBarIcon: ({ color }) => tabIcon("⌕", color) }} />
        <Tabs.Screen name="favorites" options={{ title: "收藏", tabBarIcon: ({ color }) => tabIcon("♡", color) }} />
        <Tabs.Screen name="rank" options={{ title: "榜单", tabBarIcon: ({ color }) => tabIcon("▥", color) }} />
        <Tabs.Screen name="history" options={{ title: "记录", tabBarIcon: ({ color }) => tabIcon("◷", color) }} />
      </Tabs>
      <MiniPlayer />
    </>
  );
}

const styles = StyleSheet.create({ icon: { fontSize: 22, fontWeight: "700" } });
