import { PropsWithChildren, ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { Spacing } from "@/constants/theme";

interface ScreenProps extends PropsWithChildren {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  scroll?: boolean;
}

export function Screen({ title, subtitle, action, scroll = true, children }: ScreenProps) {
  const content = (
    <>
      <View style={styles.header}>
        <View style={styles.heading}>
          <ThemedText type="title">{title}</ThemedText>
          {subtitle ? <ThemedText themeColor="textSecondary">{subtitle}</ThemedText> : null}
        </View>
        {action}
      </View>
      {children}
      <View style={styles.playerSpace} />
    </>
  );

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        {scroll ? (
          <ScrollView contentContainerStyle={styles.content}>{content}</ScrollView>
        ) : (
          <View style={styles.content}>{content}</View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safeArea: { flex: 1 },
  content: { paddingHorizontal: Spacing.three, paddingTop: Spacing.three, gap: Spacing.three },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: Spacing.three },
  heading: { flex: 1, gap: Spacing.one },
  playerSpace: { height: 82 },
});
