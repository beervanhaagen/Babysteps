import { useRef, useState, type ComponentRef, type ReactNode, type RefObject } from 'react';
import { AccessibilityInfo, findNodeHandle, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useAnnounce, webAria } from './a11y';
import { Button } from './actions';
import { Avatar } from './content';
import { useFocusRing } from './focus';
import { fontFamily, text } from './text';
import { border, color, radius, size, space } from './tokens';

// Written reacties under a moment (owner, 3 November 2026): read by the whole circle, parents can
// delete any, family their own, no editing. Always plain text in <Text>: never HTML, never a link.

export interface Comment {
  id: string;
  body: string;
  /** "Oma Ria" for family, the parent's first name for a parent. */
  author: string;
  authorKind: 'family' | 'parent';
  mine: boolean;
  canDelete: boolean;
  /** ISO time it was written. */
  at: string;
}

export const COMMENT_MAX = 500;

export const commentsCount = (n: number) => (n === 1 ? '1 reactie' : `${n} reacties`);

/** Keyboard and screen-reader focus to an element that replaced the one that had it. */
function focusOn(ref: RefObject<unknown>) {
  requestAnimationFrame(() => {
    const target = ref.current as { focus?: () => void } | null;
    if (!target) return;
    if (Platform.OS === 'web') return target.focus?.();
    const tag = findNodeHandle(target as never);
    if (tag) AccessibilityInfo.setAccessibilityFocus(tag);
  });
}
// Focusable from script on the web, not in the tab order.
const focusable = webAria({ tabIndex: -1 });

interface CommentsProps {
  /** The reacties shown, oldest first. */
  comments: Comment[];
  /** All reacties on the moment; more than shown gives the "Alle … reacties" button. */
  total: number;
  /** "vandaag", "3 nov" (from @teddysteps/core's whenWritten). */
  when: (at: string) => string;
  onAll?: () => void;
  allBusy?: boolean;
  /** Deletes for real; throws when it didn't work. */
  onDelete?: (comment: Comment) => Promise<void>;
  /** The field to write one, under the list. */
  composer?: ReactNode;
  size?: 'md' | 'lg';
}

/** The reacties of one moment, with "Alle 8 reacties" when there are more, and the field under it. */
export function Comments({ comments, total, when, onAll, allBusy, onDelete, composer, size: s = 'md' }: CommentsProps) {
  const hidden = total - comments.length;
  // After a delete, focus lands on the list (or what's left of it), not on the page's body.
  const list = useRef<ComponentRef<typeof View>>(null);
  const [gone, setGone] = useState('');
  useAnnounce(gone);
  const remove = onDelete
    ? async (c: Comment) => {
        setGone('');
        await onDelete(c);
        setGone('Reactie verwijderd');
        focusOn(list);
      }
    : undefined;
  return (
    <View style={styles.block}>
      {hidden > 0 && onAll ? (
        <LinkButton onPress={onAll} busy={allBusy}>
          {allBusy ? 'Reacties ophalen…' : comments.length ? `Alle ${total} reacties` : `${commentsCount(total)} lezen`}
        </LinkButton>
      ) : null}
      <View ref={list} role="list" accessibilityLabel="Reacties" {...webAria({ 'aria-label': 'Reacties' })} {...focusable} style={[styles.list, styles.noOutline]}>
        {comments.map((c) => (
          <Row key={c.id} comment={c} when={when} onDelete={remove} large={s === 'lg'} />
        ))}
      </View>
      <Text role="status" accessibilityLiveRegion="polite" style={styles.hidden}>
        {gone}
      </Text>
      {composer}
    </View>
  );
}

function Row({ comment: c, when, onDelete, large }: { comment: Comment; when: (at: string) => string; onDelete?: CommentsProps['onDelete']; large: boolean }) {
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const question = useRef<ComponentRef<typeof Text>>(null);
  const ask = useRef<ComponentRef<typeof View>>(null);
  const failure = failed ? 'Verwijderen lukte even niet. Probeer het zo nog eens.' : undefined;
  useAnnounce(failure);
  const date = when(c.at);
  async function remove() {
    if (!onDelete) return;
    setBusy(true);
    setFailed(false);
    try {
      await onDelete(c);
    } catch {
      setFailed(true);
      setBusy(false);
    }
  }
  return (
    <View role="listitem" style={styles.row}>
      <Avatar name={c.author} size={large ? 40 : 34} tone={c.authorKind === 'parent' ? 'butter' : 'pistachio'} decorative />
      <View style={styles.grow}>
        <Text style={[styles.head, large && styles.headLg]}>
          <Text style={styles.author}>{c.mine ? `${c.author} (jij)` : c.author}</Text>
          {date ? <Text style={styles.date}>{`  ${date}`}</Text> : null}
        </Text>
        <Text selectable style={[styles.body, large && styles.bodyLg]}>
          {c.body}
        </Text>
        {c.canDelete && onDelete ? (
          asking ? (
            <View style={styles.ask}>
              <Text ref={question} {...focusable} style={[styles.askText, styles.noOutline]}>
                {c.mine ? 'Je reactie verwijderen?' : `Reactie van ${c.author} verwijderen?`}
              </Text>
              <View style={styles.askRow}>
                <LinkButton onPress={remove} busy={busy} danger>
                  {busy ? 'Verwijderen…' : 'Ja, verwijderen'}
                </LinkButton>
                {!busy ? (
                  <LinkButton
                    onPress={() => {
                      setAsking(false);
                      setFailed(false);
                      focusOn(ask);
                    }}
                  >
                    Nee
                  </LinkButton>
                ) : null}
              </View>
              {failure ? (
                <Text role="alert" accessibilityLiveRegion="polite" style={styles.error}>
                  {failure}
                </Text>
              ) : null}
            </View>
          ) : (
            <LinkButton
              ref={ask}
              small
              onPress={() => {
                setAsking(true);
                focusOn(question);
              }}
              label={c.mine ? 'Verwijder je reactie' : `Verwijder de reactie van ${c.author}`}
            >
              Verwijderen
            </LinkButton>
          )
        ) : null}
      </View>
    </View>
  );
}

/** A quiet text button with a 44px target. */
function LinkButton({
  children,
  onPress,
  busy,
  danger,
  small,
  label,
  ref,
}: {
  children: string;
  onPress: () => void;
  busy?: boolean;
  danger?: boolean;
  small?: boolean;
  label?: string;
  ref?: RefObject<ComponentRef<typeof View> | null>;
}) {
  const focus = useFocusRing();
  return (
    <Pressable
      ref={ref}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!busy, busy: !!busy }}
      disabled={busy}
      onPress={onPress}
      onFocus={focus.onFocus}
      onBlur={focus.onBlur}
      style={[styles.link, focus.ring]}
    >
      <Text style={[styles.linkText, small && styles.linkSmall, danger && { color: color.plum }]}>{children}</Text>
    </Pressable>
  );
}

interface ComposerProps {
  /** Sends it; throws `new Error('too-many')` at the daily limit, anything else when it didn't arrive. */
  onSend: (body: string, clientId: string) => Promise<void>;
  /** A fresh id per reactie, so sending again after a hiccup never makes two. */
  newId: () => string;
  /** Under the field: who reads along. */
  hint?: string;
  size?: 'md' | 'lg';
  autoFocus?: boolean;
  /** For the spoken name: "Schrijf een reactie bij …". */
  about?: string;
  /** "Annuleren" next to "Plaatsen", e.g. to fold a card's field away again. */
  onCancel?: () => void;
}

/** The field to write a reactie, with "Plaatsen". At most 500 characters; the count shows near the end. */
export function CommentComposer({ onSend, newId, hint = 'Iedereen in de kring kan dit lezen.', size: s = 'md', autoFocus, about, onCancel }: ComposerProps) {
  const [value, setValue] = useState('');
  const [draft, setDraft] = useState(newId);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string>();
  const [sent, setSent] = useState('');
  const focus = useFocusRing();
  const left = COMMENT_MAX - value.length;
  const ready = value.trim().length > 0 && left >= 0;
  // Spoken on iOS too, where live regions are ignored.
  useAnnounce(problem ?? sent);
  async function send() {
    if (!ready || busy) return;
    setBusy(true);
    setProblem(undefined);
    setSent('');
    try {
      await onSend(value.trim(), draft);
      setValue('');
      setDraft(newId());
      requestAnimationFrame(() => setSent('Reactie geplaatst!'));
    } catch (e) {
      setProblem(
        e instanceof Error && e.message === 'too-many'
          ? 'Je hebt vandaag al heel veel geschreven. Morgen kan het weer.'
          : 'Je reactie kwam niet aan. Probeer het zo nog eens.',
      );
    }
    setBusy(false);
  }
  const lg = s === 'lg';
  const count = left < 50 ? (left < 0 ? `${-left} tekens te veel` : `Nog ${left} tekens`) : null;
  return (
    <View style={styles.composer}>
      <TextInput
        value={value}
        onChangeText={(t) => {
          setValue(t);
          setSent('');
        }}
        multiline
        maxLength={COMMENT_MAX + 50}
        autoFocus={autoFocus}
        placeholder="Schrijf een reactie…"
        placeholderTextColor={color.inkMuted}
        accessibilityLabel={about ? `Schrijf een reactie bij ${about}` : 'Schrijf een reactie'}
        accessibilityHint={count ? `${hint} ${count}.` : hint}
        onFocus={focus.onFocus}
        onBlur={focus.onBlur}
        style={[styles.input, lg && styles.inputLg, left < 0 && styles.inputError, focus.ring]}
      />
      <Text style={[styles.hint, lg && styles.hintLg]}>
        {hint}
        {count ? <Text style={[styles.count, left < 0 && { color: color.plum }]}>{`  ${count}`}</Text> : null}
      </Text>
      <View style={styles.composerRow}>
        {onCancel && !busy ? <LinkButton onPress={onCancel}>Annuleren</LinkButton> : null}
        <Button size="md" disabled={!ready} busy={busy} onPress={send} accessibilityLabel="Reactie plaatsen">
          Plaatsen
        </Button>
      </View>
      {/* Always there, so a screen reader reads it out when it fills. */}
      <Text role="status" accessibilityLiveRegion="polite" style={styles.sent}>
        {sent}
      </Text>
      {problem ? (
        <Text role="alert" accessibilityLiveRegion="polite" style={styles.error}>
          {problem}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.space2 },
  list: { gap: space.space3 },
  noOutline: { outlineStyle: 'none' } as object,
  hidden: { position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0 },
  row: { flexDirection: 'row', gap: space.space3, alignItems: 'flex-start' },
  grow: { flex: 1, minWidth: 0 },
  head: { ...text('meta'), fontFamily: fontFamily('sans', 800), color: color.ink },
  headLg: { fontSize: 16, lineHeight: 22 },
  author: { fontFamily: fontFamily('sans', 800), color: color.ink },
  date: { fontFamily: fontFamily('sans', 700), color: color.inkMuted },
  body: { ...text('body') },
  bodyLg: { fontSize: 18, lineHeight: 26 },
  ask: { gap: space.space1, paddingTop: space.space1 },
  askText: { ...text('meta'), fontFamily: fontFamily('sans', 800), color: color.ink },
  askRow: { flexDirection: 'row', gap: space.space4 },
  link: { minHeight: size.tapMin, justifyContent: 'center', alignSelf: 'flex-start' },
  linkText: { ...text('meta'), fontFamily: fontFamily('sans', 800), color: color.ink, textDecorationLine: 'underline' },
  linkSmall: { color: color.inkMuted },
  composer: { gap: space.space2 },
  input: {
    ...text('body'),
    minHeight: 64,
    maxHeight: 180,
    paddingHorizontal: space.space4,
    paddingVertical: space.space3,
    borderRadius: radius.radiusM,
    borderWidth: border.edge,
    borderColor: color.ink,
    backgroundColor: color.white,
    textAlignVertical: 'top',
  },
  inputLg: { fontSize: 18, lineHeight: 26, minHeight: 76 },
  inputError: { borderColor: color.plum },
  hint: { ...text('meta'), color: color.inkMuted },
  hintLg: { fontSize: 15 },
  count: { fontFamily: fontFamily('sans', 800), color: color.ink },
  composerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: space.space4, flexWrap: 'wrap' },
  sent: { ...text('meta'), fontFamily: fontFamily('sans', 800), color: color.ink },
  error: { ...text('meta'), fontFamily: fontFamily('sans', 700), color: color.plum },
});
