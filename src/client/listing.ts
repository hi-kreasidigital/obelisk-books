// Shop / category listing: filters, sort and "Load more" over the cards already in the HTML.
for (const root of document.querySelectorAll<HTMLElement>('[data-listing]')) {
  const grid = root.querySelector<HTMLElement>('[data-grid]');
  if (!grid) continue;
  const cards = [...grid.querySelectorAll<HTMLElement>('[data-card]')];
  const original = [...cards];
  const form = root.querySelector<HTMLFormElement>('form.filters');
  const sort = root.querySelector<HTMLSelectElement>('[data-sort]')!;
  const pageSize = Number(root.dataset.pageSize) || 24;
  let limit = pageSize;
  const params = new URLSearchParams(location.search);
  if (params.get('sort')) sort.value = params.get('sort')!;
  for (const [k, v] of params) form?.querySelectorAll<HTMLInputElement>(`input[name="${k}"]`).forEach((i) => { if (v.split(',').includes(i.value)) i.checked = true; });

  const selected = (name: string) => [...(form?.querySelectorAll<HTMLInputElement>(`input[name="${name}"]:checked`) ?? [])].map((i) => i.value);
  const apply = () => {
    const f = { format: selected('format'), cats: selected('cats'), collection: selected('collection'), authors: selected('authors'), avail: selected('avail') };
    const match = (c: HTMLElement) => {
      const d = c.dataset;
      if (f.format.length && !f.format.includes(d.format!)) return false;
      if (f.cats.length && !f.cats.some((x) => d.cats!.split(' ').includes(x))) return false;
      if (f.collection.length && !f.collection.includes(d.collection!)) return false;
      if (f.authors.length && !f.authors.some((x) => d.authors!.split(' ').includes(x))) return false;
      if (f.avail.length && !f.avail.some((a) => (a === 'sale' ? d.sale === '1' : d.avail === a))) return false;
      return true;
    };
    const by: Record<string, (a: HTMLElement, b: HTMLElement) => number> = {
      newest: (a, b) => (b.dataset.date ?? '').localeCompare(a.dataset.date ?? ''),
      price_asc: (a, b) => Number(a.dataset.price) - Number(b.dataset.price),
      price_desc: (a, b) => Number(b.dataset.price) - Number(a.dataset.price),
      title: (a, b) => a.dataset.title!.localeCompare(b.dataset.title!),
    };
    const list = (by[sort.value] ? [...original].sort(by[sort.value]) : original).filter(match);
    grid.replaceChildren(...list);
    list.forEach((c, i) => (c.hidden = i >= limit));
    root.querySelector<HTMLElement>('[data-count]')!.textContent = root.dataset.tCount!.replace('{count}', String(list.length));
    root.querySelector<HTMLElement>('[data-empty]')!.hidden = list.length > 0;
    const more = root.querySelector<HTMLElement>('[data-more-wrap]')!;
    more.hidden = list.length <= limit;
    root.querySelector<HTMLElement>('[data-showing]')!.textContent = root.dataset.tShowing!.replace('{shown}', String(Math.min(limit, list.length))).replace('{total}', String(list.length));
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(f)) if (v.length) q.set(k, v.join(','));
    if (sort.value !== 'recommended') q.set('sort', sort.value);
    history.replaceState(null, '', q.size ? `?${q}` : location.pathname);
  };
  form?.addEventListener('change', () => { limit = pageSize; apply(); });
  form?.addEventListener('reset', () => setTimeout(() => { limit = pageSize; apply(); }));
  root.querySelector('[data-clear]')?.addEventListener('click', () => form?.reset());
  sort.addEventListener('change', apply);
  root.querySelector('[data-more]')?.addEventListener('click', () => { limit += pageSize; apply(); });
  const toggle = root.querySelector<HTMLButtonElement>('.filters-toggle');
  toggle?.addEventListener('click', () => { const open = form!.dataset.open !== 'true'; form!.dataset.open = String(open); toggle.setAttribute('aria-expanded', String(open)); });
  apply();
}
