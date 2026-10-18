import { router } from 'expo-router';
import { EmailSignIn } from '@/components/EmailSignIn';
import { Screen } from '@/components/Screen';

// S2 Account maken.
export default function CreateAccount() {
  return (
    <Screen header={{ title: 'Maak je TeddySteps-account', color: 'pistachio', onBack: router.back, character: 'bizzy', characterRotate: 8 }}>
      <EmailSignIn terms />
    </Screen>
  );
}
