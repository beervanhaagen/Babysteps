import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Button, color, ListRow, text } from '@teddysteps/ui';
import { ComingSoon } from '@/components/ComingSoon';
import { signOut as endSession } from '@/lib/auth';
import { clearQueue } from '@/lib/queue';
import { supabase } from '@/lib/supabase';
import { forgetPhotos, useQueue } from '@/lib/trail';

// M1 Account comes in step 8. Signing out is here already, for testing.
export default function Me() {
  const { queue } = useQueue();
  const [sure, setSure] = useState(false);
  // Anything still in the queue would be lost (also print versions of visible moments,
  // which the book needs); ask once more first.
  const waiting = queue.length;
  async function signOut() {
    if (waiting && !sure) return setSure(true);
    const { data } = await supabase.auth.getSession();
    await clearQueue();
    if (data.session) await forgetPhotos(data.session.user.id);
    await endSession();
  }
  return (
    <ComingSoon title="Ik" tab="me" tone="lilac" character="tiggy" step="stap 8">
      <View>
        <ListRow icon="bell" title="Meldingen" subtitle="Seintjes en knuffels" onPress={() => router.push('/meldingen')} />
        <ListRow icon="trash" title="Onlangs verwijderd" subtitle="Momenten terugzetten, tot 30 dagen" onPress={() => router.push('/verwijderd')} />
      </View>
      {sure ? (
        <Text role="alert" style={[text('rowTitle'), { color: color.plum }]}>
          {waiting === 1
            ? 'Er staat nog 1 moment alleen op deze telefoon. Log je nu uit, dan is het weg.'
            : `Er staan nog ${waiting} momenten alleen op deze telefoon. Log je nu uit, dan zijn ze weg.`}
        </Text>
      ) : null}
      <Button block variant={sure ? 'danger' : 'paper'} onPress={signOut}>
        {sure ? 'Toch uitloggen' : 'Uitloggen'}
      </Button>
    </ComingSoon>
  );
}
