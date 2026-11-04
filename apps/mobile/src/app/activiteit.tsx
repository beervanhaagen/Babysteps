import { daysBetween, todayInAmsterdam, weekName } from '@teddysteps/core';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, border, color, CommentIcon, fontFamily, Hug, ReactionIcon, REACTIONS, text, useFocusRing } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';
import { Tabs } from '@/components/Tabs';
import { TextLink } from '@/components/TextLink';
import { useActivity, type ActivityItem } from '@/lib/family';

// T6 Activiteit, the "Knuffels" tab: hugs, icons, written reacties and people who joined. Voice notes (step 6) and the month birthday
// (X3, step 9) join this list later. Header in pistachio: this is family news, and the
// boards' rose is an accent, not a header block.
export default function Activity() {
  const { items } = useActivity();
  const today = todayInAmsterdam();
  const age = (item: ActivityItem) => daysBetween(todayInAmsterdam(new Date(item.at)), today);
  const groups = [
    { title: 'Vandaag', items: (items ?? []).filter((i) => age(i) === 0) },
    { title: 'Deze week', items: (items ?? []).filter((i) => age(i) > 0 && age(i) < 7) },
    { title: 'Eerder', items: (items ?? []).filter((i) => age(i) >= 7) },
  ].filter((g) => g.items.length);

  return (
    <View style={styles.screen}>
    <Screen header={{ title: 'Knuffels', subtitle: 'Van je familie, en wie er meeloopt', color: 'pistachio', character: 'puddle', characterRotate: -6 }}>
      {items && !items.length ? (
        <View style={styles.empty}>
          <Hug size={120} />
          <Text style={[text('titleM'), { textAlign: 'center' }]}>Nog stil hier</Text>
          <Text style={[text('body'), { textAlign: 'center' }]}>Nodig familie uit, dan zie je hier hun knuffels.</Text>
          <TextLink onPress={() => router.push('/uitnodigen')}>Iemand uitnodigen</TextLink>
        </View>
      ) : null}
      {groups.map((group) => (
        <View key={group.title}>
          <Text style={styles.eyebrow}>{group.title}</Text>
          {group.items.map((item) => (
            <Row key={item.key} item={item} />
          ))}
        </View>
      ))}
    </Screen>
    <Tabs active="hugs" />
    </View>
  );
}

function Row({ item }: { item: ActivityItem }) {
  const focus = useFocusRing();
  const one = !item.reaction || item.reaction === 'hug' ? 'een knuffel' : (REACTIONS.find((r) => r.kind === item.reaction)?.one ?? 'iets liefs');
  const title = item.kind === 'hug' ? `${item.who} stuurde ${one}` : item.kind === 'comment' ? `${item.who} schreef een reactie` : `${item.who} loopt nu mee`;
  const at = `Bij ${weekName(item.week ?? 1).toLowerCase()}${item.caption ? `: ${item.caption}` : ''}`;
  const sub =
    item.kind === 'hug'
      ? at
      : item.kind === 'comment'
        ? `“${item.text ?? ''}”`
      : item.frequency === 'never'
        ? 'Kijkt mee zonder mail'
        : item.frequency === 'each'
          ? 'Krijgt bij elk moment een mailtje'
          : 'Krijgt elke zondag een mailtje';
  const isNew = item.kind !== 'joined' && !item.seen;
  const open = item.momentId ? () => router.push(`/moment/${item.momentId}`) : undefined;
  return (
    <Pressable
      disabled={!open}
      onPress={open}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      accessibilityRole={open ? 'link' : undefined}
      accessibilityLabel={`${isNew ? 'Nieuw. ' : ''}${title}. ${sub}${item.kind === 'comment' ? `. ${at}` : ''}`}
      style={[styles.row, focus.ring]}
    >
      {item.kind === 'comment' ? (
        <View style={[styles.badge, styles.badgeComment, !item.seen && styles.badgeNew]}>
          <CommentIcon size={24} />
        </View>
      ) : item.kind === 'hug' ? (
        <View style={[styles.badge, !item.seen && styles.badgeNew]}>
          {!item.reaction || item.reaction === 'hug' ? <Hug size={40} decorative /> : <ReactionIcon kind={item.reaction} size={30} />}
        </View>
      ) : (
        <Avatar name={item.who} size={46} tone="butter" decorative />
      )}
      <View style={styles.grow}>
        <Text style={styles.title}>{title}</Text>
        <Text style={item.kind === 'comment' ? styles.quote : styles.sub} numberOfLines={item.kind === 'comment' ? 2 : 1}>
          {sub}
        </Text>
        {item.kind === 'comment' ? (
          <Text style={styles.sub} numberOfLines={1}>
            {at}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  empty: { alignItems: 'center', gap: 10, paddingTop: 24 },
  eyebrow: { ...text('eyebrow'), fontSize: 13, letterSpacing: 2, textTransform: 'uppercase', marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 66, borderBottomWidth: 2, borderBottomColor: color.line, borderStyle: 'dashed' },
  badge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: border.edge,
    borderColor: color.ink,
    backgroundColor: color.lilac,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  badgeNew: { backgroundColor: color.sunshine },
  badgeComment: { backgroundColor: color.pistachio },
  grow: { flex: 1, minWidth: 0 },
  title: { fontFamily: fontFamily('sans', 800), fontSize: 15, lineHeight: 20, color: color.ink },
  sub: { fontFamily: fontFamily('sans', 700), fontSize: 13, color: color.inkMuted },
  quote: { fontFamily: fontFamily('sans', 400), fontSize: 15, lineHeight: 21, color: color.ink },
});
