import { useState } from 'react';
import { AdminProvider, useAdmin } from './context';
import { SignIn } from './SignIn';
import { ToastProvider, Loading } from './ui/kit';
import { useRoute } from './router';
import { supabase } from '../lib/supabase';
import { Overview } from './screens/Overview';
import { BooksList, BookEditor } from './screens/Books';
import { CollectionsList, CollectionEditor } from './screens/Collections';
import { CategoriesList, CategoryEditor, AuthorsList, AuthorEditor } from './screens/Taxonomy';
import { Lists } from './screens/Lists';
import { ArticlesList, ArticleEditor } from './screens/Articles';
import { MediaLibrary } from './screens/Media';
import { Shipping } from './screens/Shipping';
import { WebsiteText } from './screens/WebsiteText';
import { Languages } from './screens/Languages';
import { Users } from './screens/Users';
import { Settings } from './screens/Settings';
import { Later } from './screens/Later';
import { PublishButton } from './ui/PublishButton';

const NAV: { group: string; items: { path: string; label: string; need?: 'edit' | 'fulfil' | 'owner' }[] }[] = [
  { group: '', items: [{ path: '/', label: 'Overview' }] },
  { group: 'Orders', items: [{ path: '/orders', label: 'Orders' }, { path: '/customers', label: 'Customers' }] },
  { group: 'Catalog', items: [
    { path: '/books', label: 'Books & formats' }, { path: '/collections', label: 'Collections' },
    { path: '/categories', label: 'Categories' }, { path: '/authors', label: 'Authors' }, { path: '/lists', label: 'Lists' },
  ] },
  { group: 'Content', items: [{ path: '/articles', label: 'Articles' }, { path: '/media', label: 'Media' }] },
  { group: 'Store', items: [{ path: '/shipping', label: 'Shipping options' }, { path: '/discounts', label: 'Discounts' }, { path: '/newsletter', label: 'Newsletter' }] },
  { group: 'Translation', items: [{ path: '/text', label: 'Website text' }, { path: '/languages', label: 'Languages' }] },
  { group: 'Admin', items: [{ path: '/users', label: 'Users & roles' }, { path: '/settings', label: 'Settings' }] },
];

function Screen({ route }: { route: string }) {
  const [, a, b] = route.split('/');
  switch (a) {
    case '': case undefined: return <Overview />;
    case 'books': return b ? <BookEditor id={b} /> : <BooksList />;
    case 'collections': return b ? <CollectionEditor id={b} /> : <CollectionsList />;
    case 'categories': return b ? <CategoryEditor id={b} /> : <CategoriesList />;
    case 'authors': return b ? <AuthorEditor id={b} /> : <AuthorsList />;
    case 'lists': return <Lists />;
    case 'articles': return b ? <ArticleEditor id={b} /> : <ArticlesList />;
    case 'media': return <MediaLibrary />;
    case 'shipping': return <Shipping />;
    case 'text': return <WebsiteText />;
    case 'languages': return <Languages />;
    case 'users': return <Users />;
    case 'settings': return <Settings />;
    case 'orders': return <Later title="Orders" phase="Phase 5" text="The orders list, order detail with the Bookvault panel and the phone-friendly “To send” list are built in Phase 5. The tables are already in place." />;
    case 'customers': return <Later title="Customers" phase="Phase 5" text="Customer list, data export and deletion are built in Phase 5." />;
    case 'discounts': return <Later title="Discounts" phase="Phase 4" text="The discount editor and engine (codes, automatic discounts, 100% codes) are built in Phase 4. The tables are already in place." />;
    case 'newsletter': return <Later title="Newsletter" phase="Phase 5" text="Newsletter subscribers and sending through Resend are built in Phase 5." />;
    default: return <Later title="Not found" text="This page doesn't exist." />;
  }
}

function Shell() {
  const route = useRoute();
  const { staff, can } = useAdmin();
  const [menu, setMenu] = useState(false);

  const active = (p: string) => (p === '/' ? route === '/' : route === p || route.startsWith(p + '/'));
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[230px_1fr]">
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:p-2 focus:bg-white">Skip to main content</a>
      <aside className={`bg-sidebar text-[#E8E8E8] lg:block ${menu ? 'block' : 'hidden'} lg:min-h-screen`}>
        <div className="flex items-center gap-2 p-4">
          <img src="/logo-square.png" alt="" className="h-9 bg-white rounded p-0.5" />
          <div className="leading-tight"><div className="font-bold">Obelisk Books</div><div className="text-xs opacity-70">Dashboard</div></div>
        </div>
        <nav aria-label="Dashboard" className="px-2 pb-6">
          {NAV.map((g) => (
            <div key={g.group} className="mb-3">
              {g.group && <div className="px-2 text-[11px] uppercase tracking-wider opacity-60 mb-1">{g.group}</div>}
              {g.items.map((i) => (
                <a key={i.path} href={`#${i.path}`} onClick={() => setMenu(false)}
                  className={`block rounded px-2 py-1.5 text-sm ${active(i.path) ? 'bg-teal text-white' : 'hover:bg-white/10'}`}
                  aria-current={active(i.path) ? 'page' : undefined}>{i.label}</a>
              ))}
            </div>
          ))}
        </nav>
      </aside>
      <div className="min-w-0">
        <header className="flex items-center gap-3 border-b border-line bg-white px-4 h-14 sticky top-0 z-30">
          <button className="btn lg:hidden" onClick={() => setMenu(!menu)} aria-expanded={menu}>Menu</button>
          <div className="flex-1" />
          {can.edit && <PublishButton />}
          <span className="text-sm text-muted hidden sm:inline">{staff!.display_name} · {staff!.role}</span>
          <button className="btn" onClick={() => supabase.auth.signOut()}>Sign out</button>
        </header>
        <main id="main" className="p-4 lg:p-6 max-w-[1400px]"><Screen route={route} /></main>
      </div>
    </div>
  );
}

export default function AdminApp() {
  return (
    <ToastProvider>
      <AdminProvider fallback={({ ready, notStaff }) => (ready ? <SignIn notStaff={notStaff} /> : <Loading />)}>
        <Shell />
      </AdminProvider>
    </ToastProvider>
  );
}
