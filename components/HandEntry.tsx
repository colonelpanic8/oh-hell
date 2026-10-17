import { StyleSheet, View } from "react-native";
import { Button, Card, HelperText, Text } from "react-native-paper";

import { NumberChips } from "@/components/NumberChips";
import { signed, trumpLabel } from "@/lib/format";
import {
  bidBalance,
  biddingOrder,
  bidProblem,
  cards,
  dealer,
  Draft,
  emptyDraft,
  Game,
  legalBidsFor,
  totalHands,
  tricksProblem,
  trump,
} from "@/lib/game";

interface Props {
  game: Game;
  onChange: (update: (game: Game) => Game) => void;
}

function unavailable(max: number, allowed: readonly number[]): number[] {
  return Array.from({ length: max + 1 }, (_, n) => n).filter(
    (n) => !allowed.includes(n),
  );
}

function balanceLabel(balance: number): string {
  if (balance === 0) return "even";
  return balance > 0 ? `over by ${balance}` : `under by ${-balance}`;
}

export function HandEntry({ game, onChange }: Props) {
  const hand = game.hands.length;
  const dealt = cards(game, hand) ?? 0;
  const draft = game.draft ?? emptyDraft(game.players.length);
  const order = biddingOrder(game, hand);
  const total = totalHands(game);

  const setDraft = (next: Draft) => onChange((g) => ({ ...g, draft: next }));
  const setBid = (seat: number, value: number) =>
    setDraft({
      ...draft,
      bids: draft.bids.map((v, i) => (i === seat ? value : v)),
    });
  // Once every trick is accounted for, anyone not yet entered took none.
  const setTaken = (seat: number, value: number) => {
    const taken = draft.taken.map((v, i) => (i === seat ? value : v));
    const counted = taken.reduce<number>((a, t) => a + (t ?? 0), 0);
    setDraft({
      ...draft,
      taken: counted === dealt ? taken.map((t) => t ?? 0) : taken,
    });
  };

  const header = (
    <View style={styles.header}>
      <Text variant="titleLarge">
        Hand {hand + 1}
        {total !== null ? ` of ${total}` : ""} · {dealt}{" "}
        {dealt === 1 ? "card" : "cards"}
      </Text>
      <Text variant="bodyMedium">
        {game.players[dealer(game, hand)]} deals · Trump:{" "}
        {trumpLabel(trump(game, hand))}
      </Text>
    </View>
  );

  if (draft.phase === "bids") {
    const problem = bidProblem(game, hand, draft.bids);
    const complete = draft.bids.every((b) => b !== null);
    const sum = draft.bids.reduce<number>((a, b) => a + (b ?? 0), 0);
    return (
      <Card mode="contained" style={styles.card}>
        <Card.Content style={styles.content}>
          {header}
          <Text variant="bodyMedium">
            Bids: {sum} of {dealt} ·{" "}
            {balanceLabel(bidBalance(game, hand, draft.bids))}
          </Text>
          {order.map((seat) => (
            <View key={seat} style={styles.player}>
              <Text variant="titleMedium">
                {game.players[seat]}
                {seat === dealer(game, hand) ? " (dealer)" : ""}
              </Text>
              <NumberChips
                max={dealt}
                value={draft.bids[seat] ?? null}
                disabled={unavailable(
                  dealt,
                  legalBidsFor(game, hand, draft.bids, seat),
                )}
                onChange={(n) => setBid(seat, n)}
              />
            </View>
          ))}
          <HelperText type="error" visible={complete && problem !== null}>
            {problem}
          </HelperText>
          <View style={styles.actions}>
            <Button
              disabled={draft.bids.every((b) => b === null)}
              onPress={() => setDraft(emptyDraft(game.players.length))}
            >
              Clear
            </Button>
            <Button
              mode="contained"
              icon="arrow-right"
              disabled={problem !== null}
              onPress={() => setDraft({ ...draft, phase: "tricks" })}
            >
              Bids are in
            </Button>
          </View>
        </Card.Content>
      </Card>
    );
  }

  const problem = tricksProblem(game, hand, draft.taken);
  const counted = draft.taken.reduce<number>((a, t) => a + (t ?? 0), 0);
  return (
    <Card mode="contained" style={styles.card}>
      <Card.Content style={styles.content}>
        {header}
        <Text variant="bodyMedium">
          Tricks: {counted} of {dealt} counted
        </Text>
        {order.map((seat) => {
          const others = counted - (draft.taken[seat] ?? 0);
          const bid = draft.bids[seat] ?? 0;
          const took = draft.taken[seat];
          return (
            <View key={seat} style={styles.player}>
              <Text variant="titleMedium">
                {game.players[seat]} · bid {bid}
                {took !== null && took !== undefined
                  ? took === bid
                    ? " · made it"
                    : ` · ${signed(took - bid)}`
                  : ""}
              </Text>
              <NumberChips
                max={dealt}
                value={took ?? null}
                disabled={unavailable(
                  dealt,
                  Array.from({ length: dealt - others + 1 }, (_, n) => n),
                )}
                onChange={(n) => setTaken(seat, n)}
              />
            </View>
          );
        })}
        <HelperText
          type="error"
          visible={draft.taken.every((t) => t !== null) && problem !== null}
        >
          {problem}
        </HelperText>
        <View style={styles.actions}>
          <Button
            icon="arrow-left"
            onPress={() => setDraft({ ...draft, phase: "bids" })}
          >
            Back to bids
          </Button>
          <Button
            mode="contained"
            icon="check"
            disabled={problem !== null}
            onPress={() =>
              onChange((g) => ({
                ...g,
                hands: [
                  ...g.hands,
                  {
                    bids: draft.bids.map((b) => b ?? 0),
                    taken: draft.taken.map((t) => t ?? 0),
                  },
                ],
                draft: null,
              }))
            }
          >
            Save hand
          </Button>
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 16 },
  content: { gap: 12 },
  header: { gap: 4 },
  player: { gap: 6 },
  actions: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
});
