import { possessive } from '@teddysteps/core';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Share, StyleSheet, Text, View } from 'react-native';
import { border, Button, color, fontFamily, Hug, TextField, text, useAnnounce } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';
import { TextLink } from '@/components/TextLink';
import { useAuth } from '@/lib/auth';
import { familyLink, useCircle } from '@/lib/family';

// F1 Dit krijgt oma: the message and link as they arrive in WhatsApp. The link preview stays
// generic (no name, no photo; decided 17 October 2026), so the preview here shows that too.
export default function InviteMessage() {
  const { id, code } = useLocalSearchParams<{ id: string; code: string }>();
  const { state } = useAuth();
  const { members } = useCircle();
  const name = state.status === 'ready' ? state.trail.childName : '';
  const member = members?.find((m) => m.id === id);
  const [message, setMessage] = useState(`Hoi! Ik houd ${possessive(name)} eerste jaar bij in TeddySteps. Tik om mee te kijken, je hebt geen account nodig.`);
  const [copied, setCopied] = useState(false);
  useAnnounce(copied ? 'Link gekopieerd' : undefined);
  const link = familyLink(code);

  async function share() {
    const result = await Share.share({ message: `${message.trim()}\n${link}` });
    if (result.action === Share.sharedAction) router.back();
  }

  async function copy() {
    await Clipboard.setStringAsync(link);
    setCopied(true);
  }

  return (
    <Screen
      header={{ title: member ? `Dit krijgt ${member.label}` : 'Dit krijgen ze', color: 'pistachio', onBack: router.back }}
      footer={
        <>
          <Button block icon="share" onPress={share}>
            Uitnodiging versturen
          </Button>
          <TextLink onPress={copy}>{copied ? 'Gekopieerd!' : 'Of kopieer de link'}</TextLink>
        </>
      }
    >
      <View style={styles.chat} accessible accessibilityLabel={`Voorbeeld van het bericht: ${message}`}>
        <Text style={styles.when}>Jouw bericht · nu</Text>
        <View style={styles.bubble}>
          <Text style={styles.bubbleText}>{message}</Text>
        </View>
        <View style={styles.preview}>
          <View style={styles.previewArt}>
            <Hug size={110} decorative />
          </View>
          <View style={styles.previewText}>
            <Text style={styles.previewTitle}>Je bent uitgenodigd op TeddySteps</Text>
            <Text style={styles.previewSub}>teddysteps.nl · privé-uitnodiging</Text>
          </View>
        </View>
      </View>
      <TextField label="Je eigen tekst" value={message} onChangeText={setMessage} multiline maxLength={300} />
      <Text style={styles.note}>
        {member
          ? `Deze link is alleen voor ${member.label}. Doorgestuurd? Stuur ${member.label} dan in Familie een nieuwe link: de oude stopt, ook op apparaten waar hij al geopend is.`
          : 'Deze link is alleen voor deze persoon. Doorgestuurd? Stuur dan in Familie een nieuwe link: de oude stopt, ook op apparaten waar hij al geopend is.'}
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chat: { gap: 10, padding: 16, borderRadius: 26, borderWidth: border.edgeBold, borderColor: color.ink, backgroundColor: color.white },
  when: { ...text('meta'), fontSize: 12, color: color.inkMuted, textAlign: 'center' },
  bubble: {
    alignSelf: 'flex-start',
    maxWidth: '85%',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: border.edge,
    borderColor: color.ink,
    backgroundColor: color.lilac,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    borderBottomLeftRadius: 6,
  },
  bubbleText: { fontFamily: fontFamily('sans', 700), fontSize: 16, lineHeight: 23, color: color.ink },
  preview: { alignSelf: 'flex-start', width: '85%', borderRadius: 20, borderWidth: border.edge, borderColor: color.ink, overflow: 'hidden' },
  previewArt: { height: 120, backgroundColor: color.sunshine, alignItems: 'center', justifyContent: 'flex-end' },
  previewText: { paddingVertical: 10, paddingHorizontal: 14, backgroundColor: color.paper },
  previewTitle: { ...text('titleS'), fontSize: 17 },
  previewSub: { ...text('meta') },
  note: { ...text('meta'), color: color.inkMuted },
});
