import { router } from "expo-router";
import { useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  FAB,
  IconButton,
  List,
  Text,
} from "react-native-paper";

import { Confirm } from "@/components/Confirm";
import { useGames } from "@/context/GamesContext";
import { gameStatus, rulesName } from "@/lib/format";
import { Game, isFinished } from "@/lib/game";

function byRecency(a: Game, b: Game) {
  const done = Number(isFinished(a)) - Number(isFinished(b));
  return done || b.updatedAt - a.updatedAt;
}

export default function Home() {
  const { games, deleteGame } = useGames();
  const [deleting, setDeleting] = useState<Game | null>(null);

  if (!games) return <ActivityIndicator style={styles.center} />;

  return (
    <View style={styles.screen}>
      {games.length === 0 ? (
        <View style={styles.center}>
          <Text variant="titleMedium">No games yet</Text>
          <Text variant="bodyMedium">Start one with the button below.</Text>
        </View>
      ) : (
        <FlatList
          data={[...games].sort(byRecency)}
          keyExtractor={(g) => g.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <List.Item
              title={item.players.join(", ")}
              description={`${gameStatus(item)} · ${rulesName(item.rules)} · ${new Date(item.createdAt).toLocaleDateString()}`}
              onPress={() => router.push(`/game/${item.id}`)}
              left={(props) => (
                <List.Icon
                  {...props}
                  icon={isFinished(item) ? "trophy-outline" : "cards-playing"}
                />
              )}
              right={(props) => (
                <IconButton
                  {...props}
                  icon="delete-outline"
                  onPress={() => setDeleting(item)}
                  accessibilityLabel="Delete game"
                />
              )}
            />
          )}
        />
      )}
      <FAB
        icon="plus"
        label="New game"
        style={styles.fab}
        onPress={() => router.push("/new")}
      />
      <Confirm
        visible={deleting !== null}
        title="Delete game?"
        message={
          deleting
            ? `${deleting.players.join(", ")} will be gone for good.`
            : ""
        }
        confirmLabel="Delete"
        onConfirm={() => deleting && deleteGame(deleting.id)}
        onDismiss={() => setDeleting(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  list: {
    paddingBottom: 96,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  fab: { position: "absolute", right: 16, bottom: 16 },
});
