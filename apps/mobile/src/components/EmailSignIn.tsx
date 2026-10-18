import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, Text } from 'react-native';
import { Button, color, fontFamily, TextField, text, useAnnounce } from '@teddysteps/ui';
import { friendlyError, isEmail } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

// Apple and Google sign-in (S2, S4) come once the Apple and Google accounts exist
// (docs/bouwplan.md §9); until then only the e-mail code is shown, never a dead button.

/** E-mail address plus "Stuur me een code", shared by S2 (new account) and S4 (log in). */
export function EmailSignIn({ terms }: { terms?: boolean }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  useAnnounce(error);

  async function send() {
    const address = email.trim().toLowerCase();
    if (!isEmail(address)) return setError('Dit e-mailadres klopt nog niet helemaal.');
    setError(undefined);
    setBusy(true);
    // Always allowed to create an account, so the screen never reveals whether an address is known.
    const { error: sendError } = await supabase.auth.signInWithOtp({ email: address, options: { shouldCreateUser: true } });
    setBusy(false);
    if (sendError) return setError(friendlyError(sendError));
    router.push({ pathname: '/code', params: { email: address } });
  }

  return (
    <>
      <TextField
        label="E-mailadres"
        value={email}
        onChangeText={setEmail}
        error={error}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        returnKeyType="send"
        onSubmitEditing={send}
      />
      <Button block onPress={send} busy={busy}>
        Stuur me een code
      </Button>
      {terms ? (
        <Text style={styles.terms}>
          Door verder te gaan, ga je akkoord met onze{' '}
          <Text accessibilityRole="link" style={styles.termsLink} onPress={() => Linking.openURL('https://teddysteps.nl/voorwaarden')}>
            voorwaarden
          </Text>{' '}
          en{' '}
          <Text accessibilityRole="link" style={styles.termsLink} onPress={() => Linking.openURL('https://teddysteps.nl/privacy')}>
            privacybelofte
          </Text>
          .
        </Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  terms: { ...text('meta'), fontFamily: fontFamily('sans', 400), lineHeight: 20, color: color.inkMuted, textAlign: 'center' },
  termsLink: { fontFamily: fontFamily('sans', 800), color: color.ink, textDecorationLine: 'underline' },
});
