import { useEffect, useState } from 'react';

// Hash routing keeps /admin a single static page: /admin#/books/123
export function useRoute() {
  const read = () => (location.hash.replace(/^#/, '') || '/').split('?')[0];
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => setRoute(read());
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return route;
}
export const go = (path: string) => { location.hash = path; };
export const query = () => new URLSearchParams(location.hash.split('?')[1] ?? '');
