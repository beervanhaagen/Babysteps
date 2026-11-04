import type { Comment } from '@teddysteps/ui';
import { randomUUID } from 'expo-crypto';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';

// Written reacties under a moment (T2), through the database functions add_comment,
// delete_comment and moment_comments: the whole circle reads them, parents may delete any.

type Row = { id: string; body: string; author: string; author_kind: 'family' | 'parent'; mine: boolean; can_delete: boolean; created_at: string };
const toComment = (r: Row): Comment => ({ id: r.id, body: r.body, author: r.author, authorKind: r.author_kind, mine: r.mine, canDelete: r.can_delete, at: r.created_at });

const PAGE = 30;

/** All reacties of one moment, oldest first; older ones 30 at a time. */
export function useMomentComments(momentId: string | undefined) {
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [more, setMore] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const page = useCallback(
    async (before?: Comment) => {
      const { data, error } = await supabase.rpc('moment_comments', {
        commented_moment: momentId,
        before_at: before?.at ?? null,
        before_id: before?.id ?? null,
        n: PAGE + 1,
      });
      if (error) throw error;
      const rows = (data ?? []) as Row[];
      return { list: rows.slice(0, PAGE).map(toComment).reverse(), more: rows.length > PAGE };
    },
    [momentId],
  );

  useEffect(() => {
    if (!momentId) return;
    let alive = true;
    page().then(
      (r) => {
        if (!alive) return;
        setFailed(false);
        setComments(r.list);
        setMore(r.more);
      },
      () => alive && setFailed(true),
    );
    return () => {
      alive = false;
    };
  }, [momentId, page, attempt]);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const older = useCallback(async () => {
    const first = comments?.[0];
    if (!first) return;
    const r = await page(first);
    setComments((now) => [...r.list, ...(now ?? [])]);
    setMore(r.more);
  }, [comments, page]);

  const add = useCallback(
    async (body: string, clientId: string) => {
      const { data, error } = await supabase.rpc('add_comment', { commented_moment: momentId, comment_body: body, comment_client: clientId });
      if (error) throw new Error(error.code === '54000' ? 'too-many' : 'failed');
      const row = ((data ?? []) as Row[])[0];
      if (row) setComments((now) => (now?.some((c) => c.id === row.id) ? now : [...(now ?? []), toComment(row)]));
    },
    [momentId],
  );

  const remove = useCallback(async (comment: Comment) => {
    const { error } = await supabase.rpc('delete_comment', { comment: comment.id });
    if (error) throw error;
    setComments((now) => (now ?? []).filter((c) => c.id !== comment.id));
  }, []);

  return { comments, more, failed, retry, older, add, remove, newId: randomUUID };
}
