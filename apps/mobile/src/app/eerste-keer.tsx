import { FIRST_KINDS, FIRSTS, findFirst, firstKind, searchFirsts, type FirstItem, type FirstKindId } from '@teddysteps/core';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { border, Button, ChoiceChip, color, FirstIcon, fontFamily, Icon, radius, shadow, space, text, TextField, useFocusRing } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';
import { pickFirstFor, setDraft } from '@/lib/draft';

// A3b Welke eerste keer? (board Add-first): pick a first from the list (packages/core/src/firsts.ts),
// by kind or by searching, or type your own. Opened from A3 (`voor` = "nieuw") or from editing a
// moment (`voor` = its id); the choice goes back there.
export default function PickFirst() {
  const { voor, huidig } = useLocalSearchParams<{ voor: string; huidig?: string }>();
  const known = findFirst(huidig);
  const [kind, setKind] = useState<FirstKindId | 'alles'>('alles');
  const [query, setQuery] = useState('');
  const [picked, setPicked] = useState<string | undefined>(known?.id);
  const [own, setOwn] = useState(known ? '' : (huidig ?? ''));
  const { width } = useWindowDimensions();
  const tile = Math.floor((width - space.space6 * 2 - 20) / 3);

  const found = searchFirsts(query, kind === 'alles' ? undefined : kind);
  const sections = FIRST_KINDS.map((k) => ({ kind: k, items: found.filter((f) => f.kind === k.id) })).filter((s) => s.items.length);
  const listed = FIRSTS.find((f) => f.id === picked)?.label;
  const label = own.trim() || listed;

  function choose() {
    if (!label) return;
    if (voor === 'nieuw') setDraft({ isFirst: true, firstLabel: label });
    else pickFirstFor(voor, label);
    router.back();
  }

  return (
    <Screen
      header={{ title: 'Welke eerste keer?', subtitle: 'Kies er een, of typ hem zelf.', color: 'lilac', onBack: router.back, character: 'tiggy' }}
      footer={
        <Button block onPress={choose} disabled={!label}>
          {label ? `Kies: ${own.trim() || listed!.toLocaleLowerCase('nl-NL')}` : 'Kies een eerste keer'}
        </Button>
      }
    >
      <TextField label="Zoek een eerste keer" value={query} onChangeText={setQuery} placeholder="Zoek, bijv. tandje" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} style={styles.chipRow}>
        <View role="radiogroup" aria-label="Soort eerste keer" style={styles.chips}>
          <ChoiceChip selected={kind === 'alles' && !query} onPress={() => (setKind('alles'), setQuery(''))}>
            Alles
          </ChoiceChip>
          {FIRST_KINDS.map((k) => (
            <ChoiceChip key={k.id} selected={kind === k.id && !query} onPress={() => (setKind(k.id), setQuery(''))}>
              {k.title}
            </ChoiceChip>
          ))}
        </View>
      </ScrollView>
      {sections.map(({ kind: k, items }) => (
        <View key={k.id} style={styles.section}>
          <View style={styles.sectionHead}>
            <View style={[styles.swatch, { backgroundColor: color[k.tone] }]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" />
            <Text accessibilityRole="header" style={styles.sectionTitle}>
              {k.title}
            </Text>
          </View>
          <View role="radiogroup" aria-label={k.title} style={styles.tiles}>
            {items.map((item) => (
              <Tile
                key={item.id}
                item={item}
                width={tile}
                selected={!own.trim() && picked === item.id}
                onPress={() => {
                  setPicked(item.id);
                  setOwn('');
                }}
              />
            ))}
          </View>
        </View>
      ))}
      {!sections.length ? <Text style={styles.none}>Die staat er (nog) niet bij. Typ hem hieronder zelf!</Text> : null}
      <View style={styles.own}>
        <TextField label="Staat hij er niet bij?" value={own} onChangeText={setOwn} maxLength={60} placeholder="Bijv. de kat geaaid" />
      </View>
    </Screen>
  );
}

function Tile({ item, width, selected, onPress }: { item: FirstItem; width: number; selected: boolean; onPress: () => void }) {
  const focus = useFocusRing();
  return (
    <Pressable
      role="radio"
      aria-checked={selected}
      accessibilityLabel={item.label}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={({ pressed }) => [styles.tile, { width }, selected && styles.tileOn, pressed && { transform: [{ translateY: 2 }] }, focus.ring]}
    >
      <FirstIcon icon={item.icon} tone={firstKind(item.kind).tone} size={44} iconSize={24} />
      <Text style={[styles.tileLabel, selected && { fontFamily: fontFamily('sans', 800) }]}>{item.label}</Text>
      {selected ? (
        <View style={styles.check} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          <Icon name="check" size={13} weight={3.6} color={color.onBluebird} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chipRow: { marginHorizontal: -space.space6 },
  chips: { flexDirection: 'row', gap: 8, paddingHorizontal: space.space6, paddingVertical: 2 },
  section: { gap: 10, paddingTop: 4 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: { width: 14, height: 14, borderRadius: 4, borderWidth: 1.5, borderColor: color.ink },
  sectionTitle: { ...text('eyebrow'), fontSize: 12, textTransform: 'uppercase' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    minHeight: 104,
    paddingTop: 12,
    paddingBottom: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.radiusM,
    borderWidth: border.edge,
    borderColor: color.ink,
    backgroundColor: color.white,
  },
  tileOn: { backgroundColor: color.sunshine, boxShadow: shadow.shadowSm },
  tileLabel: { ...text('meta'), fontSize: 13, lineHeight: 16, fontFamily: fontFamily('sans', 700), textAlign: 'center' },
  check: {
    position: 'absolute',
    right: -6,
    top: -6,
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: border.edge,
    borderColor: color.ink,
    backgroundColor: color.bluebird,
    alignItems: 'center',
    justifyContent: 'center',
  },
  none: { ...text('body'), fontSize: 15, color: color.inkMuted },
  own: { padding: 14, borderRadius: radius.radiusM, borderWidth: border.edge, borderStyle: 'dashed', borderColor: color.ink, backgroundColor: color.card },
});
