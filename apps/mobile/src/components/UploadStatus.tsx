import { Linking, StyleSheet, Text, View } from 'react-native';
import { Banner, border, Button, color, radius, text } from '@teddysteps/ui';
import { Photo } from '@/components/Photo';
import { TextLink } from '@/components/TextLink';
import { removeStuck, run, type QueuedMoment } from '@/lib/queue';

// X2 (offline) and X4 (upload failed) on the trail, for moments that are not visible yet.
// Once family can see a moment, its print version finishes quietly in the background,
// unless it gets stuck: then it shows here too, so nothing is lost without a word.
export function UploadStatus({ queue, online }: { queue: QueuedMoment[]; online: boolean }) {
  const waiting = queue.filter((q) => q.stage !== 'visible' || q.stuck);
  if (!waiting.length) return null;
  const failed = online && waiting.some((q) => q.failedAt);
  const photos = waiting.reduce((n, q) => n + q.photos.length, 0);

  return (
    <View style={styles.wrap}>
      {!online ? (
        <Banner tone="sunshine" character="bizzy" title="Je bent offline">
          {`${photos === 1 ? '1 foto staat' : `${photos} foto’s staan`} veilig op je telefoon en ${photos === 1 ? 'komt' : 'komen'} op het pad zodra je weer verbinding hebt.`}
        </Banner>
      ) : failed ? (
        <Banner tone="rose" character="bizzy" title="Uploaden lukte even niet">
          Geen zorgen: je foto’s staan nog veilig op je telefoon. We proberen het zelf nog een paar keer.
        </Banner>
      ) : null}
      {waiting.map((q) => (
        <Item key={q.clientId} item={q} online={online} />
      ))}
      {failed ? (
        <>
          {waiting.some((q) => q.failedAt && !q.stuck) ? (
            <Button size="md" block onPress={() => void run(true)}>
              Nu opnieuw proberen
            </Button>
          ) : null}
          <TextLink onPress={() => Linking.openURL('mailto:feedback@teddysteps.nl?subject=Uploaden%20lukt%20niet')}>
            Blijft het misgaan? Laat het ons weten
          </TextLink>
        </>
      ) : null}
    </View>
  );
}

function minutesUntil(iso?: string) {
  const minutes = iso ? Math.max(1, Math.round((Date.parse(iso) - Date.now()) / 60_000)) : 1;
  return minutes === 1 ? 'over 1 minuut' : `over ${minutes} minuten`;
}

function Item({ item, online }: { item: QueuedMoment; online: boolean }) {
  const name = (item.isFirst ? item.firstLabel : item.caption) || 'Moment';
  const progress = item.stage === 'new' ? 0.15 : item.stage === 'created' ? 0.6 : 0.9;
  const status = !online
    ? 'Wacht op verbinding'
    : item.stuck
      ? 'Dit lukt niet meer. Je kunt het van je telefoon halen.'
      : item.failedAt
        ? `Niet gelukt · ${minutesUntil(item.nextTryAt)} opnieuw`
        : 'Bezig met uploaden';
  const trouble = online && !!item.failedAt;
  return (
    <View style={styles.item}>
      <View style={styles.row} accessible accessibilityLabel={`${name}, week ${item.trailWeek}. ${status}`}>
        <View style={styles.thumb}>
          <Photo source={{ local: item.photos[0].small }} />
        </View>
        <View style={[styles.grow, { gap: 8 }]}>
          <Text style={text('rowTitle')} numberOfLines={1}>
            {name} · week {item.trailWeek}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: trouble ? color.plum : color.bluebird }]} />
          </View>
          <Text style={[text('meta'), styles.muted]}>{status}</Text>
        </View>
      </View>
      {item.stuck ? (
        <Button size="md" variant="paper" icon="trash" onPress={() => void removeStuck(item.clientId)}>
          Van telefoon verwijderen
        </Button>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  grow: { flex: 1, minWidth: 0 },
  muted: { color: color.inkMuted },
  item: {
    gap: 10,
    padding: 8,
    borderRadius: radius.radiusL,
    borderWidth: border.edge,
    borderColor: color.ink,
    backgroundColor: color.white,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  thumb: { width: 90, height: 90, borderRadius: 14, borderWidth: border.edge, borderColor: color.ink, overflow: 'hidden', backgroundColor: color.pistachio },
  track: { height: 10, borderRadius: 5, borderWidth: border.edge, borderColor: color.ink, backgroundColor: color.lilac, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
});
