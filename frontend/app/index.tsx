import { useEffect } from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";
import { useRouter } from "expo-router";

import { theme } from "@/src/lib/theme";
import { getPrinter } from "@/src/lib/storage";
import { isPrinterConnected } from "@/src/lib/printer";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const printer = await getPrinter();
      const connected = await isPrinterConnected(printer);
      if (!printer || !connected) {
        router.replace("/printer-setup");
        return;
      }
      router.replace("/home");
    })();
  }, []);

  return (
    <View style={styles.container} testID="index-bootstrap">
      <ActivityIndicator size="large" color={theme.color.brandPrimary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.color.surface,
    alignItems: "center",
    justifyContent: "center",
  },
});
