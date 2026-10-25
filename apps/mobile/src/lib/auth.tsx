import type { CalendarDate } from '@teddysteps/core';
import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { forgetExports } from './export';
import { unregisterDevice } from './push';
import { supabase } from './supabase';

export interface Trail {
  id: string;
  childName: string;
  /** "Wat komt eraan" on T1; the switch comes in M6 (step 8). */
  leapCardsOn: boolean;
  /** Null while the baby is still on the way. */
  birthDate: CalendarDate | null;
  dueDate: CalendarDate;
}

/** M7: what is being deleted, and until when "Toch bewaren" works. */
export interface Deletion {
  /** This parent's own account, if they asked. */
  accountUntil: string | null;
  /** The trail, if it is going (asked by this parent or the other one). */
  trailUntil: string | null;
  byMe: boolean;
  byName: string | null;
}

type AuthState =
  | { status: 'loading' }
  | { status: 'leaving'; session: Session; trail: Trail | null; deletion: Deletion }
  | { status: 'signed-out' }
  | { status: 'onboarding'; session: Session }
  | { status: 'offline'; session: Session }
  | { status: 'ready'; session: Session; trail: Trail };

const AuthContext = createContext<{ state: AuthState; refresh: () => Promise<void> }>({
  state: { status: 'loading' },
  refresh: async () => {},
});

// Only a failed request counts as offline; a refused session means signing in again.
function isNetworkError(error: { message?: string; code?: string }) {
  return !error.code && /network|fetch|timeout/i.test(error.message ?? '');
}

async function findTrail(): Promise<Trail | null> {
  // RLS only returns the trail this parent belongs to.
  const { data, error } = await supabase.from('children').select('trail_id, first_name, birth_date, due_date, leap_cards_on').limit(1).maybeSingle();
  if (error) throw error;
  return data ? { id: data.trail_id, childName: data.first_name, birthDate: data.birth_date, dueDate: data.due_date, leapCardsOn: data.leap_cards_on } : null;
}

/** Every sign-out goes through here: first this device stops getting pushes for this account. */
export async function signOut() {
  forgetExports();
  await unregisterDevice().catch(() => undefined);
  await supabase.auth.signOut();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  const load = useCallback(async (session: Session | null) => {
    if (!session) return setState({ status: 'signed-out' });
    try {
      const [trail, { data: pending }] = await Promise.all([findTrail(), supabase.rpc('my_deletion')]);
      const row = ((pending ?? []) as { account_until: string | null; trail_until: string | null; by_me: boolean | null; by_name: string | null }[])[0];
      if (row) {
        const deletion = { accountUntil: row.account_until, trailUntil: row.trail_until, byMe: !!row.by_me, byName: row.by_name };
        return setState({ status: 'leaving', session, trail, deletion });
      }
      setState(trail ? { status: 'ready', session, trail } : { status: 'onboarding', session });
    } catch (error) {
      // No connection at start-up: stay signed in and offer to try again,
      // rather than guessing whether this parent already has a trail.
      if (isNetworkError(error as { message?: string; code?: string })) return setState({ status: 'offline', session });
      await signOut();
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') load(session);
    });
    return () => data.subscription.unsubscribe();
  }, [load]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await load(data.session);
  }, [load]);

  return <AuthContext.Provider value={{ state, refresh }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
