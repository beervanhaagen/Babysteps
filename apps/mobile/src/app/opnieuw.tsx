import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button, color, text } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth';

// Shown when the app starts without a connection; the parent stays signed in.
export default function TryAgain() {
  const { refresh } = useAuth();
  const [busy, setBusy] = useState(false);
  return (
    <Screen
      header={{ title: 'Even geen verbinding', color: 'butter', character: 'puddle' }}
      footer={
        <Button
          block
          disabled={busy}
          onPress={async () => {
            setBusy(true);
            await refresh();
            setBusy(false);
          }}
        >
          Opnieuw proberen
        </Button>
      }
    >
      <Text style={styles.body}>We konden je pad niet ophalen. Check je wifi of mobiele data en probeer het opnieuw.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { ...text('body'), fontSize: 16, lineHeight: 24, color: color.ink },
});
