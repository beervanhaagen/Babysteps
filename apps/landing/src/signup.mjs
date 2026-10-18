// Pre-registration (supabase/functions/waitlist). The form only appears once vercel.json sends
// /api/aanmelden to the waitlist function, so the live page never shows a form that can't post;
// until then "Hou me op de hoogte" stays an e-mail. Locally: SIGNUP=local npm run landing.
import { readFileSync } from 'node:fs';
import { CONTACT } from './layout.mjs';
import { ui } from './ui.mjs';

const vercel = readFileSync(new URL('../vercel.json', import.meta.url), 'utf8');
export const SIGNUP_ON = process.env.SIGNUP === 'local' || vercel.includes('/functions/v1/waitlist/aanmelden');

/** A design-system Button as a submit button of the form around it. */
export function submit(label, { variant, icon, name, value } = {}) {
  return ui('Button', { variant, icon }, label).replace('type="button"', `type="submit" name="${name}" value="${value}"`);
}

// Born or due, built with the page (Dutch month names): born first, newest at the top, since
// most parents have a baby of a few months; then up to 10 months ahead.
function monthOptions() {
  const now = new Date();
  const option = (offset) => {
    const day = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
    return `<option value="${day.toISOString().slice(0, 7)}">${day.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</option>`;
  };
  const born = Array.from({ length: 25 }, (_, i) => option(-i)).join('');
  const due = Array.from({ length: 10 }, (_, i) => option(i + 1)).join('');
  return `<option value="">Kies een maand</option><optgroup label="Al geboren">${born}</optgroup><optgroup label="Nog onderweg">${due}</optgroup>`;
}

export function signupForm() {
  return `<form class="lp-signup" method="post" action="/api/aanmelden">
<div class="ts-field">
<label for="aanmelden-email">Je e-mailadres</label>
<input id="aanmelden-email" name="email" type="email" required maxlength="254" autocomplete="email" inputmode="email">
</div>
<div class="lp-honeypot" aria-hidden="true"><label for="aanmelden-website">Laat dit veld leeg</label><input id="aanmelden-website" name="website" type="text" tabindex="-1" autocomplete="off"></div>
<div class="lp-actions">
${submit('Hou me op de hoogte', { icon: 'mail', name: 'soort', value: 'nieuws' })}
</div>
<fieldset class="lp-test">
<legend class="lp-h lp-h4">Of word testgezin</legend>
<div class="ts-field">
<label for="aanmelden-maand">Wanneer is je kleintje geboren of uitgerekend? <span class="lp-optional">(mag leeg blijven)</span></label>
<div class="lp-select"><select id="aanmelden-maand" name="maand" aria-describedby="aanmelden-maand-hint">${monthOptions()}</select>${ui('Icon', { name: 'chevron-right', size: 20 })}</div>
<div id="aanmelden-maand-hint" class="ts-hint">Zo kiezen we testgezinnen met kleintjes van verschillende leeftijden.</div>
</div>
${submit('Ik wil meetesten', { variant: 'paper', name: 'soort', value: 'testen' })}
</fieldset>
<p class="lp-small">Je krijgt eerst een mailtje om te bevestigen. Daarna mailen we je alleen als de app er is, of om je te vragen voor een test. Geen nieuwsbrief, geen reclame. Uiterlijk na 12 maanden wissen we je adres. <a href="/privacy#site">Zo gaan we ermee om</a>.</p>
</form>`;
}

// The pages the function sends people to. noindex, not in the sitemap. One action is bluebird;
// "Naar de homepagina" is paper only next to "Opnieuw aanmelden".
const home = ui('Button', { href: '/' }, 'Naar de homepagina');
const back = ui('Button', { variant: 'paper', href: '/' }, 'Naar de homepagina');
const again = ui('Button', { href: '/#start' }, 'Opnieuw aanmelden');

export const SIGNUP_PAGES = {
  aangemeld: {
    title: 'Kijk in je mailbox · TeddySteps',
    character: 'bizzy',
    eyebrow: 'Nog één stap',
    heading: 'Kijk even in je <em>mailbox.</em>',
    text: `<p class="lp-lead">We hebben je een mailtje gestuurd. Tik op de knop in het mailtje om je aanmelding te bevestigen. Zonder bevestiging wissen we je adres na 7 dagen.</p>
<p class="lp-small">Niets gekregen? Kijk ook bij je ongewenste mail, of mail naar <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>`,
    actions: home,
  },
  bevestig: {
    title: 'Bevestig je aanmelding · TeddySteps',
    character: 'puddle',
    eyebrow: 'Nog één tik',
    heading: 'Was jij dit? <em>Tik op ja.</em>',
    // Posts to its own address (/bevestig/<code>); a mail scanner only opens the page and confirms nothing.
    text: `<p class="lp-lead">Dan zet je jezelf op de lijst en hoor je het als eerste als TeddySteps er is. Heb jij je niet aangemeld? Tik dan op wissen, dan zijn we je adres meteen kwijt.</p>
<form method="post" class="lp-actions">
${submit('Ja, zet me op de lijst', { icon: 'check', name: 'actie', value: 'ja' })}
${submit('Niet ik, wis mijn adres', { variant: 'paper', name: 'actie', value: 'wis' })}
</form>`,
    actions: '',
  },
  bevestigd: {
    title: 'Je staat op de lijst · TeddySteps',
    character: 'bo',
    mood: 'happy',
    eyebrow: 'Gelukt',
    heading: 'Je staat op de <em>lijst!</em>',
    text: `<p class="lp-lead">Zodra TeddySteps in de App Store en Google Play staat, hoor je het als eerste. Heb je je ook als testgezin aangemeld? Dan mailen we je als jullie erbij zitten.</p>
<p class="lp-small">Wil je er toch af? Open de link in ons mailtje opnieuw en kies "wis mijn adres", of mail naar <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>`,
    actions: home,
  },
  gewist: {
    title: 'Je adres is gewist · TeddySteps',
    character: 'puddle',
    eyebrow: 'Klaar',
    heading: 'Je adres is <em>gewist.</em>',
    text: '<p class="lp-lead">We hebben niets meer van je. Sorry voor het mailtje!</p>',
    actions: home,
  },
  'aanmelden-mislukt': {
    title: 'Aanmelden lukte niet · TeddySteps',
    character: 'tiggy',
    eyebrow: 'Foutje',
    heading: 'Dat ging <em>mis.</em>',
    text: `<p class="lp-lead">Controleer je e-mailadres en probeer het nog eens. Na een paar pogingen moet je even een kwartiertje wachten.</p>
<p class="lp-small">Lukt het niet? Mail ons op <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>`,
    actions: `${again}\n${back}`,
  },
  'link-verlopen': {
    title: 'Deze link werkt niet meer · TeddySteps',
    character: 'tiggy',
    eyebrow: 'Oeps',
    heading: 'Deze link werkt niet <em>meer.</em>',
    text: `<p class="lp-lead">Hij is al gebruikt, of ouder dan 7 dagen. Meld je gerust opnieuw aan.</p>
<p class="lp-small">Al bevestigd en wil je eraf? Tik in ons mailtje opnieuw op de link en kies "wis mijn adres", of mail naar <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>`,
    actions: `${again}\n${back}`,
  },
};
