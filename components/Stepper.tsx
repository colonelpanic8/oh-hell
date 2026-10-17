import { StyleSheet, View } from "react-native";
import { IconButton, Text } from "react-native-paper";

interface Props {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

export function Stepper({ label, value, onChange, min, max, step = 1 }: Props) {
  const clamp = (n: number) =>
    Math.min(max ?? Infinity, Math.max(min ?? -Infinity, n));
  return (
    <View style={styles.row}>
      <Text variant="bodyLarge" style={styles.label}>
        {label}
      </Text>
      <IconButton
        icon="minus"
        size={18}
        mode="outlined"
        disabled={min !== undefined && value <= min}
        onPress={() => onChange(clamp(value - step))}
        accessibilityLabel={`Decrease ${label}`}
      />
      <Text variant="titleMedium" style={styles.value}>
        {value}
      </Text>
      <IconButton
        icon="plus"
        size={18}
        mode="outlined"
        disabled={max !== undefined && value >= max}
        onPress={() => onChange(clamp(value + step))}
        accessibilityLabel={`Increase ${label}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
  label: { flex: 1 },
  value: { minWidth: 36, textAlign: "center" },
});
