import { CATCH_UP_LIMIT, MAX_PER_WEEK, planCatchUp, possessive, shortDutchDate, todayInAmsterdam, trailWeek, weekSpan, type CalendarDate, type CatchUpWeek } from '@teddysteps/core';
import { Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { border, Button, Character, color, Icon, radius, space, text, useAnnounce, useFocusRing } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';
import { TextLink } from '@/components/TextLink';
import { useAuth } from '@/lib/auth';
import { forgetPickerCopies, pickPhotos, type PickedPhoto } from '@/lib/photos';
import { askOnce, willAsk } from '@/lib/push';
import { pin } from '@/lib/queue';
import { useTrailMoments } from '@/lib/trail';

// O6 Inhalen (board Onboarding-7, plan tech-architect, decisions owner 21 October 2026): fill the
// weeks before you started. No scan of the photo library: the parent picks older photos in the
// phone's own picker (at most 20 for now), we sort them into weeks by the day they were taken and
// tick one per day; each week with ticks becomes one ordinary moment in the upload queue.
// Nothing leaves the phone before "Voeg mijn keuze toe", and every picker copy that isn't used is
// deleted on every way out. Last step of onboarding (3 van 3, skippable), and later from X1.
type Phase = 'intro' | 'choose' | 'busy' | 'done';

const LOW_SPACE = 1_000_000_000;

export default function CatchUp() {
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const { state } = useAuth();
  const { moments } = useTrailMoments();
  const [phase, setPhase] = useState<Phase>('intro');
  const [weeks, setWeeks] = useState<CatchUpWeek<PickedPhoto>[]>([]);
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [note, setNote] = useState<string>();
  const [progress, setProgress] = useState<string>();
  const [added, setAdded] = useState<number[]>([]);
  const [asking, setAsking] = useState(false);
  useAnnounce(progress ?? note);
  // Picker copies we still hold (with their metadata): deleted on every way out.
  const held = useRef<PickedPhoto[]>([]);
  // While the weeks are being prepared, nothing may take the photos away: no back, no swipe.
  const adding = useRef(false);
  useEffect(() => () => forgetPickerCopies(held.current), []);
  useEffect(() => {
    if (phase !== 'busy') return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [phase]);

  if (state.status !== 'ready' || !state.trail.birthDate) return null;
  const birth = state.trail.birthDate;
  const name = state.trail.childName;
  const today = todayInAmsterdam();
  const now = trailWeek(birth, today);
  const step: [number, number] | undefined = onboarding ? [3, 3] : undefined;
  const toTrail = () => router.replace('/pad');
  const leave = () => {
    forgetPickerCopies(held.current);
    held.current = [];
    if (onboarding) toTrail();
    else router.back();
  };

  function restart() {
    forgetPickerCopies(held.current);
    held.current = [];
    setWeeks([]);
    setNote(undefined);
    setPhase('intro');
  }

  async function choose() {
    setNote(undefined);
    const picked = await pickPhotos(CATCH_UP_LIMIT);
    if (!picked.length) return;
    // Some older Android pickers ignore the limit: keep the first ones, let go of the rest.
    const photos = picked.slice(0, CATCH_UP_LIMIT);
    forgetPickerCopies(picked.slice(CATCH_UP_LIMIT));
    held.current = photos;
    const plan = planCatchUp(photos, birth, today, [...new Set(moments.map((m) => m.trailWeek))]);
    forgetPickerCopies(plan.leftOut);
    held.current = photos.filter((p) => !plan.leftOut.includes(p));
    if (!plan.weeks.length) {
      setNote('Deze foto’s passen niet op het pad: ze hebben geen datum, of zijn van vóór de geboorte. Geen datum? Voeg ze toe via Foto’s en kies zelf de week.');
      return;
    }
    if (plan.leftOut.length) {
      setNote(
        plan.leftOut.length === 1
          ? '1 foto lieten we weg: zonder datum, of van vóór de geboorte. Geen datum? Voeg hem toe via Foto’s en kies zelf de week.'
          : `${plan.leftOut.length} foto’s lieten we weg: zonder datum, of van vóór de geboorte. Geen datum? Voeg ze toe via Foto’s en kies zelf de week.`,
      );
    }
    setWeeks(plan.weeks);
    setTicked(new Set(plan.weeks.flatMap((w) => w.suggested.map((p) => p.uri))));
    setPhase('choose');
  }

  function toggle(week: CatchUpWeek<PickedPhoto>, photo: PickedPhoto) {
    const next = new Set(ticked);
    if (next.has(photo.uri)) next.delete(photo.uri);
    else if (week.photos.filter((p) => next.has(p.uri)).length >= MAX_PER_WEEK) return setNote(`Er passen ${MAX_PER_WEEK} foto’s in een week.`);
    else next.add(photo.uri);
    setNote(undefined);
    setTicked(next);
  }

  async function add() {
    if (adding.current) return;
    if (Paths.availableDiskSpace < LOW_SPACE) {
      return setNote('Je telefoon is bijna vol. Maak eerst wat ruimte vrij, dan zetten we de foto’s klaar.');
    }
    const todo = weeks.map((w) => ({ week: w.week, photos: w.photos.filter((p) => ticked.has(p.uri)) })).filter((w) => w.photos.length);
    adding.current = true;
    setPhase('busy');
    const done: number[] = [];
    for (const [i, w] of todo.entries()) {
      setProgress(`Week ${w.week} klaarmaken (${i + 1} van ${todo.length})…`);
      try {
        // pin() makes the versions on the phone and deletes these picker copies.
        await pin({ photos: w.photos, trailWeek: w.week, caption: '', isFirst: false, firstLabel: '' });
        held.current = held.current.filter((p) => !w.photos.includes(p));
        done.push(w.week);
      } catch {
        setProgress(undefined);
        setAdded([...added, ...done]);
        setWeeks(weeks.filter((x) => !done.includes(x.week)));
        setNote(
          done.length
            ? `${done.length === 1 ? '1 week staat' : `${done.length} weken staan`} op je pad. Week ${w.week} lukte niet: probeer het nog eens.`
            : `Week ${w.week} klaarmaken lukte niet. Probeer het nog eens, of kies andere foto’s.`,
        );
        setPhase('choose');
        adding.current = false;
        return;
      }
    }
    adding.current = false;
    // The photos that weren't ticked never leave the phone, and their copies go now.
    forgetPickerCopies(held.current);
    held.current = [];
    setProgress(undefined);
    setAdded([...added, ...done]);
    setPhase('done');
    if (await willAsk()) {
      setAsking(true);
      setTimeout(() => askOnce().catch(() => undefined), 1000);
    }
  }

  if (phase === 'done') {
    const sorted = [...added].sort((a, b) => a - b);
    const inARow = sorted.every((w, i) => i === 0 || w === sorted[i - 1] + 1);
    const title = sorted.length === 1 ? `Week ${sorted[0]} ingehaald!` : inARow ? `Week ${sorted[0]} tot ${sorted[sorted.length - 1]} ingehaald!` : `${sorted.length} weken ingehaald!`;
    return (
      <Screen header={{ title, color: 'pistachio', step, character: 'tiggy' }} footer={<Button block onPress={toTrail}>Naar het pad</Button>}>
        <View style={styles.center}>
          <Character name="bo" mood="happy" size={120} motion="hop" decorative />
          <Text style={[styles.body, styles.centerText]}>
            Ze staan op {possessive(name)} pad, elk in de juiste week. Een zin of een eerste keer erbij? Dat kan altijd via het moment.
          </Text>
          {asking ? <Text style={[styles.body, styles.centerText]}>Zet meldingen aan, dan hoor je ’s avonds wie {name} een knuffel stuurde.</Text> : null}
        </View>
      </Screen>
    );
  }

  if (phase === 'intro') {
    return (
      <Screen
        header={{ title: now > 1 ? `Week 1 tot ${now} inhalen` : 'Inhalen', color: 'pistachio', step, onBack: onboarding ? undefined : router.back, character: 'tiggy', characterRotate: -8 }}
        footer={
          <>
            <Button block icon="camera" onPress={choose}>
              Kies foto’s
            </Button>
            <TextLink onPress={leave}>{onboarding ? 'Overslaan, ik begin vandaag' : 'Toch niet'}</TextLink>
          </>
        }
      >
        <Text style={styles.body}>
          Kies foto’s van na de geboorte, tot {CATCH_UP_LIMIT} tegelijk. Wij zetten ze in de week waarin ze gemaakt zijn en stellen er per dag één voor. Jij kiest wat erop
          komt.
        </Text>
        <Text style={styles.muted}>TeddySteps ziet alleen de foto’s die je kiest. Je kunt dit later nog eens doen.</Text>
        {note ? (
          <Text role="alert" style={styles.note}>
            {note}
          </Text>
        ) : null}
      </Screen>
    );
  }

  const count = ticked.size;
  const weeksTicked = weeks.filter((w) => w.photos.some((p) => ticked.has(p.uri))).length;
  return (
    <Screen
      header={{
        title: 'Wat komt erop?',
        subtitle: 'Tik een foto aan of uit.',
        color: 'pistachio',
        step,
        // Back to the start: these photos are let go, and you can pick again.
        onBack: phase === 'busy' ? undefined : restart,
        character: 'tiggy',
        characterRotate: -8,
      }}
      footer={
        phase === 'busy' ? (
          <Text role="status" accessibilityLiveRegion="polite" style={[styles.body, styles.centerText]}>
            {progress}
          </Text>
        ) : (
          <>
            {count ? null : <Text style={[styles.muted, styles.centerText]}>Tik minstens één foto aan.</Text>}
            <Button block onPress={add} disabled={!count}>
              {count ? `Voeg mijn keuze toe (${weeksTicked === 1 ? '1 week' : `${weeksTicked} weken`})` : 'Voeg mijn keuze toe'}
            </Button>
            <TextLink onPress={leave}>{onboarding ? 'Overslaan, ik begin vandaag' : 'Toch niet'}</TextLink>
          </>
        )
      }
    >
      <Text style={styles.muted}>Gaat het snelst op wifi. Een zin of een eerste keer zet je er later bij.</Text>
      {note ? (
        <Text role="alert" style={styles.note}>
          {note}
        </Text>
      ) : null}
      {weeks.map((w) => (
        <WeekRow key={w.week} week={w} birth={birth} ticked={ticked} busy={phase === 'busy'} onToggle={(p) => toggle(w, p)} />
      ))}
    </Screen>
  );
}

function WeekRow({
  week: w,
  birth,
  ticked,
  busy,
  onToggle,
}: {
  week: CatchUpWeek<PickedPhoto>;
  birth: CalendarDate;
  ticked: Set<string>;
  busy: boolean;
  onToggle: (photo: PickedPhoto) => void;
}) {
  const { width } = useWindowDimensions();
  const size = Math.floor((width - space.space6 * 2 - 3 * space.space2) / 4);
  const on = w.photos.filter((p) => ticked.has(p.uri)).length;
  return (
    <View style={styles.week}>
      <View style={styles.weekHead}>
        <Text accessibilityRole="header" style={styles.weekLabel}>
          Week {w.week}
        </Text>
        <Text style={styles.weekMeta}>
          {weekSpan(birth, w.week)} · {on} van {w.photos.length} gekozen
        </Text>
      </View>
      {w.onTrail ? <Text style={styles.muted}>Staat al op je pad. Tik aan wat er nog bij moet.</Text> : null}
      <View style={styles.thumbs}>
        {w.photos.map((p, i) => (
          <Thumb key={p.uri} week={w.week} photo={p} index={i} size={size} on={ticked.has(p.uri)} disabled={busy} onPress={() => onToggle(p)} />
        ))}
      </View>
    </View>
  );
}

function Thumb({ week, photo, index, size, on, disabled, onPress }: { week: number; photo: PickedPhoto; index: number; size: number; on: boolean; disabled: boolean; onPress: () => void }) {
  const focus = useFocusRing();
  return (
    <Pressable
      role="checkbox"
      aria-checked={on}
      accessibilityLabel={`Week ${week}, foto ${index + 1}${photo.takenOn ? `, ${shortDutchDate(photo.takenOn)}` : ''}`}
      disabled={disabled}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={[styles.thumb, { width: size, height: size }, on && styles.thumbOn, focus.ring]}
    >
      {/* Memory only: thumbnails of photos that stay on the phone are never kept on disk. */}
      <Image source={{ uri: photo.uri }} contentFit="cover" cachePolicy="memory" style={StyleSheet.absoluteFill} accessible={false} />
      {!on ? <View style={styles.thumbOff} /> : null}
      <View style={[styles.check, on && styles.checkOn]}>{on ? <Icon name="check" size={13} weight={3.6} color={color.onBluebird} /> : null}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { ...text('body'), fontSize: 15, lineHeight: 22 },
  muted: { ...text('meta'), color: color.inkMuted },
  note: { ...text('meta'), color: color.plum },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 },
  centerText: { textAlign: 'center' },
  week: { gap: 8, paddingTop: 6 },
  weekHead: { flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' },
  weekLabel: { ...text('eyebrow'), fontSize: 12, textTransform: 'uppercase' },
  weekMeta: { ...text('meta'), fontSize: 13, color: color.inkMuted },
  thumbs: { flexDirection: 'row', flexWrap: 'wrap', gap: space.space2 },
  thumb: { borderRadius: radius.radiusS, borderWidth: border.edge, borderColor: color.ink, overflow: 'hidden', backgroundColor: color.lilac },
  thumbOn: { borderWidth: border.edgeBold },
  // A paper veil (60%) over photos that aren't ticked.
  thumbOff: { ...StyleSheet.absoluteFill, backgroundColor: `${color.paper}99` },
  check: {
    position: 'absolute',
    right: 4,
    top: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: border.edge,
    borderColor: color.ink,
    backgroundColor: color.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOn: { backgroundColor: color.bluebird },
});
