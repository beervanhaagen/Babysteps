import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, color, ListRow, text, useAnnounce } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';
import { friendlyError } from '@/lib/errors';
import { restoreMoment } from '@/lib/moments';
import { supabase } from '@/lib/supabase';

// "Onlangs verwijderd": moments deleted in the last 30 days, each with "Terugzetten". After that
// the nightly purge removes them for good. Part of M6 Privacy en data, which comes in step 8.
interface Deleted {
  id: string;
  trail_week: number;
  caption: string | null;
  is_first: boolean;
  first_label: string | null;
  deleted_at: string;
  /** Days left to restore, counted when the list loads. */
  left: number;
}

const DAY = 24 * 60 * 60 * 1000;

export default function RecentlyDeleted() {
  const [items, setItems] = useState<Deleted[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string>();
  useAnnounce(message);

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('deleted_moments');
    if (error) setMessage(friendlyError(error));
    else {
      const now = Date.now();
      setItems((data as Omit<Deleted, 'left'>[]).map((d) => ({ ...d, left: Math.max(1, 30 - Math.floor((now - new Date(d.deleted_at).getTime()) / DAY)) })));
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function restore(item: Deleted) {
    if (busy) return;
    setBusy(item.id);
    setMessage(undefined);
    try {
      await restoreMoment(item.id);
      setMessage(`Terug op het pad, in week ${item.trail_week}.`);
      await load();
    } catch (e) {
      setMessage(friendlyError(e));
    }
    setBusy(null);
  }

  return (
    <Screen header={{ title: 'Onlangs verwijderd', subtitle: '30 dagen om je te bedenken', color: 'lilac', onBack: router.back, character: 'tiggy' }}>
      {items === null ? <Text style={styles.muted}>Even zoeken…</Text> : null}
      {items?.length === 0 ? <Text style={styles.muted}>Hier staat niets. Alles wat je verwijdert, kun je hier 30 dagen terugzetten.</Text> : null}
      <View>
        {items?.map((item) => {
          const title = (item.is_first ? item.first_label : item.caption) || 'Een moment';
          return (
            <ListRow
              key={item.id}
              title={`Week ${item.trail_week} · ${title}`}
              subtitle={item.left === 1 ? 'Nog 1 dag' : `Nog ${item.left} dagen`}
              accessory={
                <Button variant="paper" size="md" onPress={() => restore(item)} busy={busy === item.id}>
                  Terugzetten
                </Button>
              }
            />
          );
        })}
      </View>
      {message ? (
        <Text role="status" style={styles.muted}>
          {message}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  muted: { ...text('meta'), color: color.inkMuted },
});
