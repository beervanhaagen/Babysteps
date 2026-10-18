import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { Button, ChoiceChip, ChoiceGroup, color, TextField, text, useAnnounce } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth';
import { friendlyError } from '@/lib/errors';
import { inviteFamily, RELATIONS, type Relation } from '@/lib/family';

// "Iemand toevoegen" from O3 and M3: what the child calls them, and who they are.
// No board of its own; the fields follow M3 and the data model (first names only).
export default function AddPerson() {
  const { state } = useAuth();
  const name = state.status === 'ready' ? state.trail.childName : 'je kleintje';
  const [label, setLabel] = useState('');
  const [relation, setRelation] = useState<Relation | null>(null);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  useAnnounce(error);

  async function next() {
    if (!label.trim()) return setError(`Hoe noemt ${name} deze persoon? Bijvoorbeeld "Oma Ria".`);
    setError(undefined);
    setBusy(true);
    try {
      const { memberId, code } = await inviteFamily(label.trim(), relation);
      router.replace({ pathname: '/uitnodiging/[id]', params: { id: memberId, code } });
    } catch (e) {
      setBusy(false);
      setError(friendlyError(e));
    }
  }

  return (
    <Screen
      header={{ title: 'Iemand toevoegen', color: 'pistachio', onBack: router.back, character: 'puddle' }}
      footer={
        <Button block onPress={next} busy={busy}>
          Uitnodiging maken
        </Button>
      }
    >
      <TextField
        label={`Hoe noemt ${name} deze persoon?`}
        hint="Alleen een voornaam of roepnaam, zoals Oma Ria of Tante Sanne."
        placeholder="Oma Ria"
        value={label}
        onChangeText={setLabel}
        error={error}
        maxLength={40}
        autoCapitalize="words"
        autoComplete="off"
      />
      <ChoiceGroup label="Wie is het?">
        {RELATIONS.map((r) => (
          <ChoiceChip key={r.id} selected={relation === r.id} onPress={() => setRelation(relation === r.id ? null : r.id)}>
            {r.label}
          </ChoiceChip>
        ))}
      </ChoiceGroup>
      <Text style={styles.note}>Familie ziet je momenten op een eigen pagina, zonder app of wachtwoord. Je kunt iemand altijd weer uit je kring halen.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  note: { ...text('meta'), color: color.inkMuted },
});
