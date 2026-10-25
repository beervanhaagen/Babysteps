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

/** M3: the devices a family member's link is open on (a rough name and dates, never a token). */
export interface FamilyDevice {
  id: string;
  hint: string;
  lastUsedOn: string;
}

export async function memberDevices(memberId: string): Promise<FamilyDevice[]> {
  const { data, error } = await supabase.rpc('member_devices', { member: memberId });
  if (error) throw error;
  return ((data ?? []) as { id: string; device_hint: string | null; last_used_on: string }[]).map((d) => ({
    id: d.id,
    hint: d.device_hint ?? 'Een browser',
    lastUsedOn: d.last_used_on,
  }));
}

/** Logs out one device; the link keeps working elsewhere. */
export async function revokeDevice(deviceId: string) {
  const { error } = await supabase.rpc('revoke_device', { device: deviceId });
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

// M3, the other parent (supabase/migrations/20261025120000_parent_invites.sql, function
// `parent-invite` for the mails). Both parents have the same rights.
export interface Parent {
  userId: string;
  firstName: string | null;
  isMe: boolean;
}

export interface PartnerInvite {
  id: string;
  email: string;
  sentAt: string;
}

/** A parent who joined on this parent's invite in the last 7 days: can still be taken off. */
export interface RecentJoin {
  invite: string;
  userId: string;
}

/** The parents of this trail, and an open invite for the second one. */
export function useParents() {
  const [parents, setParents] = useState<Parent[] | null>(null);
  const [invite, setInvite] = useState<PartnerInvite | null>(null);
  const [recent, setRecent] = useState<RecentJoin | null>(null);
  const refresh = useCallback(async () => {
    const { data: me } = await supabase.auth.getUser();
    const [list, open, joined] = await Promise.all([
      supabase.rpc('trail_parents_list'),
      supabase
        .from('parent_invites')
        .select('id, email, sent_at')
        .is('accepted_at', null)
        .is('cancelled_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('sent_at', { ascending: false })
        .limit(1),
      supabase
        .from('parent_invites')
        .select('id, accepted_by')
        .eq('invited_by', me.user?.id ?? '')
        .is('removed_at', null)
        .not('accepted_by', 'is', null)
        .gt('accepted_at', new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
        .limit(1),
    ]);
    const join = (joined.data ?? [])[0] as { id: string; accepted_by: string } | undefined;
    setRecent(join ? { invite: join.id, userId: join.accepted_by } : null);
    setParents(((list.data ?? []) as { user_id: string; first_name: string | null; is_me: boolean }[]).map((p) => ({ userId: p.user_id, firstName: p.first_name, isMe: p.is_me })));
    const row = (open.data ?? [])[0] as { id: string; email: string; sent_at: string } | undefined;
    setInvite(row ? { id: row.id, email: row.email, sentAt: row.sent_at } : null);
  }, []);
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );
  return { parents, invite, recent, refresh };
}

/** Errors from the parent-invite function, by what the parent can do about them. */
export class InviteRefused extends Error {
  constructor(public reason: 'address' | 'full' | 'limit' | 'gone' | 'other') {
    super(reason);
  }
}

// The database's own error code, from the function's answer (sturdier than the HTTP status:
// a function that isn't there also answers 404).
const REASON: Record<string, InviteRefused['reason']> = { '22023': 'address', '23514': 'full', '54000': 'limit', P0002: 'gone' };

async function parentInvite(body: Record<string, string>) {
  const { data, error } = await supabase.functions.invoke('parent-invite', { body });
  if (error) {
    const answer = await (error as { context?: Response }).context?.json?.().catch(() => null);
    throw new InviteRefused(REASON[answer?.error] ?? 'other');
  }
  return data as { ok: true; sent?: boolean; trail?: string };
}

export const invitePartner = (email: string) => parentInvite({ action: 'invite', email });
export const acceptPartnerInvite = (invite: string) => parentInvite({ action: 'accept', invite });

/** Within 7 days of joining: the inviter takes a wrongly joined parent off again. */
export async function removeJoinedParent(invite: string) {
  const { error } = await supabase.rpc('remove_joined_parent', { invite });
  if (error) throw error;
}

export async function cancelPartnerInvite(invite: string) {
  const { error } = await supabase.rpc('cancel_parent_invite', { invite });
  if (error) throw error;
}

/** For someone signed in without a trail: an invite to join one, if there is one. */
export async function myPartnerInvite(): Promise<{ id: string; child: string; inviter: string | null } | null> {
  const { data } = await supabase.rpc('my_parent_invite');
  const row = ((data ?? []) as { id: string; child: string; inviter: string | null }[])[0];
  return row ?? null;
}
