import { router, Stack } from "expo-router";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Button, HelperText, Text } from "react-native-paper";

import { homeButton } from "@/components/HomeButton";
import { PlayersEditor } from "@/components/PlayersEditor";
import { RulesEditor } from "@/components/RulesEditor";
import { useGames } from "@/context/GamesContext";
import { MAX_PLAYERS, MIN_PLAYERS } from "@/lib/rules";

function problem(names: string[]): string | null {
  if (names.length < MIN_PLAYERS) return `Add at least ${MIN_PLAYERS} players.`;
  if (names.length > MAX_PLAYERS) return `At most ${MAX_PLAYERS} players.`;
  if (names.some((n) => n === "")) return "Every player needs a name.";
  const lower = names.map((n) => n.toLowerCase());
  if (new Set(lower).size !== lower.length) return "Names must be different.";
  return null;
}

export default function NewGame() {
  const { games, lastSetup, createGame } = useGames();
  const [players, setPlayers] = useState(() =>
    lastSetup.players.length > 0 ? lastSetup.players : ["", "", ""],
  );
  const [firstDealer, setFirstDealer] = useState(0);
  const [rules, setRules] = useState(lastSetup.rules);

  const suggestions = useMemo(() => {
    const names = new Map<string, string>();
    for (const g of [...(games ?? [])].sort(
      (a, b) => b.updatedAt - a.updatedAt,
    )) {
      for (const p of g.players) {
        if (!names.has(p.toLowerCase())) names.set(p.toLowerCase(), p);
      }
    }
    return [...names.values()];
  }, [games]);

  const names = players.map((p) => p.trim());
  const error = problem(names);

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <Stack.Screen options={{ headerLeft: homeButton() }} />
      <Text variant="titleLarge">Players</Text>
      <PlayersEditor
        players={players}
        onChange={setPlayers}
        firstDealer={firstDealer}
        onFirstDealerChange={setFirstDealer}
        suggestions={suggestions}
      />
      <Text variant="titleLarge" style={styles.heading}>
        Rules
      </Text>
      <RulesEditor rules={rules} players={names.length} onChange={setRules} />
      <HelperText type="error" visible={error !== null}>
        {error}
      </HelperText>
      <Button
        mode="contained"
        icon="play"
        disabled={error !== null}
        onPress={() => {
          const id = createGame(names, rules, firstDealer);
          router.replace(`/game/${id}`);
        }}
      >
        Start game
      </Button>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: 16,
    gap: 8,
    maxWidth: 720,
    width: "100%",
    alignSelf: "center",
  },
  heading: { marginTop: 16 },
});
