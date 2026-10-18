// teddysteps.nl, after the board design/brand/TeddySteps-landing.dc.html.
// Differences from the board, on purpose:
// - The app isn't in the stores yet: "Binnenkort" up top, and every download button is an
//   e-mail to us ("Hou me op de hoogte", "Ik wil meetesten").
// - No price yet (docs/bouwplan.md §10, besluit 8).
// - Rose is never text and no section background (design-system README); plum can't sit on
//   aubergine, so feeling words on dark sections are sunshine.
// - Only claims that hold at launch: family sends hugs and voice notes (no typed messages),
//   one family-wide "mag foto's bewaren" switch, ordering the book comes in v1.1.
// - Leap copy checked by child-development-reviewer: always "misschien", "rond", "ongeveer".
import { check, CONTACT, KEEP_POSTED, page, TEST_ALONG } from './layout.mjs';
import { ui } from './ui.mjs';

// Pictures of the app are decoration: hidden from screen readers and out of the tab order.
const art = (html, className = '') => `<div class="${className}" aria-hidden="true" inert>${html}</div>`;

const nav = `
<a class="lp-link" href="#sprongetjes">Wat komt eraan</a>
<a class="lp-link" href="#kring">Je eigen kring</a>
<a class="lp-link" href="#boek">Het jaarboek</a>
<a class="lp-link" href="#vragen">Vragen</a>
${ui('Button', { size: 'md', variant: 'paper', href: '#start' }, 'Hou me op de hoogte')}`;

const hero = `
<section class="lp-wrap lp-hero" aria-labelledby="hero-titel">
<div class="lp-hero-text">
<p class="lp-eyebrow">Binnenkort · voor nieuwe ouders</p>
<h1 id="hero-titel" class="lp-h lp-h1">Het eerste jaar gaat zo snel. <em>Hou elk moment vast.</em></h1>
<p class="lp-lead">Leg de kleine en grote momenten vast in een paar seconden. Deel ze alleen met de mensen die je dierbaar zijn, en zie welk sprongetje er ongeveer aankomt. Na een jaar wordt alles een boek om samen in te bladeren.</p>
<div class="lp-actions">
${ui('Button', { href: '#start', icon: 'heart' }, 'Hou me op de hoogte')}
${ui('Button', { variant: 'paper', href: '#hoe' }, 'Zo werkt het')}
</div>
<ul class="lp-stickers" aria-label="In het kort">
<li>${ui('Sticker', { tone: 'white', icon: 'check' }, 'Gratis app')}</li>
<li>${ui('Sticker', { tone: 'white', icon: 'lock' }, 'Alleen op uitnodiging')}</li>
<li>${ui('Sticker', { tone: 'white', icon: 'check' }, 'Opgeslagen in de EU')}</li>
</ul>
</div>
${art(`<div class="lp-hero-blob"></div>
<div class="lp-hero-cards">
${ui('MomentCard', { week: 'Week 9', caption: 'Eerste echte lach', note: "Om drie uur 's nachts. Natuurlijk.", hugs: 6, tint: 'butter', character: 'bo' })}
${ui('NextUp', { eyebrow: 'Wat komt eraan', title: 'Een nieuw sprongetje', when: 'Rond week 12 · over 2 weken', character: 'tiggy', items: ['Misschien even wat onrustiger', 'Daarna misschien: meer kijken, kirren en lachen'] })}
</div>
<div class="lp-hero-sticker">${ui('Sticker', { icon: 'family' }, 'Gedeeld met 6 mensen')}</div>`, 'lp-hero-art')}
</section>`;

const memories = `
<section class="lp-dark" aria-labelledby="snel-titel">
<div class="lp-wrap lp-split">
<div class="lp-col">
<p class="lp-eyebrow lp-on-dark">Voor je het weet</p>
<h2 id="snel-titel" class="lp-h lp-h2">Je knippert, <em>en ze is drie maanden.</em></h2>
<p class="lp-text">Je denkt dat je het nooit vergeet. De eerste lach, het eerste badje, dat ene geluidje. Maar de nachten lopen in elkaar over en de dagen vliegen voorbij. Over een jaar weet je nog dat het mooi was, maar niet meer hoe het precies ging.</p>
${ui('HandNote', { color: 'sunshine' }, 'en dat wil je juist niet kwijt')}
</div>
<ul class="lp-col lp-memories" aria-label="Momenten die je wilt onthouden">
<li class="lp-memory" data-tone="paper"><span>Week 6</span>Ze maakte voor het eerst een geluidje terug toen je tegen haar praatte.</li>
<li class="lp-memory" data-tone="butter"><span>Week 19</span>Het eerste hapje broccoli. Het gezicht dat ze trok.</li>
<li class="lp-memory" data-tone="pistachio"><span>Een gewone dinsdag</span>In slaap gevallen op papa's borst, midden in de serie.</li>
</ul>
</div>
</section>`;

const how = `
<section id="hoe" class="lp-section" aria-labelledby="hoe-titel">
<div class="lp-wrap lp-stack">
<div class="lp-intro">
<p class="lp-eyebrow">Zo werkt het</p>
<h2 id="hoe-titel" class="lp-h lp-h2">Het grootste avontuur van je leven, <em>stap voor stap.</em></h2>
<p class="lp-text">Net als een reisdagboek: jij legt de reis vast, je familie leest thuis mee, en aan het eind heb je een boek. Alleen gaat deze reis over het eerste jaar van je kind.</p>
</div>
<ol class="lp-steps">
<li class="lp-step" data-tone="butter">
<h3 class="lp-h lp-h3"><span class="lp-num" aria-hidden="true">1</span>Vastleggen in seconden</h3>
<p>Kies de foto die je toch al maakte, schrijf er één zin bij, en hij staat in de juiste week. Met één duim, terwijl je met je andere arm je baby vasthoudt.</p>
${art(ui('EmptySlot', { title: 'Deze week is nog leeg!', subtitle: 'Week 14 · voeg een moment toe' }), 'lp-step-art')}
</li>
<li class="lp-step" data-tone="pistachio">
<h3 class="lp-h lp-h3"><span class="lp-num" aria-hidden="true">2</span>Je kring leest mee</h3>
<p>Opa, oma, tantes en je beste vriendin krijgen elk een eigen WhatsApp-link. Ze zien elk nieuw moment en sturen knuffels en berichtjes terug. Zonder app of wachtwoord.</p>
${art(ui('HugToast', { title: 'Oma Ria stuurt een knuffel' }, 'Bij week 9 · Eerste echte lach'), 'lp-step-art')}
</li>
<li class="lp-step" data-tone="cornflower">
<h3 class="lp-h lp-h3"><span class="lp-num" aria-hidden="true">3</span>Een boek na een jaar</h3>
<p>Na twaalf maanden wordt je pad een jaarboek: elk moment en elk bijschrift, op volgorde. Je hoeft zelf niets te ontwerpen.</p>
${art(ui('BookCover', { name: 'Lotte', color: 'apricot', size: 150, tilt: -3, subtitle: 'ons eerste jaar' }), 'lp-step-art lp-center')}
</li>
</ol>
</div>
</section>`;

const leaps = `
<section id="sprongetjes" class="lp-section lp-band" data-tone="sunshine" aria-labelledby="sprong-titel">
<div class="lp-wrap lp-stack">
<div class="lp-intro-row">
<div class="lp-intro">
<p class="lp-eyebrow">Wat komt eraan</p>
<h2 id="sprong-titel" class="lp-h lp-h2">Zien wat er ongeveer aankomt, <em>en het moment vastpakken.</em></h2>
<p class="lp-text">Veel ouders merken het in het eerste jaar: een paar dagen is hun baby wat onrustiger, wil ze meer bij je zijn of slaapt ze slechter, en daarna kan ze ineens iets nieuws. Dat noemen we een sprongetje. TeddySteps laat zien wanneer het volgende ongeveer kan komen, wat je kunt merken en welk moment je dan niet wilt missen.</p>
</div>
${ui('HandNote', { color: 'plum' }, 'o, misschien slaapt ze daarom zo slecht')}
</div>
<div class="lp-card lp-timeline">
${ui('LeapTimeline', { now: 20, end: 54, nowLabel: 'Nu', nextLabel: 'Volgende sprongetje', weekWord: 'week', nextWeekWord: 'rond week', axisLabels: ['uitgerekend', '3 maanden', '6 maanden', '9 maanden', '1 jaar'], label: 'Het eerste jaar, gerekend vanaf de uitgerekende datum, met sprongetjes rond week 5, 8, 12, 17, 26, 36, 44 en 53. Nu week 20, het volgende sprongetje is rond week 26.' })}
</div>
<div class="lp-split lp-split-top">
<div class="lp-col lp-nextup">
${ui('NextUp', { eyebrow: 'Over 6 weken', title: 'Het volgende sprongetje', when: 'Rond week 26', character: 'tiggy', items: ['Misschien een paar dagen meer bij je willen zijn of slechter slapen', 'Daarna misschien: speelgoed pakken, omdraaien en goed bekijken', 'Leg het vast: het eerste "gesprekje" waarin ze terugbrabbelt'] })}
</div>
<ul class="lp-col lp-checks" data-tick="white">
${check('Een seintje op je pad', 'Op je pad zie je wat er ongeveer aankomt, zodat onrustige dagen je minder overvallen.')}
${check('Een tip om vast te leggen', 'Bij elk sprongetje: welk nieuw kunstje je de weken erna misschien ziet.')}
${check('Gerekend vanaf de uitgerekende datum', 'Zo passen de weken beter bij je baby, ook als ze eerder of later kwam.')}
</ul>
</div>
<p class="lp-small">Elke baby heeft een eigen tempo. Een sprongetje kan eerder, later of nauwelijks merkbaar zijn, en het onderzoek erachter is niet eenduidig. Het is een ruwe schatting, geen planning en geen medisch advies. Maak je je zorgen? Vraag het consultatiebureau of je huisarts. Huilt ze anders dan anders, drinkt ze slecht of voelt ze warm aan? Dat is geen sprongetje: bel je huisarts.</p>
</div>
</section>`;

const circle = `
<section id="kring" class="lp-dark" aria-labelledby="kring-titel">
<div class="lp-wrap lp-split lp-split-reverse">
${art(`<div class="lp-phone">
${ui('ScreenHeader', { title: 'Lottes kring', subtitle: '6 mensen, allemaal door jou uitgenodigd', color: 'pistachio' })}
<div class="lp-phone-body">
${ui('PersonRow', { name: 'Alex', role: 'Ouder · voegt ook momenten toe' })}
${ui('PersonRow', { name: 'Oma Ria', tone: 'butter', role: 'Ziet elk moment · stuurt knuffels' })}
${ui('PersonRow', { name: 'Opa Henk', tone: 'butter', role: 'Krijgt elke zondag een kaartje' })}
${ui('PersonRow', { name: 'Tante Sanne', tone: 'lilac', role: 'Spreekt berichtjes in' })}
</div>
</div>`, 'lp-col lp-center')}
<div class="lp-col">
<p class="lp-eyebrow lp-on-dark">Privé, zoals het hoort</p>
<h2 id="kring-titel" class="lp-h lp-h2">Je eigen kring, <em>geen volgers.</em></h2>
<p class="lp-text">Geen Instagram, geen vreemden, geen algoritme. Deel de echte momenten, ook de rommelige, met de mensen die ze zouden inlijsten. Niemand anders kan het pad van je kind vinden.</p>
<ul class="lp-checks lp-checks-grid">
${check('Alleen op uitnodiging', 'Geen openbare profielen en geen zoekfunctie.')}
${check('Geen reclame, geen algoritme', 'Momenten staan op volgorde, alleen voor jouw mensen.')}
${check('Jij bepaalt of familie mag bewaren', "Familie kan kijken. Foto's bewaren kan alleen als jij dat aanzet.")}
${check('Veilig in de EU', 'Je gegevens worden nooit verkocht, nooit gedeeld met adverteerders en nooit gebruikt om AI te trainen. Alles exporteren kan altijd.')}
</ul>
<p><a class="lp-text-link" href="/privacy">Lees onze privacybelofte</a></p>
</div>
</div>
</section>`;

const book = `
<section id="boek" class="lp-section lp-band" data-tone="cornflower" aria-labelledby="boek-titel">
<div class="lp-wrap lp-split">
${art(`${ui('BookCover', { name: 'Lotte', color: 'apricot', size: 300, subtitle: 'ons eerste jaar' })}
<div class="lp-book-second">${ui('BookCover', { name: 'Lotte', color: 'pistachio', size: 190, tilt: 5, subtitle: 'voor oma' })}</div>`, 'lp-col lp-books')}
<div class="lp-col">
<p class="lp-eyebrow">Het jaarboek</p>
<h2 id="boek-titel" class="lp-h lp-h2">Een jaar vol eerste keren. <em>In één boek.</em></h2>
<p class="lp-text">Elk moment dat je vastlegde, op volgorde, met jouw woorden erbij. Je hoeft niets te ontwerpen: als je kind één wordt, maken wij van je pad een boek.</p>
<ul class="lp-checks" data-tick="white">
${check('Gemaakt om in te bladeren', 'Om honderd keer samen voor te lezen, plakhandjes en al.')}
${check('Een exemplaar voor opa en oma', 'Een extra boek voor wie het eerste jaar van dichtbij volgde.')}
${check('Later begonnen? Geen probleem', 'Zet de eerdere weken in één keer over uit je fotorol.')}
</ul>
<p class="lp-strong">De app blijft gratis. Je betaalt alleen als je het boek wilt.</p>
</div>
</div>
</section>`;

const faq = [
  ['Is TeddySteps echt gratis?', 'Ja. Momenten vastleggen en delen met je eigen kring is gratis, met zoveel familieleden als je wilt. Wij verdienen aan het jaarboek, dus het gaat ons alleen goed als dat boek de moeite waard is.'],
  ["Wie kan de foto's van mijn kind zien?", "Alleen de mensen die jij uitnodigt. Er zijn geen openbare profielen en je kunt een pad niet zoeken. Je haalt iemand er op elk moment weer af, en jij bepaalt of familie foto's mag bewaren."],
  ['Moet oma een app installeren?', 'Nee. Ze opent de link die je via WhatsApp stuurt en ziet elk moment, in grote, duidelijke letters, met een knuffelknop.'],
  ['Hoe weten jullie wanneer een sprongetje komt?', 'We rekenen vanaf de uitgerekende datum, met de weken die vaak voor sprongetjes worden genoemd. Het onderzoek daarachter is niet eenduidig, dus zie het als een ruwe schatting: bij jouw kind kan het eerder, later of nauwelijks merkbaar zijn. Het is geen planning en geen medisch advies. Maak je je zorgen? Vraag het consultatiebureau of je huisarts.'],
  ['Mijn baby is al een paar maanden. Te laat?', 'Helemaal niet. Je zet de eerdere weken in één keer over uit je fotorol, zodat het boek toch het hele eerste jaar laat zien.'],
  ['Kunnen we allebei momenten toevoegen?', 'Ja. Nodig je partner uit als ouder en jullie vullen samen hetzelfde pad.'],
  ['En als ik een paar weken oversla?', 'Dan gebeurt er niets. Het pad wacht gewoon, met hooguit één vriendelijk seintje op zondag. Geen reeksen om bij te houden, geen schuldgevoel.'],
  ['Wanneer kan ik beginnen?', `Binnenkort. We testen TeddySteps eerst met een kleine groep gezinnen. Wil je meetesten of het als eerste horen? Mail naar <a href="${KEEP_POSTED}">${CONTACT}</a>.`],
];

const questions = `
<section id="vragen" class="lp-section" aria-labelledby="vragen-titel">
<div class="lp-wrap lp-split lp-split-top">
<div class="lp-col lp-faq-head">
<p class="lp-eyebrow">Vragen</p>
<h2 id="vragen-titel" class="lp-h lp-h2">Goed om te <em>weten.</em></h2>
</div>
<div class="lp-col lp-faq-list">
${faq.map(([q, a], i) => `<details class="lp-faq"${i === 0 ? ' open' : ''}><summary>${q}</summary><p>${a}</p></details>`).join('\n')}
</div>
</div>
</section>`;

const start = `
<section id="start" class="lp-section lp-band" data-tone="lilac" aria-labelledby="start-titel">
<div class="lp-wrap lp-split">
<div class="lp-col">
<p class="lp-eyebrow">Bijna klaar</p>
<h2 id="start-titel" class="lp-h lp-h2">Je onthoudt niet elke eerste keer. <em>Het boek wel.</em></h2>
<p class="lp-text lp-strong">TeddySteps komt binnenkort naar de App Store en Google Play. Stuur ons een mailtje, dan hoor je het als eerste. Wil je meetesten? Zet erbij hoe oud je kleintje is, of wanneer het wordt verwacht.</p>
<div class="lp-actions">
${ui('Button', { href: KEEP_POSTED, icon: 'mail' }, 'Hou me op de hoogte')}
${ui('Button', { variant: 'paper', href: TEST_ALONG }, 'Ik wil meetesten')}
</div>
<p class="lp-small">Werkt de knop niet? Mail naar ${CONTACT}. We mailen je alleen als de app er is, en over meetesten als je dat vraagt. Daarna wissen we je adres.</p>
</div>
${art(ui('Hug', { size: 240 }), 'lp-col lp-center')}
</div>
</section>`;

export function home() {
  return page({
    title: 'TeddySteps: het eerste jaar van je baby, alleen voor je kring',
    description: 'Leg het eerste jaar van je baby vast, deel het alleen met je eigen kring en zie welk sprongetje eraan komt. Na een jaar wordt het een boek. Geen reclame.',
    ogTitle: 'Het eerste jaar gaat zo snel',
    ogDescription: 'Hou elk moment vast en deel het alleen met je eigen kring. TeddySteps komt binnenkort.',
    path: '/',
    nav,
    navOnPhone: false,
    body: [hero, memories, how, leaps, circle, book, questions, start].join('\n'),
  });
}
