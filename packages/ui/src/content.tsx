import { useEffect, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Character, Hug, Icon, type CharacterName, type IconName } from './brand';
import { useFocusRing } from './focus';
import type { SoftBlock } from './navigation';
import { fontFamily, text } from './text';
import { border, color, radius, shadow, size, space } from './tokens';

export interface StickerProps {
  tone?: 'sunshine' | 'white' | 'lilac' | 'pistachio' | 'butter';
  icon?: IconName;
  children: string;
}

export function Sticker({ tone = 'sunshine', icon, children }: StickerProps) {
  return (
    <View style={[styles.sticker, { backgroundColor: color[tone] }, tone === 'sunshine' && { boxShadow: shadow.shadowSm }]}>
      {icon ? <Icon name={icon} size={16} weight={2.6} /> : null}
      <Text style={styles.stickerText}>{children}</Text>
    </View>
  );
}

export interface AvatarProps {
  name: string;
  size?: number;
  tone?: SoftBlock;
  decorative?: boolean;
}

/** The first letter of what the parent calls someone, without Oma, Opa, Tante or Oom. */
export function Avatar({ name, size: s = 44, tone = 'pistachio', decorative }: AvatarProps) {
  const initial = (name || '?').replace(/^(Oma|Opa|Tante|Oom) /, '').charAt(0);
  const a11y = decorative
    ? { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const }
    : { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: name };
  return (
    <View {...a11y} style={[styles.avatar, { width: s, height: s, borderRadius: s / 2, backgroundColor: color[tone] }]}>
      <Text style={{ fontFamily: fontFamily('sticker', 400), fontSize: Math.round(s * 0.45), color: color.ink, includeFontPadding: false }}>{initial}</Text>
    </View>
  );
}

export interface PersonRowProps {
  name: string;
  role: string;
  tone?: SoftBlock;
  action?: string;
  onAction?: () => void;
}

export function PersonRow({ name, role, tone, action, onAction }: PersonRowProps) {
  const focus = useFocusRing();
  return (
    <View style={styles.personRow}>
      <Avatar name={name} tone={tone} decorative />
      <View style={styles.grow}>
        <Text style={text('rowTitle')}>{name}</Text>
        <Text style={[text('meta'), styles.muted]}>{role}</Text>
      </View>
      {action ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${action}: ${name}`}
          onPress={onAction}
          onFocus={focus.onFocus}
          onBlur={focus.onBlur}
          style={[styles.textLink, focus.ring]}
        >
          <Text style={text('fieldLabel')}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export interface MomentCardProps {
  week: string;
  caption: string;
  note?: string;
  /** The photo, filling the frame (the app passes an expo-image). Without it a character shows. */
  photo?: ReactNode;
  /** Spoken description of the photo. */
  alt?: string;
  /** "EERSTE KEER!" sticker with Tiggy on the photo. */
  firstBadge?: string;
  tint?: SoftBlock;
  character?: CharacterName;
  hugs?: number;
  tilt?: number;
  peek?: CharacterName;
  onPress?: () => void;
}

/** A postcard on the fridge: photo, week, one line, and the hugs it got. */
export function MomentCard({ week, caption, note, photo, alt, firstBadge, tint = 'lilac', character = 'bo', hugs, tilt = -1.5, peek, onPress }: MomentCardProps) {
  const focus = useFocusRing();
  const body = (
    <>
      <View>
        <View accessible={!!alt} accessibilityRole={alt ? 'image' : undefined} accessibilityLabel={alt} style={[styles.photo, !photo && { backgroundColor: color[tint] }]}>
          {photo ?? <Character name={character} mood="happy" size={110} decorative motion={null} />}
        </View>
        {firstBadge ? <FirstBadge label={firstBadge} /> : null}
      </View>
      <View style={styles.foot}>
        <View style={styles.grow}>
          <Text style={styles.eyebrow}>{week}</Text>
          <Text style={text('titleS')} numberOfLines={3}>
            {caption}
          </Text>
          {note ? <Text style={[text('meta'), styles.muted, { fontSize: 14 }]}>{note}</Text> : null}
        </View>
        {hugs != null ? (
          <View style={styles.hugs} accessible accessibilityLabel={hugs === 1 ? '1 knuffel' : `${hugs} knuffels`}>
            <Icon name="heart" size={16} weight={2.4} />
            <Text style={styles.hugsText}>{hugs}</Text>
          </View>
        ) : null}
      </View>
      {peek ? <Character name={peek} size={70} decorative rotate={14} peek={{ right: -24, top: -36 }} /> : null}
    </>
  );
  const card = [styles.moment, { transform: [{ rotate: `${tilt}deg` }] }];
  const label = [week, firstBadge, caption, note, hugs == null ? null : hugs === 1 ? '1 knuffel' : `${hugs} knuffels`].filter(Boolean).join(', ');
  if (!onPress) return <View style={card}>{body}</View>;
  return (
    <Pressable accessibilityRole="link" accessibilityLabel={label} onPress={onPress} onFocus={focus.onFocus} onBlur={focus.onBlur} style={[card, focus.ring]}>
      {body}
    </Pressable>
  );
}

/** The "EERSTE KEER!" sticker with Tiggy, on a photo (T1, T2). */
export function FirstBadge({ label, size = 'md' }: { label: string; size?: 'md' | 'lg' }) {
  const lg = size === 'lg';
  return (
    <View style={[styles.firstBadge, lg && styles.firstBadgeLg]}>
      <Character name="tiggy" mood="happy" size={lg ? 30 : 26} decorative motion={null} />
      <Text numberOfLines={1} style={[styles.firstText, lg && { fontSize: 13 }]}>
        {label}
      </Text>
    </View>
  );
}

export function HugToast({ title, children }: { title: string; children?: string }) {
  // iOS ignores live regions, so announce the hug there ourselves.
  useEffect(() => {
    if (Platform.OS === 'ios') AccessibilityInfo.announceForAccessibility(children ? `${title}. ${children}` : title);
  }, [title, children]);
  return (
    <View role="status" accessibilityLiveRegion="polite" style={styles.hugToast}>
      <View style={styles.hugBadge}>
        <Hug size={50} decorative />
      </View>
      <View style={styles.shrink}>
        <Text style={[text('rowTitle'), { fontSize: 15 }]}>{title}</Text>
        {children ? <Text style={text('meta')}>{children}</Text> : null}
      </View>
    </View>
  );
}

export interface CalloutProps {
  title: string;
  children?: string;
  tone?: SoftBlock;
  tilt?: number;
}

/** A soft-block card with one message; at most one per screen. */
export function Callout({ title, children, tone = 'lilac', tilt = -1 }: CalloutProps) {
  return (
    <View style={[styles.callout, { backgroundColor: color[tone], transform: [{ rotate: `${tilt}deg` }] }]}>
      <Text style={[text('rowTitle'), { fontSize: 15 }]}>{title}</Text>
      {children ? <Text style={text('meta')}>{children}</Text> : null}
    </View>
  );
}

export interface BannerProps {
  title: string;
  children?: string;
  icon?: IconName;
  tone?: SoftBlock | 'rose';
  /** A character instead of only the icon, as on X2 and X4. */
  character?: CharacterName;
}

/** A status line at the top of a screen: offline (X2), upload failed (X4). */
export function Banner({ title, children, icon = 'offline', tone = 'butter', character }: BannerProps) {
  return (
    <View role="status" accessibilityLiveRegion="polite" style={[styles.banner, { backgroundColor: color[tone] }]}>
      {character ? <Character name={character} size={52} decorative /> : null}
      <View style={styles.grow}>
        <View style={styles.bannerTitle}>
          <Icon name={icon} size={20} />
          <Text style={[text('rowTitle'), { fontSize: 15 }]}>{title}</Text>
        </View>
        {children ? <Text style={[text('meta'), { fontSize: 14, lineHeight: 20 }]}>{children}</Text> : null}
      </View>
    </View>
  );
}

export interface EmptySlotProps {
  title?: string;
  subtitle?: string;
  onPress?: () => void;
}

export function EmptySlot({ title = 'Deze week is nog leeg!', subtitle = 'voeg een moment toe', onPress }: EmptySlotProps) {
  const focus = useFocusRing();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} onFocus={focus.onFocus} onBlur={focus.onBlur} style={[styles.emptySlot, focus.ring]}>
      <View style={styles.emptyPlus}>
        <Icon name="plus" size={20} weight={3} color={color.onBluebird} />
      </View>
      <View style={styles.shrink}>
        <Text style={[text('rowTitle'), { fontSize: 15 }]}>{title}</Text>
        <Text style={[text('meta'), styles.muted]}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1, minWidth: 0 },
  shrink: { flexShrink: 1, minWidth: 0 },
  muted: { color: color.inkMuted },
  sticker: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: radius.radiusS,
    borderWidth: border.edge,
    borderColor: color.ink,
  },
  stickerText: { ...text('meta'), fontFamily: fontFamily('sans', 800) },
  avatar: { alignItems: 'center', justifyContent: 'center', borderWidth: border.edge, borderColor: color.ink },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 64,
    maxWidth: 342,
    borderBottomWidth: 2,
    borderBottomColor: color.line,
    borderStyle: 'dashed',
  },
  textLink: { minHeight: size.tapMin, paddingHorizontal: 4, justifyContent: 'center' },
  moment: {
    maxWidth: 340,
    padding: 8,
    backgroundColor: color.white,
    borderWidth: border.edge,
    borderColor: color.ink,
    borderRadius: radius.radiusL,
    boxShadow: shadow.shadowMd,
  },
  photo: {
    height: 140,
    borderRadius: 18,
    borderWidth: border.edge,
    borderColor: color.ink,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  foot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, paddingTop: 10, paddingHorizontal: 6, paddingBottom: 4 },
  eyebrow: { ...text('eyebrow'), textTransform: 'uppercase' },
  firstBadge: {
    position: 'absolute',
    left: 10,
    top: 10,
    maxWidth: '80%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
    paddingLeft: 3,
    paddingRight: 10,
    borderRadius: radius.radiusS,
    borderWidth: border.edge,
    borderColor: color.ink,
    backgroundColor: color.sunshine,
  },
  firstBadgeLg: { left: 12, top: 12, gap: 6, paddingVertical: 4, paddingLeft: 4, paddingRight: 12, boxShadow: shadow.shadowSm },
  firstText: { ...text('eyebrow'), fontSize: 12, letterSpacing: 0, textTransform: 'uppercase' },
  hugs: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4, paddingHorizontal: 10, borderRadius: radius.radiusS, backgroundColor: color.lilac },
  hugsText: { ...text('meta'), fontFamily: fontFamily('sans', 800) },
  hugToast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    maxWidth: 342,
    paddingTop: 10,
    paddingRight: 22,
    paddingBottom: 10,
    paddingLeft: 8,
    borderRadius: 34,
    borderWidth: border.edge,
    borderColor: color.ink,
    backgroundColor: color.butter,
    boxShadow: shadow.shadowMd,
  },
  hugBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: border.edge,
    borderColor: color.ink,
    backgroundColor: color.paper,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    maxWidth: 342,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: border.edge,
    borderColor: color.ink,
    boxShadow: shadow.shadowMd,
  },
  bannerTitle: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  callout: {
    gap: space.space1,
    maxWidth: 342,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: border.edge,
    borderColor: color.ink,
    boxShadow: shadow.shadowMd,
  },
  emptySlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 62,
    maxWidth: 342,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: border.edgeDash,
    borderColor: color.ink,
    borderStyle: 'dashed',
    backgroundColor: color.butter,
  },
  emptyPlus: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: border.edge,
    borderColor: color.ink,
    backgroundColor: color.bluebird,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
