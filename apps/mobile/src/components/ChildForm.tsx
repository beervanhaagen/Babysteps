import { checkChildDates, formatDutchDate, parseDutchDate, todayInAmsterdam, typeDutchDate, type CalendarDate } from '@teddysteps/core';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { ChoiceChip, ChoiceGroup, color, TextField, text, useAnnounce } from '@teddysteps/ui';
import { PROBLEMS } from '@/lib/childDates';

const HELP = 'Het pad telt vanaf de geboorte. Sprongetjes tellen we vanaf de uitgerekende datum, ook als je kleintje eerder of later kwam.';

export interface ChildValues {
  name: string;
  birthDate: CalendarDate | null;
  dueDate: CalendarDate;
}

/**
 * The fields of O2 "Je kleintje", also used by M1 "Profiel van Lotte" in edit mode. In edit mode
 * the "Is je baby er al?" choice only shows while the baby is still on the way; once born, the
 * birth date can be corrected but not taken away.
 */
export function useChildForm(initial?: { name: string; birthDate: CalendarDate | null; dueDate: CalendarDate }) {
  const editing = !!initial;
  const [name, setName] = useState(initial?.name ?? '');
  const [born, setBorn] = useState(initial ? !!initial.birthDate : true);
  const [birth, setBirth] = useState(initial?.birthDate ? formatDutchDate(initial.birthDate) : '');
  const [due, setDue] = useState(initial ? formatDutchDate(initial.dueDate) : '');
  const [errors, setErrors] = useState<{ name?: string; birth?: string; due?: string }>({});
  // VoiceOver doesn't read role="alert"; announce the first problem ourselves.
  useAnnounce(errors.name ?? errors.birth ?? errors.due);

  /** The values when they're fine, otherwise null with the problems shown at the fields. */
  function check(): ChildValues | null {
    const birthDate = born ? parseDutchDate(birth) : null;
    const dueDate = parseDutchDate(due);
    const problems = checkChildDates(born, birthDate, dueDate, todayInAmsterdam());
    const found = {
      name: name.trim() ? undefined : 'Vul de naam of roepnaam in.',
      birth: problems.find((p) => p.startsWith('birth')),
      due: problems.find((p) => p.startsWith('due')),
    };
    setErrors({ name: found.name, birth: found.birth && PROBLEMS[found.birth], due: found.due && PROBLEMS[found.due] });
    if (found.name || problems.length || !dueDate) return null;
    return { name: name.trim(), birthDate, dueDate };
  }

  const fields = (
    <>
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
      {!editing || !initial?.birthDate ? (
        <ChoiceGroup label="Is je baby er al?">
          <ChoiceChip selected={born} onPress={() => setBorn(true)}>
            Ja, geboren!
          </ChoiceChip>
          <ChoiceChip selected={!born} onPress={() => setBorn(false)}>
            Nog onderweg
          </ChoiceChip>
        </ChoiceGroup>
      ) : null}
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
    </>
  );

  return { fields, check };
}

const styles = StyleSheet.create({
  dates: { flexDirection: 'row', gap: 10 },
  date: { flex: 1, minWidth: 0 },
  help: { ...text('meta'), color: color.inkMuted },
});
