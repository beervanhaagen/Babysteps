import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { supabase } from './supabase';

export type Relation = 'oma' | 'opa' | 'oom' | 'tante' | 'vriend' | 'vriendin' | 'peetoom' | 'peettante' | 'anders';

export const RELATIONS: { id: Relation; label: string }[] = [
  { id: 'oma', label: 'Oma' },
  { id: 'opa', label: 'Opa' },
  { id: 'tante', label: 'Tante' },
  { id: 'oom', label: 'Oom' },
  { id: 'vriendin', label: 'Vriendin' },
  { id: 'vriend', label: 'Vriend' },
  { id: 'peettante', label: 'Peettante' },
  { id: 'peetoom', label: 'Peetoom' },
  { id: 'anders', label: 'Iemand anders' },
];

export interface CircleMember {
  id: string;
  label: string;
  relation: Relation | null;
  frequency: 'each' | 'weekly' | 'never';
  invitedAt: string;
  joinedAt: string | null;
  revokedAt: string | null;
}

/** The personal link for one family member; the code sits after # (docs/family-email.md). */
export function familyLink(code: string): string {
  const base = process.env.EXPO_PUBLIC_FAMILY_URL ?? 'https://familie.teddysteps.nl';
  return `${base}/j#${code}`;
}

export function useCircle() {
  const [members, setMembers] = useState<CircleMember[] | null>(null);
  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('circle_members')
      .select('id, label, relation, email_frequency, invited_at, joined_at, revoked_at')
      .is('revoked_at', null)
      .order('invited_at');
    if (data) {
      setMembers(
        data.map((m) => ({
          id: m.id,
          label: m.label,
          relation: m.relation,
          frequency: m.email_frequency,
          invitedAt: m.invited_at,
          joinedAt: m.joined_at,
          revokedAt: m.revoked_at,
        })),
      );
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  return { members, refresh };
}

/** Adds someone to the circle; the code comes back once and is never stored in the app. */
export async function inviteFamily(label: string, relation: Relation | null) {
  const { data, error } = await supabase.rpc('invite_family', { member_label: label, member_relation: relation ?? '' });
  if (error) throw error;
  const row = (data as { member_id: string; code: string }[])[0];
  return { memberId: row.member_id, code: row.code };
}

/** A fresh link for someone; the old link and every device it was opened on stop working. */
export async function newFamilyLink(memberId: string): Promise<string> {
  const { data, error } = await supabase.rpc('new_family_link', { member: memberId });
  if (error) throw error;
  return data as string;
}

export async function revokeFamily(memberId: string) {
  const { error } = await supabase.rpc('revoke_family', { member: memberId });
  if (error) throw error;
}

export interface ActivityItem {
  key: string;
  kind: 'hug' | 'joined';
  at: string;
  who: string;
  /** For hugs: the moment, for "Bij week 30: geklapt". */
  week?: number;
  caption?: string | null;
  momentId?: string;
  frequency?: CircleMember['frequency'];
  seen: boolean;
}

/** T6: hugs and people who joined, newest first. Hugs are marked seen once shown. */
export function useActivity() {
  const [items, setItems] = useState<ActivityItem[] | null>(null);
  const refresh = useCallback(async () => {
    // Hugs that arrive after this moment stay new, even if they're in this fetch's results.
    const fetchedAt = new Date().toISOString();
    const [hugs, joined] = await Promise.all([
      supabase
        .from('reactions')
        .select('id, created_at, seen_at, circle_members(label), moments!inner(id, trail_week, caption, first_label, is_first)')
        .eq('kind', 'hug')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('circle_members').select('id, label, joined_at, email_frequency').not('joined_at', 'is', null).is('revoked_at', null),
    ]);
    type Hug = {
      id: string;
      created_at: string;
      seen_at: string | null;
      circle_members: { label: string } | null;
      moments: { id: string; trail_week: number; caption: string | null; first_label: string | null; is_first: boolean } | null;
    };
    const list: ActivityItem[] = [
      ...((hugs.data ?? []) as unknown as Hug[]).map((h) => ({
        key: h.id,
        kind: 'hug' as const,
        at: h.created_at,
        who: h.circle_members?.label ?? 'Iemand',
        week: h.moments?.trail_week,
        caption: h.moments ? (h.moments.is_first ? h.moments.first_label : h.moments.caption) : null,
        momentId: h.moments?.id,
        seen: !!h.seen_at,
      })),
      ...(joined.data ?? []).map((m) => ({
        key: `joined-${m.id}`,
        kind: 'joined' as const,
        at: m.joined_at as string,
        who: m.label,
        frequency: m.email_frequency,
        seen: true,
      })),
    ].sort((a, b) => b.at.localeCompare(a.at));
    setItems(list);
    // Everything up to the fetch counts as seen, also beyond the 100 shown.
    await supabase.from('reactions').update({ seen_at: new Date().toISOString() }).is('seen_at', null).lte('created_at', fetchedAt);
  }, []);
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  return { items, refresh };
}

/** How many hugs the parent hasn't seen yet, for the dot on the bell (T1). */
export function useUnseenHugs() {
  const [count, setCount] = useState(0);
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      supabase
        .from('reactions')
        .select('id, moments!inner(id)', { count: 'exact', head: true })
        .is('seen_at', null)
        .then(({ count: n }) => alive && setCount(n ?? 0));
      return () => {
        alive = false;
      };
    }, []),
  );
  return count;
}
