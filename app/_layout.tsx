import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { MD3DarkTheme, MD3LightTheme, PaperProvider } from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { GamesProvider } from "@/context/GamesContext";

export default function RootLayout() {
  const dark = useColorScheme() === "dark";
  const theme = dark ? MD3DarkTheme : MD3LightTheme;
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <GamesProvider>
          <StatusBar style={dark ? "light" : "dark"} />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: theme.colors.surface },
              headerTintColor: theme.colors.onSurface,
              contentStyle: { backgroundColor: theme.colors.background },
            }}
          >
            <Stack.Screen name="index" options={{ title: "Oh Hell" }} />
            <Stack.Screen name="new" options={{ title: "New game" }} />
            <Stack.Screen name="game/[id]" options={{ title: "Game" }} />
          </Stack>
        </GamesProvider>
      </PaperProvider>
    </SafeAreaProvider>
  );
}
