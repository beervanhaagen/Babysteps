import { ageLine, longDutchDate, possessive, todayInAmsterdam, trailWeek, type CalendarDate } from '@teddysteps/core';
import { useState } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { border, Button, Character, color, fontFamily, IconButton, Scallop, shadow, text, Wordmark } from '@teddysteps/ui';
import { api, type FamilyMoment, type FamilyPage } from '../api';
import { navigate, useView } from '../route';
import { Heading, Page, Photo, TextLink } from './shared';

const WIDE = 900;
const FREQUENCY = {
  each: 'Bij elk nieuw moment krijg je een mailtje.',
  weekly: 'Elke zondag krijg je één mailtje met de nieuwe momenten.',
  never: 'Je krijgt geen mailtjes; je kijkt hier mee.',
} as const;

// F3 Kaartjes, and F7 on a laptop: newest first, grouped by week, big photos, one big button.
// "Inspreken" (voice notes) comes in step 6. Header in pistachio, the design system's colour for
// family; the boards' rose is an accent, not a header block. The parents' names aren't asked
// yet, so F7's "Sam en Alex" reads "de ouders".
interface CardsProps {
  page: FamilyPage;
  onHugged: (id: string, counts: { mine: number; total: number }) => void;
  onOlder: () => Promise<void>;
  onBookList: () => void;
}

export function Cards({ page, onHugged, onOlder, onBookList }: CardsProps) {
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

  const empty = (
    <View style={styles.empty}>
      <Character name="bo" size={110} decorative />
      <Text style={[text('titleM'), { textAlign: 'center' }]}>Nog geen kaartjes</Text>
      <Text style={styles.emptyText}>Zodra er een moment op {possessive(name)} pad staat, zie je het hier.</Text>
    </View>
  );

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
        {wide ? (
          <View style={styles.columns}>
            <View style={styles.main}>
              {page.moments.length ? (
                <>
                  <Text style={[styles.groupTitle, { fontSize: 20 }]}>{page.moments[0].week === week ? 'Nieuw deze week' : 'Het nieuwste moment'}</Text>
                  <Card moment={page.moments[0]} size="lg" tilt={-0.6} onHugged={onHugged} />
                  {page.moments.length > 1 ? <Text style={[styles.groupTitle, { fontSize: 20 }]}>Eerder</Text> : null}
                  <View style={styles.grid}>
                    {page.moments.slice(1).map((m, i) => (
                      <View key={m.id} style={styles.gridCell}>
                        <Card moment={m} size="sm" tilt={i % 2 ? 0.6 : -0.6} onHugged={onHugged} />
                      </View>
                    ))}
                  </View>
                  <Older more={page.more} onOlder={onOlder} />
                </>
              ) : (
                empty
              )}
            </View>
            <Aside page={page} onBookList={onBookList} />
          </View>
        ) : groups.length ? (
          groups.map((group) => (
            <View key={group.title} style={styles.group}>
              <Text style={styles.groupTitle}>{group.title}</Text>
              <View style={styles.cards}>
                {group.moments.map((m, i) => (
                  <Card key={m.id} moment={m} size="md" tilt={i % 2 ? 1 : -1} onHugged={onHugged} />
                ))}
              </View>
            </View>
          ))
        ) : (
          empty
        )}
        {!wide && groups.length ? <Older more={page.more} onOlder={onOlder} /> : null}
      </Page>
    </View>
  );
}

/** Twelve postcards at a time; older ones on request, so a full year stays light. */
function Older({ more, onOlder }: { more: boolean; onOlder: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  if (!more) return null;
  return (
    <Button
      block
      variant="paper"
      busy={busy}
      onPress={async () => {
        setBusy(true);
        await onOlder().catch(() => undefined);
        setBusy(false);
      }}
    >
      Eerdere kaartjes
    </Button>
  );
}

/** F7's side column: hello, your postcards, your own book, and what this page is. */
function Aside({ page, onBookList }: { page: FamilyPage; onBookList: () => void }) {
  const name = page.child.firstName;
  const sent = page.moments.reduce((n, m) => n + m.myHugs, 0);
  async function joinList() {
    await api.bookList();
    onBookList();
  }
  return (
    <View style={styles.aside}>
      <View style={[styles.panel, { backgroundColor: color.lilac }]}>
        <Text style={styles.eyebrow}>Hallo {page.me.label}</Text>
        <Text style={[text('titleM'), { fontSize: 24, lineHeight: 28 }]}>{sent === 1 ? 'Al 1 knuffel gestuurd' : `Al ${sent} knuffels gestuurd`}</Text>
        <Text style={styles.panelText}>De ouders zien elke knuffel terug, en ze komen straks ook in het jaarboek.</Text>
      </View>
      <View style={[styles.panel, { backgroundColor: color.white }]}>
        <Text style={styles.panelTitle}>Je kaartjes</Text>
        <Text style={styles.panelText}>{FREQUENCY[page.me.frequency]}</Text>
        <TextLink onPress={() => navigate('/instellingen')}>Wijzig hoe vaak</TextLink>
      </View>
      <View style={[styles.panel, { backgroundColor: color.butter }]}>
        <Text style={styles.panelTitle}>Een eigen boek?</Text>
        <Text style={styles.panelText}>Na een jaar wordt {possessive(name)} pad een boek. Wil je er zelf ook een?</Text>
        {page.me.onBookList ? (
          <Text role="status" style={styles.panelTitle}>
            Genoteerd! We laten het je weten.
          </Text>
        ) : (
          <Button size="md" variant="sunshine" onPress={joinList}>
            Laat het me weten
          </Button>
        )}
      </View>
      <Text style={styles.private}>Deze pagina is privé: alleen wie een persoonlijke uitnodiging kreeg, kan hem openen.</Text>
    </View>
  );
}

function Card({ moment: m, size, tilt, onHugged }: { moment: FamilyMoment; size: 'sm' | 'md' | 'lg'; tilt: number; onHugged: CardsProps['onHugged'] }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  async function hug() {
    setBusy(true);
    setFailed(false);
    try {
      onHugged(m.id, await api.hug(m.id));
      navigate('/verstuurd');
    } catch {
      setBusy(false);
      setFailed(true);
    }
  }
  const title = (m.isFirst ? m.firstLabel : m.caption) ?? `Een moment uit week ${m.week}`;
  const facts = [m.isFirst && size !== 'sm' ? m.caption : null, longDutchDate(m.day as CalendarDate)];
  return (
    <View style={[styles.card, { transform: [{ rotate: `${tilt}deg` }] }]}>
      <View style={[styles.photo, size === 'lg' && { height: 300 }, size === 'sm' && { height: 150 }]}>
        <Photo uri={m.photos[0]?.url} label={`Foto: ${m.caption ?? title}`} />
      </View>
      <View style={styles.words}>
        <Text style={styles.eyebrow}>{`Week ${m.week}${m.isFirst ? ' · eerste keer!' : ''}`}</Text>
        <Text role="heading" style={[styles.cardTitle, size === 'lg' && { fontSize: 32, lineHeight: 37 }, size === 'sm' && { fontSize: 22, lineHeight: 26 }]}>
          {title}
        </Text>
        <Text style={[styles.meta, size === 'lg' && { fontSize: 18 }]}>{facts.filter(Boolean).join(' · ')}</Text>
        {m.myHugs ? (
          <Text style={styles.mine}>{m.myHugs === 1 ? 'Je knuffelde dit' : `Je knuffelde dit ${m.myHugs} keer`}</Text>
        ) : m.hugs ? (
          <Text style={styles.meta}>{m.hugs === 1 ? '1 knuffel' : `${m.hugs} knuffels`}</Text>
        ) : null}
      </View>
      <View style={styles.actions}>
        <Button icon="heart" block={size !== 'lg'} busy={busy} onPress={hug} accessibilityLabel={`Knuffelen: ${title}`}>
          {m.myHugs ? 'Nog een knuffel' : 'Knuffelen'}
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
  columns: { flexDirection: 'row', gap: 40, alignItems: 'flex-start' },
  main: { flex: 1, minWidth: 0, gap: 14 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -12 },
  gridCell: { width: '50%', padding: 12 },
  aside: { width: 360, gap: 16, paddingTop: 38 },
  panel: { gap: 8, padding: 18, borderRadius: 22, borderWidth: border.edge, borderColor: color.ink, boxShadow: shadow.shadowMd, alignItems: 'flex-start' },
  panelTitle: { fontFamily: fontFamily('sans', 800), fontSize: 17, color: color.ink },
  panelText: { fontFamily: fontFamily('sans', 700), fontSize: 15, lineHeight: 22, color: color.ink },
  private: { fontFamily: fontFamily('sans', 700), fontSize: 14, lineHeight: 20, color: color.inkMuted },
  group: { gap: 12, marginTop: 4 },
  groupTitle: { fontFamily: fontFamily('sans', 800), fontSize: 17, color: color.ink },
  cards: { gap: 18 },
  card: {
    gap: 10,
    padding: 10,
    borderRadius: 26,
    borderWidth: border.edgeBold,
    borderColor: color.ink,
    backgroundColor: color.white,
    boxShadow: shadow.shadowLg,
  },
  photo: { height: 200, borderRadius: 18, borderWidth: border.edge, borderColor: color.ink, overflow: 'hidden', backgroundColor: color.lilac },
  words: { paddingHorizontal: 8, gap: 2 },
  eyebrow: { ...text('eyebrow'), fontSize: 14, letterSpacing: 1.7, textTransform: 'uppercase' },
  cardTitle: { ...text('titleM'), fontSize: 25, lineHeight: 29 },
  meta: { fontFamily: fontFamily('sans', 700), fontSize: 15, lineHeight: 21, color: color.inkMuted },
  mine: { fontFamily: fontFamily('sans', 800), fontSize: 15, lineHeight: 21, color: color.ink },
  actions: { paddingHorizontal: 4, paddingBottom: 6 },
  error: { fontFamily: fontFamily('sans', 700), fontSize: 15, color: color.plum, paddingHorizontal: 8, paddingBottom: 6 },
  empty: { alignItems: 'center', gap: 12, paddingTop: 40 },
  emptyText: { fontFamily: fontFamily('sans', 400), fontSize: 17, lineHeight: 25, color: color.ink, textAlign: 'center' },
});
