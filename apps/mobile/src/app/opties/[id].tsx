import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { border, color, ListRow, radius, Switch, text, useAnnounce } from '@teddysteps/ui';
import { Photo } from '@/components/Photo';
import { Screen } from '@/components/Screen';
import { friendlyError } from '@/lib/errors';
import { useCircle } from '@/lib/family';
import { deleteMoment, saveToPhone, updateMoment } from '@/lib/moments';
import { useTrailMoments } from '@/lib/trail';

// T8 Moment-opties (board Trail-8): change the words or the week, keep it out of the book, see who
// can see it, keep the photo on the phone, or delete it (back within 30 days, on the trail's banner
// or under Ik → Onlangs verwijderd). No visibility per moment at launch: the whole circle sees
// every moment. A full page rather than the board's sheet, because edit and week open from here.
export default function MomentOptions() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { moments, refresh } = useTrailMoments();
  const { members } = useCircle();
  const m = moments.find((x) => x.momentId === id);
  const [inBook, setInBook] = useState<boolean>();
  const [busy, setBusy] = useState<'book' | 'save' | 'delete' | null>(null);
  const [message, setMessage] = useState<string>();
  useAnnounce(message);
  if (!m) {
    return (
      <Screen header={{ title: 'Opties', color: 'cornflower', onBack: router.back, character: 'bo' }}>
        <Text style={styles.message}>Even zoeken…</Text>
      </Screen>
    );
  }

  const watching = (members ?? []).filter((c) => c.joinedAt).length;
  const title = (m.isFirst ? m.firstLabel : m.caption) || 'Een moment';
  const short = title.length > 40 ? `${title.slice(0, 38).trimEnd()}…` : title;
  const bookValue = inBook ?? m.inBook;

  // The switch flips at once; if saving fails, it flips back.
  async function toggleBook(next: boolean) {
    if (busy) return;
    setBusy('book');
    setInBook(next);
    setMessage(undefined);
    try {
      await updateMoment(m!, { caption: m!.caption ?? '', trailWeek: m!.trailWeek, isFirst: m!.isFirst, firstLabel: m!.firstLabel ?? '', inBook: next });
      await refresh();
    } catch (e) {
      setInBook(!next);
      setMessage(friendlyError(e));
    }
    setBusy(null);
  }

  async function save() {
    if (busy) return;
    setBusy('save');
    setMessage(undefined);
    try {
      const result = await saveToPhone(m!);
      setMessage(
        result === 'denied'
          ? 'TeddySteps mag nog geen foto’s bewaren. Dat zet je aan in de Instellingen van je telefoon.'
          : result === 'partial'
            ? 'Niet alle foto’s lukten. Probeer het zo nog eens.'
            : m!.photos.length === 1
              ? 'De foto staat in je fotobibliotheek.'
              : 'De foto’s staan in je fotobibliotheek.',
      );
    } catch {
      setMessage('Bewaren lukte even niet. Probeer het zo nog eens.');
    }
    setBusy(null);
  }

  function confirmRemove() {
    if (busy) return;
    Alert.alert('Dit moment verwijderen?', 'Het verdwijnt van het pad en ook bij je familie. Je kunt het 30 dagen terugzetten.', [
      { text: 'Toch niet', style: 'cancel' },
      { text: 'Ja, verwijder dit moment', style: 'destructive', onPress: remove },
    ]);
  }

  async function remove() {
    setBusy('delete');
    try {
      await deleteMoment(m!);
      router.dismissTo({ pathname: '/pad', params: { verwijderd: m!.momentId ?? '' } });
    } catch (e) {
      setBusy(null);
      setMessage(friendlyError(e));
    }
  }

  return (
    <Screen header={{ title: 'Opties', subtitle: `Week ${m.trailWeek} · ${short}`, color: 'cornflower', onBack: router.back, character: 'bo' }}>
      <View style={styles.thumb} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Photo source={m.photos[0]?.small} />
      </View>
      <View>
        <ListRow icon="edit" title="Bijschrift aanpassen" onPress={() => router.push(`/bewerken/${id}`)} />
        <ListRow icon="trail" title="Naar een andere week" subtitle={`Staat nu bij week ${m.trailWeek}`} onPress={() => router.push(`/week/${id}`)} />
        <Switch
          label="In het jaarboek"
          hint={bookValue ? 'Dit moment komt in het boek.' : 'Dit moment blijft op het pad, maar niet in het boek.'}
          value={bookValue}
          onValueChange={toggleBook}
        />
        <ListRow
          icon="family"
          title="Wie dit kan zien"
          subtitle={watching === 0 ? 'Nog alleen jullie · nodig je familie uit' : watching === 1 ? 'Familie · 1 persoon' : `Familie · ${watching} mensen`}
          onPress={() => router.push('/familie')}
        />
        <ListRow icon="download" title="Foto bewaren op je telefoon" onPress={save} />
        <ListRow icon="trash" title="Moment verwijderen" subtitle="Je kunt het 30 dagen terugzetten" danger onPress={confirmRemove} chevron={false} />
      </View>
      {message ? (
        <Text role="status" style={[text('meta'), styles.message]}>
          {message}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  thumb: { width: 96, height: 96, borderRadius: radius.radiusM, borderWidth: border.edge, borderColor: color.ink, overflow: 'hidden', backgroundColor: color.butter },
  message: { ...text('meta'), color: color.inkMuted },
});
