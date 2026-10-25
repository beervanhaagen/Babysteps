import { possessive } from '@teddysteps/core';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button, color, text, useAnnounce } from '@teddysteps/ui';
import { useChildForm } from '@/components/ChildForm';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

// M1 "Profiel van Lotte": the O2 form in edit mode, no step bar, button "Opslaan". A new birth
// date moves the weeks along (supabase/migrations/20261025090000_child_profile.sql).
export default function ChildProfile() {
  const { state, refresh } = useAuth();
  const trail = state.status === 'ready' ? state.trail : null;
  const { fields, check } = useChildForm(trail ? { name: trail.childName, birthDate: trail.birthDate, dueDate: trail.dueDate } : undefined);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string>();
  useAnnounce(formError);
  if (!trail) return null;

  async function save() {
    const values = check();
    if (!values) return;
    setBusy(true);
    setFormError(undefined);
    const { error } = await supabase
      .from('children')
      .update({ first_name: values.name, birth_date: values.birthDate, due_date: values.dueDate })
      .eq('trail_id', trail!.id);
    if (error) {
      setBusy(false);
      return setFormError(friendlyError(error));
    }
    await refresh();
    router.back();
  }

  return (
    <Screen
      header={{ title: `Profiel van ${trail.childName}`, color: 'lilac', onBack: router.back, character: 'tiggy', characterRotate: -8 }}
      footer={
        <Button block onPress={save} busy={busy}>
          Opslaan
        </Button>
      }
    >
      {fields}
      {trail.birthDate ? (
        <Text style={styles.note}>
          Klopt de geboortedatum niet? Pas hem aan, dan schuiven de weken van {possessive(trail.childName)} pad mee. Momenten die je zelf naar een andere week zette, blijven
          staan.
        </Text>
      ) : null}
      {formError ? (
        <Text role="alert" style={styles.error}>
          {formError}
        </Text>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { ...text('meta'), color: color.inkMuted },
  error: { ...text('meta'), color: color.plum },
});
