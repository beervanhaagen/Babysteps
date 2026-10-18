import { Animated, Linking, StyleSheet, Text, View } from 'react-native';
import { border, Button, Character, color, Icon, radius, shadow, text, useLoop } from '@teddysteps/ui';
import { TextLink } from '@/components/TextLink';
import { Photo } from '@/components/Photo';
import { run, type QueuedMoment } from '@/lib/queue';

// X2 (offline) and X4 (upload failed) on the trail, for moments that are not visible yet.
// Once family can see a moment, its print version finishes quietly in the background.
export function UploadStatus({ queue, online }: { queue: QueuedMoment[]; online: boolean }) {
  const waiting = queue.filter((q) => q.stage !== 'visible');
  if (!waiting.length) return null;
  const failed = online && waiting.some((q) => q.failedAt);
  const photos = waiting.reduce((n, q) => n + q.photos.length, 0);

  return (
    <View style={styles.wrap}>
      {!online ? (
        <Banner tone="sunshine" icon="offline" title="Je bent offline">
          {`${photos === 1 ? '1 foto staat' : `${photos} foto’s staan`} veilig op je telefoon en ${photos === 1 ? 'komt' : 'komen'} op het pad zodra je weer verbinding hebt.`}
        </Banner>
      ) : failed ? (
        <Banner tone="rose" icon="offline" title="Uploaden lukte even niet">
          Geen zorgen: je foto’s staan nog veilig op je telefoon. We proberen het zelf nog een paar keer.
        </Banner>
      ) : null}
      {waiting.map((q) => (
        <Item key={q.clientId} item={q} online={online} />
      ))}
      {failed ? (
        <>
          <Button size="md" block onPress={() => void run()}>
            Nu opnieuw proberen
          </Button>
          <TextLink onPress={() => Linking.openURL('mailto:feedback@teddysteps.nl?subject=Uploaden%20lukt%20niet')}>
            Blijft het misgaan? Laat het ons weten
          </TextLink>
        </>
      ) : null}
    </View>
  );
}

function Banner({ tone, icon, title, children }: { tone: 'sunshine' | 'rose'; icon: 'offline'; title: string; children: string }) {
  const drift = useLoop('drift');
  return (
    <View role="status" accessibilityLiveRegion="polite" style={[styles.banner, { backgroundColor: color[tone] }]}>
      <Animated.View style={{ transform: drift }}>
        <Character name="bizzy" size={52} decorative motion={null} />
      </Animated.View>
      <View style={styles.grow}>
        <View style={styles.bannerTitle}>
          <Icon name={icon} size={20} />
          <Text style={text('rowTitle')}>{title}</Text>
        </View>
        <Text style={[text('meta'), { fontSize: 14, lineHeight: 20 }]}>{children}</Text>
      </View>
    </View>
  );
}

function Item({ item, online }: { item: QueuedMoment; online: boolean }) {
  const name = (item.isFirst ? item.firstLabel : item.caption) || 'Moment';
  const progress = item.stage === 'new' ? 0.15 : 0.6;
  const status = !online ? 'Wacht op verbinding' : item.failedAt ? 'Niet gelukt · over 1 minuut opnieuw' : 'Bezig met uploaden';
  return (
    <View style={styles.item} accessible accessibilityLabel={`${name}, week ${item.trailWeek}. ${status}.`}>
      <View style={styles.thumb}>
        <Photo source={{ local: item.photos[0].small }} />
      </View>
      <View style={[styles.grow, { gap: 8 }]}>
        <Text style={text('rowTitle')} numberOfLines={1}>
          {name} · week {item.trailWeek}
        </Text>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: item.failedAt && online ? color.tomato : color.bluebird }]} />
        </View>
        <Text style={[text('meta'), styles.muted]}>{status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  grow: { flex: 1, minWidth: 0 },
  muted: { color: color.inkMuted },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: border.edge,
    borderColor: color.ink,
    boxShadow: shadow.shadowMd,
  },
  bannerTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
    borderRadius: radius.radiusL,
    borderWidth: border.edge,
    borderColor: color.ink,
    backgroundColor: color.white,
  },
  thumb: { width: 90, height: 90, borderRadius: 14, borderWidth: border.edge, borderColor: color.ink, overflow: 'hidden', backgroundColor: color.pistachio },
  track: { height: 10, borderRadius: 5, borderWidth: border.edge, borderColor: color.ink, backgroundColor: color.lilac, overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
});
