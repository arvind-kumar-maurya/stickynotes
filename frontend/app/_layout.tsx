import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { LogBox } from "react-native";
import { useFonts } from "expo-font";

import { useIconFonts } from "@/src/hooks/use-icon-fonts";

LogBox.ignoreAllLogs(true);

// Keep the native splash visible from cold start until icon fonts register.
// Required because @expo/vector-icons' componentDidMount fallback fires
// Font.loadAsync against a broken vendor path if any <Icon> mounts before
// the family is registered — which throws on Android Expo Go.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [iconsLoaded, iconsError] = useIconFonts();
  // Handwritten + display fonts from Google Fonts CDN.
  // expo-font accepts remote URLs.
  const [appFontsLoaded, appFontsError] = useFonts({
    Caveat: "https://fonts.gstatic.com/s/caveat/v18/WnznHAc5bAfYB2QRah7pcpNvOx-pjcB9eIWpZw.ttf",
    Kalam: "https://fonts.gstatic.com/s/kalam/v16/YA9dr0Wd4kDdMtD6GgLLmCUItqGt.ttf",
    Fraunces:
      "https://fonts.gstatic.com/s/fraunces/v33/6NUh8FyLNQOQZAnv9bYEvDiIdE9Ea92uemAk.ttf",
  });

  const ready = iconsLoaded && appFontsLoaded;
  const erred = iconsError || appFontsError;

  useEffect(() => {
    if (ready || erred) {
      SplashScreen.hideAsync();
    }
  }, [ready, erred]);

  if (!ready && !erred) return null;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
        contentStyle: { backgroundColor: "#FDFBF7" },
      }}
    />
  );
}
