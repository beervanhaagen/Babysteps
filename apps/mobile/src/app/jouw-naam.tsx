import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button, color, text, TextField, useAnnounce } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

// M1 "Jouw voornaam": the open "Hoe heet jij?" from the build plan. Only a first name, never a
// surname. Kept for M3 ("Sam (jij)") and, later, the family page.
export default function YourName() {
  const { state } = useAuth();
  const userId = state.status === 'ready' ? state.session.user.id : null;
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  useAnnounce(error);

  useEffect(() => {
    if (!userId) return;
    supabase
      .from('profiles')
      .select('first_name')
      .eq('id', userId)
      .single()
      .then(({ data }) => data?.first_name && setName(data.first_name));
  }, [userId]);

  async function save() {
    if (!name.trim()) return setError('Vul je voornaam in.');
    setBusy(true);
    setError(undefined);
    const result = await supabase.from('profiles').update({ first_name: name.trim() }).eq('id', userId!);
    if (result.error) {
      setBusy(false);
      return setError(friendlyError(result.error));
    }
    router.back();
  }

  return (
    <Screen
      header={{ title: 'Hoe heet jij?', color: 'lilac', onBack: router.back, character: 'bizzy' }}
      footer={
        <Button block onPress={save} busy={busy}>
          Opslaan
        </Button>
      }
    >
      <TextField label="Je voornaam" value={name} onChangeText={setName} error={error} autoCapitalize="words" autoComplete="given-name" maxLength={40} />
      <Text style={styles.note}>Alleen je voornaam, nooit een achternaam.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { ...text('meta'), color: color.inkMuted },
});
