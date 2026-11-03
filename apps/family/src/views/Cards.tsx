import { ageLine, longDutchDate, possessive, todayInAmsterdam, trailWeek, weekMonth, weekName, weekSpan, type CalendarDate } from '@teddysteps/core';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import {
  border,
  Button,
  Character,
  ChildAvatar,
  color,
  fontFamily,
  Icon,
  MonthBar,
  radius,
  ReactionCounts,
  Scallop,
  shadow,
  space,
  text,
  useFocusRing,
  useReducedMotion,
  webAria,
  Wordmark,
  type MonthChip,
  type ReactionKind,
} from '@teddysteps/ui';
import { api, NotAllowed, type FamilyMoment, type FamilyPage } from '../api';
import { navigate, useView } from '../route';
import { Love } from './Love';
import { Heading, Photo, TextLink } from './shared';

const WIDE = 900;
const FREQUENCY = {
  each: 'Bij elk nieuw moment krijg je een mailtje.',
  weekly: 'Elke zondag krijg je één mailtje met de nieuwe momenten.',
  never: 'Je krijgt geen mailtjes; je kijkt hier mee.',
} as const;

// F3 (the moments), and F7 on a laptop: newest first, as a timeline of months and weeks (owner,
// 25 October and 3 November 2026), with the months as chips on top to jump back to the start.
// A tap on a photo opens the big view (Viewer) at that photo.
// "Inspreken" (voice notes) comes in step 6. Header in pistachio, the design system's colour for
// family; the boards' rose is an accent, not a header block. The parents' names aren't asked
// yet, so F7's "Sam en Alex" reads "de ouders".
interface CardsProps {
  page: FamilyPage;
  /** A hug or icon went out: new counts for the card, and the float. */
  onReacted: (id: string, kind: ReactionKind, reactions: FamilyMoment['reactions']) => void;
  onOlder: () => Promise<void>;
  /** The keyring's start page, when this browser follows more than one child. */
  onSwitch?: () => void;
  /** Loads older moments until this week is in (a month chip further back). */
  onOlderUntil: (week: number) => Promise<void>;
  onOpen: (moment: string, photo: number) => void;
}

export function Cards({ page, onReacted, onOlder, onOlderUntil, onOpen, onSwitch }: CardsProps) {
  const { width } = useWindowDimensions();
  const wide = width >= WIDE;
  const name = page.child.firstName;
  const today = todayInAmsterdam();
  const birth = page.child.birthDate as CalendarDate | null;
  const week = birth ? trailWeek(birth, today) : null;
  const [current, setCurrent] = useState<string>();
  const [jumping, setJumping] = useState(false);
  const [jumpFailed, setJumpFailed] = useState(false);
  const reduced = useReducedMotion();
  useView(`${possessive(name)} pad`);

  // Newest month first, in it the newest week first, the moments of each week together.
  const months: { key: string; name: string; weeks: [number, FamilyMoment[]][] }[] = [];
  for (const m of page.moments) {
    const month = birth ? weekMonth(birth, m.week) : { key: 'all', name: '' };
    let group = months[months.length - 1];
    if (!group || group.key !== month.key) months.push((group = { key: month.key, name: month.name, weeks: [] }));
    const last = group.weeks[group.weeks.length - 1];
    if (last && last[0] === m.week) last[1].push(m);
    else group.weeks.push([m.week, [m]]);
  }

  // Every month from the birth to now; months older than what's loaded may still have moments.
  const loaded = new Set(months.map((m) => m.key));
  const oldest = months[months.length - 1]?.key ?? '';
  const chips: MonthChip[] = [];
  if (birth && week) {
    for (let w = 1; w <= week; w++) {
      const m = weekMonth(birth, w);
      if (chips[chips.length - 1]?.key === m.key) continue;
      chips.push({ key: m.key, label: m.short, name: m.name, available: loaded.has(m.key) || (page.more && m.key < oldest) });
    }
  }

  // The family page is web only: the month headings are found by their id. The heading gets
  // focus, so a keyboard or screen reader lands where the eyes do.
  const scrollTo = (key: string) => {
    const heading = document.getElementById(`maand-${key}`);
    if (!heading) return false;
    heading.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
    return true;
  };
  async function pick(key: string) {
    setJumpFailed(false);
    if (loaded.has(key) || !birth) return void scrollTo(key);
    // Older months come in first, as many pages as it takes (12 moments each).
    setJumping(true);
    let first = 1;
    while (first < 200 && weekMonth(birth, first).key !== key) first++;
    try {
      await onOlderUntil(first);
    } catch {
      setJumping(false);
      return setJumpFailed(true);
    }
    setJumping(false);
    // A month without moments after all: the nearest month before it that has some, else the oldest.
    requestAnimationFrame(() => {
      const ids = [...document.querySelectorAll<HTMLElement>('[id^="maand-"]')].map((el) => el.id.slice(6));
      if (!scrollTo(key)) scrollTo(ids.filter((k) => k < key).sort().pop() ?? ids[ids.length - 1]);
    });
  }
  // The month at the top of the screen is the filled chip.
  const onScroll = () => {
    let top: string | undefined;
    for (const m of months) {
      const el = document.getElementById(`maand-${m.key}`);
      if (el && el.getBoundingClientRect().top < 160) top = m.key;
    }
    setCurrent(top ?? months[0]?.key);
  };

  const empty = (
    <View style={styles.empty}>
      <Character name="bo" size={110} decorative />
      <Text style={[text('titleM'), { textAlign: 'center' }]}>Nog geen momenten</Text>
      <Text style={styles.emptyText}>Zodra er een moment op {possessive(name)} pad staat, zie je het hier.</Text>
    </View>
  );

  return (
    <ScrollView style={styles.screen} stickyHeaderIndices={chips.length > 1 ? [1] : undefined} onScroll={onScroll} scrollEventThrottle={100}>
      <View style={styles.header}>
        {/* The website's logo on top (owner, 3 November 2026), then the child, like a book's cover. */}
        <View style={styles.top}>
          <View style={[styles.topInner, wide && styles.inner]}>
            <Wordmark size={wide ? 30 : 24} />
            <Button variant="paper" size="md" icon="me" onPress={() => navigate('/instellingen')}>
              Jouw profiel
            </Button>
          </View>
        </View>
        <View style={[styles.band, wide && styles.bandWide]}>
          <View style={[styles.bar, wide && styles.inner]}>
            <ChildAvatar look={page.child.look} size={wide ? 84 : 64} still />
            <View style={styles.grow}>
              {/* Lettered like the wordmark: ink letters on a hard paper print. */}
              <View>
                <Text aria-hidden style={[styles.title, wide && styles.titleWide, styles.titleShadow]}>
                  {possessive(name)} pad
                </Text>
                <Heading style={{ ...styles.title, ...(wide ? styles.titleWide : null) }}>{`${possessive(name)} pad`}</Heading>
              </View>
              {birth ? <Text style={[styles.age, wide && { fontSize: 18 }]}>{ageLine(birth, today)}</Text> : null}
              {onSwitch ? <Switch onPress={onSwitch} /> : null}
            </View>
            {/* On a laptop one of the gang peeks in: never the child's own animal twice. */}
            {wide ? <Character name={page.child.look.animal === 'puddle' ? 'tiggy' : 'puddle'} size={80} rotate={-6} decorative /> : null}
          </View>
        </View>
        <Scallop color="pistachio" />
      </View>
      {chips.length > 1 ? <MonthBar months={chips} current={current ?? months[0]?.key} onPick={pick} /> : <View />}
      <View style={[styles.column, wide && styles.columnWide]}>
        <Text role="status" style={styles.loading}>
          {jumping ? 'Eerdere momenten ophalen…' : ''}
        </Text>
        {jumpFailed ? (
          <Text role="alert" style={styles.error}>
            Dat lukte even niet. Probeer het zo nog eens.
          </Text>
        ) : null}
        <View style={wide ? styles.columns : styles.single}>
          <View style={styles.main}>
            {months.length ? (
              <>
                <View style={styles.timeline}>
                  <View style={styles.rail} aria-hidden />
                  {months.map((month) => (
                    <View key={month.key} style={styles.month}>
                      <Text nativeID={`maand-${month.key}`} role="heading" {...webAria({ 'aria-level': 2 })} style={styles.monthTitle}>
                        {month.name}
                      </Text>
                      {month.weeks.map(([w, moments]) => (
                        <View key={w} style={styles.week}>
                          <View style={styles.weekHeading}>
                            <View style={styles.marker} aria-hidden>
                              {w === week ? (
                                <View style={styles.bo}>
                                  <Character name={page.child.look.animal} size={30} decorative />
                                </View>
                              ) : null}
                              <View style={[styles.dot, w === week && styles.dotNow]} />
                            </View>
                            <Text role="heading" {...webAria({ 'aria-level': 3 })} style={styles.weekLabel}>
                              {w === week ? `${weekName(w)} · nu` : weekName(w)}
                            </Text>
                            {birth ? <Text style={styles.weekMeta}>{weekSpan(birth, w)}</Text> : null}
                          </View>
                          <View style={styles.weekBody}>
                            {moments.map((m) => (
                              <Card key={m.id} moment={m} size={wide ? 'lg' : 'md'} mayKeep={page.mayKeep} onReacted={onReacted} onOpen={(i) => onOpen(m.id, i)} />
                            ))}
                          </View>
                        </View>
                      ))}
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
      </View>
    </ScrollView>
  );
}

/** Oma with more grandchildren: back to "Wie wil je zien?" (/kies). */
function Switch({ onPress }: { onPress: () => void }) {
  const focus = useFocusRing();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} onFocus={focus.onFocus} onBlur={focus.onBlur} style={[styles.switch, focus.ring]}>
      <Icon name="swap" size={16} weight={2.6} />
      <Text style={styles.switchText}>Ander kindje kiezen</Text>
    </Pressable>
  );
}

/** Twelve moments at a time; older ones on request, so a full year stays light. */
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
      Eerdere momenten
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
        <Text style={styles.panelTitle}>Jouw mail</Text>
        <Text style={styles.panelText}>{FREQUENCY[page.me.frequency]}</Text>
        <TextLink onPress={() => navigate('/instellingen')}>Wijzig hoe vaak</TextLink>
      </View>
      <Text style={styles.private}>Deze pagina is privé: alleen wie een persoonlijke uitnodiging kreeg, kan hem openen.</Text>
    </View>
  );
}

function Card({
  moment: m,
  size,
  mayKeep,
  onReacted,
  onOpen,
}: {
  moment: FamilyMoment;
  size: 'md' | 'lg';
  mayKeep: boolean;
  onReacted: CardsProps['onReacted'];
  onOpen: (photo: number) => void;
}) {
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
  const title = (m.isFirst ? m.firstLabel : m.caption) ?? (m.week <= 52 ? `Een moment uit week ${m.week}` : `Een moment op ${weekName(m.week)}`);
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
          {n > 1 ? (
            <View style={styles.count} aria-hidden pointerEvents="none">
              <Icon name="photos" size={15} weight={2.4} />
              <Text style={styles.countText}>{n}</Text>
            </View>
          ) : null}
        </View>
      ) : null}
      <View style={styles.words}>
        {m.isFirst ? <Text style={styles.eyebrow}>Eerste keer!</Text> : null}
        <Text role="heading" {...webAria({ 'aria-level': 3 })} style={[styles.cardTitle, size === 'lg' && { fontSize: 32, lineHeight: 37 }]}>
          {title}
        </Text>
        <Text style={[styles.meta, size === 'lg' && { fontSize: 18 }]}>{facts.filter(Boolean).join(' · ')}</Text>
        <ReactionCounts counts={Object.fromEntries(Object.entries(m.reactions).map(([k, v]) => [k, v?.total ?? 0]))} />
      </View>
      <View style={styles.actions}>
        <Love moment={m} title={title} block={size === 'md'} onReacted={onReacted} />
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
  header: { position: 'relative' },
  top: { backgroundColor: color.paper, paddingHorizontal: 20, paddingVertical: 10 },
  topInner: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  band: { backgroundColor: color.pistachio, paddingHorizontal: 20, paddingBottom: 8 },
  bandWide: { paddingHorizontal: 80, paddingBottom: 10 },
  inner: { width: '100%', maxWidth: 1120, alignSelf: 'center' },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 14 },
  grow: { flex: 1, minWidth: 0 },
  title: { fontFamily: fontFamily('sticker', 400), fontSize: 30, lineHeight: 36, letterSpacing: 0, color: color.ink, outlineStyle: 'none' } as object,
  titleShadow: { position: 'absolute', left: 2, top: 2, right: -2, color: color.paper },
  titleWide: { fontSize: 42, lineHeight: 50 },
  age: { fontFamily: fontFamily('sans', 800), fontSize: 16, color: color.ink },
  switch: { flexDirection: 'row', alignItems: 'center', gap: space.space2, minHeight: 44, alignSelf: 'flex-start' },
  switchText: { ...text('meta'), fontFamily: fontFamily('sans', 800), color: color.ink, textDecorationLine: 'underline' },
  column: { width: '100%', maxWidth: 520, alignSelf: 'center', paddingHorizontal: space.space5, paddingTop: space.space3, paddingBottom: space.space6, gap: 14 },
  columnWide: { maxWidth: 1120, paddingHorizontal: space.space6 },
  loading: { fontFamily: fontFamily('sans', 800), fontSize: 15, color: color.inkMuted, textAlign: 'center' },
  month: { gap: 22 },
  // Under the sticky month chips when jumped to.
  monthTitle: { ...text('titleM'), marginLeft: RAIL, scrollMarginTop: 72, outlineStyle: 'none' } as object,
  count: {
    position: 'absolute',
    top: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: radius.radiusPill,
    borderWidth: border.edge,
    borderColor: color.ink,
    backgroundColor: color.white,
  },
  countText: { fontFamily: fontFamily('sans', 800), fontSize: 12, lineHeight: 16, color: color.ink },
  columns: { flexDirection: 'row', gap: 40, alignItems: 'flex-start' },
  single: { gap: 14 },
  timeline: { gap: 22, paddingTop: 4 },
  // The path: a 0-wide box with a dotted border all round, from the first stop down.
  rail: { position: 'absolute', left: RAIL / 2 - 1, top: 74, bottom: 0, width: 0, borderWidth: 1, borderStyle: 'dotted', borderColor: color.ink, opacity: 0.5 },
  week: { gap: 12 },
  weekHeading: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, minHeight: 44, paddingTop: 4 },
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
