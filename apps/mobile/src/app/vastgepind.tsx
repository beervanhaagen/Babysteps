import { possessive } from '@teddysteps/core';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { border, Button, Character, color, fontFamily, IconButton, shadow, space, text } from '@teddysteps/ui';
import { Doodles } from '@/components/Doodles';
import { Photo } from '@/components/Photo';
import { useAuth } from '@/lib/auth';
import { askOnce, willAsk } from '@/lib/push';
import { getQueue } from '@/lib/queue';
import { useQueue } from '@/lib/trail';

// A4 Vastgepind! A full-colour delight screen. It shows at once, also offline: the moment is
// safe on the phone and the queue takes it from here. After the first moment, one line says what
// notifications are for and the system question follows a second later (CLAUDE.md: no separate
// permission screen). Sharing outside TeddySteps (SH2) comes in a later step.
export default function Pinned() {
  const insets = useSafeAreaInsets();
  const { client } = useLocalSearchParams<{ client: string }>();
  const { state } = useAuth();
  const { online } = useQueue();
  // A snapshot: the queue may finish (and forget) this moment while we celebrate.
  const [moment] = useState(() => getQueue().find((q) => q.clientId === client));
  const [asking, setAsking] = useState(false);
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    willAsk().then((ask) => {
      if (!alive || !ask) return;
      setAsking(true);
      timer = setTimeout(() => askOnce().catch(() => undefined), 1000);
    });
    return () => {
      alive = false;
      if (timer) clearTimeout(timer);
    };
  }, []);
  if (!moment || state.status !== 'ready') return <Redirect href="/pad" />;

  const name = state.trail.childName;
  const title = (moment.isFirst ? moment.firstLabel : moment.caption) || 'Een moment';
  const toTrail = () => router.replace('/pad');

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <Doodles />
      <View style={styles.bar}>
        <IconButton icon="close" label="Sluiten" onPress={toTrail} />
      </View>
      <View style={styles.middle}>
        <View style={styles.art} accessible accessibilityRole="image" accessibilityLabel={`Foto: ${title}, week ${moment.trailWeek}`}>
          <View style={styles.card}>
            <View style={styles.photo}>
              <Photo source={{ local: moment.photos[0].view }} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.eyebrow}>{`Week ${moment.trailWeek}${moment.isFirst ? ' · eerste keer!' : ''}`}</Text>
              <Text style={styles.cardTitle} numberOfLines={2}>
                {title}
              </Text>
            </View>
          </View>
          <View style={styles.tiggy}>
            <Character name="tiggy" mood="happy" size={96} motion="hop" decorative />
          </View>
          <View style={styles.bizzy}>
            <Character name="bizzy" mood="happy" size={70} delay={2} decorative />
          </View>
        </View>
        <Text accessibilityRole="header" style={[text('display'), styles.center]}>
          Vastgepind in week {moment.trailWeek}!
        </Text>
        <Text style={[styles.body, styles.center]}>
          {moment.isFirst ? 'Een eerste keer! Tiggy kwam kijken.' : `Het staat op ${possessive(name)} pad.`}
          {online ? '' : ' Het wacht veilig op je telefoon tot je weer verbinding hebt.'}
        </Text>
        {asking ? <Text style={[styles.body, styles.center]}>Zet meldingen aan, dan hoor je ’s avonds wie {name} een knuffel stuurde.</Text> : null}
      </View>
      <View style={[styles.footer, { paddingBottom: space.space6 + insets.bottom }]}>
        <Button block variant="dark" onPress={toTrail}>
          Terug naar het pad
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.rose },
  bar: { height: 56, justifyContent: 'center', paddingHorizontal: 10 },
  middle: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 22 },
  art: { width: 320, height: 270 },
  card: {
    position: 'absolute',
    left: 34,
    top: 16,
    width: 210,
    padding: 8,
    borderRadius: 18,
    borderWidth: border.edgeBold,
    borderColor: color.ink,
    backgroundColor: color.white,
    boxShadow: shadow.shadowLg,
    transform: [{ rotate: '-6deg' }],
  },
  photo: { height: 136, borderRadius: 12, borderWidth: border.edge, borderColor: color.ink, overflow: 'hidden', backgroundColor: color.pistachio },
  cardText: { paddingTop: 8, paddingHorizontal: 4, paddingBottom: 2 },
  eyebrow: { ...text('eyebrow'), fontSize: 11, textTransform: 'uppercase' },
  cardTitle: { ...text('titleS'), fontSize: 17 },
  tiggy: { position: 'absolute', right: -6, bottom: -6 },
  bizzy: { position: 'absolute', left: -8, bottom: 6 },
  center: { textAlign: 'center' },
  body: { fontFamily: fontFamily('sans', 400), fontSize: 16, lineHeight: 24, color: color.ink },
  footer: { paddingTop: 12, paddingHorizontal: space.space6 },
});
