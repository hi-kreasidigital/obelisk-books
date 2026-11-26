import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function SignIn({ notStaff }: { notStaff: boolean }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'password' | 'link'>('password');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (notStaff) {
    return (
      <Shell>
        <p className="mb-4">You're signed in, but this account has no dashboard access. Ask the Owner to add your email under <b>Users &amp; roles</b>.</p>
        <button className="btn" onClick={() => supabase.auth.signOut()}>Sign out</button>
      </Shell>
    );
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setMsg(null);
    if (mode === 'password') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMsg(error.message);
    } else {
      const { error } = await supabase.auth.signInWithOtp({
        email, options: { shouldCreateUser: false, emailRedirectTo: `${location.origin}/admin/` },
      });
      setMsg(error ? error.message : 'Check your email for the sign-in link.');
    }
    setBusy(false);
  };

  return (
    <Shell>
      <form onSubmit={submit} className="space-y-3">
        <label className="block"><span className="label">Email address</span>
          <input className="input" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
        {mode === 'password' && (
          <label className="block"><span className="label">Password</span>
            <input className="input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
        )}
        {msg && <p className="text-sm text-muted" role="alert">{msg}</p>}
        <button className="btn-primary w-full" disabled={busy}>{mode === 'password' ? 'Sign in' : 'Email me a sign-in link'}</button>
        <button type="button" className="link text-sm" onClick={() => setMode(mode === 'password' ? 'link' : 'password')}>
          {mode === 'password' ? 'Use a sign-in link instead' : 'Use a password instead'}
        </button>
      </form>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen grid place-items-center p-4">
      <div className="card w-full max-w-sm p-6">
        <img src="/logo-square.png" alt="Obelisk Books logo" className="h-14 mb-4" />
        <h1 className="text-xl font-bold mb-4">Dashboard sign-in</h1>
        {children}
      </div>
    </main>
  );
}
