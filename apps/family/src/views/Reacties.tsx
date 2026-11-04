import { whenWritten } from '@teddysteps/core';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button, color, CommentComposer, Comments, fontFamily, space, type Comment } from '@teddysteps/ui';
import { api, type FamilyMoment } from '../api';

// Written reacties under a postcard (owner, 3 November 2026): the newest three, all on request,
// and a field to write one. The whole circle reads them; your own you can delete.
export type CommentsChange = (id: string, change: { comments: Comment[]; commentCount: number }) => void;

export function Reacties({
  moment: m,
  title,
  large,
  open,
  onChanged,
}: {
  moment: FamilyMoment;
  title: string;
  large?: boolean;
  /** Came here from the big view's "Reageren": the field opens, in view. */
  open?: boolean;
  onChanged: CommentsChange;
}) {
  // All of them, once asked for; until then the page's newest three.
  const [all, setAll] = useState<Comment[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [writing, setWriting] = useState(false);
  useEffect(() => {
    if (!open) return;
    // The family page is web only: the block is found by its id.
    requestAnimationFrame(() => document.getElementById(`reacties-${m.id}`)?.scrollIntoView({ block: 'center' }));
  }, [open, m.id]);

  const shown = all ?? m.comments;
  async function loadAll() {
    setLoading(true);
    setFailed(false);
    try {
      // Newest first from the server, 30 at a time; on screen oldest first.
      const list: Comment[] = [];
      let before: string | undefined;
      for (let i = 0; i < 20; i++) {
        const r = await api.comments(m.id, before);
        list.push(...r.comments.filter((c) => !list.some((x) => x.id === c.id)));
        if (!r.more || !r.comments.length) break;
        before = r.comments[r.comments.length - 1].id;
      }
      setAll(list.reverse());
    } catch {
      setFailed(true);
    }
    setLoading(false);
  }

  async function send(body: string, clientId: string) {
    const { comment } = await api.comment(m.id, body, clientId);
    const known = shown.some((c) => c.id === comment.id);
    if (known) return;
    if (all) setAll([...all, comment]);
    onChanged(m.id, { comments: [...m.comments, comment].slice(-3), commentCount: m.commentCount + 1 });
  }

  async function remove(c: Comment) {
    await api.deleteComment(c.id);
    if (all) setAll(all.filter((x) => x.id !== c.id));
    onChanged(m.id, { comments: m.comments.filter((x) => x.id !== c.id), commentCount: Math.max(0, m.commentCount - 1) });
  }

  return (
    <View nativeID={`reacties-${m.id}`} style={styles.block}>
      <Comments
        comments={shown}
        total={all ? all.length : m.commentCount}
        when={(at) => whenWritten(at)}
        onAll={loadAll}
        allBusy={loading}
        onDelete={remove}
        size={large ? 'lg' : 'md'}
        composer={
          writing || open ? (
            <CommentComposer
              onSend={send}
              newId={() => crypto.randomUUID()}
              size={large ? 'lg' : 'md'}
              autoFocus
              about={title}
              onCancel={open ? undefined : () => setWriting(false)}
            />
          ) : (
            <Button variant="paper" size="md" block={!large} onPress={() => setWriting(true)} accessibilityLabel={`Schrijf een reactie bij ${title}`}>
              Schrijf een reactie
            </Button>
          )
        }
      />
      {failed ? (
        <Text role="alert" style={styles.error}>
          De reacties kwamen even niet door. Probeer het zo nog eens.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { gap: space.space2, borderTopWidth: 2, borderTopColor: color.line, borderStyle: 'dashed', paddingTop: space.space3, marginHorizontal: space.space1, marginBottom: space.space1 },
  error: { fontFamily: fontFamily('sans', 700), fontSize: 15, color: color.plum },
});
