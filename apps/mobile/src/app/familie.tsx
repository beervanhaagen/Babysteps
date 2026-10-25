import { possessive } from '@teddysteps/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { color, PersonRow, text } from '@teddysteps/ui';
import { CircleList } from '@/components/CircleList';
import { Screen } from '@/components/Screen';
import { Tabs } from '@/components/Tabs';
import { useAuth } from '@/lib/auth';
import { TextLink } from '@/components/TextLink';
import { cancelPartnerInvite, removeJoinedParent, useCircle, useParents } from '@/lib/family';

// M3 Familie en rollen: the parents (and inviting the other one), who is in the circle, a new
// link, withdrawing; devices per person on their own screen (kring/[id]).
export default function Family() {
  const { state } = useAuth();
  const { members } = useCircle();
  const { parents, invite, recent, refresh } = useParents();
  const [cancelFailed, setCancelFailed] = useState(false);

  // A typo in the address made someone else a parent: undo it, within 7 days of joining.
  function takeOff(who: string, inviteId: string) {
    Alert.alert(`${who} eraf halen?`, `${who} kan het pad dan niet meer zien. Was het toch goed? Dan nodig je opnieuw uit.`, [
      { text: 'Toch niet', style: 'cancel' },
      { text: 'Ja, haal eraf', style: 'destructive', onPress: () => removeJoinedParent(inviteId).then(refresh, () => setCancelFailed(true)) },
    ]);
  }
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
        <View>
          <Text accessibilityRole="header" style={styles.section}>
            Ouders
          </Text>
          {(parents ?? []).map((p) => (
            <PersonRow
              key={p.userId}
              name={p.isMe ? (p.firstName ? `${p.firstName} (jij)` : 'Jij') : (p.firstName ?? 'De andere ouder')}
              role="Ouder · kan toevoegen en aanpassen"
              tone="pistachio"
              action={recent && recent.userId === p.userId ? 'Haal eraf' : undefined}
              onAction={recent && recent.userId === p.userId ? () => takeOff(p.firstName ?? 'deze ouder', recent.invite) : undefined}
            />
          ))}
          {invite ? (
            <View style={styles.invite}>
              <Text style={styles.inviteText}>Uitnodiging verstuurd naar {invite.email}. Werkt zodra je partner met dit adres inlogt.</Text>
              <TextLink
                onPress={() =>
                  cancelPartnerInvite(invite.id).then(
                    () => (setCancelFailed(false), refresh()),
                    () => setCancelFailed(true),
                  )
                }
              >
                Intrekken
              </TextLink>
              {cancelFailed ? (
                <Text role="alert" style={styles.error}>
                  Dat lukte even niet. Probeer het zo nog eens.
                </Text>
              ) : null}
            </View>
          ) : parents && parents.length < 2 ? (
            <TextLink onPress={() => router.push('/ouder-uitnodigen')}>Nodig je partner uit als ouder</TextLink>
          ) : null}
        </View>
        <Text accessibilityRole="header" style={styles.section}>
          Familie
        </Text>
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
  section: { ...text('eyebrow'), fontSize: 12, textTransform: 'uppercase', marginBottom: 4 },
  invite: { gap: 4, paddingVertical: 8 },
  inviteText: { ...text('meta'), color: color.inkMuted },
  error: { ...text('meta'), color: color.plum },
});
