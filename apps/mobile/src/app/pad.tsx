import { longDutchDate, todayInAmsterdam, TRAIL_WEEKS, trailWeek } from '@teddysteps/core';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Banner, Button, Character, color, EmptySlot, fontFamily, MomentCard, space, text } from '@teddysteps/ui';
import { Doodles } from '@/components/Doodles';
import { Photo } from '@/components/Photo';
import { Tabs } from '@/components/Tabs';
import { TrailHeader } from '@/components/TrailHeader';
import { UploadStatus } from '@/components/UploadStatus';
import { useAuth } from '@/lib/auth';
import { startMoment } from '@/lib/draft';
import { useQueue, useTrailMoments, type TrailMoment } from '@/lib/trail';

// T1 Pad, with X1 (empty trail) and X2/X4 (uploads waiting or failed).
// The "Wat komt eraan" leap card comes with its reviewed copy in step 9.
export default function Trail() {
  const { state } = useAuth();
  const { moments, source } = useTrailMoments();
  const { queue, online } = useQueue();
  if (state.status !== 'ready') return null;
  const { trail } = state;
  const week = trail.birthDate ? trailWeek(trail.birthDate, todayInAmsterdam()) : null;

  return (
    <View style={styles.screen}>
      <TrailHeader childName={trail.childName} week={week ? `Week ${week} van ${TRAIL_WEEKS}` : null} />
      {!week ? (
        <OnTheWay dueDate={longDutchDate(trail.dueDate, { weekday: false, year: true })} />
      ) : source === 'server' && !moments.length ? (
        <EmptyTrail week={week} />
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {source === 'failed' || (source === 'cached' && !queue.length) ? (
            <Banner tone="sunshine" character="bizzy" title="Je bent offline">
              {source === 'failed'
                ? 'Je pad verschijnt zodra je weer verbinding hebt.'
                : 'Dit is je pad zoals we het kenden. Nieuwe dingen zie je zodra je weer verbinding hebt.'}
            </Banner>
          ) : null}
          <UploadStatus queue={queue} online={online && source !== 'failed'} />
          <View style={styles.timeline}>
            <View style={styles.rail} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
              <View style={styles.now} />
              <View style={styles.line} />
            </View>
            <View style={styles.cards}>
              {!moments.some((m) => m.trailWeek === week) ? (
                <EmptySlot subtitle={`Week ${week} · voeg een moment toe`} onPress={() => router.push('/toevoegen')} />
              ) : null}
              {/* A moment still uploading shows in the upload status above, not twice. */}
              {moments
                .filter((m) => !m.queued || m.queued.stage === 'visible')
                .map((m, i) => (
                  <Card key={m.key} moment={m} tilt={i % 2 ? 1 : -1.5} />
                ))}
            </View>
          </View>
        </ScrollView>
      )}
      <Tabs active="trail" />
    </View>
  );
}

function Card({ moment: m, tilt }: { moment: TrailMoment; tilt: number }) {
  const title = (m.isFirst ? m.firstLabel : m.caption) ?? 'Een moment';
  return (
    <MomentCard
      week={`Week ${m.trailWeek}`}
      caption={title}
      note={m.isFirst && m.caption ? m.caption : undefined}
      photo={<Photo source={m.photos[0]?.small} />}
      alt={m.caption ?? title}
      firstBadge={m.isFirst ? 'Eerste keer!' : undefined}
      tilt={tilt}
      onPress={m.momentId ? () => router.push(`/moment/${m.momentId}`) : undefined}
    />
  );
}

/** X1 Leeg pad. */
function EmptyTrail({ week }: { week: number }) {
  return (
    <View style={styles.center}>
      <Doodles />
      <Character name="bo" size={130} decorative />
      <Text accessibilityRole="header" style={[text('titleL'), styles.centerText]}>
        Week {week} wacht op je!
      </Text>
      <Text style={[styles.body, styles.centerText]}>Elk pad begint met één moment. Een slaperige foto telt helemaal mee.</Text>
      <View style={styles.actions}>
        <Button block icon="plus" onPress={() => router.push('/toevoegen')}>
          Voeg je eerste moment toe
        </Button>
        <Button block variant="paper" onPress={() => void startMoment('older')}>
          Haal oudere foto’s op
        </Button>
      </View>
    </View>
  );
}

/** Before the birth there is nothing to pin yet (decided 17 October 2026). */
function OnTheWay({ dueDate }: { dueDate: string }) {
  return (
    <View style={styles.center}>
      <Doodles />
      <Character name="bo" size={130} mood="happy" decorative />
      <Text accessibilityRole="header" style={[text('titleL'), styles.centerText]}>
        Nog even geduld!
      </Text>
      <Text style={[styles.body, styles.centerText]}>
        Het pad begint bij de geboorte. Uitgerekend: {dueDate}. Is je kleintje er al? Dan kun je meteen het eerste moment vastpinnen.
      </Text>
      <View style={styles.actions}>
        <Button block onPress={() => router.push('/geboren')}>
          Mijn kleintje is geboren!
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  content: { paddingTop: 2, paddingHorizontal: space.space5, paddingBottom: space.space6, gap: space.space4 },
  timeline: { flexDirection: 'row', gap: 14 },
  rail: { width: 18, alignItems: 'center' },
  now: { width: 18, height: 18, borderRadius: 9, borderWidth: 2.5, borderColor: color.ink, backgroundColor: color.tangerine },
  // A 0-wide box with a dotted border all round: one-sided dotted borders draw unreliably on phones.
  line: { flex: 1, width: 0, borderWidth: 1.5, borderStyle: 'dotted', borderColor: color.ink },
  cards: { flex: 1, gap: 14 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: space.space6, paddingBottom: 12 },
  centerText: { textAlign: 'center' },
  body: { fontFamily: fontFamily('sans', 400), fontSize: 16, lineHeight: 24, color: color.ink },
  actions: { alignSelf: 'stretch', gap: 10 },
});
