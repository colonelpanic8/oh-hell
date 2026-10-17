import { Button, Dialog, Portal, Text } from "react-native-paper";

interface Props {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onDismiss: () => void;
}

/** `Alert.alert` doesn't work on web, so confirmations use a dialog everywhere. */
export function Confirm({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onDismiss,
}: Props) {
  return (
    <Portal>
      <Dialog visible={visible} onDismiss={onDismiss}>
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          <Button onPress={onDismiss}>Cancel</Button>
          <Button
            onPress={() => {
              onConfirm();
              onDismiss();
            }}
          >
            {confirmLabel}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}
