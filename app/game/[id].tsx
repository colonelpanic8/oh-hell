import { Stack, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Card,
  Chip,
  IconButton,
  Menu,
  SegmentedButtons,
  Text,
} from "react-native-paper";

import { Confirm } from "@/components/Confirm";
import { EditHandDialog } from "@/components/EditHandDialog";
import { HandEntry } from "@/components/HandEntry";
import { homeButton } from "@/components/HomeButton";
import { Scoreboard } from "@/components/Scoreboard";
import { useGames } from "@/context/GamesContext";
import { rulesName, scheduleLabel } from "@/lib/format";
import { Game, isFinished, scoresheet, standings } from "@/lib/game";

/** Below this height the hand and the scoresheet become tabs. */
const STACKED_HEIGHT = 1000;
const CONTENT_WIDTH = 820;

type Tab = "hand" | "scores";

function GameMenu({
  game,
  onChange,
}: {
  game: Game;
  onChange: (update: (game: Game) => Game) => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const last = game.hands.at(-1);
  return (
    <>
      <Menu
        visible={open}
        onDismiss={() => setOpen(false)}
        anchor={
          <IconButton
            icon="dots-vertical"
            onPress={() => setOpen(true)}
            accessibilityLabel="Game menu"
          />
        }
      >
        <Menu.Item
          leadingIcon="undo"
          title="Undo last hand"
          disabled={!last}
          onPress={() => {
            setOpen(false);
            onChange((g) => ({
              ...g,
              hands: g.hands.slice(0, -1),
              draft: last ? { phase: "tricks", ...last } : null,
              endedEarly: false,
            }));
          }}
        />
        {game.endedEarly ? (
          <Menu.Item
            leadingIcon="play"
            title="Keep playing"
            onPress={() => {
              setOpen(false);
              onChange((g) => ({ ...g, endedEarly: false }));
            }}
          />
        ) : (
          <Menu.Item
            leadingIcon="flag-checkered"
            title="End game now"
            disabled={isFinished(game)}
            onPress={() => {
              setOpen(false);
              setConfirmEnd(true);
            }}
          />
        )}
      </Menu>
      <Confirm
        visible={confirmEnd}
        title="End the game?"
        message="The current totals become the final scores. You can keep playing later from this menu."
        confirmLabel="End game"
        onConfirm={() => onChange((g) => ({ ...g, endedEarly: true }))}
        onDismiss={() => setConfirmEnd(false)}
      />
    </>
  );
}

export default function GameScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { games, updateGame } = useGames();
  const { height } = useWindowDimensions();
  const [editing, setEditing] = useState<number | null>(null);
  const [tab, setTab] = useState<Tab>("hand");

  if (!games) return <ActivityIndicator style={styles.center} />;
  const game = games.find((g) => g.id === id);
  if (!game) {
    return (
      <View style={styles.center}>
        <Text variant="titleMedium">Game not found</Text>
      </View>
    );
  }

  const onChange = (update: (game: Game) => Game) =>
    updateGame(game.id, update);
  const sheet = scoresheet(game);
  const finished = isFinished(game, sheet);
  const ranking = standings(sheet.totals);
  const stacked = height >= STACKED_HEIGHT;

  const summary = (
    <View style={styles.standings}>
      {ranking.map((s) => (
        <Chip
          key={s.seat}
          icon={finished && s.rank === 1 ? "trophy" : undefined}
          compact
        >
          {s.rank}. {game.players[s.seat]} {s.total}
        </Chip>
      ))}
    </View>
  );

  const entry = finished ? (
    <Card mode="contained">
      <Card.Title
        title="Final scores"
        subtitle={`${rulesName(game.rules)} · ${scheduleLabel(game.rules, game.players.length)}`}
      />
      <Card.Content style={styles.final}>
        {ranking.map((s) => (
          <Text
            key={s.seat}
            variant={s.rank === 1 ? "titleLarge" : "bodyLarge"}
          >
            {s.rank}. {game.players[s.seat]} — {s.total}
          </Text>
        ))}
      </Card.Content>
    </Card>
  ) : (
    <HandEntry game={game} onChange={onChange} />
  );

  const board = (
    <Scoreboard game={game} sheet={sheet} onEditHand={setEditing} />
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: rulesName(game.rules),
          headerLeft: homeButton(),
          headerRight: () => <GameMenu game={game} onChange={onChange} />,
        }}
      />
      {stacked ? (
        <ScrollView contentContainerStyle={styles.pad}>
          {summary}
          {entry}
          {board}
        </ScrollView>
      ) : (
        <View style={styles.tabs}>
          <SegmentedButtons
            value={tab}
            onValueChange={(v) => setTab(v as Tab)}
            style={styles.tabBar}
            buttons={[
              {
                value: "hand",
                label: finished ? "Result" : `Hand ${game.hands.length + 1}`,
                icon: "cards-playing-outline",
              },
              { value: "scores", label: "Scores", icon: "table" },
            ]}
          />
          <ScrollView contentContainerStyle={styles.pad}>
            {tab === "hand" ? (
              <>
                {summary}
                {entry}
              </>
            ) : (
              board
            )}
          </ScrollView>
        </View>
      )}
      <EditHandDialog
        game={game}
        hand={editing}
        onDismiss={() => setEditing(null)}
        onSave={(hand, result) =>
          onChange((g) => ({
            ...g,
            hands: g.hands.map((h, i) => (i === hand ? result : h)),
          }))
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  pad: {
    padding: 16,
    gap: 16,
    width: "100%",
    maxWidth: CONTENT_WIDTH,
    alignSelf: "center",
  },
  tabs: { flex: 1 },
  tabBar: {
    marginHorizontal: 16,
    marginTop: 12,
    maxWidth: CONTENT_WIDTH - 32,
    width: "100%",
    alignSelf: "center",
  },
  standings: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  final: { gap: 4 },
});
