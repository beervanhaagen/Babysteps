import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { border, Button, ChoiceChip, color, fontFamily, text, useAnnounce, useFocusRing } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';
import { setDraft, useDraft } from '@/lib/draft';
import { MAX_PHOTOS, pickPhotos, takePhoto, type PickedPhoto } from '@/lib/photos';

// A2 Foto's: "Kies de mooiste". The board shows an in-app gallery of the whole photo library;
// we use the system picker instead (no access to all photos needed, bouwplan §4), so this
// screen shows what was picked, lets the parent drop some and add more or use the camera.
// Header in lilac like A3: the board's tangerine is Tiggy's colour, not a header block.
export default function Photos() {
  const draft = useDraft();
  const [photos, setPhotos] = useState<PickedPhoto[]>(draft.photos);
  // Indexes into `photos`, in the order chosen: the first is the cover on the trail.
  const [order, setOrder] = useState<number[]>(draft.photos.map((_, i) => i));
  const [message, setMessage] = useState<string>();
  useAnnounce(message);

  const toggle = (i: number) =>
    setOrder((current) => (current.includes(i) ? current.filter((x) => x !== i) : current.length < MAX_PHOTOS ? [...current, i] : current));

  async function add(source: 'library' | 'camera') {
    setMessage(undefined);
    const room = MAX_PHOTOS - order.length;
    if (room <= 0) return setMessage(`Je kunt maximaal ${MAX_PHOTOS} foto’s kiezen.`);
    const picked = source === 'camera' ? await takePhoto() : await pickPhotos(room);
    if (picked === null) return setMessage('Geen toegang tot de camera. Je kunt dat aanzetten in de instellingen van je telefoon.');
    const added = picked.slice(0, room);
    setPhotos((current) => [...current, ...added]);
    setOrder((current) => [...current, ...added.map((_, k) => photos.length + k)]);
  }

  function next() {
    setDraft({ photos: order.map((i) => photos[i]) });
    router.push('/details');
  }

  const n = order.length;
  return (
    <Screen
      header={{ title: 'Kies de mooiste', color: 'lilac', onBack: router.back, character: 'bizzy', characterRotate: -8 }}
      footer={
        <View style={styles.footer}>
          <Text style={styles.count}>{n === 1 ? '1 foto gekozen' : `${n} foto’s gekozen`}</Text>
          <Button onPress={next} disabled={!n}>
            Volgende
          </Button>
        </View>
      }
    >
      <View style={styles.chips}>
        <ChoiceChip onPress={() => add('library')}>Meer kiezen</ChoiceChip>
        <ChoiceChip onPress={() => add('camera')}>Camera</ChoiceChip>
      </View>
      {message ? (
        <Text role="alert" style={styles.message}>
          {message}
        </Text>
      ) : null}
      <View style={styles.grid}>
        {photos.map((photo, i) => (
          <Thumb key={photo.uri + i} photo={photo} index={i} rank={order.indexOf(i)} onPress={() => toggle(i)} />
        ))}
      </View>
    </Screen>
  );
}

function Thumb({ photo, index, rank, onPress }: { photo: PickedPhoto; index: number; rank: number; onPress: () => void }) {
  const focus = useFocusRing();
  const chosen = rank >= 0;
  return (
    <View style={styles.cell}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={chosen ? `Foto ${index + 1}, keuze ${rank + 1}` : `Foto ${index + 1}`}
        accessibilityState={{ selected: chosen }}
        onPress={onPress}
        onFocus={focus.onFocus}
        onBlur={focus.onBlur}
        style={[styles.thumb, chosen && styles.chosen, chosen && { transform: [{ rotate: rank % 2 ? '2deg' : '-2deg' }] }, focus.ring]}
      >
        <Image source={{ uri: photo.uri }} contentFit="cover" style={StyleSheet.absoluteFill} accessible={false} />
        <View style={[styles.mark, chosen && styles.markOn]}>{chosen ? <Text style={styles.rank}>{rank + 1}</Text> : null}</View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  message: { ...text('meta'), color: color.plum },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  cell: { width: '33.333%', aspectRatio: 1, padding: 4 },
  thumb: { flex: 1, borderRadius: 14, overflow: 'hidden', backgroundColor: color.lilac },
  chosen: { borderWidth: 3, borderColor: color.ink },
  mark: {
    position: 'absolute',
    right: 6,
    top: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: border.edgeBold,
    borderColor: color.ink,
    backgroundColor: color.white,
    opacity: 0.75,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markOn: { width: 30, height: 30, borderRadius: 15, backgroundColor: color.tangerine, opacity: 1 },
  rank: { fontFamily: fontFamily('sticker', 400), fontSize: 15, color: color.ink, includeFontPadding: false },
  footer: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  count: { flex: 1, fontFamily: fontFamily('sans', 800), fontSize: 16, color: color.ink },
});
