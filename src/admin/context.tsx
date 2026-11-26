import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase, type Tables } from '../lib/supabase';

type Ctx = {
  session: Session | null;
  staff: Tables<'staff'> | null;
  languages: Tables<'languages'>[];          // all languages (staff can read all)
  enabledLangs: Tables<'languages'>[];
  reloadLanguages: () => Promise<void>;
  can: { edit: boolean; fulfil: boolean; owner: boolean };
};
const AdminCtx = createContext<Ctx | null>(null);
export const useAdmin = () => useContext(AdminCtx)!;

export function AdminProvider({ children, fallback }: { children: ReactNode; fallback: (s: { session: Session | null; ready: boolean; notStaff: boolean }) => ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [staff, setStaff] = useState<Tables<'staff'> | null>(null);
  const [languages, setLanguages] = useState<Tables<'languages'>[]>([]);

  const reloadLanguages = async () => {
    const { data } = await supabase.from('languages').select('*').order('sort');
    setLanguages(data ?? []);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); if (!data.session) setReady(true); });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) { setStaff(null); return; }
    (async () => {
      const { data } = await supabase.from('staff').select('*').eq('user_id', session.user.id).maybeSingle();
      setStaff(data && data.active ? data : null);
      await reloadLanguages();
      setReady(true);
    })();
  }, [session?.user.id]);

  if (!ready || !session || !staff) return <>{fallback({ session, ready, notStaff: ready && !!session && !staff })}</>;

  const can = {
    owner: staff.role === 'owner',
    edit: staff.role === 'owner' || staff.role === 'editor',
    fulfil: staff.role !== undefined && ['owner', 'editor', 'fulfilment'].includes(staff.role),   // Editors also manage orders (26 Nov 2026)
  };
  return (
    <AdminCtx.Provider value={{ session, staff, languages, enabledLangs: languages.filter((l) => l.enabled), reloadLanguages, can }}>
      {children}
    </AdminCtx.Provider>
  );
}
