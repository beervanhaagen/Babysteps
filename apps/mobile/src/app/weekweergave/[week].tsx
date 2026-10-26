import { firstLook, todayInAmsterdam, trailWeek, weekSpan } from '@teddysteps/core';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Banner, border, Button, color, IconButton, PhotoViewer, radius, text, type ViewerPhoto } from '@teddysteps/ui';
import { Photo } from '@/components/Photo';
import { useAuth } from '@/lib/auth';
import { byWeek, dayOf, useTrailMoments } from '@/lib/trail';

// T2b, the big view of the trail (PhotoViewer in packages/ui): opened from any photo on the pad,
// at that photo. Swipe, or tap the edges, through every photo; empty weeks are skipped.
export default function WeekView() {
  const params = useLocalSearchParams<{ week: string; moment?: string; foto?: string }>();
  const insets = useSafeAreaInsets();
  const { state } = useAuth();
  const { moments, source } = useTrailMoments();
  const birth = state.status === 'ready' ? state.trail.birthDate : null;
  if (!birth) return null;
  const now = Math.min(trailWeek(birth, todayInAmsterdam()), 104);

  // Oldest first, weeks and the moments in them, so swiping on goes forward in time.
  const photos: ViewerPhoto[] = byWeek(moments.filter((m) => !m.queued || m.queued.stage === 'visible'))
    .reverse()
    .flatMap(([week, list]) => {
      const all = [...list].reverse().flatMap((m) => m.photos.map((p, i) => ({ m, p, i })));
      return all.map(({ m, p, i }, index) => ({
        key: `${m.key}-${i}`,
        week,
        index,
        count: all.length,
        photo: <Photo source={p.view} fit="contain" />,
        caption: m.caption,
        first: m.isFirst && m.firstLabel ? { label: m.firstLabel, ...firstLook(m.firstLabel) } : undefined,
        date: dayOf(m),
        hugs: m.hugs || undefined,
        overlay: m.momentId ? <IconButton icon="more" label="Opties voor dit moment" onPress={() => router.push(`/opties/${m.momentId}`)} /> : undefined,
      }));
    });
  const offline = source === 'failed' || (source === 'cached' && !photos.length);

  return (
    <PhotoViewer
      photos={photos}
      start={{ week: Number(params.week) || now, key: params.moment ? `${params.moment}-${Number(params.foto) || 0}` : undefined }}
      now={now}
      span={(w) => weekSpan(birth, w)}
      // Only the server says this week is really empty; before that, or offline, we don't know yet.
      addPage={source === 'server' ? <AddPage /> : undefined}
      onEmptyNow={() => router.push('/toevoegen')}
      onClose={router.back}
      closeLabel="Terug naar het pad"
      banner={
        offline ? (
          <Banner tone="sunshine" character="bizzy" title="Je bent offline">
            Je foto’s verschijnen zodra je weer verbinding hebt.
          </Banner>
        ) : undefined
      }
      waiting={source === 'failed' ? undefined : 'Even laden…'}
      topInset={insets.top}
      bottomInset={insets.bottom}
    />
  );
}

/** This week is still empty: the last page invites one more moment. */
function AddPage() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>Deze week is nog leeg!</Text>
      <Text style={styles.emptyText}>Een foto en één zin is genoeg.</Text>
      <Button icon="plus" onPress={() => router.push('/toevoegen')}>
        Moment toevoegen
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    flex: 1,
    borderWidth: border.edgeBold,
    borderStyle: 'dashed',
    borderColor: color.ink,
    borderRadius: radius.radiusL,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 24,
  },
  emptyTitle: { ...text('titleM'), fontSize: 24, lineHeight: 28, textAlign: 'center' },
  emptyText: { ...text('body'), fontSize: 15, color: color.inkMuted, textAlign: 'center', maxWidth: 260 },
});
