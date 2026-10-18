import { useState } from 'react';
import { Button } from '@teddysteps/ui';
import { ComingSoon } from '@/components/ComingSoon';
import { clearQueue } from '@/lib/queue';
import { supabase } from '@/lib/supabase';
import { useQueue } from '@/lib/trail';

// M1 Account comes in step 8. Signing out is here already, for testing.
export default function Me() {
  const { queue } = useQueue();
  const [sure, setSure] = useState(false);
  // Photos that are still only on this phone would be lost; ask once more first.
  const waiting = queue.filter((q) => q.stage !== 'visible').length;
  async function signOut() {
    if (waiting && !sure) return setSure(true);
    await clearQueue();
    await supabase.auth.signOut();
  }
  return (
    <ComingSoon title="Ik" tab="me" tone="lilac" character="tiggy" step="stap 8">
      <Button block variant={sure ? 'danger' : 'paper'} onPress={signOut}>
        {sure ? `Toch uitloggen (${waiting} nog niet geüpload)` : 'Uitloggen'}
      </Button>
    </ComingSoon>
  );
}
