import { ageLine, longDutchDate, possessive, todayInAmsterdam, trailWeek, weekSpan, type CalendarDate } from '@teddysteps/core';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { border, Button, Character, color, fontFamily, IconButton, Scallop, shadow, text, useFocusRing, webAria, Wordmark } from '@teddysteps/ui';
import { api, NotAllowed, type FamilyMoment, type FamilyPage } from '../api';
import { navigate, useView } from '../route';
import { Heading, Page, Photo, TextLink } from './shared';

const WIDE = 900;
const FREQUENCY = {
  each: 'Bij elk nieuw moment krijg je een mailtje.',
  weekly: 'Elke zondag krijg je één mailtje met de nieuwe momenten.',
  never: 'Je krijgt geen mailtjes; je kijkt hier mee.',
} as const;

// F3 Kaartjes, and F7 on a laptop: newest first, as a timeline of weeks (owner, 25 October 2026),
// one big button. A tap on a photo opens the big view (Viewer) at that photo.
// "Inspreken" (voice notes) comes in step 6. Header in pistachio, the design system's colour for
// family; the boards' rose is an accent, not a header block. The parents' names aren't asked
// yet, so F7's "Sam en Alex" reads "de ouders".
interface CardsProps {
  page: FamilyPage;
  onHugged: (id: string, counts: { mine: number; total: number }) => void;
  onOlder: () => Promise<void>;
  onOpen: (moment: string, photo: number) => void;
}

export function Cards({ page, onHugged, onOlder, onOpen }: CardsProps) {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const name = page.child.firstName;
  const today = todayInAmsterdam();
  const birth = page.child.birthDate as CalendarDate | null;
  const week = birth ? trailWeek(birth, today) : null;
  useView(`${possessive(name)} pad`);

  // Newest week first, the moments of each week together.
  const weeks: [number, FamilyMoment[]][] = [];
  for (const m of page.moments) {
    const last = weeks[weeks.length - 1];
    if (last && last[0] === m.week) last[1].push(m);
    else weeks.push([m.week, [m]]);
  }

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
        <View style={wide ? styles.columns : styles.single}>
          <View style={styles.main}>
            {weeks.length ? (
              <>
                <View style={styles.timeline}>
                  <View style={styles.rail} aria-hidden />
                  {weeks.map(([w, moments]) => (
                    <View key={w} style={styles.week}>
                      <View style={styles.weekHeading}>
                        <View style={styles.marker} aria-hidden>
                          {w === week ? (
                            <View style={styles.bo}>
                              <Character name="bo" size={30} decorative />
                            </View>
                          ) : null}
                          <View style={[styles.dot, w === week && styles.dotNow]} />
                        </View>
                        <Text role="heading" {...webAria({ 'aria-level': 2 })} style={styles.weekLabel}>
                          {w === week ? `Week ${w} · nu` : `Week ${w}`}
                        </Text>
                        {birth ? <Text style={styles.weekMeta}>{weekSpan(birth, w)}</Text> : null}
                      </View>
                      <View style={styles.weekBody}>
                        {moments.map((m) => (
                          <Card key={m.id} moment={m} size={wide ? 'lg' : 'md'} mayKeep={page.mayKeep} onHugged={onHugged} onOpen={(i) => onOpen(m.id, i)} />
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
                <Older more={page.more} onOlder={onOlder} />
              </>
            ) : (
              empty
            )}
          </View>
          {wide ? <Aside page={page} /> : null}
        </View>
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

/** F7's side column: hello, your postcards, and what this page is. */
function Aside({ page }: { page: FamilyPage }) {
  const sent = page.moments.reduce((n, m) => n + m.myHugs, 0);
  return (
    <View style={styles.aside}>
      <View style={[styles.panel, { backgroundColor: color.lilac }]}>
        <Text style={styles.eyebrow}>Hallo {page.me.label}</Text>
        <Text style={[text('titleM'), { fontSize: 24, lineHeight: 28 }]}>{sent === 1 ? 'Al 1 knuffel gestuurd' : `Al ${sent} knuffels gestuurd`}</Text>
        <Text style={styles.panelText}>De ouders zien elke knuffel terug.</Text>
      </View>
      <View style={[styles.panel, { backgroundColor: color.white }]}>
        <Text style={styles.panelTitle}>Je kaartjes</Text>
        <Text style={styles.panelText}>{FREQUENCY[page.me.frequency]}</Text>
        <TextLink onPress={() => navigate('/instellingen')}>Wijzig hoe vaak</TextLink>
      </View>
      <Text style={styles.private}>Deze pagina is privé: alleen wie een persoonlijke uitnodiging kreeg, kan hem openen.</Text>
    </View>
  );
}

function Card({ moment: m, size, mayKeep, onHugged, onOpen }: { moment: FamilyMoment; size: 'md' | 'lg'; mayKeep: boolean; onHugged: CardsProps['onHugged']; onOpen: (photo: number) => void }) {
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [keeping, setKeeping] = useState(false);
  const [keepProblem, setKeepProblem] = useState<'failed' | 'off'>();
  // M6: only when the parents allow it; the browser downloads the photo on this card (1280px).
  async function keep() {
    if (keeping) return;
    setKeeping(true);
    setKeepProblem(undefined);
    try {
      const { url } = await api.keep(m.id, 0);
      window.location.assign(url);
    } catch (e) {
      setKeepProblem(e instanceof NotAllowed ? 'off' : 'failed');
    }
    setKeeping(false);
  }
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
  const facts = [m.isFirst ? m.caption : null, longDutchDate(m.day as CalendarDate)];
  const n = m.photos.length;
  const tile = (i: number) => <Tile key={i} moment={m} photo={i} more={i === 2 && n > 3 ? n - 3 : 0} title={title} onOpen={onOpen} />;
  return (
    <View style={styles.card}>
      {n ? (
        <View style={[styles.photo, size === 'lg' && { height: 360 }]}>
          {n === 1 ? (
            tile(0)
          ) : n === 2 ? (
            <View style={styles.mosaicRow}>{[tile(0), tile(1)]}</View>
          ) : (
            <View style={styles.mosaicRow}>
              <View style={{ flex: 2 }}>{tile(0)}</View>
              <View style={styles.mosaicColumn}>{[tile(1), tile(2)]}</View>
            </View>
          )}
        </View>
      ) : null}
      <View style={styles.words}>
        <Text style={styles.eyebrow}>{`Week ${m.week}${m.isFirst ? ' · eerste keer!' : ''}`}</Text>
        <Text role="heading" {...webAria({ 'aria-level': 3 })} style={[styles.cardTitle, size === 'lg' && { fontSize: 32, lineHeight: 37 }]}>
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
        <Button icon="heart" block={size === 'md'} busy={busy} onPress={hug} accessibilityLabel={`Knuffelen: ${title}`}>
          {m.myHugs ? 'Nog een knuffel' : 'Knuffelen'}
        </Button>
        {mayKeep && m.photos.length && keepProblem !== 'off' ? (
          <Button icon="download" variant="paper" block={size === 'md'} busy={keeping} onPress={keep} accessibilityLabel={`Bewaar de foto: ${title}`}>
            Bewaar foto
          </Button>
        ) : null}
      </View>
      {keepProblem ? (
        <Text role="alert" style={styles.error}>
          {keepProblem === 'off' ? 'Foto’s bewaren kan nu niet meer: de ouders hebben het uitgezet.' : 'Bewaren lukte even niet. Probeer het zo nog eens.'}
        </Text>
      ) : null}
      {failed ? (
        <Text role="alert" style={styles.error}>
          Je knuffel kwam niet aan. Probeer het zo nog eens.
        </Text>
      ) : null}
    </View>
  );
}

/** One photo of a card: opens the big view at it. The third says "+N" when there are more. */
function Tile({ moment: m, photo, more, title, onOpen }: { moment: FamilyMoment; photo: number; more: number; title: string; onOpen: (photo: number) => void }) {
  const focus = useFocusRing();
  const n = m.photos.length;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={n > 1 ? `Bekijk groot, foto ${photo + 1} van ${n}: ${title}` : `Bekijk groot: ${title}`}
      onPress={() => onOpen(photo)}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={styles.tile}
    >
      <Photo uri={m.photos[photo]?.url} label="" />
      {/* The ring sits inside the tile (the frame clips anything outside), ink on a white edge for dark photos. */}
      {focus.ring ? (
        <View style={styles.ring}>
          <View style={styles.ringInner} />
        </View>
      ) : null}
      {more ? (
        <View style={styles.more}>
          <Text style={styles.moreText}>+{more}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

/** The path's column on the left of the timeline. */
const RAIL = 32;

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
  single: { gap: 14 },
  timeline: { gap: 22, paddingTop: 4 },
  // The path: a 0-wide box with a dotted border all round, from the first stop down.
  rail: { position: 'absolute', left: RAIL / 2 - 1, top: 26, bottom: 0, width: 0, borderWidth: 1, borderStyle: 'dotted', borderColor: color.ink, opacity: 0.5 },
  week: { gap: 12 },
  weekHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, paddingTop: 4 },
  marker: { width: RAIL, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -8 },
  // Bo stands on this week's stop.
  bo: { position: 'absolute', bottom: 28 },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: border.edge, borderColor: color.ink, backgroundColor: color.white },
  dotNow: { backgroundColor: color.ink },
  weekLabel: { ...text('eyebrow'), fontSize: 14, letterSpacing: 1.7, textTransform: 'uppercase' },
  weekMeta: { fontFamily: fontFamily('sans', 700), fontSize: 15, color: color.inkMuted },
  weekBody: { marginLeft: RAIL, gap: 18 },
  mosaicRow: { flex: 1, flexDirection: 'row', gap: 3 },
  mosaicColumn: { flex: 1, gap: 3 },
  tile: { flex: 1, overflow: 'hidden', backgroundColor: color.lilac },
  ring: { position: 'absolute', inset: 0, borderWidth: 3, borderColor: color.white, zIndex: 1 },
  ringInner: { flex: 1, borderWidth: 3, borderColor: color.ink },
  more: { position: 'absolute', inset: 0, backgroundColor: `${color.ink}9E`, alignItems: 'center', justifyContent: 'center' },
  moreText: { fontFamily: fontFamily('sticker', 400), fontSize: 24, color: color.white },
  main: { flex: 1, minWidth: 0, gap: 14 },
  aside: { width: 360, gap: 16, paddingTop: 38 },
  panel: { gap: 8, padding: 18, borderRadius: 22, borderWidth: border.edge, borderColor: color.ink, boxShadow: shadow.shadowMd, alignItems: 'flex-start' },
  panelTitle: { fontFamily: fontFamily('sans', 800), fontSize: 17, color: color.ink },
  panelText: { fontFamily: fontFamily('sans', 700), fontSize: 15, lineHeight: 22, color: color.ink },
  private: { fontFamily: fontFamily('sans', 700), fontSize: 14, lineHeight: 20, color: color.inkMuted },
  card: {
    gap: 10,
    padding: 10,
    borderRadius: 26,
    borderWidth: border.edgeBold,
    borderColor: color.ink,
    backgroundColor: color.white,
    boxShadow: shadow.shadowLg,
  },
  photo: { height: 260, borderRadius: 18, borderWidth: border.edge, borderColor: color.ink, overflow: 'hidden', backgroundColor: color.white },
  words: { paddingHorizontal: 8, gap: 2 },
  eyebrow: { ...text('eyebrow'), fontSize: 14, letterSpacing: 1.7, textTransform: 'uppercase' },
  cardTitle: { ...text('titleM'), fontSize: 25, lineHeight: 29 },
  meta: { fontFamily: fontFamily('sans', 700), fontSize: 15, lineHeight: 21, color: color.inkMuted },
  mine: { fontFamily: fontFamily('sans', 800), fontSize: 15, lineHeight: 21, color: color.ink },
  actions: { paddingHorizontal: 4, paddingBottom: 6, gap: 8 },
  error: { fontFamily: fontFamily('sans', 700), fontSize: 15, color: color.plum, paddingHorizontal: 8, paddingBottom: 6 },
  empty: { alignItems: 'center', gap: 12, paddingTop: 40 },
  emptyText: { fontFamily: fontFamily('sans', 400), fontSize: 17, lineHeight: 25, color: color.ink, textAlign: 'center' },
});
