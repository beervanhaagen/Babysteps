import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button, color, text, useAnnounce } from '@teddysteps/ui';
import { useChildForm } from '@/components/ChildForm';
import { Screen } from '@/components/Screen';
import { TextLink } from '@/components/TextLink';
import { signOut, useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

// O2 Je kleintje (1 van 3). The fields are shared with M1 "Profiel van Lotte" (components/ChildForm).
export default function YourLittleOne() {
  const { refresh } = useAuth();
  const { fields, check } = useChildForm();
  const [formError, setFormError] = useState<string>();
  const [busy, setBusy] = useState(false);
  useAnnounce(formError);

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
      <TextLink onPress={() => signOut()}>Ander e-mailadres? Uitloggen</TextLink>
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: { ...text('meta'), color: color.plum },
});
