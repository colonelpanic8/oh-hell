import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";

import { signed } from "@/lib/format";
import { Game, Scoresheet } from "@/lib/game";

interface Props {
  game: Game;
  sheet: Scoresheet;
  onEditHand: (hand: number) => void;
}

const HAND_WIDTH = 64;
const PLAYER_WIDTH = 88;

/** Hands down the side, players across the top; tap a hand to fix it. */
export function Scoreboard({ game, sheet, onEditHand }: Props) {
  const { colors } = useTheme();
  const best = Math.max(...sheet.totals);
  const border = { borderColor: colors.outlineVariant };

  return (
    <ScrollView horizontal contentContainerStyle={styles.scroll}>
      <View>
        <View style={[styles.row, styles.headerRow, border]}>
          <Text style={[styles.handCell, styles.bold]}>Hand</Text>
          {game.players.map((name, seat) => (
            <Text
              key={seat}
              numberOfLines={1}
              style={[styles.playerCell, styles.bold]}
            >
              {name}
            </Text>
          ))}
        </View>
        {sheet.hands.map((h, index) => (
          <Pressable
            key={index}
            onPress={() => onEditHand(index)}
            accessibilityRole="button"
            accessibilityLabel={`Edit hand ${index + 1}`}
            style={({ pressed }) => [
              styles.row,
              border,
              pressed && { backgroundColor: colors.surfaceVariant },
            ]}
          >
            <View style={styles.handCell}>
              <Text variant="bodyMedium">{index + 1}</Text>
              <Text variant="bodySmall" style={{ color: colors.outline }}>
                {h.cards} {h.cards === 1 ? "card" : "cards"}
              </Text>
            </View>
            {game.players.map((_, seat) => {
              const made = h.bids[seat] === h.taken[seat];
              return (
                <View key={seat} style={styles.playerCell}>
                  <Text variant="bodyLarge">{h.totals[seat]}</Text>
                  <Text
                    variant="bodySmall"
                    style={{ color: made ? colors.primary : colors.error }}
                  >
                    {h.taken[seat]}/{h.bids[seat]} · {signed(h.scores[seat]!)}
                  </Text>
                </View>
              );
            })}
          </Pressable>
        ))}
        {sheet.hands.length === 0 && (
          <Text variant="bodyMedium" style={styles.empty}>
            Scores appear here after the first hand.
          </Text>
        )}
        {sheet.hands.length > 0 && (
          <View style={[styles.row, styles.totalRow, border]}>
            <Text style={[styles.handCell, styles.bold]}>Total</Text>
            {sheet.totals.map((t, seat) => (
              <Text
                key={seat}
                variant="titleMedium"
                style={[
                  styles.playerCell,
                  t === best && { color: colors.primary },
                ]}
              >
                {t}
              </Text>
            ))}
          </View>
        )}
        {sheet.hands.length > 0 && (
          <Text
            variant="bodySmall"
            style={[styles.legend, { color: colors.outline }]}
          >
            Each cell: running total, then tricks taken / bid · hand score. Tap
            a hand to fix it.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 6,
  },
  headerRow: { paddingVertical: 8 },
  totalRow: { borderBottomWidth: 0, paddingVertical: 10 },
  handCell: { width: HAND_WIDTH, paddingHorizontal: 6 },
  playerCell: { width: PLAYER_WIDTH, paddingHorizontal: 6 },
  bold: { fontWeight: "bold" },
  empty: { padding: 12 },
  legend: { padding: 6, maxWidth: HAND_WIDTH + 3 * PLAYER_WIDTH },
});
