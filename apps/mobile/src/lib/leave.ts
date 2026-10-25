import { forgetExports } from './export';
import { supabase } from './supabase';

// M7 "Pad en account verwijderen" (supabase/migrations/20261025140000_deletion.sql, function
// `leave` for the mails). 'account' = only me (the trail stays with the other parent), 'trail' =
// the trail and me. A parent on their own always takes the trail along.
// "Nu meteen" wipes the account within the hour; a trail shared with a parent who stays keeps its
// 30 days. trailUntil is null when the trail stays.
export async function requestDeletion(scope: 'account' | 'trail', rightAway: boolean): Promise<{ accountUntil: string; trailUntil: string | null }> {
  const { data, error } = await supabase.functions.invoke('leave', { body: { action: 'request', scope, rightAway } });
  if (error) throw error;
  return data as { accountUntil: string; trailUntil: string | null };
}

/** "Toch bewaren": my account and the trail, as long as the purge hasn't started. */
export async function restoreDeletion() {
  const { error } = await supabase.rpc('restore_deletion');
  if (error) throw error;
}

/** Signs out on every device, after asking to leave. */
export async function signOutEverywhere() {
  forgetExports();
  await supabase.auth.signOut({ scope: 'global' }).catch(() => supabase.auth.signOut());
}
