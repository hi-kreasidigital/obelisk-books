import { useEffect, useState } from 'react';
import { supabase, cents, toCents, type Tables } from '../../lib/supabase';
import { useAdmin } from '../context';
import { PageHeader, Section, Field, Loading, Modal, useToast, confirmDelete } from '../ui/kit';

type Opt = Tables<'shipping_options'>;
const blank = (region_id: string): Partial<Opt> => ({ region_id, carrier: '', service_name: '', tracked: true, price_eur_cents: 0, price_usd_cents: 0, extra_item_eur_cents: 0, extra_item_usd_cents: 0, delivery_min_days: 3, delivery_max_days: 5, active: true, sort: 0 });

export function Shipping() {
  const { can } = useAdmin();
  const toast = useToast();
  const [regions, setRegions] = useState<Tables<'shipping_regions'>[] | null>(null);
  const [opts, setOpts] = useState<Opt[]>([]);
  const [edit, setEdit] = useState<Partial<Opt> | null>(null);
  const [money, setMoney] = useState({ eur: '', usd: '', xeur: '', xusd: '' });
  const [regionEdit, setRegionEdit] = useState<Partial<Tables<'shipping_regions'>> | null>(null);
  const load = () => {
    supabase.from('shipping_regions').select('*').order('sort').then(({ data }) => setRegions(data ?? []));
    supabase.from('shipping_options').select('*').order('tracked', { ascending: false }).order('price_eur_cents').then(({ data }) => setOpts(data ?? []));
  };
  useEffect(load, []);
  if (!regions) return <Loading />;

  const openOpt = (o: Partial<Opt>) => { setEdit(o); setMoney({ eur: cents(o.price_eur_cents), usd: cents(o.price_usd_cents), xeur: cents(o.extra_item_eur_cents), xusd: cents(o.extra_item_usd_cents) }); };
  const saveOpt = async () => {
    if (!edit) return;
    const row = { ...edit, price_eur_cents: toCents(money.eur) ?? 0, price_usd_cents: toCents(money.usd) ?? 0, extra_item_eur_cents: toCents(money.xeur) ?? 0, extra_item_usd_cents: toCents(money.xusd) ?? 0 } as any;
    delete row.created_at; delete row.updated_at; delete row.updated_by;
    if (!row.carrier || !row.service_name) return toast('Fill in carrier and service', 'error');
    const { error } = row.id ? await supabase.from('shipping_options').update(row).eq('id', row.id) : await supabase.from('shipping_options').insert(row);
    toast(error ? error.message : 'Shipping option saved', error ? 'error' : 'ok'); if (!error) { setEdit(null); load(); }
  };
  const delOpt = async (o: Opt) => { if (confirmDelete(`${o.carrier} ${o.service_name}`)) { await supabase.from('shipping_options').delete().eq('id', o.id); load(); } };
  const saveRegion = async () => {
    if (!regionEdit) return;
    const countries = (regionEdit.countries ?? []).map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z]{2}$/.test(c));
    if (!regionEdit.name || !countries.length) return toast('Give the region a name and at least one 2-letter country code', 'error');
    const row = { name: regionEdit.name, countries, sort: regionEdit.sort ?? regions.length + 1 };
    const { error } = regionEdit.id ? await supabase.from('shipping_regions').update(row).eq('id', regionEdit.id) : await supabase.from('shipping_regions').insert(row);
    toast(error ? error.message : 'Region saved', error ? 'error' : 'ok'); if (!error) { setRegionEdit(null); load(); }
  };
  const delRegion = async (r: Tables<'shipping_regions'>) => { if (confirmDelete(`region ${r.name} and its shipping options`)) { await supabase.from('shipping_regions').delete().eq('id', r.id); load(); } };

  return (
    <>
      <PageHeader title="Shipping options" sub="Copied from Bookvault's Quote Tool. Tracked options are listed first at checkout; untracked is never pre-selected."
        actions={can.edit && <button className="btn-primary" onClick={() => setRegionEdit({ name: '', countries: [] })}>New region</button>} />
      {regions.length === 0 && <div className="card p-6 text-muted">Start by adding a region (e.g. “Europe” with country codes NL, BE, DE, FR …), then its shipping services.</div>}
      {regions.map((r) => (
        <Section key={r.id} title={r.name} actions={can.edit && <div className="flex gap-1">
          <button className="btn btn-sm" onClick={() => setRegionEdit(r)}>Edit region</button>
          <button className="btn btn-sm" onClick={() => openOpt(blank(r.id))}>+ Option</button>
          <button className="btn-danger btn-sm" onClick={() => delRegion(r)}>Delete</button></div>}>
          <p className="text-xs text-muted mb-2">{r.countries.join(', ')}</p>
          <div className="overflow-auto"><table className="table">
            <thead><tr><th>Carrier · service</th><th>Tracking</th><th>EUR</th><th>USD</th><th>+ per extra book</th><th>Delivery (working days)</th><th>Bookvault code</th><th></th></tr></thead>
            <tbody>{opts.filter((o) => o.region_id === r.id).map((o) => (
              <tr key={o.id} className={o.active ? '' : 'opacity-50'}>
                <td className="font-semibold">{o.carrier} · {o.service_name}</td>
                <td>{o.tracked ? <span className="badge bg-teal-tint text-teal-text">Tracked</span> : <span className="badge bg-orange-tint">Untracked</span>}</td>
                <td>€{cents(o.price_eur_cents)}</td><td>${cents(o.price_usd_cents)}</td>
                <td>€{cents(o.extra_item_eur_cents)} / ${cents(o.extra_item_usd_cents)}</td>
                <td>{o.delivery_min_days}–{o.delivery_max_days}</td><td>{o.bookvault_service_code ?? '—'}</td>
                <td className="whitespace-nowrap">{can.edit && <><button className="btn btn-sm" onClick={() => openOpt(o)}>Edit</button> <button className="btn-danger btn-sm" onClick={() => delOpt(o)}>Delete</button></>}</td>
              </tr>))}</tbody></table></div>
        </Section>
      ))}

      <Modal open={!!edit} onClose={() => setEdit(null)} title={edit?.id ? 'Edit shipping option' : 'New shipping option'}>
        {edit && <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Carrier"><input className="input" value={edit.carrier ?? ''} onChange={(e) => setEdit({ ...edit, carrier: e.target.value })} /></Field>
          <Field label="Service"><input className="input" value={edit.service_name ?? ''} onChange={(e) => setEdit({ ...edit, service_name: e.target.value })} /></Field>
          <Field label="Price EUR"><input className="input" value={money.eur} onChange={(e) => setMoney({ ...money, eur: e.target.value })} /></Field>
          <Field label="Price USD"><input className="input" value={money.usd} onChange={(e) => setMoney({ ...money, usd: e.target.value })} /></Field>
          <Field label="Each extra book EUR"><input className="input" value={money.xeur} onChange={(e) => setMoney({ ...money, xeur: e.target.value })} /></Field>
          <Field label="Each extra book USD"><input className="input" value={money.xusd} onChange={(e) => setMoney({ ...money, xusd: e.target.value })} /></Field>
          <Field label="Delivery from (working days)"><input className="input" type="number" min={0} value={edit.delivery_min_days ?? 0} onChange={(e) => setEdit({ ...edit, delivery_min_days: Number(e.target.value) })} /></Field>
          <Field label="Delivery to (working days)"><input className="input" type="number" min={0} value={edit.delivery_max_days ?? 0} onChange={(e) => setEdit({ ...edit, delivery_max_days: Number(e.target.value) })} /></Field>
          <Field label="Bookvault service code (Phase 8)"><input className="input" value={edit.bookvault_service_code ?? ''} onChange={(e) => setEdit({ ...edit, bookvault_service_code: e.target.value || null })} /></Field>
          <Field label="Source" hint="e.g. Bookvault Quote Tool, 26 Nov 2026"><input className="input" value={edit.source_note ?? ''} onChange={(e) => setEdit({ ...edit, source_note: e.target.value || null })} /></Field>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={!!edit.tracked} onChange={(e) => setEdit({ ...edit, tracked: e.target.checked })} /> Has tracking</label>
          <label className="flex gap-2 text-sm"><input type="checkbox" checked={!!edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Offered at checkout</label>
          {!edit.tracked && <p className="sm:col-span-2 text-xs bg-orange-tint p-2 rounded">Untracked: shown below tracked options, never pre-selected, labelled “Untracked · cheaper, no tracking number · can take about 4 weeks to Europe”. Bookvault doesn't replace or refund lost untracked parcels.</p>}
          <div className="sm:col-span-2 flex justify-end"><button className="btn-primary" onClick={saveOpt}>Save option</button></div>
        </div>}
      </Modal>
      <Modal open={!!regionEdit} onClose={() => setRegionEdit(null)} title="Shipping region">
        {regionEdit && <div className="space-y-3">
          <Field label="Name"><input className="input" value={regionEdit.name ?? ''} onChange={(e) => setRegionEdit({ ...regionEdit, name: e.target.value })} /></Field>
          <Field label="Countries" hint="2-letter codes separated by commas, e.g. NL, BE, DE, FR">
            <textarea className="input" value={(regionEdit.countries ?? []).join(', ')} onChange={(e) => setRegionEdit({ ...regionEdit, countries: e.target.value.split(',') })} /></Field>
          <div className="flex justify-end"><button className="btn-primary" onClick={saveRegion}>Save region</button></div>
        </div>}
      </Modal>
    </>
  );
}
