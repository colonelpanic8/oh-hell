import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { Surface, Text, useTheme } from "react-native-paper";

import { signed } from "@/lib/format";
import { cards, dealer, Game, Scoresheet } from "@/lib/game";

interface Props {
  game: Game;
  sheet: Scoresheet;
  onEditHand: (hand: number) => void;
}

const HAND_WIDTH = 60;
const SUB_WIDTH = 46;
const SUBS = ["Bid", "Made", "Score", "Total"] as const;
const PLAYER_WIDTH = SUB_WIDTH * SUBS.length;

function HandLabel({
  index,
  dealt,
  muted,
}: {
  index: number;
  dealt: number;
  muted: object;
}) {
  return (
    <View style={styles.handCell}>
      <Text variant="titleSmall">{index + 1}</Text>
      <Text variant="labelSmall" style={muted}>
        {dealt} {dealt === 1 ? "card" : "cards"}
      </Text>
    </View>
  );
}

/**
 * Hands down the side, players across the top, each split into
 * bid / made / hand score / running total. Tap a hand to fix it.
 */
export function Scoreboard({ game, sheet, onEditHand }: Props) {
  const { colors } = useTheme();
  const best = Math.max(...sheet.totals);
  const muted = { color: colors.outline };
  const divider = { borderLeftColor: colors.outlineVariant };
  const line = { borderBottomColor: colors.outlineVariant };
  const stripe = { backgroundColor: colors.elevation.level2 };
  const head = { backgroundColor: colors.elevation.level3 };

  const current = game.hands.length;
  const draft = game.draft;
  const pendingDealt = cards(game, current);
  const pendingDealer = pendingDealt === null ? null : dealer(game, current);

  return (
    <Surface
      mode="flat"
      elevation={0}
      style={[styles.surface, { borderColor: colors.outlineVariant }]}
    >
      <ScrollView horizontal contentContainerStyle={styles.scroll}>
        <View>
          <View style={[styles.row, head]}>
            <View style={styles.handCell} />
            {game.players.map((name, seat) => (
              <View
                key={seat}
                style={[styles.playerCell, styles.divider, divider]}
              >
                <Text
                  numberOfLines={1}
                  variant="titleSmall"
                  style={styles.name}
                >
                  {name}
                </Text>
              </View>
            ))}
          </View>
          <View style={[styles.row, styles.subHead, head, line]}>
            <Text variant="labelSmall" style={[styles.handCell, muted]}>
              Hand
            </Text>
            {game.players.map((_, seat) => (
              <View
                key={seat}
                style={[styles.playerCell, styles.divider, divider]}
              >
                {SUBS.map((label) => (
                  <Text
                    key={label}
                    variant="labelSmall"
                    style={[styles.subCell, muted]}
                  >
                    {label}
                  </Text>
                ))}
              </View>
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
                index % 2 === 1 && stripe,
                pressed && { backgroundColor: colors.secondaryContainer },
              ]}
            >
              <HandLabel index={index} dealt={h.cards} muted={muted} />
              {game.players.map((_, seat) => {
                const made = h.bids[seat] === h.taken[seat];
                const tone = { color: made ? colors.primary : colors.error };
                const isDealer = h.dealer === seat;
                return (
                  <View
                    key={seat}
                    style={[styles.playerCell, styles.divider, divider]}
                  >
                    <Text
                      variant="bodyMedium"
                      style={[styles.subCell, isDealer && styles.dealer]}
                    >
                      {h.bids[seat]}
                    </Text>
                    <Text variant="bodyMedium" style={[styles.subCell, tone]}>
                      {h.taken[seat]}
                    </Text>
                    <Text
                      variant="bodyMedium"
                      style={[styles.subCell, styles.score, tone]}
                    >
                      {signed(h.scores[seat]!)}
                    </Text>
                    <Text
                      variant="titleSmall"
                      style={[styles.subCell, styles.total]}
                    >
                      {h.totals[seat]}
                    </Text>
                  </View>
                );
              })}
            </Pressable>
          ))}
          {draft && pendingDealt !== null && (
            <View style={[styles.row, current % 2 === 1 && stripe]}>
              <HandLabel index={current} dealt={pendingDealt} muted={muted} />
              {game.players.map((_, seat) => {
                const bid = draft.bids[seat];
                const took = draft.taken[seat];
                return (
                  <View
                    key={seat}
                    style={[styles.playerCell, styles.divider, divider]}
                  >
                    <Text
                      variant="bodyMedium"
                      style={[
                        styles.subCell,
                        bid != null && pendingDealer === seat && styles.dealer,
                        bid == null && muted,
                      ]}
                    >
                      {bid ?? "·"}
                    </Text>
                    <Text
                      variant="bodyMedium"
                      style={[styles.subCell, took == null && muted]}
                    >
                      {took ?? "·"}
                    </Text>
                    <Text variant="bodyMedium" style={[styles.subCell, muted]}>
                      ·
                    </Text>
                    <Text variant="bodyMedium" style={[styles.subCell, muted]}>
                      ·
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
          {sheet.hands.length === 0 && !draft && (
            <Text variant="bodyMedium" style={[styles.empty, muted]}>
              Scores appear here after the first hand.
            </Text>
          )}
          {sheet.hands.length > 0 && (
            <View style={[styles.row, styles.totalRow, head]}>
              <Text variant="titleSmall" style={styles.handCell}>
                Total
              </Text>
              {sheet.totals.map((t, seat) => (
                <View
                  key={seat}
                  style={[styles.playerCell, styles.divider, divider]}
                >
                  <Text
                    variant="titleMedium"
                    style={[
                      styles.grandTotal,
                      t === best && { color: colors.primary },
                    ]}
                  >
                    {t}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      {sheet.hands.length > 0 && (
        <Text variant="labelSmall" style={[styles.legend, muted]}>
          Underlined bid: dealer. Tap a hand to fix it.
        </Text>
      )}
    </Surface>
  );
}

const styles = StyleSheet.create({
  surface: {
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
  },
  scroll: { flexGrow: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  subHead: {
    paddingTop: 0,
    paddingBottom: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  totalRow: { paddingVertical: 10 },
  handCell: { width: HAND_WIDTH, paddingHorizontal: 8 },
  playerCell: {
    width: PLAYER_WIDTH,
    flexDirection: "row",
    alignItems: "center",
  },
  divider: { borderLeftWidth: StyleSheet.hairlineWidth },
  name: { paddingHorizontal: 8 },
  subCell: { width: SUB_WIDTH, textAlign: "center" },
  score: { fontVariant: ["tabular-nums"] },
  total: { fontVariant: ["tabular-nums"] },
  dealer: { textDecorationLine: "underline" },
  grandTotal: { flex: 1, textAlign: "right", paddingRight: 10 },
  empty: { padding: 16 },
  legend: { paddingHorizontal: 12, paddingVertical: 8 },
});
