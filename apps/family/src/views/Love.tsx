import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, color, fontFamily, ReactionPicker, REACTIONS, space, type ReactionKind } from '@teddysteps/ui';
import { api, type FamilyMoment } from '../api';

// Sending love from a card or the big view (owner, 3 November 2026): "Knuffelen" and the five
// icons. It goes out in place, floats up the screen (App), and a status line says so; the page
// stays where it is.
const name = (kind: ReactionKind) => (kind === 'hug' ? 'Knuffel' : (REACTIONS.find((r) => r.kind === kind)?.label ?? 'Het'));

export function Love({
  moment: m,
  title,
  block,
  onReacted,
}: {
  moment: FamilyMoment;
  /** For the hug button's spoken name. */
  title?: string;
  block?: boolean;
  onReacted: (id: string, kind: ReactionKind, reactions: FamilyMoment['reactions']) => void;
}) {
  // Only the control that was pressed shows it's busy.
  const [busy, setBusy] = useState<ReactionKind>();
  const [sent, setSent] = useState<string>('');
  const [failed, setFailed] = useState<ReactionKind>();

  async function react(kind: ReactionKind) {
    setBusy(kind);
    setFailed(undefined);
    // Cleared first, so the same icon twice is announced twice.
    setSent('');
    try {
      const { reactions } = await api.react(m.id, kind);
      onReacted(m.id, kind, reactions);
      requestAnimationFrame(() => setSent(`${name(kind)} verstuurd!`));
    } catch {
      setFailed(kind);
    }
    setBusy(undefined);
  }

  return (
    <View style={styles.love}>
      <Button block={block} size={block ? 'lg' : 'md'} busy={busy === 'hug'} disabled={!!busy && busy !== 'hug'} onPress={() => react('hug')} accessibilityLabel={title ? `Knuffelen: ${title}` : 'Knuffelen'}>
        {m.myHugs ? 'Nog een knuffel' : 'Knuffelen'}
      </Button>
      <ReactionPicker busy={!!busy} onReact={react} />
      {/* Always there, so a screen reader reads it out when it fills. */}
      <Text role="status" style={styles.sent}>
        {sent}
      </Text>
      {failed ? (
        <Text role="alert" style={styles.error}>
          {`Je ${name(failed).toLowerCase()} kwam niet aan. Probeer het zo nog eens.`}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  love: { gap: space.space2 },
  sent: { fontFamily: fontFamily('sans', 800), fontSize: 15, color: color.ink },
  error: { fontFamily: fontFamily('sans', 700), fontSize: 15, color: color.plum },
});
