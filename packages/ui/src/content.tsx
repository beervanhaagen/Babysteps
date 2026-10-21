import { useEffect, useRef, useState, type ComponentRef, type ReactNode } from 'react';
import { AccessibilityInfo, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Character, Hug, Icon, type CharacterName, type IconName } from './brand';
import { SvgMarkup } from './svg';
import { useFocusRing } from './focus';
import { useReducedMotion } from './motion';
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

/** A first on a card: its label, line icon (24×24 path data) and the colour of its kind. */
export interface FirstMark {
  label: string;
  icon: string;
  tone: SoftBlock;
}

export interface MomentCardProps {
  /** The photos, already rendered (the app passes expo-images); the first three show. */
  photos: ReactNode[];
  /** All photos of the moment; beyond three the last tile says "+N". */
  photoCount?: number;
  /** Spoken description of the photos. */
  alt?: string;
  /** The parent's one line: the card's title. */
  caption?: string | null;
  first?: FirstMark;
  /** "za 17 okt". */
  date: string;
  hugs?: number;
  /**
   * 'album' (Pad 3.0): one big photo (400px) to swipe through, "N foto's" and dots.
   * 'large': photos on top at a fixed height. 'compact': one photo beside the words.
   */
  layout?: 'album' | 'large' | 'compact';
  /** Spoken first, e.g. "Week 30". */
  context?: string;
  /** Gets the photo shown at the time (album), to open the week there. */
  onPress?: (photo: number) => void;
}

/** A page in a photo album (Pad 2.0): straight, one ink edge, the photos to the edge, your line under it. */
export function MomentCard({ photos, photoCount = photos.length, alt, caption, first, date, hugs, layout = 'large', context, onPress }: MomentCardProps) {
  const focus = useFocusRing();
  const compact = layout === 'compact';
  const hugText = hugs ? (hugs === 1 ? '1 knuffel' : `${hugs} knuffels`) : null;
  const words = (
    <View style={[styles.momentBody, !compact && styles.momentBodyLarge, layout === 'album' && styles.albumBody]}>
      {first ? <FirstLabel {...first} /> : null}
      {caption ? (
        <Text style={[styles.momentTitle, compact && { fontSize: 17 }, layout === 'album' && { fontSize: 19, lineHeight: 24 }]} numberOfLines={compact ? 3 : 4}>
          {caption}
        </Text>
      ) : null}
      <View style={[styles.momentFoot, layout === 'large' && styles.momentFootRule]}>
        <Text style={styles.momentDate}>{date}</Text>
        {hugText ? (
          <View style={styles.momentHugs}>
            <Icon name="heart" size={16} weight={2.6} color={color.tomato} />
            <Text style={styles.momentHugsText}>{hugs}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
  const pictures = (
    <View accessible={!!alt} accessibilityRole={alt ? 'image' : undefined} accessibilityLabel={alt} style={compact ? styles.momentThumb : styles.momentPhotos}>
      {compact ? <Tile>{photos[0]}</Tile> : <Mosaic photos={photos} count={photoCount} />}
    </View>
  );
  const body = (
    <View style={compact ? styles.momentRow : undefined}>
      {pictures}
      {words}
    </View>
  );
  const label = [context, first ? `Eerste keer: ${first.label}` : null, caption, date, hugText].filter(Boolean).join(', ');
  if (layout === 'album') return <AlbumCard photos={photos} alt={alt} label={label} words={words} onPress={onPress} />;
  if (!onPress) return <View style={styles.moment}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={label}
      onPress={() => onPress(0)}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={({ pressed }) => [styles.moment, pressed && styles.momentPressed, focus.ring]}
    >
      {body}
    </Pressable>
  );
}

const ALBUM_HEIGHT = 400;

/**
 * Pad 3.0: the photos big, one at a time, swiped sideways. Each photo and the words open the
 * week (T2b) at the photo shown. Screen readers get the photos as one adjustable image.
 */
function AlbumCard({ photos, alt, label, words, onPress }: { photos: ReactNode[]; alt?: string; label: string; words: ReactNode; onPress?: (photo: number) => void }) {
  const focus = useFocusRing();
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(0);
  const pager = useRef<ComponentRef<typeof ScrollView>>(null);
  const reduced = useReducedMotion();
  const count = photos.length;
  const go = (to: number) => {
    const next = Math.max(0, Math.min(count - 1, to));
    pager.current?.scrollTo({ x: next * width, animated: !reduced });
    setPage(next);
  };
  return (
    <View style={[styles.moment, styles.album]}>
      <View
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={alt}
        accessibilityValue={{ text: count > 1 ? `foto ${page + 1} van ${count}` : undefined }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, { name: 'activate' }]}
        onAccessibilityAction={(e) =>
          e.nativeEvent.actionName === 'increment' ? go(page + 1) : e.nativeEvent.actionName === 'decrement' ? go(page - 1) : onPress?.(page)
        }
        style={styles.albumPhotos}
      >
        <ScrollView
          ref={pager}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => width && setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {(count ? photos : [undefined]).map((photo, i) => (
            <Pressable key={i} onPress={() => onPress?.(i)} style={{ width, height: ALBUM_HEIGHT }}>
              <Tile>{photo}</Tile>
            </Pressable>
          ))}
        </ScrollView>
        {count > 1 ? (
          <>
            <View style={styles.albumCount}>
              <Icon name="photos" size={14} weight={2.4} />
              <Text style={styles.albumCountText}>{count} foto’s</Text>
            </View>
            <View style={styles.albumDots}>
              {photos.map((_, i) => (
                <View key={i} style={[styles.albumDot, i === page && styles.albumDotOn]} />
              ))}
            </View>
          </>
        ) : null}
      </View>
      {onPress ? (
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={label}
          onPress={() => onPress(page)}
          onFocus={focus.onFocus}
          onBlur={focus.onBlur}
          style={({ pressed }) => [pressed && { opacity: 0.7 }, focus.ring]}
        >
          {words}
        </Pressable>
      ) : (
        <View accessible accessibilityLabel={label}>
          {words}
        </View>
      )}
    </View>
  );
}

/** One photo tile; without a photo, a soft block with Bo. */
function Tile({ children, more }: { children?: ReactNode; more?: number }) {
  return (
    <View style={styles.tile}>
      {children ?? <Character name="bo" mood="happy" size={56} decorative motion={null} />}
      {more ? (
        <View style={styles.tileMore}>
          <Text style={styles.tileMoreText}>+{more}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Fixed layouts for one, two, three or more photos, 3px of white between them. */
function Mosaic({ photos, count }: { photos: ReactNode[]; count: number }) {
  if (photos.length <= 1) return <Tile>{photos[0]}</Tile>;
  if (photos.length === 2) {
    return (
      <View style={styles.mosaicRow}>
        <Tile>{photos[0]}</Tile>
        <Tile>{photos[1]}</Tile>
      </View>
    );
  }
  return (
    <View style={styles.mosaicRow}>
      <View style={{ flex: 2 }}>
        <Tile>{photos[0]}</Tile>
      </View>
      <View style={styles.mosaicColumn}>
        <Tile>{photos[1]}</Tile>
        <Tile more={count > 3 ? count - 3 : undefined}>{photos[2]}</Tile>
      </View>
    </View>
  );
}

/** A first's icon in a circle of its kind's colour (cards, A3b's tiles, the grid). */
export function FirstIcon({ icon, tone, size: box = 22, iconSize = 15 }: { icon: string; tone: SoftBlock; size?: number; iconSize?: number }) {
  return (
    <View style={[styles.firstIcon, { width: box, height: box, borderRadius: box / 2, backgroundColor: color[tone] }, box > 22 && styles.firstIconEdge]}>
      <SvgMarkup
        markup={`<path d="${icon}" fill="none" stroke="currentColor" stroke-width="${box > 22 ? 2.2 : 2.4}" stroke-linecap="round" stroke-linejoin="round"/>`}
        viewBox="0 0 24 24"
        width={iconSize}
        height={iconSize}
        color={color.ink}
      />
    </View>
  );
}

/** "Eerste keer · Los gezeten", but just "Eerste hapje" when the label says it already. */
export const firstLabelText = (label: string) => (/^eerste\b/i.test(label.trim()) ? label : `Eerste keer · ${label}`);

/** "Eerste keer · Los gezeten": a calm label with the icon and colour of its kind. */
export function FirstLabel({ label, icon, tone }: FirstMark) {
  return (
    <View style={styles.firstLabel}>
      <FirstIcon icon={icon} tone={tone} />
      <Text style={styles.firstLabelText} numberOfLines={1}>
        {firstLabelText(label)}
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
  /** Something to the right of the words, e.g. a sticker with a time. */
  accessory?: ReactNode;
}

/** A soft-block card with one message; at most one per screen. */
export function Callout({ title, children, tone = 'lilac', tilt = -1, accessory }: CalloutProps) {
  const words = (
    <>
      <Text style={[text('rowTitle'), { fontSize: 15 }]}>{title}</Text>
      {children ? <Text style={text('meta')}>{children}</Text> : null}
    </>
  );
  return (
    <View style={[styles.callout, accessory ? styles.calloutRow : null, { backgroundColor: color[tone], transform: [{ rotate: `${tilt}deg` }] }]}>
      {accessory ? <View style={styles.grow}>{words}</View> : words}
      {accessory}
    </View>
  );
}

export interface ListRowProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  onPress?: () => void;
  /** Destructive actions ("Moment verwijderen") in plum. */
  danger?: boolean;
  chevron?: boolean;
  /** Something on the right instead of the chevron, such as a Switch. */
  accessory?: ReactNode;
}

/** A settings or options row (T8, the Ik screens): icon, title, a muted line, a chevron. */
export function ListRow({ title, subtitle, icon, onPress, danger, chevron = true, accessory }: ListRowProps) {
  const focus = useFocusRing();
  const tint = danger ? color.plum : color.ink;
  const body = (
    <>
      {icon ? <Icon name={icon} size={22} color={tint} /> : null}
      <View style={styles.grow}>
        <Text style={[text('rowTitle'), { color: tint }]}>{title}</Text>
        {subtitle ? <Text style={[text('meta'), styles.muted]}>{subtitle}</Text> : null}
      </View>
      {accessory ?? (onPress && chevron ? <Icon name="chevron-right" size={20} color={color.inkMuted} /> : null)}
    </>
  );
  if (!onPress) return <View style={styles.listRow}>{body}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={({ pressed }) => [styles.listRow, pressed && { opacity: 0.6 }, focus.ring]}
    >
      {body}
    </Pressable>
  );
}

export interface NextUpProps {
  title: string;
  /** "over zo'n 6 weken". */
  when?: string;
  eyebrow?: string;
  /** The one line of the folded card, e.g. "Een nieuw sprongetje, over zo’n 6 weken". */
  summary?: string;
  items?: string[];
  character?: CharacterName;
  tone?: SoftBlock | 'white';
  /** A small line under the list, e.g. the reminder that leaps are a rough guide. */
  children?: string;
  /** A line that shows even when the card is folded, e.g. when to call the huisarts. */
  footnote?: string;
  /**
   * With these, the card folds (Pad 2.0): eyebrow with when, title and summary, and a chevron.
   * Tapping it opens the items and the small line.
   */
  open?: boolean;
  onToggle?: () => void;
}

/** What's coming next (the leap card on T1): eyebrow, title, when, a few lines and a character. */
export function NextUp({ title, when, eyebrow = 'Wat komt eraan', summary, items, character, tone = 'white', children, footnote, open = true, onToggle }: NextUpProps) {
  const focus = useFocusRing();
  const foldable = !!onToggle;
  const details = open ? (
    <>
      {items?.length ? (
        <View style={styles.nextUpList}>
          {items.map((item) => (
            <View key={item} style={styles.nextUpItem}>
              <Text style={styles.nextUpBullet} accessibilityElementsHidden importantForAccessibility="no">
                •
              </Text>
              <Text style={[text('body'), styles.grow]}>{item}</Text>
            </View>
          ))}
        </View>
      ) : null}
      {children ? <Text style={[text('meta'), styles.muted]}>{children}</Text> : null}
    </>
  ) : null;
  const note = footnote ? <Text style={[text('meta'), styles.muted, { fontSize: 13, lineHeight: 18 }]}>{footnote}</Text> : null;
  if (foldable) {
    // Pad 3.0: folded it's one line ("WAT KOMT ERAAN  Een sprongetje, over zo'n 6 weken");
    // open, the title, the lines and the small print follow.
    return (
      <View role="region" aria-label={eyebrow} style={[styles.nextUpFolded, { backgroundColor: color[tone] }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={[eyebrow, summary ?? title].join('. ')}
          accessibilityHint={open ? 'Sluit de uitleg' : 'Opent de uitleg'}
          onPress={onToggle}
          onFocus={focus.onFocus}
          onBlur={focus.onBlur}
          style={[styles.nextUpToggle, focus.ring]}
        >
          <Text style={[styles.eyebrow, { fontSize: 11 }]}>{eyebrow}</Text>
          <Text numberOfLines={1} style={styles.nextUpLine}>
            {summary ?? title}
          </Text>
          <View style={{ transform: [{ rotate: open ? '-90deg' : '90deg' }] }}>
            <Icon name="chevron-right" size={18} weight={2.4} color={color.inkMuted} />
          </View>
        </Pressable>
        {open ? (
          <View style={styles.nextUpOpen}>
            <Text accessibilityRole="header" style={styles.nextUpFoldTitle}>
              {when ? `${title}, ${when}` : title}
            </Text>
            {details}
            {note}
          </View>
        ) : null}
      </View>
    );
  }
  return (
    <View style={[styles.nextUp, { backgroundColor: color[tone] }]}>
      <View style={styles.nextUpHead}>
        <View style={styles.shrink}>
          <Text style={styles.eyebrow}>{eyebrow}</Text>
          <Text accessibilityRole="header" style={[text('titleS'), { fontSize: 22, lineHeight: 26, marginTop: 2 }]}>
            {title}
          </Text>
          {when ? <Text style={[text('meta'), styles.muted, { marginTop: 2 }]}>{when}</Text> : null}
        </View>
        {character ? <Character name={character} size={74} decorative /> : null}
      </View>
      {details}
      {note}
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
    width: '100%',
    maxWidth: 342,
    backgroundColor: color.white,
    borderWidth: border.edge,
    borderColor: color.ink,
    borderRadius: radius.radiusL,
    boxShadow: shadow.shadowSm,
    overflow: 'hidden',
  },
  eyebrow: { ...text('eyebrow'), textTransform: 'uppercase' },
  album: { maxWidth: undefined },
  albumBody: { paddingHorizontal: 16 },
  albumPhotos: { height: ALBUM_HEIGHT, backgroundColor: color.ink, borderBottomWidth: border.edge, borderBottomColor: color.ink },
  albumCount: {
    position: 'absolute',
    right: 12,
    top: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: radius.radiusS,
    borderWidth: 1.5,
    borderColor: color.ink,
    backgroundColor: color.white,
  },
  albumCountText: { ...text('meta'), fontSize: 12, lineHeight: 16, fontFamily: fontFamily('sans', 800) },
  albumDots: { position: 'absolute', left: 0, right: 0, bottom: 10, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  albumDot: { width: 7, height: 7, borderRadius: 4, borderWidth: 1.5, borderColor: color.ink, backgroundColor: `${color.white}73` },
  albumDotOn: { backgroundColor: color.white },
  momentPressed: { transform: [{ translateY: 2 }], boxShadow: `0 1px 0 0 ${color.ink}` },
  momentRow: { flexDirection: 'row', alignItems: 'stretch' },
  momentPhotos: { height: 196, backgroundColor: color.white, borderBottomWidth: border.edge, borderBottomColor: color.ink },
  momentThumb: { width: 104, minHeight: 104, borderRightWidth: border.edge, borderRightColor: color.ink },
  momentBody: { flex: 1, minWidth: 0, gap: 6, paddingVertical: 12, paddingHorizontal: 14 },
  momentBodyLarge: { flex: 0 },
  momentTitle: { fontFamily: fontFamily('display', 700), fontSize: 18, lineHeight: 23, color: color.ink },
  momentFoot: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 'auto' },
  momentFootRule: { paddingTop: 8, borderTopWidth: 1.5, borderTopColor: color.line },
  momentDate: { ...text('meta'), fontSize: 13, color: color.inkMuted },
  momentHugs: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 4 },
  momentHugsText: { ...text('meta'), fontSize: 13, fontFamily: fontFamily('sans', 800) },
  mosaicRow: { flex: 1, flexDirection: 'row', gap: 3 },
  mosaicColumn: { flex: 1, gap: 3 },
  tile: { flex: 1, overflow: 'hidden', backgroundColor: color.lilac, alignItems: 'center', justifyContent: 'center' },
  tileMore: { ...StyleSheet.absoluteFill, backgroundColor: `${color.ink}9E` /* ink at 62% */, alignItems: 'center', justifyContent: 'center' },
  tileMoreText: { fontFamily: fontFamily('sticker', 400), fontSize: 22, color: color.white },
  firstIcon: { alignItems: 'center', justifyContent: 'center' },
  firstIconEdge: { borderWidth: 1.5, borderColor: color.ink },
  firstLabel: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 2,
    paddingLeft: 2,
    paddingRight: 10,
    borderRadius: radius.radiusS,
    borderWidth: 1.5,
    borderColor: color.ink,
    backgroundColor: color.card,
  },
  firstLabelText: { ...text('meta'), fontSize: 12, lineHeight: 16, fontFamily: fontFamily('sans', 800), flexShrink: 1 },
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
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    minHeight: 60,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: color.line,
  },
  nextUp: {
    width: '100%',
    maxWidth: 342,
    borderWidth: border.edgeBold,
    borderColor: color.ink,
    borderRadius: radius.radiusL,
    boxShadow: shadow.shadowMd,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 10,
  },
  nextUpFolded: { paddingHorizontal: 14, paddingRight: 12, borderWidth: border.edge, borderColor: color.ink, borderRadius: radius.radiusM },
  nextUpToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48 },
  nextUpLine: { flex: 1, minWidth: 0, fontFamily: fontFamily('sans', 800), fontSize: 14, lineHeight: 19, color: color.ink },
  nextUpOpen: { gap: 10, paddingBottom: 14 },
  nextUpFoldTitle: { fontFamily: fontFamily('display', 700), fontSize: 17, lineHeight: 21, color: color.ink },
  nextUpHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 },
  nextUpList: { gap: 3 },
  nextUpItem: { flexDirection: 'row', gap: 8 },
  nextUpBullet: { ...text('body'), width: 10 },
  calloutRow: { flexDirection: 'row', alignItems: 'center', gap: space.space3 },
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
