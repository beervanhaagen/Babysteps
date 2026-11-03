import { ageLine, possessive, todayInAmsterdam, type CalendarDate } from '@teddysteps/core';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { border, Character, ChildAvatar, color, fontFamily, Icon, radius, Scallop, shadow, space, text, useFocusRing, Wordmark } from '@teddysteps/ui';
import type { KeyringChild } from '../api';
import { useView } from '../route';
import { Heading, Page, TextLink } from './shared';

// The start page of the keyring (owner, 3 November 2026): when this browser follows more than
// one child, e.g. Oma with two grandchildren, she picks whose trail to see. Each child is its own
// circle; nothing here links them on the server.
interface PickerProps {
  choices: KeyringChild[];
  /** The child shown before "Ander kindje kiezen", if any: marked, with a way back. */
  current?: string;
  onPick: (member: string) => void;
}

export function Picker({ choices, current, onPick }: PickerProps) {
  useView('Wie wil je zien?');
  const today = todayInAmsterdam();
  const back = choices.find((c) => c.member === current);
  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <Wordmark size={24} />
      </View>
      <View style={styles.band}>
        <Heading style={styles.title}>Wie wil je zien?</Heading>
        <View style={styles.peek}>
          <Character name="bo" size={64} rotate={6} decorative />
        </View>
      </View>
      <Scallop color="pistachio" />
      <Page>
        <View style={styles.list}>
          {choices.map((c) => (
            <Child key={c.member} child={c} today={today} now={c.member === current} onPress={() => onPick(c.member)} />
          ))}
        </View>
        {back ? <TextLink onPress={() => onPick(back.member)}>{`Terug naar ${possessive(back.firstName)} pad`}</TextLink> : null}
        <Text style={styles.note}>Elk pad is privé. Alleen wie is uitgenodigd, kan meekijken.</Text>
      </Page>
    </View>
  );
}

function Child({ child: c, today, now, onPress }: { child: KeyringChild; today: CalendarDate; now: boolean; onPress: () => void }) {
  const focus = useFocusRing();
  const age = c.birthDate ? ageLine(c.birthDate as CalendarDate, today) : null;
  const news = c.newThisWeek === 0 ? 'Deze week nog niets nieuws' : c.newThisWeek === 1 ? '1 nieuw moment deze week' : `${c.newThisWeek} nieuwe momenten deze week`;
  const you = `Voor ${c.firstName} ben je ${c.label}`;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={[`${possessive(c.firstName)} pad`, now ? 'nu open' : null, age, news, you].filter(Boolean).join('. ')}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={({ pressed }) => [styles.card, now && styles.cardNow, pressed && styles.pressed, focus.ring]}
    >
      <ChildAvatar look={c.look} size={72} still />
      <View style={styles.words}>
        <Text style={styles.name}>{possessive(c.firstName)} pad</Text>
        {age ? <Text style={styles.meta}>{age}</Text> : null}
        <Text style={[styles.meta, c.newThisWeek > 0 && styles.news]}>{news}</Text>
        <Text style={styles.meta}>{you}</Text>
      </View>
      <Icon name="chevron-right" size={22} weight={2.8} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  top: { backgroundColor: color.paper, paddingHorizontal: space.space5, paddingVertical: space.space3 },
  band: { backgroundColor: color.pistachio, paddingHorizontal: space.space6, paddingTop: space.space4, paddingBottom: space.space2, flexDirection: 'row', alignItems: 'flex-end' },
  title: { ...text('titleL'), flex: 1 },
  peek: { marginBottom: -space.space3 },
  list: { gap: space.space4, paddingTop: space.space3 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.space4,
    padding: space.space4,
    borderRadius: radius.radiusL,
    borderWidth: border.edgeBold,
    borderColor: color.ink,
    backgroundColor: color.white,
    boxShadow: shadow.shadowMd,
  },
  cardNow: { backgroundColor: color.butter },
  // Pressed like every sticker: down into its shadow.
  pressed: { transform: [{ translateY: 3 }], boxShadow: `0 2px 0 0 ${color.ink}` },
  words: { flex: 1, minWidth: 0, gap: space.space1 },
  name: { fontFamily: fontFamily('sticker', 400), fontSize: 24, lineHeight: 30, color: color.ink },
  meta: { ...text('meta'), color: color.inkMuted },
  news: { fontFamily: fontFamily('sans', 800), color: color.ink },
  note: { ...text('meta'), color: color.inkMuted, marginTop: space.space2 },
});
