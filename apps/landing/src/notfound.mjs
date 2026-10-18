// The page for an address that doesn't exist. Vercel serves dist/404.html with status 404.
import { page } from './layout.mjs';
import { ui } from './ui.mjs';

const body = `
<section class="lp-wrap lp-notfound" aria-labelledby="niet-gevonden-titel">
<div class="lp-notfound-art" aria-hidden="true" inert>${ui('Character', { name: 'puddle', size: 160, decorative: true })}</div>
<p class="lp-eyebrow">Foutje · 404</p>
<h1 id="niet-gevonden-titel" class="lp-h lp-h1">Deze pagina is <em>zoekgeraakt.</em></h1>
<p class="lp-lead">Puddle heeft overal gekeken, maar hier staat niets. Misschien is de link oud, of zit er een typfout in.</p>
<div class="lp-actions">
${ui('Button', { href: '/', icon: 'heart' }, 'Naar de homepagina')}
${ui('Button', { variant: 'paper', href: '/privacy' }, 'Onze privacybelofte')}
</div>
</section>`;

export function notFound() {
  return page({
    title: 'Pagina niet gevonden · TeddySteps',
    description: 'Deze pagina bestaat niet (meer).',
    path: '/404',
    nav: '',
    robots: 'noindex',
    body,
  });
}
