import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { border, Button, Character, CodeInput, color, fontFamily, Icon, IconButton, radius, shadow, text, useLoop } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';
import { TextLink } from '@/components/TextLink';
import { friendlyError } from '@/lib/errors';
import { supabase } from '@/lib/supabase';

const RESEND_AFTER_S = 60;

// S3 E-mailcode. Also the second step of S4: the code works for new and existing accounts.
export default function EmailCode() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(RESEND_AFTER_S);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait(wait - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  async function confirm(value = code) {
    if (value.length < 6 || busy) return;
    setBusy(true);
    setError(undefined);
    const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: value, type: 'email' });
    setBusy(false);
    // On success the auth state changes and the router moves on by itself.
    if (verifyError) setError(friendlyError(verifyError));
  }

  async function resend() {
    setWait(RESEND_AFTER_S);
    setError(undefined);
    setCode('');
    const { error: sendError } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (sendError) setError(friendlyError(sendError));
  }

  function change(value: string) {
    setCode(value);
    if (error) setError(undefined);
    if (value.length === 6) confirm(value);
  }

  return (
    <Screen
      footer={
        <Button block onPress={() => confirm()} disabled={code.length < 6 || busy}>
          Bevestigen
        </Button>
      }
    >
      <View style={styles.bar}>
        <IconButton icon="back" label="Terug" onPress={router.back} />
      </View>
      <MailArt />
      <Text accessibilityRole="header" style={text('titleL')}>
        Kijk in je mail!
      </Text>
      <Text style={styles.body}>
        We hebben een code van 6 cijfers gestuurd naar <Text style={styles.strong}>{email}</Text>. De code is 10 minuten geldig.
      </Text>
      <CodeInput value={code} onChangeText={change} autoFocus invalid={!!error} />
      {error ? (
        <Text role="alert" accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <TextLink onPress={resend} disabled={wait > 0}>
        {wait > 0 ? `Niks gekregen? Nieuwe code over ${wait} s` : 'Niks gekregen? Stuur een nieuwe code'}
      </TextLink>
    </Screen>
  );
}

function MailArt() {
  const drift = useLoop('drift', 1);
  return (
    <View style={styles.art} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <View style={styles.puddle}>
        <Character name="puddle" size={130} decorative />
      </View>
      <Animated.View style={[styles.envelope, { transform: [...(drift ?? []), { rotate: '8deg' }] }]}>
        <Icon name="mail" size={36} weight={2.4} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { height: 56, justifyContent: 'center', marginHorizontal: -14 },
  art: { height: 200 },
  puddle: { position: 'absolute', left: 36, bottom: 0 },
  envelope: {
    position: 'absolute',
    right: 26,
    top: 10,
    width: 92,
    height: 66,
    borderRadius: radius.radiusS,
    borderWidth: border.edgeBold,
    borderColor: color.ink,
    backgroundColor: color.white,
    boxShadow: shadow.shadowMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { fontFamily: fontFamily('sans', 400), fontSize: 16, lineHeight: 24, color: color.ink },
  strong: { fontFamily: fontFamily('sans', 800) },
  error: { ...text('meta'), color: color.plum },
});
