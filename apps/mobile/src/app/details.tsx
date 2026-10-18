import { daysBetween, todayInAmsterdam, trailWeek } from '@teddysteps/core';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { border, Button, ChoiceChip, ChoiceGroup, color, fontFamily, Icon, radius, TextField, text, useAnnounce, useFocusRing } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth';
import { resetDraft, useDraft } from '@/lib/draft';
import { pin } from '@/lib/queue';

// A3 Vertel er iets over: caption, a first (as a few words), and the week.
// The week starts at the week the first photo was taken, so older photos land in their own week.
export default function Details() {
  const { state } = useAuth();
  const draft = useDraft();
  const trail = state.status === 'ready' ? state.trail : null;
  const birth = trail?.birthDate ?? null;
  const today = todayInAmsterdam();
  const current = birth ? trailWeek(birth, today) : 1;
  const photoDays = draft.photos.map((p) => p.takenOn).filter((d) => d && birth && daysBetween(birth, d) >= 0 && daysBetween(d, today) >= 0).sort();
  const photoWeek = birth && photoDays[0] ? trailWeek(birth, photoDays[0]) : current;

  const [caption, setCaption] = useState('');
  const [isFirst, setIsFirst] = useState(draft.isFirst);
  const [firstLabel, setFirstLabel] = useState('');
  const [week, setWeek] = useState(Math.min(photoWeek, current));
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState<string>();
  const [saveError, setSaveError] = useState<string>();
  const [busy, setBusy] = useState(false);
  useAnnounce(error ?? saveError);

  const name = trail?.childName ?? 'je kleintje';

  async function save() {
    if (isFirst && !firstLabel.trim()) return setError(`Wat deed ${name} voor het eerst? Een paar woorden is genoeg.`);
    setError(undefined);
    setSaveError(undefined);
    setBusy(true);
    try {
      const queued = await pin({ photos: draft.photos, trailWeek: week, caption, isFirst, firstLabel });
      resetDraft();
      router.replace({ pathname: '/vastgepind', params: { client: queued.clientId } });
    } catch {
      setBusy(false);
      setSaveError('De foto’s klaarmaken lukte niet. Probeer het nog eens, of kies andere foto’s.');
    }
  }

  return (
    <Screen
      header={{ title: 'Vertel er iets over', color: 'lilac', onBack: router.back, character: 'puddle' }}
      footer={
        <Button block onPress={save} busy={busy}>
          {`Vastpinnen in week ${week}!`}
        </Button>
      }
    >
      <View style={styles.thumbs}>
        {draft.photos.slice(0, 4).map((photo, i) => (
          <View key={photo.uri} style={styles.thumb} accessible accessibilityRole="image" accessibilityLabel={`Gekozen foto ${i + 1}`}>
            <Image source={{ uri: photo.uri }} contentFit="cover" style={StyleSheet.absoluteFill} />
            {i === 3 && draft.photos.length > 4 ? (
              <View style={styles.more}>
                <Text style={styles.moreText}>+{draft.photos.length - 4}</Text>
              </View>
            ) : null}
          </View>
        ))}
      </View>
      <TextField label="Bijschrift" value={caption} onChangeText={setCaption} multiline maxLength={500} placeholder="Wat gebeurde er?" />
      <ChoiceGroup label="Is dit een eerste keer?">
        <ChoiceChip selected={!isFirst} onPress={() => setIsFirst(false)}>
          Gewoon een moment
        </ChoiceChip>
        <ChoiceChip selected={isFirst} onPress={() => setIsFirst(true)}>
          Ja, een eerste keer!
        </ChoiceChip>
      </ChoiceGroup>
      {isFirst ? (
        <TextField label={`Wat deed ${name} voor het eerst?`} value={firstLabel} onChangeText={setFirstLabel} maxLength={60} error={error} />
      ) : null}
      <WeekRow week={week} open={picking} onPress={() => setPicking(!picking)} />
      {picking ? (
        <ChoiceGroup label="Kies de week">
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.weeks}>
            {Array.from({ length: current }, (_, i) => current - i).map((w) => (
            <ChoiceChip
              key={w}
              selected={w === week}
              onPress={() => {
                setWeek(w);
                setPicking(false);
              }}
            >
              {`Week ${w}`}
            </ChoiceChip>
          ))}
          </ScrollView>
        </ChoiceGroup>
      ) : null}
      {saveError ? (
        <Text role="alert" style={styles.error}>
          {saveError}
        </Text>
      ) : null}
    </Screen>
  );
}

function WeekRow({ week, open, onPress }: { week: number; open: boolean; onPress: () => void }) {
  const focus = useFocusRing();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Week ${week}. Andere week kiezen`}
      accessibilityState={{ expanded: open }}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={[styles.weekRow, focus.ring]}
    >
      <Icon name="trail" />
      <Text style={styles.weekText}>Week {week}</Text>
      <Text style={[text('meta'), styles.muted]}>{open ? 'kies een week' : 'andere week'}</Text>
      <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}>
        <Icon name="chevron-right" size={20} color={color.inkMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  thumbs: { flexDirection: 'row', gap: 8 },
  thumb: { flex: 1, height: 84, borderRadius: 14, borderWidth: border.edge, borderColor: color.ink, overflow: 'hidden', backgroundColor: color.lilac },
  more: { ...StyleSheet.absoluteFill, backgroundColor: color.ink, opacity: 0.6, alignItems: 'center', justifyContent: 'center' },
  moreText: { fontFamily: fontFamily('sticker', 400), fontSize: 20, color: color.paper },
  error: { ...text('meta'), color: color.plum },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 16,
    borderRadius: radius.radiusM,
    borderWidth: border.edge,
    borderColor: color.ink,
    backgroundColor: color.card,
  },
  weekText: { flex: 1, fontFamily: fontFamily('sans', 800), fontSize: 15, color: color.ink },
  muted: { color: color.inkMuted },
  weeks: { gap: 8, paddingVertical: 4 },
});
