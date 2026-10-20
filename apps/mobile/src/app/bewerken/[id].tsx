import { firstLook } from '@teddysteps/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button, color, FirstIcon, firstLabelText, ListRow, Switch, text, TextField, useAnnounce } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';
import { forgetPickedFirst, usePickedFirst } from '@/lib/draft';
import { friendlyError } from '@/lib/errors';
import { updateMoment } from '@/lib/moments';
import { useTrailMoments } from '@/lib/trail';

// T8 → "Bijschrift aanpassen": the line under the photo, and whether it's a first (with its label).
export default function EditMoment() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { moments, refresh } = useTrailMoments();
  const m = moments.find((x) => x.momentId === id);
  // Until the parent types, the fields show the moment as it is (it may load a moment later).
  const [typedCaption, setCaption] = useState<string>();
  const [pickedFirst, setIsFirst] = useState<boolean>();
  const pickedLabel = usePickedFirst(id);
  // A pick from A3b only counts for this visit of the screen.
  useEffect(() => forgetPickedFirst, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  useAnnounce(error);
  if (!m) {
    return (
      <Screen header={{ title: 'Bijschrift', color: 'cornflower', onBack: router.back, character: 'puddle' }}>
        <Text style={styles.note}>Even zoeken…</Text>
      </Screen>
    );
  }

  const caption = typedCaption ?? m.caption ?? '';
  const isFirst = pickedFirst ?? m.isFirst;
  const label = pickedLabel ?? m.firstLabel ?? '';

  async function save() {
    if (isFirst && !label.trim()) return setError('Kies welke eerste keer het was, of typ hem zelf.');
    setBusy(true);
    setError(undefined);
    try {
      await updateMoment(m!, { caption, trailWeek: m!.trailWeek, isFirst, firstLabel: label, inBook: m!.inBook });
      await refresh();
      router.back();
    } catch (e) {
      setBusy(false);
      setError(friendlyError(e));
    }
  }

  return (
    <Screen
      header={{ title: 'Bijschrift', subtitle: `Week ${m.trailWeek}`, color: 'cornflower', onBack: router.back, character: 'puddle' }}
      footer={
        <Button block onPress={save} busy={busy}>
          Opslaan
        </Button>
      }
    >
      <TextField label="Wat gebeurde er?" value={caption} onChangeText={setCaption} multiline maxLength={500} placeholder="Eén zin is genoeg" />
      <Switch label="Een eerste keer" hint="Eerste keren krijgen een label op het pad." value={isFirst} onValueChange={setIsFirst} />
      {isFirst ? (
        <ListRow
          title={label ? firstLabelText(label) : 'Welke eerste keer?'}
          subtitle={label ? 'Een andere kiezen' : 'Kies er een uit de lijst of typ hem zelf'}
          accessory={label ? <FirstIcon {...firstLook(label)} size={32} iconSize={20} /> : undefined}
          onPress={() => router.push({ pathname: '/eerste-keer', params: { voor: id, huidig: label } })}
        />
      ) : null}
      {error ? (
        <Text role="alert" style={[text('meta'), { color: color.plum }]}>
          {error}
        </Text>
      ) : null}
      <Text style={styles.note}>Familie ziet de nieuwe tekst meteen.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { ...text('meta'), color: color.inkMuted },
});
