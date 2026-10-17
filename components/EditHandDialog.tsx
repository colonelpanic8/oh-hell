import { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Button, Dialog, HelperText, Portal, Text } from "react-native-paper";

import { NumberChips } from "@/components/NumberChips";
import {
  biddingOrder,
  bidProblem,
  cards,
  Game,
  HandResult,
  tricksProblem,
} from "@/lib/game";

interface Props {
  game: Game;
  /** The hand being edited, or `null` when closed. */
  hand: number | null;
  onSave: (hand: number, result: HandResult) => void;
  onDismiss: () => void;
}

export function EditHandDialog({ hand, ...props }: Props) {
  if (hand === null || !props.game.hands[hand]) return null;
  return <EditHand key={hand} hand={hand} {...props} />;
}

function EditHand({ game, hand, onSave, onDismiss }: Props & { hand: number }) {
  const { width } = useWindowDimensions();
  const [result, setResult] = useState(() =>
    structuredClone(game.hands[hand]!),
  );
  const dealt = cards(game, hand) ?? 0;
  const problem =
    bidProblem(game, hand, result.bids) ??
    tricksProblem(game, hand, result.taken);
  const set = (key: keyof HandResult, seat: number, value: number) =>
    setResult({
      ...result,
      [key]: result[key].map((v, i) => (i === seat ? value : v)),
    });

  return (
    <Portal>
      <Dialog
        visible
        onDismiss={onDismiss}
        style={[styles.dialog, { width: Math.min(640, width - 52) }]}
      >
        <Dialog.Title>
          Hand {hand + 1} · {dealt} {dealt === 1 ? "card" : "cards"}
        </Dialog.Title>
        <Dialog.ScrollArea>
          <ScrollView contentContainerStyle={styles.content}>
            {biddingOrder(game, hand).map((seat) => (
              <View key={seat} style={styles.player}>
                <Text variant="titleMedium">{game.players[seat]}</Text>
                <Text variant="bodySmall">Bid</Text>
                <NumberChips
                  max={dealt}
                  value={result.bids[seat] ?? null}
                  onChange={(n) => set("bids", seat, n)}
                />
                <Text variant="bodySmall">Took</Text>
                <NumberChips
                  max={dealt}
                  value={result.taken[seat] ?? null}
                  onChange={(n) => set("taken", seat, n)}
                />
              </View>
            ))}
          </ScrollView>
        </Dialog.ScrollArea>
        <HelperText type="error" visible={problem !== null}>
          {problem}
        </HelperText>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button
            disabled={problem !== null}
            onPress={() => {
              onSave(hand, result);
              onDismiss();
            }}
          >
            Save
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: { maxHeight: "90%", alignSelf: "center" },
  content: { gap: 16, paddingVertical: 8 },
  player: { gap: 4 },
});
