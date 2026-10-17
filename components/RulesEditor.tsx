import { useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Button,
  Chip,
  Divider,
  List,
  Menu,
  Switch,
  Text,
} from "react-native-paper";

import { Stepper } from "@/components/Stepper";
import { scheduleLabel, signed } from "@/lib/format";
import { matchingPreset, PRESETS } from "@/lib/presets";
import {
  Formula,
  maxCards,
  Poly,
  Rules,
  scoreHand,
  Shape,
  Suit,
  TrickCredit,
  TrumpRule,
} from "@/lib/rules";

interface Props {
  rules: Rules;
  players: number;
  onChange: (rules: Rules) => void;
}

function Choice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly (readonly [T, string])[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map(([key, label]) => (
        <Chip
          key={key}
          selected={key === value}
          showSelectedOverlay
          onPress={() => onChange(key)}
        >
          {label}
        </Chip>
      ))}
    </View>
  );
}

function Row({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Text variant="bodyLarge" style={styles.grow}>
        {label}
      </Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

function PolyEditor({
  title,
  unit,
  value,
  onChange,
}: {
  title: string;
  unit: string;
  value: Poly;
  onChange: (value: Poly) => void;
}) {
  return (
    <View>
      <Text variant="titleSmall" style={styles.subheading}>
        {title}
      </Text>
      <Stepper
        label="Flat points"
        value={value.constant}
        onChange={(constant) => onChange({ ...value, constant })}
      />
      <Stepper
        label={`Points per ${unit}`}
        value={value.linear}
        onChange={(linear) => onChange({ ...value, linear })}
      />
      <Stepper
        label={`Points per ${unit}²`}
        value={value.squared}
        onChange={(squared) => onChange({ ...value, squared })}
      />
    </View>
  );
}

const SHAPES = [
  ["up-down", "1 → max → 1"],
  ["down-up", "max → 1 → max"],
  ["up", "1 → max"],
  ["down", "max → 1"],
  ["constant", "max every hand"],
] as const satisfies readonly (readonly [Shape, string])[];

const CREDIT = [
  ["always", "Always"],
  ["missed", "Only on a miss"],
  ["under", "Only when under"],
] as const satisfies readonly (readonly [TrickCredit, string])[];

const TRUMPS = {
  "turn-up": { cycle: [{ kind: "turn-up" }], noTrumpOnFullDeal: true },
  hcds: rotation(["hearts", "clubs", "diamonds", "spades"]),
  sdch: rotation(["spades", "diamonds", "clubs", "hearts"]),
  spades: rotation(["spades"]),
} satisfies Record<string, TrumpRule>;

function rotation(suits: Suit[]): TrumpRule {
  return {
    cycle: suits.map((suit) => ({ kind: "suit", suit })),
    noTrumpOnFullDeal: false,
  };
}

type TrumpChoice = keyof typeof TRUMPS;

function trumpChoice(rule: TrumpRule): TrumpChoice {
  const key = (Object.keys(TRUMPS) as TrumpChoice[]).find(
    (k) => JSON.stringify(TRUMPS[k].cycle) === JSON.stringify(rule.cycle),
  );
  return key ?? "turn-up";
}

function examples(f: Formula): string {
  const at = (bid: number, taken: number) =>
    signed(scoreHand(f, { bid, taken, cards: 7, handIndex: 0 }));
  return `Bid 2: took 2 → ${at(2, 2)}, took 3 → ${at(2, 3)}, took 1 → ${at(2, 1)}. Bid 0, took 0 → ${at(0, 0)}.`;
}

export function RulesEditor({ rules, players, onChange }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const preset = matchingPreset(rules);
  const set = (patch: Partial<Rules>) => onChange({ ...rules, ...patch });
  const setScoring = (patch: Partial<Formula>) =>
    set({ scoring: { ...rules.scoring, ...patch } });
  const s = rules.scoring;
  const peak = rules.schedule.peak;
  const max = maxCards(Math.max(players, 2));

  return (
    <View style={styles.editor}>
      <Menu
        visible={menuOpen}
        onDismiss={() => setMenuOpen(false)}
        anchor={
          <Button
            mode="outlined"
            icon="chevron-down"
            contentStyle={styles.menuButton}
            onPress={() => setMenuOpen(true)}
          >
            {preset?.name ?? "Custom rules"}
          </Button>
        }
      >
        {PRESETS.map((p) => (
          <Menu.Item
            key={p.id}
            title={p.name}
            onPress={() => {
              onChange(p.rules);
              setMenuOpen(false);
            }}
          />
        ))}
      </Menu>
      {preset && <Text variant="bodyMedium">{preset.summary}</Text>}
      <Text variant="bodySmall">{examples(s)}</Text>
      <Text variant="bodySmall">
        {scheduleLabel(rules, Math.max(players, 2))}
        {rules.hook ? " · hook" : ""}
        {rules.target !== null ? ` · first to ${rules.target}` : ""}
      </Text>

      <List.Accordion title="Customize" style={styles.accordion}>
        <View style={styles.section}>
          <Text variant="titleMedium">Hands</Text>
          <Choice
            options={SHAPES}
            value={rules.schedule.shape}
            onChange={(shape) =>
              set({ schedule: { ...rules.schedule, shape } })
            }
          />
          <Row
            label={`Biggest hand: most the players allow (${max})`}
            value={peak.kind === "max"}
            onChange={(useMax) =>
              set({
                schedule: {
                  ...rules.schedule,
                  peak: useMax
                    ? { kind: "max" }
                    : { kind: "cards", cards: Math.min(10, max) },
                },
              })
            }
          />
          {peak.kind === "cards" && (
            <Stepper
              label="Biggest hand"
              value={peak.cards}
              min={1}
              max={52}
              onChange={(cards) =>
                set({
                  schedule: {
                    ...rules.schedule,
                    peak: { kind: "cards", cards },
                  },
                })
              }
            />
          )}

          <Divider style={styles.divider} />
          <Text variant="titleMedium">Bidding</Text>
          <Row
            label="Hook: the dealer can't make bids add up"
            value={rules.hook}
            onChange={(hook) => set({ hook })}
          />

          <Divider style={styles.divider} />
          <Text variant="titleMedium">Scoring</Text>
          <Stepper
            label="Points per trick taken"
            value={s.perTrick}
            onChange={(perTrick) => setScoring({ perTrick })}
          />
          {s.perTrick !== 0 && (
            <Choice
              options={CREDIT}
              value={s.perTrickWhen}
              onChange={(perTrickWhen) => setScoring({ perTrickWhen })}
            />
          )}
          <PolyEditor
            title="Making your bid exactly"
            unit="trick bid"
            value={s.exact}
            onChange={(exact) => setScoring({ exact })}
          />
          <Text variant="titleSmall" style={styles.subheading}>
            Making a bid of zero
          </Text>
          <Choice
            options={[
              ["normal", "Score as usual"],
              ["points", "Fixed points"],
              ["plus-cards", "Points + cards dealt"],
            ]}
            value={s.exactZero?.kind ?? "normal"}
            onChange={(kind) =>
              setScoring({
                exactZero:
                  kind === "normal"
                    ? null
                    : { kind, points: s.exactZero?.points ?? 5 },
              })
            }
          />
          {s.exactZero && (
            <Stepper
              label="Points"
              value={s.exactZero.points}
              onChange={(points) =>
                setScoring({ exactZero: { ...s.exactZero!, points } })
              }
            />
          )}
          <PolyEditor
            title="Taking more than you bid"
            unit="trick over"
            value={s.over}
            onChange={(over) => setScoring({ over })}
          />
          <PolyEditor
            title="Taking fewer than you bid"
            unit="trick under"
            value={s.under}
            onChange={(under) => setScoring({ under })}
          />
          <Row
            label="Multiply each hand's score by the hand number"
            value={s.multiplier === "hand-number"}
            onChange={(on) =>
              setScoring({ multiplier: on ? "hand-number" : "one" })
            }
          />

          <Divider style={styles.divider} />
          <Text variant="titleMedium">Trump</Text>
          <Choice
            options={[
              ["turn-up", "Turn up a card"],
              ["hcds", "Rotate ♥ ♣ ♦ ♠"],
              ["sdch", "Rotate ♠ ♦ ♣ ♥"],
              ["spades", "Always ♠"],
            ]}
            value={trumpChoice(rules.trump)}
            onChange={(key) =>
              set({
                trump: {
                  ...TRUMPS[key],
                  noTrumpOnFullDeal: rules.trump.noTrumpOnFullDeal,
                },
              })
            }
          />
          <Row
            label="No trump when every card is dealt"
            value={rules.trump.noTrumpOnFullDeal}
            onChange={(noTrumpOnFullDeal) =>
              set({ trump: { ...rules.trump, noTrumpOnFullDeal } })
            }
          />

          <Divider style={styles.divider} />
          <Text variant="titleMedium">Ending</Text>
          <Row
            label="End when someone reaches a target score"
            value={rules.target !== null}
            onChange={(on) => set({ target: on ? 100 : null })}
          />
          {rules.target !== null && (
            <Stepper
              label="Target"
              value={rules.target}
              min={10}
              step={10}
              onChange={(target) => set({ target })}
            />
          )}
        </View>
      </List.Accordion>
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { gap: 8 },
  menuButton: { flexDirection: "row-reverse" },
  accordion: { paddingHorizontal: 0 },
  section: { gap: 8, paddingBottom: 8 },
  subheading: { marginTop: 8 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  grow: { flex: 1 },
  divider: { marginVertical: 8 },
});
