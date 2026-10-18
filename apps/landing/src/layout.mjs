import { ui } from './ui.mjs';

export const CONTACT = 'hallo@teddysteps.nl';
// Until the app is in the stores, "Hou me op de hoogte" is an e-mail to us: no form, no list
// on this site, nothing stored here. A subject and an empty question, never personal data in the link.
export const KEEP_POSTED = `mailto:${CONTACT}?subject=${encodeURIComponent('Hou me op de hoogte')}`;
export const TEST_ALONG = `mailto:${CONTACT}?subject=${encodeURIComponent('Ik wil meetesten')}&body=${encodeURIComponent('Mijn kleintje is geboren in / wordt verwacht in: ')}`;

export function page({ title, description, ogTitle = title, ogDescription = description, path, nav, navOnPhone = true, body }) {
  return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="https://teddysteps.nl${path}">
<meta name="theme-color" content="#F2ECE1">
<meta property="og:type" content="website">
<meta property="og:site_name" content="TeddySteps">
<meta property="og:locale" content="nl_NL">
<meta property="og:title" content="${ogTitle}">
<meta property="og:description" content="${ogDescription}">
<meta property="og:url" content="https://teddysteps.nl${path}">
<meta property="og:image" content="https://teddysteps.nl/og.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="TeddySteps: Bo de beer knuffelt Puddle de eend, met de tekst Het eerste jaar gaat zo snel">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<link rel="preload" href="/fonts/Fraunces.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/fonts/Nunito.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/styles.css">
</head>
<body>
<a class="lp-skip" href="#inhoud">Naar de inhoud</a>
<header class="lp-wrap lp-nav">
<a class="lp-logo" href="/" aria-label="TeddySteps, naar de homepagina">${ui('Wordmark', { size: 34 })}</a>
<nav aria-label="Hoofdmenu"${navOnPhone ? '' : ' class="lp-hide-s"'}>${nav}</nav>
</header>
<main id="inhoud">
${body}
</main>
<footer class="lp-dark lp-footer">
<div class="lp-wrap">
<span class="lp-footer-logo" aria-hidden="true">teddysteps</span>
<ul class="lp-footer-links">
<li><a href="/privacy">Privacybelofte</a></li>
<li><a href="mailto:${CONTACT}">Contact</a></li>
</ul>
<p>Gemaakt in Nederland. Sprongetjes zijn een ruwe schatting, geen medisch advies.</p>
<p>© 2026 Haagen Trade · KvK 97569089 · ${CONTACT}</p>
</div>
</footer>
</body>
</html>
`;
}

/** A tick with a bold first line, as on the board ("Alleen op uitnodiging" + uitleg). */
export function check(title, text) {
  return `<li class="lp-check"><span class="lp-tick">${ui('Icon', { name: 'check', size: 18 })}</span><span><b>${title}</b>${text}</span></li>`;
}
