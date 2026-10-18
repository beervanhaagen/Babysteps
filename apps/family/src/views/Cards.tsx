import { ageLine, longDutchDate, possessive, todayInAmsterdam, trailWeek, type CalendarDate } from '@teddysteps/core';
import { useState } from 'react';
import { Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { border, Button, Character, color, fontFamily, IconButton, Scallop, shadow, text, Wordmark } from '@teddysteps/ui';
import { api, type FamilyMoment, type FamilyPage } from '../api';
import { navigate, useView } from '../route';
import { Heading, Page } from './shared';

const WIDE = 900;

// F3 Kaartjes, and F7 on a laptop: newest first, grouped by week, big photos, one big button.
// "Inspreken" (voice notes) comes in step 6. Header in pistachio, the design system's colour for
// family; the boards' rose is an accent, not a header block.
export function Cards({ page, onChange }: { page: FamilyPage; onChange: () => void }) {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const name = page.child.firstName;
  const today = todayInAmsterdam();
  const birth = page.child.birthDate as CalendarDate | null;
  const week = birth ? trailWeek(birth, today) : null;
  useView(`${possessive(name)} pad`);

  const groups: { title: string; moments: FamilyMoment[] }[] = [
    { title: 'Nieuw deze week', moments: page.moments.filter((m) => m.week === week) },
    { title: 'Vorige week', moments: page.moments.filter((m) => week && m.week === week - 1) },
    { title: 'Eerder', moments: page.moments.filter((m) => !week || m.week < week - 1) },
  ].filter((g) => g.moments.length);

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={[styles.band, wide && styles.bandWide]}>
          <View style={[styles.bar, wide && styles.inner]}>
            {wide ? <Wordmark size={26} tone="header" /> : null}
            <View style={styles.avatar}>
              <Character name="bo" size={44} motion={null} decorative />
            </View>
            <View style={styles.grow}>
              <Heading style={wide ? styles.titleWide : styles.title}>{wide ? `${possessive(name)} pad` : name}</Heading>
              {birth ? <Text style={[styles.age, wide && { fontSize: 18 }]}>{ageLine(birth, today)}</Text> : null}
            </View>
            <IconButton icon="settings" label="Kaartjes instellen" tone="white" onPress={() => navigate('/instellingen')} />
          </View>
        </View>
        <Scallop color="pistachio" />
        <View style={[styles.peek, wide && styles.peekWide]}>
          <Character name="puddle" size={70} rotate={-6} decorative />
        </View>
      </View>
      <Page wide={wide}>
        {groups.length ? (
          groups.map((group) => (
            <View key={group.title} style={styles.group}>
              <Text style={[styles.groupTitle, wide && { fontSize: 20 }]}>{group.title}</Text>
              <View style={[styles.cards, wide && styles.cardsWide]}>
                {group.moments.map((m, i) => (
                  <Card key={m.id} moment={m} wide={wide} tilt={i % 2 ? 1 : -1} onHugged={onChange} />
                ))}
              </View>
            </View>
          ))
        ) : (
          <View style={styles.empty}>
            <Character name="bo" size={110} decorative />
            <Text style={[text('titleM'), { textAlign: 'center' }]}>Nog geen kaartjes</Text>
            <Text style={styles.emptyText}>Zodra er een moment op {possessive(name)} pad staat, zie je het hier.</Text>
          </View>
        )}
      </Page>
    </View>
  );
}

function Card({ moment: m, wide, tilt, onHugged }: { moment: FamilyMoment; wide: boolean; tilt: number; onHugged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function hug() {
    setBusy(true);
    setFailed(false);
    try {
      await api.hug(m.id);
      onHugged();
      navigate('/verstuurd');
    } catch {
      setBusy(false);
      setFailed(true);
    }
  }
  const photo = m.photos[0];
  const title = (m.isFirst ? m.firstLabel : m.caption) ?? `Een moment uit week ${m.week}`;
  const uri = wide ? (photo?.view ?? photo?.small) : (photo?.small ?? photo?.view);
  return (
    <View style={[styles.card, wide && styles.cardWide, { transform: [{ rotate: `${wide ? tilt * 0.6 : tilt}deg` }] }]}>
      <View style={[styles.photo, wide && { height: 300 }]} accessible accessibilityRole="image" accessibilityLabel={`Foto: ${m.caption ?? title}`}>
        {uri ? <Image source={{ uri }} resizeMode="cover" style={StyleSheet.absoluteFill} /> : null}
      </View>
      <View style={styles.words}>
        <Text style={styles.eyebrow}>{`Week ${m.week}${m.isFirst ? ' · eerste keer!' : ''}`}</Text>
        <Text role="heading" style={[styles.cardTitle, wide && { fontSize: 32, lineHeight: 37 }]}>
          {title}
        </Text>
        <Text style={[styles.meta, wide && { fontSize: 18 }]}>
          {[m.isFirst ? m.caption : null, longDutchDate(m.day as CalendarDate)].filter(Boolean).join(' · ')}
          {m.hugs ? ` · ${m.hugs === 1 ? '1 knuffel' : `${m.hugs} knuffels`}` : ''}
        </Text>
      </View>
      <View style={styles.actions}>
        <Button icon="heart" block={!wide} busy={busy} onPress={hug} accessibilityLabel={`Knuffelen: ${title}`}>
          Knuffelen
        </Button>
      </View>
      {failed ? (
        <Text role="alert" style={styles.error}>
          Je knuffel kwam niet aan. Probeer het zo nog eens.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  header: { position: 'relative', zIndex: 1 },
  band: { backgroundColor: color.pistachio, paddingHorizontal: 20, paddingBottom: 6 },
  bandWide: { paddingHorizontal: 80, paddingBottom: 10 },
  inner: { width: '100%', maxWidth: 1120, alignSelf: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: border.edgeBold,
    borderColor: color.ink,
    backgroundColor: color.lilac,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  grow: { flex: 1, minWidth: 0 },
  title: { fontSize: 24, lineHeight: 28 },
  titleWide: { fontSize: 34, lineHeight: 38 },
  age: { fontFamily: fontFamily('sans', 800), fontSize: 16, color: color.ink },
  peek: { position: 'absolute', right: 64, top: 2, pointerEvents: 'none' },
  peekWide: { right: '20%' },
  group: { gap: 12, marginTop: 4 },
  groupTitle: { fontFamily: fontFamily('sans', 800), fontSize: 17, color: color.ink },
  cards: { gap: 18 },
  cardsWide: { flexDirection: 'row', flexWrap: 'wrap', gap: 28 },
  card: {
    gap: 10,
    padding: 10,
    borderRadius: 26,
    borderWidth: border.edgeBold,
    borderColor: color.ink,
    backgroundColor: color.white,
    boxShadow: shadow.shadowLg,
  },
  cardWide: { width: '48%' },
  photo: { height: 200, borderRadius: 18, borderWidth: border.edge, borderColor: color.ink, overflow: 'hidden', backgroundColor: color.lilac },
  words: { paddingHorizontal: 8, gap: 2 },
  eyebrow: { ...text('eyebrow'), fontSize: 14, letterSpacing: 1.7, textTransform: 'uppercase' },
  cardTitle: { ...text('titleM'), fontSize: 25, lineHeight: 29 },
  meta: { fontFamily: fontFamily('sans', 700), fontSize: 15, lineHeight: 21, color: color.inkMuted },
  actions: { paddingHorizontal: 4, paddingBottom: 6, flexDirection: 'row' },
  error: { fontFamily: fontFamily('sans', 700), fontSize: 15, color: color.plum, paddingHorizontal: 8, paddingBottom: 6 },
  empty: { alignItems: 'center', gap: 12, paddingTop: 40 },
  emptyText: { fontFamily: fontFamily('sans', 400), fontSize: 17, lineHeight: 25, color: color.ink, textAlign: 'center' },
});
