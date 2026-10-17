import { StyleSheet, View } from "react-native";
import { Button } from "react-native-paper";

interface Props {
  max: number;
  value: number | null;
  onChange: (value: number) => void;
  /** Values that can't be picked; others in `0..=max` can. */
  disabled?: readonly number[];
}

/** One button per value in `0..=max`. */
export function NumberChips({ max, value, onChange, disabled = [] }: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: max + 1 }, (_, n) => (
        <Button
          key={n}
          compact
          mode={value === n ? "contained" : "outlined"}
          disabled={disabled.includes(n)}
          onPress={() => onChange(n)}
          style={styles.chip}
          labelStyle={styles.label}
          accessibilityLabel={String(n)}
        >
          {n}
        </Button>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: { minWidth: 44, borderRadius: 8 },
  label: { marginHorizontal: 4, fontSize: 16 },
});
