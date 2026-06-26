import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { theme } from "@/src/lib/theme";
import { setGeminiKey, setKitchenName, getGeminiKey, getKitchenName } from "@/src/lib/storage";
import { tap, success } from "@/src/lib/haptics";

const HERO =
  "https://images.pexels.com/photos/4393657/pexels-photo-4393657.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

export default function SetupScreen() {
  const router = useRouter();
  const [kitchen, setKitchen] = useState("");
  const [key, setKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [k, n] = await Promise.all([getGeminiKey(), getKitchenName()]);
      if (k) setKey(k);
      if (n) setKitchen(n);
    })();
  }, []);

  const onSave = async () => {
    setErr(null);
    const k = kitchen.trim();
    const g = key.trim();
    if (!k) {
      setErr("Please enter your kitchen name");
      return;
    }
    if (g.length < 10) {
      setErr("That Gemini API key looks too short");
      return;
    }
    setSaving(true);
    await Promise.all([setKitchenName(k), setGeminiKey(g)]);
    success();
    setSaving(false);
    router.replace("/printer-setup");
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.hero}>
              <Image source={{ uri: HERO }} style={StyleSheet.absoluteFillObject} contentFit="cover" />
              <LinearGradient
                colors={["rgba(45,42,38,0.15)", "rgba(45,42,38,0.85)"]}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.heroBody}>
                <Text style={styles.heroEyebrow}>KitchenNotes</Text>
                <Text style={styles.heroTitle}>Let&apos;s set up{"\n"}your kitchen</Text>
                <Text style={styles.heroSub}>
                  Hinglish sticky notes that put a smile on every order.
                </Text>
              </View>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Kitchen / Brand name</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="restaurant-outline" size={18} color={theme.color.muted} />
                <TextInput
                  testID="setup-kitchen-input"
                  value={kitchen}
                  onChangeText={setKitchen}
                  placeholder="e.g. Spice Hub Kitchen"
                  placeholderTextColor={theme.color.muted}
                  style={styles.input}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              <Text style={[styles.label, { marginTop: theme.spacing.xl }]}>Gemini API Key</Text>
              <Text style={styles.helper}>
                Stored only on this device. Get a free key from aistudio.google.com.
              </Text>
              <View style={styles.inputWrap}>
                <Ionicons name="key-outline" size={18} color={theme.color.muted} />
                <TextInput
                  testID="setup-gemini-key-input"
                  value={key}
                  onChangeText={setKey}
                  placeholder="AIzaSy..."
                  placeholderTextColor={theme.color.muted}
                  style={styles.input}
                  autoCapitalize="none"
                  autoCorrect={false}
                  secureTextEntry={!showKey}
                />
                <Pressable
                  testID="setup-toggle-key-visibility"
                  hitSlop={10}
                  onPress={() => {
                    tap();
                    setShowKey((s) => !s);
                  }}
                >
                  <Ionicons
                    name={showKey ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color={theme.color.muted}
                  />
                </Pressable>
              </View>

              {err ? (
                <Text testID="setup-error" style={styles.error}>
                  {err}
                </Text>
              ) : null}
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>

        <View style={styles.footer}>
          <Pressable
            testID="setup-save-button"
            onPress={onSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.primaryBtn,
              (pressed || saving) && { opacity: 0.85 },
            ]}
          >
            <Text style={styles.primaryBtnText}>{saving ? "Saving..." : "Save & Continue"}</Text>
            <Ionicons name="arrow-forward" size={18} color={theme.color.onBrandPrimary} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.surface },
  scroll: { paddingBottom: theme.spacing.xxxl + 40 },
  hero: {
    height: 280,
    backgroundColor: theme.color.surfaceInverse,
    overflow: "hidden",
  },
  heroBody: {
    flex: 1,
    justifyContent: "flex-end",
    padding: theme.spacing.xl,
  },
  heroEyebrow: {
    color: theme.color.brandPrimary,
    fontFamily: theme.font.text,
    fontSize: theme.scale.sm,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: theme.spacing.sm,
    fontWeight: "700",
  },
  heroTitle: {
    color: theme.color.onSurfaceInverse,
    fontFamily: theme.font.display,
    fontSize: 34,
    fontWeight: "700",
    lineHeight: 38,
  },
  heroSub: {
    color: "rgba(253,251,247,0.85)",
    fontFamily: theme.font.text,
    fontSize: theme.scale.base,
    marginTop: theme.spacing.md,
  },
  form: { padding: theme.spacing.xl },
  label: {
    fontFamily: theme.font.text,
    fontSize: theme.scale.sm,
    color: theme.color.onSurfaceSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginBottom: theme.spacing.sm,
    fontWeight: "700",
  },
  helper: {
    fontFamily: theme.font.text,
    fontSize: theme.scale.sm,
    color: theme.color.muted,
    marginBottom: theme.spacing.md,
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
    paddingVertical: 14,
  },
  error: {
    marginTop: theme.spacing.md,
    color: theme.color.error,
    fontFamily: theme.font.text,
    fontSize: theme.scale.base,
  },
  footer: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    borderTopWidth: 1,
    borderTopColor: theme.color.divider,
    backgroundColor: theme.color.surface,
  },
  primaryBtn: {
    backgroundColor: theme.color.brandPrimary,
    paddingVertical: 16,
    borderRadius: theme.radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: theme.spacing.md,
  },
  primaryBtnText: {
    color: theme.color.onBrandPrimary,
    fontFamily: theme.font.text,
    fontSize: theme.scale.lg,
    fontWeight: "800",
  },
});
