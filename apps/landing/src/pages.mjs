// Small pages with one message: the 404 and the steps of the pre-registration (src/signup.mjs).
// None of them belong in search engines.
import { page } from './layout.mjs';
import { ui } from './ui.mjs';

export function simplePage({ title, character, mood, eyebrow, heading, text, actions }) {
  return page({
    title,
    description: 'TeddySteps: het eerste jaar van je baby, alleen voor je kring.',
    path: '/',
    nav: '',
    robots: 'noindex',
    body: `
<section class="lp-wrap lp-notfound" aria-labelledby="pagina-titel">
<div aria-hidden="true" inert>${ui('Character', { name: character, mood, size: 160, decorative: true })}</div>
<p class="lp-eyebrow">${eyebrow}</p>
<h1 id="pagina-titel" class="lp-h lp-h1">${heading}</h1>
${text}
${actions ? `<div class="lp-actions">\n${actions}\n</div>` : ''}
</section>`,
  });
}

export function notFound() {
  return simplePage({
    title: 'Pagina niet gevonden · TeddySteps',
    character: 'puddle',
    eyebrow: 'Foutje · 404',
    heading: 'Deze pagina is <em>zoekgeraakt.</em>',
    text: '<p class="lp-lead">Puddle heeft overal gekeken, maar hier staat niets. Misschien is de link oud, of zit er een typfout in.</p>',
    actions: `${ui('Button', { href: '/', icon: 'heart' }, 'Naar de homepagina')}\n${ui('Button', { variant: 'paper', href: '/privacy' }, 'Onze privacybelofte')}`,
  });
}
