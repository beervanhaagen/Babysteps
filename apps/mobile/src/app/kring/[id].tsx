import { daysBetween, longDutchDate, todayInAmsterdam, type CalendarDate } from '@teddysteps/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Avatar, Button, color, ListRow, text, useAnnounce } from '@teddysteps/ui';
import { relationLabel } from '@/components/CircleList';
import { Screen } from '@/components/Screen';
import { TextLink } from '@/components/TextLink';
import { friendlyError } from '@/lib/errors';
import { memberDevices, newFamilyLink, revokeDevice, revokeFamily, useCircle, type FamilyDevice } from '@/lib/family';

// One person in the circle ("Wijzig" on M3): the devices their link is open on (log one out),
// send a new link, or take them out of the circle.
export default function CircleMemberScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { members } = useCircle();
  const member = members?.find((m) => m.id === id);
  const [sure, setSure] = useState(false);
  const [done, setDone] = useState(false);
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [devices, setDevices] = useState<FamilyDevice[] | null>(null);
  const [loggedOut, setLoggedOut] = useState<string>();
  const loadDevices = useCallback(() => {
    if (id) memberDevices(id).then(setDevices, () => setDevices([]));
  }, [id]);
  useEffect(loadDevices, [loadDevices]);
  useAnnounce(error ?? (done ? `${label} kijkt niet meer mee.` : sure ? `Weet je het zeker? ${member?.label} kan dan niets meer zien.` : loggedOut));
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

  // Only that device, e.g. an old tablet. A device that still has the link can log in again;
  // for a link that went somewhere unexpected, "Nieuwe link sturen" is the real fix.
  async function logOut(device: FamilyDevice) {
    if (busy) return;
    setBusy(true);
    setError(undefined);
    try {
      await revokeDevice(device.id);
      setLoggedOut(`${device.hint} is uitgelogd. Staat de link daar nog, dan kan het weer inloggen. Ken je dit apparaat niet? Kies dan Nieuwe link sturen.`);
      loadDevices();
    } catch (e) {
      setError(friendlyError(e));
    }
    setBusy(false);
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
      {devices?.length ? (
        <View>
          <Text accessibilityRole="header" style={styles.section}>
            Kijkt mee op
          </Text>
          {devices.map((d) => (
            <ListRow
              key={d.id}
              title={d.hint}
              subtitle={lastUsed(d.lastUsedOn)}
              accessory={
                <TextLink accessibilityLabel={`Uitloggen: ${d.hint}`} disabled={busy} onPress={() => logOut(d)}>
                  Uitloggen
                </TextLink>
              }
            />
          ))}
        </View>
      ) : null}
      {loggedOut ? (
        <Text role="status" style={styles.note}>
          {loggedOut}
        </Text>
      ) : null}
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

/** "vandaag", "gisteren", "3 dagen geleden", or a date. */
function lastUsed(day: string): string {
  const ago = daysBetween(day as CalendarDate, todayInAmsterdam());
  if (ago <= 0) return 'Vandaag gebruikt';
  if (ago === 1) return 'Gisteren gebruikt';
  if (ago < 14) return `${ago} dagen geleden gebruikt`;
  return `Laatst gebruikt op ${longDutchDate(day as CalendarDate, { weekday: false })}`;
}

const styles = StyleSheet.create({
  section: { ...text('eyebrow'), fontSize: 12, textTransform: 'uppercase', marginBottom: 4 },
  body: { ...text('body'), fontSize: 16, lineHeight: 24 },
  note: { ...text('meta'), color: color.inkMuted },
});
