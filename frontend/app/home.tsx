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
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { theme } from "@/src/lib/theme";
import {
  getKitchenName,
  getOrderNumber,
  setOrderNumber as saveOrderNumber,
  getPrinter,
  SavedPrinter,
} from "@/src/lib/storage";
import { tap } from "@/src/lib/haptics";

export default function HomeScreen() {
  const router = useRouter();
  const [kitchen, setKitchen] = useState("");
  const [customer, setCustomer] = useState("");
  const [order, setOrder] = useState<number>(1);
  const [printer, setPrinterState] = useState<SavedPrinter | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [k, n, p] = await Promise.all([getKitchenName(), getOrderNumber(), getPrinter()]);
      if (k) setKitchen(k);
      setOrder(n || 1);
      setPrinterState(p);
    })();
  }, []);

  const onGenerate = async () => {
    const name = customer.trim();
    if (!name) {
      setErr("Please enter the customer's name");
      return;
    }
    setErr(null);
    await saveOrderNumber(order);
    tap();
    router.push({
      pathname: "/preview",
      params: {
        customer_name: name,
        order_number: String(order),
      },
    });
  };

  const inc = () => {
    tap();
    setOrder((n) => Math.min(999999, n + 1));
  };
  const dec = () => {
    tap();
    setOrder((n) => Math.max(1, n - 1));
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 160 }}
          >
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.eyebrow}>{kitchen || "Your Kitchen"}</Text>
                <Text style={styles.headerTitle}>Who is this{"\n"}order for?</Text>
              </View>
              <Pressable
                testID="open-settings"
                onPress={() => {
                  tap();
                  router.push("/settings");
                }}
                hitSlop={10}
                style={styles.iconBtn}
              >
                <Ionicons name="settings-outline" size={22} color={theme.color.onSurface} />
              </Pressable>
            </View>

            <View style={styles.printerChip} testID="printer-chip">
              <Ionicons
                name={printer ? "checkmark-circle" : "alert-circle-outline"}
                size={16}
                color={printer ? theme.color.success : theme.color.warning}
              />
              <Text style={styles.printerChipText} numberOfLines={1}>
                {printer ? `Printer: ${printer.name}` : "No printer connected"}
              </Text>
              <Pressable
                testID="change-printer"
                onPress={() => {
                  tap();
                  router.push("/printer-setup");
                }}
                hitSlop={8}
              >
                <Text style={styles.printerChipAction}>{printer ? "Change" : "Connect"}</Text>
              </Pressable>
            </View>

            <View style={styles.form}>
              <Text style={styles.label}>Customer name</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="person-outline" size={18} color={theme.color.muted} />
                <TextInput
                  testID="home-customer-input"
                  value={customer}
                  onChangeText={setCustomer}
                  placeholder="e.g. Rahul"
                  placeholderTextColor={theme.color.muted}
                  style={styles.input}
                  autoCapitalize="words"
                  returnKeyType="done"
                />
              </View>

              <Text style={[styles.label, { marginTop: theme.spacing.xl }]}>Order number</Text>
              <View style={styles.stepperRow}>
                <Pressable
                  testID="order-decrement"
                  onPress={dec}
                  style={({ pressed }) => [styles.stepperBtn, pressed && { opacity: 0.85 }]}
                  hitSlop={8}
                >
                  <Ionicons name="remove" size={22} color={theme.color.onSurface} />
                </Pressable>
                <View style={styles.stepperValueWrap}>
                  <Text testID="order-number-value" style={styles.stepperValue}>
                    #{order}
                  </Text>
                </View>
                <Pressable
                  testID="order-increment"
                  onPress={inc}
                  style={({ pressed }) => [styles.stepperBtn, pressed && { opacity: 0.85 }]}
                  hitSlop={8}
                >
                  <Ionicons name="add" size={22} color={theme.color.onSurface} />
                </Pressable>
              </View>

              {err ? (
                <Text testID="home-error" style={styles.error}>
                  {err}
                </Text>
              ) : null}
            </View>
          </ScrollView>
        </TouchableWithoutFeedback>

        <View style={styles.footer}>
          <Pressable
            testID="generate-button"
            onPress={onGenerate}
            style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
          >
            <Ionicons name="sparkles-outline" size={18} color={theme.color.onBrandPrimary} />
            <Text style={styles.primaryBtnText}>Generate Sticky Note</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.color.surface },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
  },
  iconBtn: { padding: theme.spacing.sm },
  eyebrow: {
    color: theme.color.brandSecondary,
    fontFamily: theme.font.text,
    fontSize: theme.scale.sm,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: theme.spacing.sm,
  },
  headerTitle: {
    color: theme.color.onSurface,
    fontFamily: theme.font.display,
    fontSize: 34,
    lineHeight: 38,
    fontWeight: "700",
  },
  printerChip: {
    marginHorizontal: theme.spacing.xl,
    marginTop: theme.spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    backgroundColor: theme.color.surfaceSecondary,
    borderRadius: theme.radius.pill,
    borderWidth: 1,
    borderColor: theme.color.border,
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.lg,
  },
  printerChipText: {
    flex: 1,
    color: theme.color.onSurfaceSecondary,
    fontFamily: theme.font.text,
    fontSize: theme.scale.sm,
  },
  printerChipAction: {
    color: theme.color.brandSecondary,
    fontFamily: theme.font.text,
    fontSize: theme.scale.sm,
    fontWeight: "800",
  },
  form: { paddingHorizontal: theme.spacing.xl, paddingTop: theme.spacing.xl },
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
    fontSize: theme.scale.xl,
    color: theme.color.onSurface,
    paddingVertical: 16,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.md,
  },
  stepperBtn: {
    width: 52,
    height: 52,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surfaceSecondary,
    borderWidth: 1,
    borderColor: theme.color.border,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValueWrap: {
    flex: 1,
    height: 52,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    color: theme.color.onSurface,
    fontFamily: theme.font.display,
    fontWeight: "700",
    fontSize: 24,
  },
  error: {
    marginTop: theme.spacing.md,
    color: theme.color.error,
    fontFamily: theme.font.text,
    fontSize: theme.scale.base,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.color.surface,
    borderTopWidth: 1,
    borderTopColor: theme.color.divider,
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
