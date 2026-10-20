// TeddySteps components. Load tokens.css, bundle.css, React 18, then bundle.js; everything is on window.TeddySteps.
type CharacterName = "bo" | "tiggy" | "bizzy" | "puddle";
type SoftBlock = "lilac" | "pistachio" | "butter" | "cornflower" | "sunshine" | "apricot";
type IconName = "edit" | "chevron-right" | "family" | "bell" | "lock" | "book" | "gift" | "help" | "trail" | "plus" | "me" | "back" | "download" | "pause" | "trash" | "check" | "close" | "share" | "apple" | "google" | "mail" | "layout" | "swap" | "text" | "sticker" | "card" | "settings" | "heart" | "mic" | "camera" | "more" | "offline" | "play";
type DoodleName = "star" | "twinkle" | "heart" | "sparkle" | "sun" | "zigzag" | "squiggle";

export interface WordmarkProps { size?: number; tone?: "paper" | "header"; twinkle?: boolean; }
export interface MonogramProps { size?: number; }
export interface CharacterProps { name: CharacterName; mood?: "default" | "happy" | "still"; size?: number; /** "bob" | "sway" | "drift" | "hop"; null for still. Defaults to the character's own */ motion?: string | null; delay?: 1 | 2 | 3; decorative?: boolean; /** absolute-position style for a peek over an edge */ peek?: object; rotate?: number; }
export interface HugProps { size?: number; }
export interface DoodleProps { name: DoodleName; size?: number; color?: string; twinkle?: boolean; delay?: 1 | 2 | 3; }
export interface IconProps { name: IconName; size?: number; weight?: number; title?: string; }
export interface ButtonProps { variant?: "primary" | "dark" | "paper" | "sunshine" | "danger"; size?: "lg" | "md"; block?: boolean; icon?: IconName; href?: string; disabled?: boolean; onClick?: () => void; children: string; }
export interface IconButtonProps { icon: IconName; label: string; tone?: "white" | "paper"; href?: string; onClick?: () => void; }
export interface ChoiceChipProps { children: string; name?: string; type?: "radio" | "checkbox"; defaultChecked?: boolean; checked?: boolean; onChange?: (e: Event) => void; }
export interface SwitchProps { label: string; hint?: string; defaultChecked?: boolean; checked?: boolean; onChange?: (e: Event) => void; }
export interface TextFieldProps { label: string; hint?: string; error?: string; type?: string; value?: string; defaultValue?: string; placeholder?: string; }
export interface CodeInputProps { value?: string; length?: number; label?: string; }
export interface ScreenHeaderProps { title: string; subtitle?: string; back?: boolean | string; step?: [number, number]; color?: SoftBlock; character?: CharacterName; characterRotate?: number; action?: unknown; }
export interface StepProgressProps { current: number; total: number; }
export interface TabBarProps { active?: "trail" | "family" | "me"; onChange?: (id: string) => void; onAdd?: () => void; }
export interface StickerProps { tone?: "sunshine" | "white" | "lilac" | "pistachio" | "butter"; icon?: IconName; children: string; }
export interface MomentCardProps { photos?: string[]; photoCount?: number; src?: string; alt?: string; caption?: string; first?: { label: string; icon: string; tone: SoftBlock }; date?: string; hugs?: number; layout?: 'large' | 'compact'; week?: string; note?: string; tint?: SoftBlock; character?: CharacterName; href?: string; }
export interface RangeBarProps { label: string; start: number; end: number; /** @deprecated use start */ from?: number; /** @deprecated use end */ to?: number; now?: number; max?: number; note?: string; }
export interface ListRowProps { title: string; subtitle?: string; icon?: IconName; href?: string; onClick?: () => void; danger?: boolean; chevron?: boolean; }
export interface PersonRowProps { name: string; role: string; tone?: SoftBlock; action?: string; }
export interface AvatarProps { name: string; size?: number; tone?: SoftBlock; decorative?: boolean; }
export interface CalloutProps { title: string; children?: string; action?: string; href?: string; tone?: SoftBlock; tilt?: number; }
export interface EmptySlotProps { title?: string; subtitle?: string; href?: string; }
export interface BookCoverProps { name: string; subtitle?: string; color?: "cornflower" | "apricot" | "pistachio" | "lilac"; size?: number; tilt?: number; }
export interface VoiceNoteProps { from: string; length: string; }
export interface HandNoteProps { children: string; color?: string; size?: "s"; tilt?: number; }
export interface HugToastProps { title: string; children?: string; }
export interface BannerProps { title: string; children?: string; icon?: IconName; tone?: SoftBlock; }
export interface ScallopProps { color: SoftBlock; }
export interface LeapTimelineProps { now: number; end?: number; leaps?: number[]; nowLabel?: string; nextLabel?: string; weekWord?: string; /** Word before the next leap's week, e.g. "rond week" (leaps are never exact). Defaults to weekWord. */ nextWeekWord?: string; axis?: number[]; axisLabels?: string[]; label?: string; }
export interface NextUpProps { title: string; when?: string; eyebrow?: string; items?: string[]; character?: CharacterName; tone?: SoftBlock; children?: string; }
