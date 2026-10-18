import { checkChildDates, parseDutchDate, todayInAmsterdam, typeDutchDate } from '@teddysteps/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button, color, fontFamily, TextField, useAnnounce } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth';
import { PROBLEMS } from '@/lib/childDates';
import { friendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

// "Mijn kleintje is geboren!": for a parent who signed up while still on the way.
// No board; M1 (step 8) edits all details later.
export default function Born() {
  const { state, refresh } = useAuth();
  const [birth, setBirth] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  useAnnounce(error);
  if (state.status !== 'ready') return null;
  const { trail } = state;

  async function save() {
    const birthDate = parseDutchDate(birth);
    const problem = checkChildDates(true, birthDate, trail.dueDate, todayInAmsterdam())[0];
    if (problem === 'birth-future') return setError('Deze datum ligt nog in de toekomst.');
    if (problem) return setError(PROBLEMS[problem]);
    setBusy(true);
    const { error: saveError } = await supabase.from('children').update({ birth_date: birthDate }).eq('trail_id', trail.id);
    if (saveError) {
      setBusy(false);
      return setError(friendlyError(saveError));
    }
    await refresh();
    router.replace('/pad');
  }

  return (
    <Screen
      header={{ title: `Welkom, ${trail.childName}!`, color: 'lilac', onBack: router.back, character: 'bo' }}
      footer={
        <Button block onPress={save} busy={busy}>
          Opslaan
        </Button>
      }
    >
      <Text style={styles.body}>Gefeliciteerd! Vanaf de geboortedatum telt het pad de weken.</Text>
      <TextField
        label="Geboortedatum"
        value={birth}
        onChangeText={(value) => setBirth(typeDutchDate(value))}
        error={error}
        placeholder="dd-mm-jjjj"
        keyboardType="number-pad"
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { fontFamily: fontFamily('sans', 400), fontSize: 16, lineHeight: 24, color: color.ink },
});
