import { router } from "expo-router";
import { IconButton } from "react-native-paper";

/** For screens opened directly (a reload or shared link on web), which have no back history. */
export function homeButton() {
  if (router.canGoBack()) return undefined;
  return function HomeButton() {
    return (
      <IconButton
        icon="home-outline"
        onPress={() => router.replace("/")}
        accessibilityLabel="All games"
      />
    );
  };
}
