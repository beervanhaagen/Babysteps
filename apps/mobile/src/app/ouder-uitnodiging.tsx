import { possessive } from '@teddysteps/core';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button, color, text, useAnnounce } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';
import { TextLink } from '@/components/TextLink';
import { useAuth } from '@/lib/auth';
import { acceptPartnerInvite, InviteRefused, myPartnerInvite } from '@/lib/family';

// M3, the invited parent after signing in (with exactly the invited, confirmed address): join the
// trail, or start an own one (O2). Someone who already has a trail never gets here (M2 is later).
export default function PartnerInvite() {
  const { state, refresh } = useAuth();
  const [invite, setInvite] = useState<{ id: string; child: string; inviter: string | null } | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  useAnnounce(error);

  useEffect(() => {
    myPartnerInvite().then(setInvite, () => setInvite(null));
  }, []);
  useEffect(() => {
    if (invite === null) router.replace(state.status === 'ready' ? '/pad' : '/kleintje');
  }, [invite, state.status]);
  if (!invite) {
    return (
      <Screen header={{ title: 'Even kijken…', color: 'lilac', character: 'tiggy' }}>
        <Text style={styles.body}>We zoeken je uitnodiging op.</Text>
      </Screen>
    );
  }

  async function join() {
    setBusy(true);
    setError(undefined);
    try {
      await acceptPartnerInvite(invite!.id);
      await refresh();
      router.replace('/pad');
    } catch (e) {
      // The answer may have got lost after joining: then the trail is simply there.
      await refresh();
      setBusy(false);
      setError(e instanceof InviteRefused && e.reason === 'gone' ? 'Deze uitnodiging werkt niet meer. Vraag om een nieuwe.' : 'Dat lukte even niet. Probeer het zo nog eens.');
    }
  }

  return (
    <Screen
      header={{ title: `Welkom op ${possessive(invite.child)} pad`, color: 'lilac', character: 'tiggy' }}
      footer={
        <>
          <Button block onPress={join} busy={busy}>
            Ja, ik doe mee
          </Button>
          <TextLink onPress={() => (state.status === 'ready' ? router.back() : router.replace({ pathname: '/kleintje', params: { eigen: '1' } }))}>
            {state.status === 'ready' ? 'Nee, ik houd mijn eigen pad' : 'Nee, ik begin een eigen pad'}
          </TextLink>
        </>
      }
    >
      <Text style={styles.body}>
        {invite.inviter ?? 'De andere ouder'} nodigt je uit om samen {possessive(invite.child)} pad bij te houden. Jullie zien dan allebei alles, kunnen allebei momenten vastpinnen en hebben dezelfde rechten. {invite.inviter ?? 'De andere ouder'} krijgt een mail met jouw e-mailadres als je meedoet.
      </Text>
      {error ? (
        <Text role="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { ...text('body'), fontSize: 16, lineHeight: 24 },
  error: { ...text('meta'), color: color.plum },
});
