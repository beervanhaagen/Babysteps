import { todayInAmsterdam, trailWeek } from '@teddysteps/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button, ChoiceChip, ChoiceGroup, color, text, useAnnounce } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { updateMoment } from '@/lib/moments';
import { useTrailMoments } from '@/lib/trail';

// T8 → "Naar een andere week": any week from the first one to this week, never ahead.
export default function MoveMoment() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state } = useAuth();
  const { moments, refresh } = useTrailMoments();
  const m = moments.find((x) => x.momentId === id);
  const [picked, setWeek] = useState<number>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  useAnnounce(error);
  if (!m || state.status !== 'ready' || !state.trail.birthDate) {
    return (
      <Screen header={{ title: 'Andere week', color: 'cornflower', onBack: router.back, character: 'bizzy' }}>
        <Text style={styles.intro}>Even zoeken…</Text>
      </Screen>
    );
  }
  const week = picked ?? m.trailWeek;
  const now = Math.min(trailWeek(state.trail.birthDate, todayInAmsterdam()), 104);
  const weeks = Array.from({ length: now }, (_, i) => now - i);

  async function save() {
    setBusy(true);
    setError(undefined);
    try {
      await updateMoment(m!, { caption: m!.caption ?? '', trailWeek: week, isFirst: m!.isFirst, firstLabel: m!.firstLabel ?? '', inBook: m!.inBook });
      await refresh();
      router.back();
    } catch (e) {
      setBusy(false);
      setError(friendlyError(e));
    }
  }

  return (
    <Screen
      header={{ title: 'Andere week', subtitle: `Staat nu bij week ${m.trailWeek}`, color: 'cornflower', onBack: router.back, character: 'bizzy' }}
      footer={
        <Button block onPress={save} busy={busy} disabled={week === m.trailWeek}>
          {`Naar week ${week}`}
        </Button>
      }
    >
      <Text style={styles.intro}>Kies de week waarin dit gebeurde. Het boek volgt het pad.</Text>
      <ChoiceGroup label="Kies de week">
        {weeks.map((w) => (
          <ChoiceChip key={w} selected={w === week} onPress={() => setWeek(w)}>
            {w === now ? `Week ${w} (nu)` : `Week ${w}`}
          </ChoiceChip>
        ))}
      </ChoiceGroup>
      {error ? (
        <Text role="alert" style={[text('meta'), { color: color.plum }]}>
          {error}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { ...text('body'), fontSize: 15, lineHeight: 22, color: color.inkMuted },
});
