import { possessive } from '@teddysteps/core';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { color, text } from '@teddysteps/ui';
import { CircleList } from '@/components/CircleList';
import { Screen } from '@/components/Screen';
import { Tabs } from '@/components/Tabs';
import { useAuth } from '@/lib/auth';
import { useCircle } from '@/lib/family';

// M3 Familie en rollen, the launch part: who is in the circle, a new link, withdrawing.
// Devices per person and inviting the other parent come with the rest of M3 in step 8.
export default function Family() {
  const { state } = useAuth();
  const { members } = useCircle();
  const name = state.status === 'ready' ? state.trail.childName : '';
  const joined = members?.filter((m) => m.joinedAt).length ?? 0;

  return (
    <View style={styles.screen}>
      <Screen
        header={{
          title: `${possessive(name)} kring`,
          subtitle: joined === 0 ? 'Nog niemand loopt mee' : joined === 1 ? '1 persoon loopt mee' : `${joined} mensen lopen mee`,
          color: 'pistachio',
          character: 'puddle',
        }}
      >
        {members && !members.length ? <Text style={styles.empty}>Nog niemand in de kring. Nodig iemand uit, dan kijken ze mee en sturen ze knuffels.</Text> : null}
        <CircleList members={members ?? []} onEdit={(m) => router.push({ pathname: '/kring/[id]', params: { id: m.id } })} />
        <Text style={styles.note}>Familie heeft geen downloadknop, tenzij je die aanzet bij Privacy en gegevens. Een schermafbeelding kan altijd, dus nodig alleen mensen uit die je vertrouwt.</Text>
      </Screen>
      <Tabs active="family" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  empty: { ...text('body'), fontSize: 15, lineHeight: 22 },
  note: { ...text('meta'), color: color.inkMuted, marginTop: 8 },
});
