import { useEffect, useState } from 'react';

// The family page declares the fonts with @font-face in apps/family/public/index.html,
// served as WOFF2 from its own domain. No expo-font here: it would pull in expo-asset,
// which knows about Expo's CDN, and the family page talks to no one but us.
const FIRST_PAINT = ['Nunito-Regular', 'Nunito-ExtraBold', 'Fraunces-ExtraBold', 'BagelFatOne-Regular'];
const MAX_WAIT_MS = 1500;

/** Waits briefly for the main fonts, so the page doesn't jump; never longer than 1.5 s. */
export function useTeddyFonts(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const done = () => setReady(true);
    const timer = setTimeout(done, MAX_WAIT_MS);
    Promise.all(FIRST_PAINT.map((family) => document.fonts.load(`16px "${family}"`)))
      .catch(() => undefined)
      .then(done);
    return () => clearTimeout(timer);
  }, []);
  return ready;
}
