import { useEffect, useState } from 'react';

// A router of a few lines for a page with a few views (bouwplan, step 0 review): the path,
// pushState and popstate, so Oma's back button works. Each view sets the page title and
// moves focus to its heading.

export function usePath(): string {
  const [path, setPath] = useState(() => window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener('popstate', onPop);
    window.addEventListener('teddysteps:navigate', onPop);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('teddysteps:navigate', onPop);
    };
  }, []);
  return path;
}

export function navigate(path: string, replace = false) {
  if (replace) window.history.replaceState(null, '', path);
  else window.history.pushState(null, '', path);
  window.dispatchEvent(new Event('teddysteps:navigate'));
  window.scrollTo(0, 0);
}

/** Title for the tab and screen readers, and focus on the view's heading. */
export function useView(title: string) {
  useEffect(() => {
    document.title = `${title} · TeddySteps`;
    const heading = document.querySelector<HTMLElement>('[role="heading"][aria-level="1"]');
    if (heading) {
      heading.setAttribute('tabindex', '-1');
      heading.focus({ preventScroll: true });
    }
  }, [title]);
}
