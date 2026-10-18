import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { border, color, fontFamily, Icon, PersonRow, shadow, size, useFocusRing, type SoftBlock } from '@teddysteps/ui';
import { RELATIONS, type CircleMember } from '@/lib/family';

const TONES: SoftBlock[] = ['butter', 'pistachio', 'lilac', 'cornflower', 'apricot'];

export function relationLabel(member: CircleMember): string {
  return RELATIONS.find((r) => r.id === member.relation)?.label ?? 'Familie';
}

function role(member: CircleMember): string {
  return member.joinedAt ? `${relationLabel(member)} · kijkt mee en knuffelt` : `${relationLabel(member)} · uitgenodigd, nog niet geopend`;
}

/** The circle as on O3 and M3, with "Iemand toevoegen" at the end. */
export function CircleList({ members, onEdit }: { members: CircleMember[]; onEdit?: (member: CircleMember) => void }) {
  return (
    <View>
      {members.map((m, i) => (
        <PersonRow
          key={m.id}
          name={m.label}
          role={role(m)}
          tone={TONES[i % TONES.length]}
          action={onEdit ? 'Wijzig' : undefined}
          onAction={onEdit ? () => onEdit(m) : undefined}
        />
      ))}
      <AddRow />
    </View>
  );
}

function AddRow() {
  const focus = useFocusRing();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push('/iemand')}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={[styles.add, focus.ring]}
    >
      <View style={styles.plus}>
        <Icon name="plus" size={22} weight={3} color={color.onBluebird} />
      </View>
      <View style={styles.grow}>
        <Text style={styles.title}>Iemand toevoegen</Text>
        <Text style={styles.sub}>Oma, opa, tante, een goede vriendin</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  add: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 64 },
  plus: {
    width: size.tapMin,
    height: size.tapMin,
    borderRadius: size.tapMin / 2,
    borderWidth: border.edgeBold,
    borderColor: color.ink,
    backgroundColor: color.bluebird,
    boxShadow: shadow.shadowSm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grow: { flex: 1 },
  title: { fontFamily: fontFamily('sans', 800), fontSize: 16, color: color.ink },
  sub: { fontFamily: fontFamily('sans', 700), fontSize: 13, color: color.inkMuted },
});
