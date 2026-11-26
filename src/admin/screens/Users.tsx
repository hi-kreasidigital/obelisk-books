import { useEffect, useState } from 'react';
import { supabase, type Tables } from '../../lib/supabase';
import { useAdmin } from '../context';
import { PageHeader, Section, Field, Loading, useToast } from '../ui/kit';

const ROLE_HELP: Record<string, string> = {
  owner: 'Everything, including users, languages and store settings',
  editor: 'Catalog, articles, media, translations, shipping, discounts, and orders & customers',
  fulfilment: 'Orders, Bookvault workflow and customers; catalog read-only',
};

export function Users() {
  const { can, staff: me } = useAdmin();
  const toast = useToast();
  const [staff, setStaff] = useState<Tables<'staff'>[] | null>(null);
  const [invites, setInvites] = useState<Tables<'staff_invites'>[]>([]);
  const [form, setForm] = useState({ email: '', display_name: '', role: 'editor' });
  const load = () => {
    supabase.from('staff').select('*').order('created_at').then(({ data }) => setStaff(data ?? []));
    supabase.from('staff_invites').select('*').order('created_at').then(({ data }) => setInvites(data ?? []));
  };
  useEffect(load, []);
  if (!staff) return <Loading />;

  const invite = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('staff_invites').insert({ email: form.email.trim().toLowerCase(), display_name: form.display_name, role: form.role as any, invited_by: me!.user_id });
    toast(error ? error.message : 'Added. The role applies when this email signs in.', error ? 'error' : 'ok');
    if (!error) { setForm({ email: '', display_name: '', role: 'editor' }); load(); }
  };
  const update = async (s: Tables<'staff'>, patch: Partial<Tables<'staff'>>) => {
    if (s.user_id === me!.user_id && (patch.role && patch.role !== 'owner' || patch.active === false)) return toast("You can't remove your own Owner access", 'error');
    const { error } = await supabase.from('staff').update(patch).eq('user_id', s.user_id);
    if (error) toast(error.message, 'error'); else load();
  };
  const removeInvite = async (email: string) => { await supabase.from('staff_invites').delete().eq('email', email); load(); };

  return (
    <>
      <PageHeader title="Users & roles" />
      <Section title="Dashboard users">
        <div className="overflow-auto"><table className="table">
          <thead><tr><th>Name</th><th>Role</th><th>Active</th></tr></thead>
          <tbody>{staff.map((s) => (
            <tr key={s.user_id}>
              <td className="font-semibold">{s.display_name}{s.user_id === me!.user_id && <span className="text-muted font-normal"> (you)</span>}</td>
              <td><select className="input max-w-40" value={s.role} disabled={!can.owner} onChange={(e) => update(s, { role: e.target.value as any })}>
                <option value="owner">Owner</option><option value="editor">Editor</option><option value="fulfilment">Fulfilment</option></select>
                <p className="text-xs text-muted mt-1">{ROLE_HELP[s.role]}</p></td>
              <td><input type="checkbox" aria-label={`${s.display_name} active`} checked={s.active} disabled={!can.owner} onChange={(e) => update(s, { active: e.target.checked })} /></td>
            </tr>))}</tbody></table></div>
      </Section>
      {can.owner && (
        <Section title="Add a user">
          <form onSubmit={invite} className="grid gap-3 sm:grid-cols-4 items-end">
            <Field label="Email address"><input className="input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
            <Field label="Name"><input className="input" required value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} /></Field>
            <Field label="Role"><select className="input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option value="editor">Editor</option><option value="fulfilment">Fulfilment</option><option value="owner">Owner</option></select></Field>
            <button className="btn-primary">Add user</button>
          </form>
          <p className="text-xs text-muted mt-2">The person then signs in at /admin with this email. Until the domain email is connected (Phase 8), create their login in Supabase → Authentication → Users → Add user.</p>
          {invites.length > 0 && <ul className="mt-3 text-sm space-y-1">{invites.map((i) => (
            <li key={i.email}>{i.email} · {i.role} · {i.accepted_at ? <span className="text-teal-text">signed in</span> : <>waiting for first sign-in <button className="link text-xs" onClick={() => removeInvite(i.email)}>cancel</button></>}</li>))}</ul>}
        </Section>
      )}
    </>
  );
}
