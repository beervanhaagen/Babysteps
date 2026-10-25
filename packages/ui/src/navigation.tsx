import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { webAria } from './a11y';
import { IconButton } from './actions';
import { Character, Icon, type CharacterName, type IconName } from './brand';
import { useFocusRing } from './focus';
import { SvgMarkup } from './svg';
import { fontFamily, text } from './text';
import { border, color, shadow, size, space } from './tokens';

export type SoftBlock = 'lilac' | 'pistachio' | 'butter' | 'cornflower' | 'sunshine' | 'apricot';

const SCALLOP = (() => {
  let d = 'M0 0 H1000 V8';
  for (let x = 1000; x > 0; x -= 50) d += ` Q${x - 12.5} 18 ${x - 25} 8 Q${x - 37.5} 6 ${x - 50} 8`;
  return `${d} Z`;
})();

/** The scalloped bottom edge of every header band. */
export function Scallop({ color: band }: { color: SoftBlock }) {
  return (
    <SvgMarkup markup={`<path d="${SCALLOP}" fill="${color[band]}"/>`} viewBox="0 0 1000 24" width="100%" height={22} preserveAspectRatio="none" style={{ marginTop: -1 }} />
  );
}

export function StepProgress({ current, total }: { current: number; total: number }) {
  return (
    <View style={styles.steps}>
      <View style={styles.stepsBar} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[styles.step, i < current && styles.stepDone]} />
        ))}
      </View>
      <Text style={styles.stepsLabel} accessibilityLabel={`Stap ${current} van ${total}`}>
        {current} van {total}
      </Text>
    </View>
  );
}

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  step?: [number, number];
  color?: SoftBlock;
  character?: CharacterName;
  characterRotate?: number;
  action?: ReactNode;
  /** Space for the status bar; the band runs up behind it. */
  topInset?: number;
  children?: ReactNode;
}

/** A soft-block band with a scalloped edge and a character peeking over it. */
export function ScreenHeader({ title, subtitle, onBack, step, color: band = 'lilac', character, characterRotate = 6, action, topInset = 0, children }: ScreenHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={[styles.band, { backgroundColor: color[band], paddingTop: topInset }]}>
        {onBack || action ? (
          <View style={styles.bar}>
            {onBack ? <IconButton icon="back" label="Terug" onPress={onBack} /> : <View style={{ width: size.tapMin }} />}
            <View>{action}</View>
          </View>
        ) : (
          <View style={{ height: 22 }} />
        )}
        {step ? <StepProgress current={step[0]} total={step[1]} /> : null}
        <Text accessibilityRole="header" {...webAria({ 'aria-level': 1 })} style={[text('titleL'), { maxWidth: character ? 240 : undefined, marginTop: step ? 14 : 0 }]}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {children}
      </View>
      <Scallop color={band} />
      {character ? (
        <Character
          name={character}
          size={88}
          decorative
          rotate={characterRotate}
          // Below the button bar when there is an action, so the two never overlap.
          peek={step ? { right: -18, top: topInset + 70 } : { right: 14, top: topInset + (action ? 56 : onBack ? 18 : 4) }}
        />
      ) : null}
    </View>
  );
}

export type TabId = 'trail' | 'family' | 'hugs' | 'me';

// Two tabs either side of the +, each as wide as the next, so the + sits exactly in the middle
// (owner, 21 October 2026). The year book is out of the MVP, so "Knuffels" (T6) took its place.
const TABS: { id: TabId; label: string; icon: IconName }[] = [
  { id: 'trail', label: 'Pad', icon: 'trail' },
  { id: 'family', label: 'Familie', icon: 'family' },
  { id: 'hugs', label: 'Knuffels', icon: 'heart' },
  { id: 'me', label: 'Ik', icon: 'me' },
];

export interface TabBarProps {
  active: TabId;
  onChange?: (id: TabId) => void;
  onAdd?: () => void;
  /** Space for the home indicator. */
  bottomInset?: number;
  /** Tabs with something new, shown as a small rose dot (e.g. unseen hugs). */
  news?: TabId[];
}

export function TabBar({ active, onChange, onAdd, bottomInset = 0, news = [] }: TabBarProps) {
  const tab = (t: (typeof TABS)[number]) => <Tab key={t.id} {...t} on={t.id === active} news={news.includes(t.id)} onPress={() => onChange?.(t.id)} />;
  return (
    <View accessibilityRole="tabbar" accessibilityLabel="Hoofdmenu" style={[styles.tabbar, { height: size.tabbar - 18 + Math.max(18, bottomInset), paddingBottom: Math.max(18, bottomInset) }]}>
      {/* Two equal halves around a fixed middle slot: the + is always exactly in the centre,
          whatever the labels or the phone's text size. */}
      <View style={styles.tabSide}>{TABS.slice(0, 2).map(tab)}</View>
      <View style={styles.fabSlot}>
        <Fab onPress={onAdd} />
      </View>
      <View style={styles.tabSide}>{TABS.slice(2).map(tab)}</View>
    </View>
  );
}

function Tab({ label, icon, on, news, onPress }: { label: string; icon: IconName; on: boolean; news: boolean; onPress: () => void }) {
  const focus = useFocusRing();
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={news ? `${label}, nieuw` : label}
      accessibilityState={{ selected: on }}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={[styles.tab, focus.ring]}
    >
      {on ? (
        <View style={styles.tabPill}>
          <Icon name={icon} size={22} weight={2.6} />
        </View>
      ) : (
        <Icon name={icon} size={24} weight={2} />
      )}
      <Text numberOfLines={1} style={[text('tab'), on && { fontFamily: fontFamily('sans', 800) }]}>{label}</Text>
      {news ? <View style={styles.news} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" /> : null}
    </Pressable>
  );
}

function Fab({ onPress }: { onPress?: () => void }) {
  const focus = useFocusRing();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Moment toevoegen"
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={({ pressed }) => [styles.fab, pressed && styles.fabPressed, focus.ring]}
    >
      <Icon name="plus" size={28} weight={3} color={color.onBluebird} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { position: 'relative', zIndex: 1 },
  band: { paddingHorizontal: space.space6, paddingBottom: 10 },
  bar: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 },
  subtitle: { ...text('rowTitle'), fontSize: 14, marginTop: 4 },
  steps: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepsBar: { flex: 1, flexDirection: 'row', gap: 6 },
  step: { flex: 1, height: 6, borderRadius: 3, backgroundColor: color.line },
  stepDone: { backgroundColor: color.ink },
  stepsLabel: { ...text('meta'), fontFamily: fontFamily('sans', 800) },
  tabbar: {
    paddingTop: 6,
    paddingHorizontal: 12,
    backgroundColor: color.white,
    borderTopWidth: border.edgeBold,
    borderTopColor: color.ink,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabSide: { flex: 1, flexDirection: 'row' },
  fabSlot: { width: size.fab + space.space4, alignItems: 'center' },
  tab: { flex: 1, minWidth: 0, minHeight: 52, alignItems: 'center', justifyContent: 'center', gap: 3 },
  news: { position: 'absolute', top: 4, left: '50%', marginLeft: 8, width: 12, height: 12, borderRadius: 6, borderWidth: border.edge, borderColor: color.ink, backgroundColor: color.rose },
  tabPill: { width: 44, height: 30, borderRadius: 15, backgroundColor: color.sunshine, alignItems: 'center', justifyContent: 'center' },
  fab: {
    width: size.fab,
    height: size.fab,
    marginTop: -30,
    borderRadius: size.fab / 2,
    borderWidth: border.edgeBold,
    borderColor: color.ink,
    backgroundColor: color.bluebird,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: shadow.shadowLg,
  },
  fabPressed: { transform: [{ translateY: 3 }], boxShadow: `0 2px 0 0 ${color.ink}` },
});
