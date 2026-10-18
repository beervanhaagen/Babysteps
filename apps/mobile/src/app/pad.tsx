import { possessive } from '@teddysteps/core';
import { router } from 'expo-router';
import { StyleSheet, Text } from 'react-native';
import { Button, color, EmptySlot, text } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

// Placeholder until T1 Trail home is built in step 3.
export default function Trail() {
  const { state } = useAuth();
  const name = state.status === 'ready' ? state.trail.childName : '';
  return (
    <Screen
      header={{ title: possessive(name) + ' pad', color: 'cornflower', character: 'bo' }}
      footer={
        <>
          {__DEV__ ? (
            <Button block variant="paper" onPress={() => router.push('/galerij')}>
              Bekijk de galerij
            </Button>
          ) : null}
          <Button block variant="paper" onPress={() => supabase.auth.signOut()}>
            Uitloggen
          </Button>
        </>
      }
    >
      <EmptySlot />
      <Text style={styles.body}>Het pad zelf komt in de volgende stap.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { ...text('body'), color: color.inkMuted },
});
