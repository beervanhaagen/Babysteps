import { todayInAmsterdam, trailWeek } from '@teddysteps/core';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { Button, color, text } from '@teddysteps/ui';
import { CircleList } from '@/components/CircleList';
import { Screen } from '@/components/Screen';
import { TextLink } from '@/components/TextLink';
import { useAuth } from '@/lib/auth';
import { useCircle } from '@/lib/family';

// O3 Familie uitnodigen (2 van 3 after O2; then O6 Inhalen, 3 van 3, when there are weeks to catch up).
// Each person gets their own link (F1), so it can be withdrawn per person. Adding from the
// phone's contacts and inviting the other parent come later (M3, step 8).
export default function InviteFamily() {
  const { onboarding } = useLocalSearchParams<{ onboarding?: string }>();
  const { members } = useCircle();
  const { state } = useAuth();
  const birth = state.status === 'ready' ? state.trail.birthDate : null;
  // Nothing to catch up before the birth or in week 1.
  const done = () =>
    onboarding && birth && trailWeek(birth, todayInAmsterdam()) > 1 ? router.replace({ pathname: '/inhalen', params: { onboarding: '1' } }) : router.replace('/pad');

  return (
    <Screen
      header={{
        title: 'Wie lopen er met je mee?',
        color: onboarding ? 'lilac' : 'pistachio',
        step: onboarding ? [2, 3] : undefined,
        onBack: onboarding ? undefined : router.back,
        character: 'bizzy',
        characterRotate: 8,
      }}
      footer={
        onboarding ? (
          <>
            <Button block onPress={done}>
              Volgende
            </Button>
            <TextLink onPress={done}>Doe ik later</TextLink>
          </>
        ) : undefined
      }
    >
      <Text style={styles.intro}>Ouders voegen momenten toe. Familie kijkt mee, stuurt knuffels en spreekt berichtjes in.</Text>
      <CircleList members={members ?? []} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { ...text('body'), fontSize: 15, lineHeight: 22, color: color.inkMuted },
});
