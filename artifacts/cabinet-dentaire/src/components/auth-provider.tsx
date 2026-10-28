import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext<{ session: Session | null; loading: boolean }>({ session: null, loading: true });
export const useCabinetSession = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [state, setState] = useState<{ session: Session | null; loading: boolean }>({ session: null, loading: true });
  useEffect(() => {
    let active = true;
    let currentId: string | null | undefined;
    function apply(session: Session | null) {
      if (!active) return;
      const id = session?.user.id ?? null;
      if (currentId !== undefined && currentId !== id) client.clear();
      currentId = id;
      setState({ session, loading: false });
    }
    const { data } = supabase.auth.onAuthStateChange((_event, session) => apply(session));
    void supabase.auth.getSession().then(({ data }) => apply(data.session));
    return () => { active = false; data.subscription.unsubscribe(); client.clear(); };
  }, [client]);
  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}
