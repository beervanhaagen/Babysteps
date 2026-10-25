import { possessive } from '@teddysteps/core';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Button, color, ListRow, text } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';
import { Tabs } from '@/components/Tabs';
import { TextLink } from '@/components/TextLink';
import { signOut as endSession, useAuth } from '@/lib/auth';
import { useCircle } from '@/lib/family';
import { clearQueue } from '@/lib/queue';
import { supabase } from '@/lib/supabase';
import { forgetPhotos, useQueue } from '@/lib/trail';

// M1 Ik (board Account-1, step 8): your name, the profile of the little one, family, notifications,
// privacy, feedback and help, signing out. First names only: the board's surname goes. No
// "Jaarboek" row (the book is in the backlog) and no founders line (M4 comes later).
const HELLO = 'hallo@teddysteps.nl';
// The name last seen, so the header doesn't flick from "Ik" to the name on every visit.
let knownName: string | null = null;

export default function Me() {
  const { state } = useAuth();
  const { queue } = useQueue();
  const { members } = useCircle();
  const [firstName, setFirstName] = useState<string | null>(knownName);
  const [sure, setSure] = useState(false);
  const [mailNote, setMailNote] = useState<string>();
  const userId = state.status === 'ready' ? state.session.user.id : null;

  // The name may have just changed on its own screen.
  useFocusEffect(
    useCallback(() => {
      if (!userId) return;
      supabase
        .from('profiles')
        .select('first_name')
        .eq('id', userId)
        .single()
        .then(({ data }) => {
          knownName = data?.first_name ?? null;
          setFirstName(knownName);
        });
    }, [userId]),
  );
  if (state.status !== 'ready') return null;
  const child = state.trail.childName;
  const joined = (members ?? []).filter((m) => m.joinedAt).length;
  const open = (members ?? []).filter((m) => !m.joinedAt).length;
  const familyLine =
    joined === 1
      ? '1 persoon'
      : joined > 1
        ? `${joined} mensen`
        : open === 1
          ? 'Nog niemand erbij · 1 uitnodiging open'
          : open > 1
            ? `Nog niemand erbij · ${open} uitnodigingen open`
            : 'Nog niemand uitgenodigd';
  // No mail app set up? Then at least show where to write.
  const mail = (subject: string) =>
    Linking.openURL(`mailto:${HELLO}?subject=${encodeURIComponent(subject)}`).catch(() => setMailNote(`Mail ons op ${HELLO}.`));

  // Anything still in the queue would be lost (also print versions of visible moments); ask once more first.
  const waiting = queue.length;
  async function signOut() {
    if (waiting && !sure) return setSure(true);
    const { data } = await supabase.auth.getSession();
    await clearQueue();
    if (data.session) await forgetPhotos(data.session.user.id);
    await endSession();
  }

  return (
    <View style={styles.screen}>
      <Screen header={{ title: firstName ?? 'Ik', subtitle: `Ouder van ${child}`, color: 'cornflower', character: 'tiggy' }}>
        <View>
          <ListRow icon="me" title="Jouw voornaam" subtitle={firstName ?? 'Nog niet ingevuld'} onPress={() => router.push('/jouw-naam')} />
          <ListRow icon="edit" title={`Profiel van ${child}`} subtitle="Naam, geboortedatum, uitgerekende datum" onPress={() => router.push('/profiel')} />
          <ListRow
            icon="family"
            title="Familie en delen"
            subtitle={familyLine}
            onPress={() => router.replace('/familie')}
          />
          <ListRow icon="bell" title="Meldingen" subtitle="Hooguit één per dag, om 19.00 uur" onPress={() => router.push('/meldingen')} />
          <ListRow icon="lock" title="Privacy en gegevens" subtitle="Alleen op uitnodiging" onPress={() => router.push('/privacy')} />
          <ListRow icon="trash" title="Onlangs verwijderd" subtitle="Momenten terugzetten, tot 30 dagen" onPress={() => router.push('/verwijderd')} />
        </View>
        <View>
          <ListRow icon="mail" title="Feedback geven" subtitle="We lezen alles, echt" onPress={() => mail(`Feedback over ${possessive(child)} pad`)} />
          <ListRow icon="help" title="Hulp en vragen" subtitle={HELLO} onPress={() => mail('Een vraag over TeddySteps')} />
        </View>
        {mailNote ? (
          <Text role="status" style={[text('meta'), { color: color.inkMuted }]}>
            {mailNote}
          </Text>
        ) : null}
        {sure ? (
          <Text role="alert" style={[text('rowTitle'), { color: color.plum }]}>
            {waiting === 1
              ? 'Er staat nog 1 moment alleen op deze telefoon. Log je nu uit, dan is het weg.'
              : `Er staan nog ${waiting} momenten alleen op deze telefoon. Log je nu uit, dan zijn ze weg.`}
          </Text>
        ) : null}
        {sure ? (
          <Button block variant="danger" onPress={signOut}>
            Toch uitloggen
          </Button>
        ) : (
          <View style={styles.center}>
            <TextLink onPress={signOut}>Uitloggen</TextLink>
          </View>
        )}
      </Screen>
      <Tabs active="me" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  center: { alignItems: 'center' },
});
