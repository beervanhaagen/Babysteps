import { checkChildDates, parseDutchDate, todayInAmsterdam, typeDutchDate } from '@teddysteps/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, ChoiceChip, ChoiceGroup, color, TextField, text, useAnnounce } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';
import { TextLink } from '@/components/TextLink';
import { signOut, useAuth } from '@/lib/auth';
import { PROBLEMS } from '@/lib/childDates';
import { friendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';


const HELP = 'Het pad telt vanaf de geboorte. Sprongetjes tellen we vanaf de uitgerekende datum, ook als je kleintje eerder of later kwam.';

// O2 Je kleintje (1 van 3). "Foto toevoegen" comes with the photo pipeline in step 3.
export default function YourLittleOne() {
  const { refresh } = useAuth();
  const [name, setName] = useState('');
  const [born, setBorn] = useState(true);
  const [birth, setBirth] = useState('');
  const [due, setDue] = useState('');
  const [errors, setErrors] = useState<{ name?: string; birth?: string; due?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  // VoiceOver doesn't read role="alert"; announce the first problem ourselves.
  useAnnounce(errors.name ?? errors.birth ?? errors.due ?? errors.form);

  async function next() {
    const birthDate = born ? parseDutchDate(birth) : null;
    const dueDate = parseDutchDate(due);
    const problems = checkChildDates(born, birthDate, dueDate, todayInAmsterdam());
    const found = {
      name: name.trim() ? undefined : 'Vul de naam of roepnaam in.',
      birth: problems.find((p) => p.startsWith('birth')),
      due: problems.find((p) => p.startsWith('due')),
    };
    setErrors({ name: found.name, birth: found.birth && PROBLEMS[found.birth], due: found.due && PROBLEMS[found.due] });
    if (found.name || problems.length) return;

    setBusy(true);
    const { error } = await supabase.rpc('create_trail', {
      child_first_name: name.trim(),
      child_birth_date: birthDate,
      child_due_date: dueDate,
    });
    if (error) {
      // The trail may exist even if the answer got lost; refresh moves on if it does.
      await refresh();
      setBusy(false);
      return setErrors({ form: friendlyError(error) });
    }
    // The parent now has a trail: on to O3 (2 van 3).
    await refresh();
    router.replace({ pathname: '/uitnodigen', params: { onboarding: '1' } });
  }

  return (
    <Screen
      header={{ title: 'Wie is de kleine ontdekker?', color: 'lilac', step: [1, 3], character: 'tiggy', characterRotate: -8 }}
      footer={
        <Button block onPress={next} busy={busy}>
          Volgende
        </Button>
      }
    >
      <TextField
        label="Naam of roepnaam"
        value={name}
        onChangeText={setName}
        error={errors.name}
        autoCapitalize="words"
        autoCorrect={false}
        autoComplete="off"
        maxLength={40}
      />
      <ChoiceGroup label="Is je baby er al?">
        <ChoiceChip selected={born} onPress={() => setBorn(true)}>
          Ja, geboren!
        </ChoiceChip>
        <ChoiceChip selected={!born} onPress={() => setBorn(false)}>
          Nog onderweg
        </ChoiceChip>
      </ChoiceGroup>
      <View style={styles.dates}>
        {born ? (
          <View style={styles.date}>
            <TextField
              label="Geboortedatum"
              value={birth}
              onChangeText={(value) => setBirth(typeDutchDate(value))}
              error={errors.birth}
              placeholder="dd-mm-jjjj"
              keyboardType="number-pad"
            />
          </View>
        ) : null}
        <View style={styles.date}>
          <TextField
            label="Uitgerekende datum"
            value={due}
            onChangeText={(value) => setDue(typeDutchDate(value))}
            error={errors.due}
            placeholder="dd-mm-jjjj"
            keyboardType="number-pad"
            accessibilityHint={errors.due ?? HELP}
          />
        </View>
      </View>
      <Text aria-hidden style={styles.help}>
        {HELP}
      </Text>
      {errors.form ? (
        <Text role="alert" style={styles.error}>
          {errors.form}
        </Text>
      ) : null}
      {/* A way out for a second parent who used the wrong address, so no duplicate trail. */}
      <TextLink onPress={() => signOut()}>Ander e-mailadres? Uitloggen</TextLink>
    </Screen>
  );
}

const styles = StyleSheet.create({
  dates: { flexDirection: 'row', gap: 10 },
  date: { flex: 1, minWidth: 0 },
  help: { ...text('meta'), color: color.inkMuted },
  error: { ...text('meta'), color: color.plum },
});
