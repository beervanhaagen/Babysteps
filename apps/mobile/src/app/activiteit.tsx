import { daysBetween, todayInAmsterdam } from '@teddysteps/core';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Avatar, border, color, fontFamily, Hug, text, useFocusRing } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';
import { Tabs } from '@/components/Tabs';
import { TextLink } from '@/components/TextLink';
import { useActivity, type ActivityItem } from '@/lib/family';

// T6 Activiteit, the "Knuffels" tab: hugs and people who joined. Voice notes (step 6) and the month birthday
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
  const title = item.kind === 'hug' ? `${item.who} stuurde een knuffel` : `${item.who} loopt nu mee`;
  const sub =
    item.kind === 'hug'
      ? `Bij week ${item.week}${item.caption ? `: ${item.caption}` : ''}`
      : item.frequency === 'never'
        ? 'Kijkt mee zonder mail'
        : item.frequency === 'each'
          ? 'Krijgt bij elk moment een kaartje'
          : 'Krijgt elke zondag een kaartje';
  const isNew = item.kind === 'hug' && !item.seen;
  const open = item.momentId ? () => router.push(`/moment/${item.momentId}`) : undefined;
  return (
    <Pressable
      disabled={!open}
      onPress={open}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      accessibilityRole={open ? 'link' : undefined}
      accessibilityLabel={`${isNew ? 'Nieuw. ' : ''}${title}. ${sub}`}
      style={[styles.row, focus.ring]}
    >
      {item.kind === 'hug' ? (
        <View style={[styles.badge, !item.seen && styles.badgeNew]}>
          <Hug size={40} decorative />
        </View>
      ) : (
        <Avatar name={item.who} size={46} tone="butter" decorative />
      )}
      <View style={styles.grow}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.sub} numberOfLines={1}>
          {sub}
        </Text>
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
  grow: { flex: 1, minWidth: 0 },
  title: { fontFamily: fontFamily('sans', 800), fontSize: 15, lineHeight: 20, color: color.ink },
  sub: { fontFamily: fontFamily('sans', 700), fontSize: 13, color: color.inkMuted },
});
