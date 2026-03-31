import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';
import type { SessionUser } from '../types/domain';

export function useSupabaseSession() {
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    console.log('🔑 [Auth] Iniciando useSupabaseSession...');
    
    if (!supabase) {
      console.warn('⚠️ [Auth] Supabase não configurado');
      setAuthLoading(false);
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        console.log('🔑 [Auth] Sessão obtida:', session ? 'COM sessão' : 'SEM sessão');
        if (session) {
          console.log('🔑 [Auth] User ID:', session.user.id);
          console.log('🔑 [Auth] Email:', session.user.email);
        }
        setSessionUser(session?.user ?? null);
      })
      .catch((err) => {
        console.error('❌ [Auth] Erro ao obter sessão:', err);
        setSessionUser(null);
      })
      .finally(() => {
        console.log('🔑 [Auth] Loading = false');
        setAuthLoading(false);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔄 [Auth] Mudança de estado:', _event, session ? 'COM sessão' : 'SEM sessão');
      setSessionUser(session?.user ?? null);
    });

    return () => {
      console.log('🔑 [Auth] Limpando subscription');
      subscription.unsubscribe();
    };
  }, []);

  return { sessionUser, setSessionUser, authLoading };
}
