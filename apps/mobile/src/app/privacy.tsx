import { possessive } from '@teddysteps/core';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { color, ListRow, Sticker, Switch, text, useAnnounce } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

// M6 Privacy en gegevens (board Account-3, step 8): invite-only is fixed, not a switch; the
// sprongetjes, the family-wide "mag foto's bewaren" (off by default; family gets a "Bewaar foto"
// button for the 1280px version, never print) and "Anoniem meten". Export (Alles downloaden) and
// "Pad verwijderen" (M7) come in the next slices; "Pad pauzeren" isn't in the launch scope.
type Settings = { leap: boolean; keep: boolean; measure: boolean };

export default function Privacy() {
  const { state, refresh } = useAuth();
  const trail = state.status === 'ready' ? state.trail : null;
  const userId = state.status === 'ready' ? state.session.user.id : null;
  // Nothing shown until loaded, so a switch never flips by itself.
  const [settings, setSettings] = useState<Settings | null>(null);
  const [message, setMessage] = useState<string>();
  useAnnounce(message);

  useEffect(() => {
    if (!trail || !userId) return;
    Promise.all([
      supabase.from('trails').select('family_may_keep_photos').eq('id', trail.id).single(),
      supabase.from('profiles').select('analytics_opt_out').eq('id', userId).single(),
    ]).then(([t, p]) => setSettings({ leap: trail.leapCardsOn, keep: !!t.data?.family_may_keep_photos, measure: !p.data?.analytics_opt_out }));
  }, [trail, userId]);

  if (!trail || !userId) return null;
  const name = trail.childName;

  async function change(key: keyof Settings, value: boolean) {
    setMessage(undefined);
    setSettings((s) => s && { ...s, [key]: value });
    const { error } =
      key === 'leap'
        ? await supabase.from('children').update({ leap_cards_on: value }).eq('trail_id', trail!.id)
        : key === 'keep'
          ? await supabase.from('trails').update({ family_may_keep_photos: value }).eq('id', trail!.id)
          : await supabase.from('profiles').update({ analytics_opt_out: !value }).eq('id', userId!);
    if (error) {
      setSettings((s) => s && { ...s, [key]: !value });
      return setMessage(friendlyError(error));
    }
    if (key === 'leap') await refresh();
  }

  return (
    <Screen header={{ title: 'Privacy en gegevens', color: 'lilac', onBack: router.back, character: 'bo' }}>
      <View>
        <ListRow
          icon="lock"
          title="Alleen op uitnodiging"
          subtitle={`Niemand vindt ${possessive(name)} pad zonder jouw uitnodiging.`}
          accessory={<Sticker tone="pistachio">Altijd aan</Sticker>}
        />
        {settings ? (
          <>
            <Switch
              label="Sprongetjes tonen"
              hint="Het kaartje ‘Wat komt eraan’ op je pad. Zet het uit als het je onrustig maakt."
              value={settings.leap}
              onValueChange={(v) => change('leap', v)}
            />
            <Switch
              label="Familie mag foto’s bewaren"
              hint="Aan: familie kan foto’s opslaan met een knop op hun pagina, en straks staan ze ook in de zondagmail. Uit: alleen kijken. Wat al bewaard is, blijft bij hen."
              value={settings.keep}
              onValueChange={(v) => change('keep', v)}
            />
            <Switch
              label="Anoniem meten wat beter kan"
              hint="Alleen tellen, nooit foto’s, namen of teksten."
              value={settings.measure}
              onValueChange={(v) => change('measure', v)}
            />
          </>
        ) : null}
      </View>
      {message ? (
        <Text role="alert" style={[text('meta'), { color: color.plum }]}>
          {message}
        </Text>
      ) : null}
      <Text style={styles.promise}>Opgeslagen in de EU. Nooit verkocht, gedeeld of gebruikt om AI te trainen.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  promise: { ...text('meta'), color: color.inkMuted, textAlign: 'center' },
});
