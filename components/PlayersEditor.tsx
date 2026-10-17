import { StyleSheet, View } from "react-native";
import {
  Button,
  Chip,
  IconButton,
  RadioButton,
  Text,
  TextInput,
} from "react-native-paper";

import { MAX_PLAYERS } from "@/lib/rules";

interface Props {
  players: string[];
  onChange: (players: string[]) => void;
  firstDealer: number;
  onFirstDealerChange: (seat: number) => void;
  /** Names from earlier games, offered as one-tap additions. */
  suggestions: string[];
}

function move<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

export function PlayersEditor({
  players,
  onChange,
  firstDealer,
  onFirstDealerChange,
  suggestions,
}: Props) {
  const taken = new Set(players.map((p) => p.trim().toLowerCase()));
  const offered = suggestions.filter((s) => !taken.has(s.toLowerCase()));
  const add = (name: string) => {
    const blank = players.findIndex((p) => p.trim() === "");
    if (blank >= 0) onChange(players.map((p, i) => (i === blank ? name : p)));
    else onChange([...players, name]);
  };
  const remove = (seat: number) => {
    onChange(players.filter((_, i) => i !== seat));
    if (seat < firstDealer) onFirstDealerChange(firstDealer - 1);
    else if (seat === firstDealer) onFirstDealerChange(0);
  };
  // The first dealer moves with their row.
  const swap = (seat: number, to: number) => {
    onChange(move(players, seat, to));
    if (firstDealer === seat) onFirstDealerChange(to);
    else if (firstDealer === to) onFirstDealerChange(seat);
  };

  return (
    <View style={styles.editor}>
      <Text variant="bodySmall">
        In seat order, clockwise. The selected player deals first.
      </Text>
      {players.map((name, seat) => (
        <View key={seat} style={styles.row}>
          <RadioButton
            value={String(seat)}
            status={firstDealer === seat ? "checked" : "unchecked"}
            onPress={() => onFirstDealerChange(seat)}
          />
          <TextInput
            dense
            mode="outlined"
            label={`Player ${seat + 1}`}
            value={name}
            onChangeText={(text) =>
              onChange(players.map((p, i) => (i === seat ? text : p)))
            }
            style={styles.name}
          />
          <IconButton
            icon="arrow-up"
            size={18}
            disabled={seat === 0}
            onPress={() => swap(seat, seat - 1)}
            accessibilityLabel="Move up"
          />
          <IconButton
            icon="arrow-down"
            size={18}
            disabled={seat === players.length - 1}
            onPress={() => swap(seat, seat + 1)}
            accessibilityLabel="Move down"
          />
          <IconButton
            icon="close"
            size={18}
            onPress={() => remove(seat)}
            accessibilityLabel="Remove player"
          />
        </View>
      ))}
      <Button
        icon="account-plus"
        mode="text"
        disabled={players.length >= MAX_PLAYERS}
        onPress={() => onChange([...players, ""])}
        style={styles.add}
      >
        Add player
      </Button>
      {offered.length > 0 && (
        <View style={styles.suggestions}>
          {offered.map((name) => (
            <Chip key={name} icon="plus" onPress={() => add(name)}>
              {name}
            </Chip>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  editor: { gap: 4 },
  row: { flexDirection: "row", alignItems: "center" },
  name: { flex: 1 },
  add: { alignSelf: "flex-start" },
  suggestions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
