import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { webAria } from './a11y';
import { Character, Icon, type CharacterName } from './brand';
import { useFocusRing } from './focus';
import type { SoftBlock } from './navigation';
import { text } from './text';
import { border, color, shadow, size, space } from './tokens';

// The child's own animal on a colour of their own (owner, 3 November 2026): one of the gang on a
// soft block, in the app's header, on the timeline and on the family page. The artwork is never
// recoloured; the colour is the circle behind it.

export const CHILD_ANIMALS: { name: CharacterName; label: string }[] = [
  { name: 'bo', label: 'Bo de beer' },
  { name: 'tiggy', label: 'Tiggy de tijger' },
  { name: 'bizzy', label: 'Bizzy de bij' },
  { name: 'puddle', label: 'Puddle de eend' },
];
export const CHILD_TONES: { name: SoftBlock; label: string }[] = [
  { name: 'lilac', label: 'Lila' },
  { name: 'pistachio', label: 'Pistache' },
  { name: 'butter', label: 'Botergeel' },
  { name: 'cornflower', label: 'Blauw' },
  { name: 'sunshine', label: 'Zonnegeel' },
  { name: 'apricot', label: 'Abrikoos' },
];

/**
 * The colours each animal stays visible on: the characters have no outline, so the circle must
 * differ from the body (at least 1.4:1). Bizzy is sunshine and Puddle cornflower themselves.
 */
export const TONES_FOR: Record<CharacterName, SoftBlock[]> = {
  bo: ['lilac', 'pistachio', 'butter', 'sunshine'],
  tiggy: ['lilac', 'pistachio', 'butter', 'sunshine', 'apricot'],
  bizzy: ['cornflower', 'apricot'],
  puddle: ['lilac', 'pistachio', 'butter', 'sunshine', 'apricot'],
};

export interface ChildLook {
  animal: CharacterName;
  tone: SoftBlock;
}

/** A look from the server, made safe: an unknown animal or colour (a newer server) shows Bo on lilac. */
export function childLook(animal?: string | null, tone?: string | null): ChildLook {
  const a = CHILD_ANIMALS.find((x) => x.name === animal)?.name ?? 'bo';
  const t = TONES_FOR[a].find((x) => x === tone) ?? TONES_FOR[a][0];
  return { animal: a, tone: t };
}

/** The child's animal in its circle. */
export function ChildAvatar({ look, size: box = 56, still }: { look: ChildLook; size?: number; still?: boolean }) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.avatar, { width: box, height: box, borderRadius: box / 2, backgroundColor: color[look.tone] }]}
    >
      <Character name={look.animal} size={Math.round(box * 0.8)} motion={still ? null : undefined} decorative />
    </View>
  );
}

/** M1: pick the animal and the colour, with the result above it. Only colours the animal shows on. */
export function ChildLookPicker({ name, look, onChange }: { name: string; look: ChildLook; onChange: (look: ChildLook) => void }) {
  const tones = CHILD_TONES.filter((t) => TONES_FOR[look.animal].includes(t.name));
  return (
    <View style={styles.picker}>
      <View style={styles.preview}>
        <ChildAvatar look={look} size={96} />
      </View>
      <Text style={styles.label}>Welk diertje past bij {name}?</Text>
      <View role="radiogroup" {...webAria({ 'aria-label': `Diertje voor ${name}` })} accessibilityLabel={`Diertje voor ${name}`} style={styles.row}>
        {CHILD_ANIMALS.map((a) => (
          // Each on a colour it shows on, the chosen colour where it can, so the pair is visible at once.
          <Option
            key={a.name}
            label={a.label}
            on={look.animal === a.name}
            tone={TONES_FOR[a.name].includes(look.tone) ? look.tone : TONES_FOR[a.name][0]}
            onPress={() => onChange(childLook(a.name, look.tone))}
          >
            <Character name={a.name} size={46} motion={null} decorative />
          </Option>
        ))}
      </View>
      <Text style={styles.label}>En welke kleur?</Text>
      <View role="radiogroup" {...webAria({ 'aria-label': 'Kleur' })} accessibilityLabel="Kleur" style={styles.row}>
        {tones.map((t) => (
          <Option key={t.name} label={t.label} on={look.tone === t.name} tone={t.name} onPress={() => onChange({ ...look, tone: t.name })} />
        ))}
      </View>
    </View>
  );
}

const OPTION = 56;

/** A round option; the chosen one lifts onto its shadow and gets an ink check. */
function Option({ label, on, tone, onPress, children }: { label: string; on: boolean; tone: SoftBlock; onPress: () => void; children?: ReactNode }) {
  const focus = useFocusRing();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: on }}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={[styles.target, focus.ring]}
    >
      <View style={[styles.option, { backgroundColor: color[tone] }, on && styles.optionOn]}>{children}</View>
      {on ? (
        <View style={styles.check}>
          <Icon name="check" size={12} weight={3.2} color={color.white} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  avatar: { borderWidth: border.edgeBold, borderColor: color.ink, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  picker: { gap: space.space3 },
  preview: { alignItems: 'center', paddingVertical: space.space2 },
  label: { ...text('rowTitle') },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.space3 },
  target: { minWidth: size.tapMin, minHeight: size.tapMin, borderRadius: OPTION / 2 },
  option: {
    width: OPTION,
    height: OPTION,
    borderRadius: OPTION / 2,
    borderWidth: border.edge,
    borderColor: color.ink,
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  // Like a chosen ChoiceChip: it lifts onto a hard drop.
  optionOn: { borderWidth: border.edgeBold, boxShadow: shadow.shadowSm, transform: [{ translateY: -2 }] },
  check: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: border.edge,
    borderColor: color.white,
    backgroundColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
