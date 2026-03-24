import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { SessionUser } from '../types/domain';

export function useSupabaseSession() {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSessionUser(session?.user ?? null);
      })
      .catch(() => {
        setSessionUser(null);
      })
      .finally(() => {
        setAuthLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { sessionUser, setSessionUser, authLoading };
}
