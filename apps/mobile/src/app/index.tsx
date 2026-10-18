import { Redirect } from 'expo-router';
import { useAuth } from '@/lib/auth';

const HOME = { 'signed-out': '/start', onboarding: '/kleintje', ready: '/pad', offline: '/opnieuw' } as const;

export default function Index() {
  const { state } = useAuth();
  if (state.status === 'loading') return null;
  return <Redirect href={HOME[state.status]} />;
}
