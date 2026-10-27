import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { SafeAreaView } from "react-native-safe-area-context";

import { router } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useAuthStore } from "@/features/auth/auth-store";
import { useTheme } from "@/hooks/use-theme";
import { createQrLoginCode, pollQrLogin, QrLoginCode } from "@/services/api/auth";

const LOGIN_STATUS: Record<number, string> = {
  86101: "请使用哔哩哔哩客户端扫码",
  86090: "已扫码，请在手机上确认登录",
  86038: "二维码已失效，请刷新",
};

export default function LoginScreen() {
  const theme = useTheme();
  const refreshUser = useAuthStore(state => state.refresh);
  const [code, setCode] = useState<QrLoginCode>();
  const [status, setStatus] = useState("正在生成二维码…");
  const [error, setError] = useState<string>();
  const pollingRef = useRef(false);

  const generate = useCallback(async () => {
    setError(undefined);
    setCode(undefined);
    setStatus("正在生成二维码…");
    try {
      const nextCode = await createQrLoginCode();
      if (!nextCode) throw new Error("二维码接口没有返回数据");
      setCode(nextCode);
      setStatus(LOGIN_STATUS[86101]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "生成二维码失败");
    }
  }, []);

  useEffect(() => {
    void generate();
  }, [generate]);

  useEffect(() => {
    if (!code?.qrcode_key) return;
    let cancelled = false;
    const poll = async () => {
      if (pollingRef.current || cancelled) return;
      pollingRef.current = true;
      try {
        const result = await pollQrLogin(code.qrcode_key);
        if (cancelled || !result) return;
        setStatus(LOGIN_STATUS[result.code] ?? result.message);
        if (result.code === 0) {
          setStatus("登录成功，正在同步账号…");
          await refreshUser();
          if (!cancelled) router.back();
        }
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "查询登录状态失败");
      } finally {
        pollingRef.current = false;
      }
    };
    void poll();
    const timer = setInterval(() => void poll(), 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [code?.qrcode_key, refreshUser]);

  return (
    <ThemedView style={styles.root}>
      <SafeAreaView style={styles.safe}>
        <Pressable onPress={() => router.back()}>
          <ThemedText>关闭</ThemedText>
        </Pressable>
        <View style={styles.content}>
          <ThemedText type="title">登录 Bilibili</ThemedText>
          <ThemedText themeColor="textSecondary">
            使用哔哩哔哩客户端扫码。登录 Cookie 由系统原生 Cookie 存储管理，刷新令牌保存在设备安全存储中。
          </ThemedText>
          <View style={[styles.qr, { backgroundColor: "#fff", borderColor: theme.border }]}>
            {code?.url ? (
              <QRCode value={code.url} size={236} />
            ) : (
              <ActivityIndicator size="large" color={theme.primary} />
            )}
          </View>
          <ThemedText style={styles.status}>{error ?? status}</ThemedText>
          {error || status.includes("失效") ? (
            <Pressable onPress={() => void generate()} style={[styles.retry, { backgroundColor: theme.primary }]}>
              <ThemedText type="smallBold" style={styles.retryText}>
                重新生成
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1, padding: 20 },
  content: { flex: 1, justifyContent: "center", gap: 20 },
  qr: {
    width: 276,
    height: 276,
    alignSelf: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  status: { textAlign: "center" },
  retry: { alignSelf: "center", paddingHorizontal: 22, paddingVertical: 12, borderRadius: 22 },
  retryText: { color: "#fff" },
});
