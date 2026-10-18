import { router } from 'expo-router';
import { EmailSignIn } from '@/components/EmailSignIn';
import { Screen } from '@/components/Screen';
import { TextLink } from '@/components/TextLink';

// S4 Inloggen. The board says "Lottes pad heeft je gemist", but before logging in we don't
// know the child's name yet.
export default function LogIn() {
  return (
    <Screen header={{ title: 'Welkom terug!', subtitle: 'Je pad heeft je gemist.', color: 'lilac', onBack: router.back, character: 'bo' }}>
      <EmailSignIn />
      <TextLink onPress={() => router.replace('/welkom')}>Nieuw hier? Begin een pad</TextLink>
    </Screen>
  );
}
