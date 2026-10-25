import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import { Button, color, text, useAnnounce } from '@teddysteps/ui';
import { useChildForm } from '@/components/ChildForm';
import { Screen } from '@/components/Screen';
import { TextLink } from '@/components/TextLink';
import { signOut, useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { requestDeletion, signOutEverywhere } from '@/lib/leave';
import { myPartnerInvite } from '@/lib/family';
import { supabase } from '@/lib/supabase';

// O2 Je kleintje (1 van 3). The fields are shared with M1 "Profiel van Lotte" (components/ChildForm).
export default function YourLittleOne() {
  const { refresh } = useAuth();
  const { fields, check } = useChildForm();
  const { eigen } = useLocalSearchParams<{ eigen?: string }>();
  // Invited as the second parent? Then that comes first (M3), unless they chose an own trail.
  // Nothing shows until we know, so nobody starts a second trail by accident.
  const [checked, setChecked] = useState(!!eigen);
  useEffect(() => {
    if (eigen) return;
    myPartnerInvite().then(
      (invite) => (invite ? router.replace('/ouder-uitnodiging') : setChecked(true)),
      () => setChecked(true),
    );
  }, [eigen]);
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  useAnnounce(formError);

  function deleteAccount() {
    Alert.alert('Account verwijderen?', 'Je account is dan binnen een uur weg. Er staat nog niets op een pad.', [
      { text: 'Toch niet', style: 'cancel' },
      {
        text: 'Ja, verwijder',
        style: 'destructive',
        onPress: () =>
          requestDeletion('account', true).then(signOutEverywhere, () => setFormError('Dat lukte even niet. Check je internet en probeer het opnieuw.')),
      },
    ]);
  }

  async function next() {
    const values = check();
    if (!values) return;
    setBusy(true);
    setFormError(undefined);
    const { error } = await supabase.rpc('create_trail', {
      child_first_name: values.name,
      child_birth_date: values.birthDate,
      child_due_date: values.dueDate,
    });
    if (error) {
      // The trail may exist even if the answer got lost; refresh moves on if it does.
      await refresh();
      setBusy(false);
      return setFormError(friendlyError(error));
    }
    // The parent now has a trail: on to O3 (2 van 3).
    await refresh();
    router.replace({ pathname: '/uitnodigen', params: { onboarding: '1' } });
  }

  if (!checked) return null;

  return (
    <Screen
      header={{ title: 'Wie is de kleine ontdekker?', color: 'lilac', step: [1, 3], character: 'tiggy', characterRotate: -8 }}
      footer={
        <Button block onPress={next} busy={busy}>
          Volgende
        </Button>
      }
    >
      {fields}
      {formError ? (
        <Text role="alert" style={styles.error}>
          {formError}
        </Text>
      ) : null}
      {/* A way out for a second parent who used the wrong address, so no duplicate trail. */}
      <Text style={styles.hint}>Uitgenodigd door je partner? Log dan in met het adres uit de mail.</Text>
      <TextLink onPress={() => signOut()}>Ander e-mailadres? Uitloggen</TextLink>
      {/* Apple: an account can always be deleted in the app, also before there is a trail. */}
      <TextLink onPress={deleteAccount}>Account verwijderen</TextLink>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { ...text('meta'), color: color.plum },
  hint: { ...text('meta'), color: color.inkMuted, textAlign: 'center' },
});
