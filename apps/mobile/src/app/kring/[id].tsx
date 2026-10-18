import { longDutchDate, todayInAmsterdam } from '@teddysteps/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Avatar, Button, color, text, useAnnounce } from '@teddysteps/ui';
import { relationLabel } from '@/components/CircleList';
import { Screen } from '@/components/Screen';
import { TextLink } from '@/components/TextLink';
import { friendlyError } from '@/lib/errors';
import { newFamilyLink, revokeFamily, useCircle } from '@/lib/family';

// One person in the circle ("Wijzig" on M3): send a new link, or take them out of the circle.
export default function CircleMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { members } = useCircle();
  const member = members?.find((m) => m.id === id);
  const [sure, setSure] = useState(false);
  const [done, setDone] = useState(false);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  useAnnounce(error ?? (done ? `${label} kijkt niet meer mee.` : sure ? `Weet je het zeker? ${member?.label} kan dan niets meer zien.` : undefined));
  if (done) {
    return (
      <Screen header={{ title: 'Uit de kring', color: 'pistachio', onBack: router.back }}>
        <Text role="status" style={styles.body}>
          {label} kijkt niet meer mee. De link en alle apparaten werken niet meer.
        </Text>
        <Button block variant="paper" onPress={() => router.back()}>
          Terug naar je kring
        </Button>
      </Screen>
    );
  }
  if (!member) return null;

  async function sendNewLink() {
    setBusy(true);
    try {
      const code = await newFamilyLink(member!.id);
      router.replace({ pathname: '/uitnodiging/[id]', params: { id: member!.id, code } });
    } catch (e) {
      setBusy(false);
      setError(friendlyError(e));
    }
  }

  async function revoke() {
    if (!sure) return setSure(true);
    setBusy(true);
    try {
      await revokeFamily(member!.id);
      setLabel(member!.label);
      setDone(true);
    } catch (e) {
      setBusy(false);
      setError(friendlyError(e));
    }
  }

  const since = member.joinedAt ? longDutchDate(todayInAmsterdam(new Date(member.joinedAt)), { weekday: false, year: true }) : null;
  return (
    <Screen header={{ title: member.label, subtitle: relationLabel(member), color: 'pistachio', onBack: router.back }}>
      <Avatar name={member.label} size={64} decorative />
      <Text style={styles.body}>
        {since ? `Kijkt mee sinds ${since}.` : 'Heeft de uitnodiging nog niet geopend.'}{' '}
        {member.frequency === 'never' ? 'Krijgt geen kaartjes in de mail.' : member.frequency === 'each' ? 'Krijgt bij elk moment een kaartje.' : 'Krijgt elke zondag een kaartje.'}
      </Text>
      <Button block variant="paper" icon="share" onPress={sendNewLink} busy={busy && !sure}>
        Nieuwe link sturen
      </Button>
      <Text style={styles.note}>
        De oude link en alle apparaten waarop hij geopend is, stoppen dan. {member.label} opent gewoon de nieuwe link. Handig als een link is doorgestuurd.
      </Text>
      {sure ? (
        <Text role="alert" style={[text('rowTitle'), { color: color.plum }]}>
          {member.label} kan dan niets meer zien, op geen enkel apparaat. Weet je het zeker?
        </Text>
      ) : null}
      <Button block variant={sure ? 'danger' : 'paper'} icon="close" onPress={revoke} busy={busy && sure}>
        {sure ? 'Ja, uit de kring halen' : 'Uit de kring halen'}
      </Button>
      {sure && !busy ? <TextLink onPress={() => setSure(false)}>Toch niet</TextLink> : null}
      {error ? (
        <Text role="alert" style={[text('meta'), { color: color.plum }]}>
          {error}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { ...text('body'), fontSize: 16, lineHeight: 24 },
  note: { ...text('meta'), color: color.inkMuted },
});
