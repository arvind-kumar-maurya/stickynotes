import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { theme } from "@/src/lib/theme";
import {
  getGeminiKey,
  setGeminiKey,
  getKitchenName,
  setKitchenName,
  getPrinter,
  setPrinter,
  SavedPrinter,
} from "@/src/lib/storage";
import { disconnectPrinter, isNativePrinterAvailable } from "@/src/lib/printer";
import { tap, success } from "@/src/lib/haptics";

export default function SettingsScreen() {
  const router = useRouter();
  const [kitchen, setKitchen] = useState("");
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [printer, setPrinterState] = useState<SavedPrinter | null>(null);
  const [savedHint, setSavedHint] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [k, n, p] = await Promise.all([getGeminiKey(), getKitchenName(), getPrinter()]);
      if (k) setKey(k);
      if (n) setKitchen(n);
      setPrinterState(p);
    })();
  }, []);

  const onSaveKitchen = async () => {
    const v = kitchen.trim();
    if (!v) return;
    await setKitchenName(v);
    setSavedHint("Kitchen name saved");
    success();
    setTimeout(() => setSavedHint(null), 1500);
  };
  const onSaveKey = async () => {
    const v = key.trim();
    if (v.length < 10) return;
    await setGeminiKey(v);
    setSavedHint("Gemini key saved");
    success();
    setTimeout(() => setSavedHint(null), 1500);
  };

  const onDisconnect = async () => {
    tap();
    await disconnectPrinter();
    await setPrinter(null);
    setPrinterState(null);
  };

  const onChangePrinter = () => {
    tap();
    router.push("/printer-setup");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <Pressable
            testID="settings-back"
            onPress={() => router.back()}
            hitSlop={10}
            style={styles.iconBtn}
          >
            <Ionicons name="chevron-back" size={22} color={theme.color.onSurface} />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={{ width: 38 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.section}>API Configuration</Text>

          <Text style={styles.label}>Kitchen name</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="restaurant-outline" size={18} color={theme.color.muted} />
            <TextInput
              testID="settings-kitchen-input"
              value={kitchen}
              onChangeText={setKitchen}
              style={styles.input}
              autoCapitalize="words"
            />
            <Pressable
              testID="settings-save-kitchen"
              onPress={onSaveKitchen}
              style={styles.smallBtn}
              hitSlop={6}
            >
              <Text style={styles.smallBtnText}>Save</Text>
            </Pressable>
          </View>

          <Text style={[styles.label, { marginTop: theme.spacing.xl }]}>Gemini API key</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="key-outline" size={18} color={theme.color.muted} />
            <TextInput
              testID="settings-gemini-input"
              value={key}
              onChangeText={setKey}
              style={styles.input}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry={!showKey}
            />
            <Pressable
              testID="settings-toggle-key"
              onPress={() => setShowKey((s) => !s)}
              hitSlop={6}
              style={{ marginRight: theme.spacing.sm }}
            >
              <Ionicons
                name={showKey ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={theme.color.muted}
              />
            </Pressable>
            <Pressable
              testID="settings-save-key"
              onPress={onSaveKey}
              style={styles.smallBtn}
              hitSlop={6}
            >
              <Text style={styles.smallBtnText}>Save</Text>
            </Pressable>
          </View>

          {savedHint ? (
            <Text testID="settings-saved-hint" style={styles.savedHint}>
              {savedHint}
            </Text>
          ) : null}

          <Text style={[styles.section, { marginTop: theme.spacing.xxl }]}>Printer</Text>

          <View style={styles.printerRow}>
            <View style={styles.iconCircle}>
              <Ionicons name="print" size={18} color={theme.color.onBrandPrimary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.printerName}>{printer ? printer.name : "No printer connected"}</Text>
              <Text style={styles.printerSub}>
                {isNativePrinterAvailable ? "58mm Bluetooth ESC/POS" : "Demo mode in Expo Go"}
              </Text>
            </View>
            <Pressable
              testID="settings-change-printer"
              onPress={onChangePrinter}
              style={styles.smallBtn}
            >
              <Text style={styles.smallBtnText}>{printer ? "Change" : "Connect"}</Text>
            </Pressable>
          </View>

          {printer ? (
            <Pressable
              testID="settings-disconnect"
              onPress={onDisconnect}
              style={({ pressed }) => [styles.dangerBtn, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="unlink-outline" size={16} color={theme.color.error} />
              <Text style={styles.dangerText}>Disconnect printer</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  iconBtn: { padding: theme.spacing.sm },
  headerTitle: {
    fontFamily: theme.font.display,
    fontSize: theme.scale.xl,
    color: theme.color.onSurface,
    fontWeight: "700",
  },
  scroll: { padding: theme.spacing.xl, paddingBottom: theme.spacing.xxxl },
  section: {
    fontFamily: theme.font.text,
    color: theme.color.brandSecondary,
    fontWeight: "800",
    fontSize: theme.scale.sm,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: theme.spacing.md,
  },
  label: {
    fontFamily: theme.font.text,
    fontSize: theme.scale.sm,
    color: theme.color.onSurfaceSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: theme.spacing.sm,
    fontWeight: "700",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.border,
    paddingHorizontal: theme.spacing.lg,
  },
  input: {
    flex: 1,
    fontFamily: theme.font.text,
    fontSize: theme.scale.lg,
    color: theme.color.onSurface,
    paddingVertical: 12,
  },
  smallBtn: {
    backgroundColor: theme.color.brandPrimary,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: theme.radius.pill,
  },
  smallBtnText: {
    color: theme.color.onBrandPrimary,
    fontFamily: theme.font.text,
    fontWeight: "800",
    fontSize: theme.scale.sm,
  },
  savedHint: {
    marginTop: theme.spacing.md,
    color: theme.color.success,
    fontFamily: theme.font.text,
    fontSize: theme.scale.sm,
  },
  printerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.border,
    padding: theme.spacing.lg,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.color.brandPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  printerName: {
    color: theme.color.onSurface,
    fontFamily: theme.font.text,
    fontWeight: "700",
    fontSize: theme.scale.lg,
  },
  printerSub: {
    color: theme.color.muted,
    fontFamily: theme.font.text,
    fontSize: theme.scale.sm,
    marginTop: 2,
  },
  dangerBtn: {
    marginTop: theme.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.sm,
    paddingVertical: 12,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.color.error,
    backgroundColor: "rgba(198,93,71,0.06)",
  },
  dangerText: {
    color: theme.color.error,
    fontFamily: theme.font.text,
    fontWeight: "800",
    fontSize: theme.scale.base,
  },
});
