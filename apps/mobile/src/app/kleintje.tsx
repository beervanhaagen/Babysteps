import { checkChildDates, parseDutchDate, todayInAmsterdam, typeDutchDate, type ChildDatesProblem } from '@teddysteps/core';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, ChoiceChip, ChoiceGroup, color, TextField, text } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

const PROBLEMS: Record<ChildDatesProblem, string> = {
  'birth-format': 'Schrijf de datum als dd-mm-jjjj.',
  'birth-future': 'Deze datum ligt nog in de toekomst.',
  'due-format': 'Schrijf de datum als dd-mm-jjjj.',
  'due-far-from-birth': 'Klopt deze datum? Hij ligt ver van de geboortedatum.',
  'due-past': 'Deze datum is al geweest. Is je kleintje er al?',
  'due-too-far': 'Kies een datum in de komende negen maanden.',
};

// O2 Je kleintje (1 van 3). "Foto toevoegen" comes with the photo pipeline in step 3.
export default function YourLittleOne() {
  const { refresh } = useAuth();
  const [name, setName] = useState('');
  const [born, setBorn] = useState(true);
  const [birth, setBirth] = useState('');
  const [due, setDue] = useState('');
  const [errors, setErrors] = useState<{ name?: string; birth?: string; due?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

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
      setBusy(false);
      return setErrors({ form: friendlyError(error) });
    }
    // The parent now has a trail; the router moves on to it (O3 follows in step 4).
    await refresh();
  }

  return (
    <Screen
      header={{ title: 'Wie is de kleine ontdekker?', color: 'lilac', step: [1, 3], character: 'tiggy', characterRotate: -8 }}
      footer={
        <Button block onPress={next} disabled={busy}>
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
          />
        </View>
      </View>
      <Text style={styles.help}>
        Het pad telt vanaf de geboorte. Sprongetjes tellen we vanaf de uitgerekende datum, ook als je kleintje eerder of later kwam.
      </Text>
      {errors.form ? (
        <Text role="alert" style={styles.error}>
          {errors.form}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dates: { flexDirection: 'row', gap: 10 },
  date: { flex: 1, minWidth: 0 },
  help: { ...text('meta'), color: color.inkMuted },
  error: { ...text('meta'), color: color.plum },
});
