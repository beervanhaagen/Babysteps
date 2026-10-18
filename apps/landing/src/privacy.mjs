// teddysteps.nl/privacy: our privacy promise in plain words. The family page links here
// (#familie). It is not the legal privacy statement; that comes before launch, with the lawyer.
// Keep every line true to what the build does (docs/family-email.md, docs/analytics.md);
// export, deleting and the analytics switch arrive in steps 8 and 10, before launch.
import { CONTACT, page } from './layout.mjs';
import { SIGNUP_ON } from './signup.mjs';
import { ui } from './ui.mjs';

const nav = ui('Button', { size: 'md', variant: 'paper', href: '/' }, 'Naar de homepagina');

const sections = [
  ['kring', 'Alleen jouw kring', `<p>Een pad is alleen te zien voor de mensen die jij uitnodigt. Er zijn geen openbare profielen en je kunt een pad niet zoeken. Iedereen krijgt een eigen link. Haal je iemand uit de kring, dan werken die link en alle toestellen waarop hij geopend is meteen niet meer.</p>`],
  ['eu', 'Opgeslagen in de EU', `<p>Foto's en gegevens worden opgeslagen in Frankfurt. We verkopen je gegevens niet, delen niets met adverteerders en gebruiken foto's nooit om AI te trainen. Welke diensten we verder gebruiken, bijvoorbeeld voor meldingen op je telefoon, staat straks in de privacyverklaring.</p>`],
  ['kind', 'Zo weinig mogelijk over je kind', `<p>We vragen alleen een voornaam, de geboortedatum en de uitgerekende datum, voor de weken van het pad en de sprongetjes. Geen achternamen. Locatie en andere verborgen gegevens halen we uit elke foto voordat hij wordt opgeslagen. Van een foto bewaren we alleen de dag waarop hij gemaakt is.</p>`],
  ['reclame', 'Geen reclame, geen algoritme', `<p>Momenten staan op volgorde en alleen bij jouw mensen. In de app tellen we zonder namen waar het beter kan, bijvoorbeeld waar mensen vastlopen. Dat zet je uit bij Privacy en gegevens.</p>`],
  ['familie', 'Voor familie', `<p>Je hebt geen app, account of wachtwoord nodig. We bewaren hoe de ouders je noemen, je relatie tot het kind als die is ingevuld, je knuffels en berichtjes, hoe vaak je kaartjes wilt en, als je kaartjes wilt, je e-mailadres. Verder de dag van je laatste bezoek, per toestel het soort toestel en wanneer het voor het laatst gebruikt is, en of je op de lijst voor het boek staat.</p>
<p>De ouders zien hoe ze je noemen, je relatie, wanneer je meedeed en je knuffels en berichtjes. Je e-mailadres zien ze niet: dat gebruiken we alleen voor je kaartjes.</p>
<p>Op de familiepagina staan geen trackers en geen reclame. Er staat één cookie, alleen om je ingelogd te houden. Er is geen downloadknop, tenzij de ouders die aanzetten. Een schermafbeelding kunnen we niet tegenhouden, dus de ouders nodigen alleen mensen uit die ze vertrouwen.</p>
<p>Wil je niet meer meekijken? Kies op de familiepagina bij je instellingen "Ik wil niet meer meekijken". Je e-mailadres, je link en je toestellen worden dan gewist. Je knuffels, berichtjes en de naam die de ouders je gaven blijven bij het pad.</p>`],
  ['van-jou', 'Altijd van jou', `<p>Je kunt alles exporteren. Verwijder je je pad, dan kun je dat 30 dagen terugdraaien. Daarna is alles binnen 60 dagen helemaal weg, ook uit onze back-ups. Wat al in de mailbox van je familie staat, zoals namen, bijschriften en foto's als je dat toestond, kunnen we niet terughalen.</p>`],
  ['site', 'Deze website', SIGNUP_ON
    ? `<p>teddysteps.nl zet geen cookies en laadt niets van andere partijen.</p>
<p>Meld je je aan om op de hoogte te blijven of mee te testen? Dan bewaren we je e-mailadres, of je wilt meetesten en, als je die invult, de maand waarin je kleintje geboren of uitgerekend is. Dat staat in Frankfurt; de bevestigingsmail gaat via Lettermint, ook in de EU. Het formulier loopt via Vercel, dat deze website host. Tegen misbruik houden we een uur lang een versleutelde code van je IP-adres bij, niet het adres zelf.</p>
<p>Bevestig je niet, dan wissen we je adres na 7 dagen. Bevestig je wel, dan gebruiken we het alleen om je te laten weten dat de app er is, of om je te vragen voor een test. Daarna wissen we het, uiterlijk na 12 maanden. Eerder eraf? Mail naar <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>`
    : `<p>teddysteps.nl zet geen cookies en laadt niets van andere partijen. Mail je ons om op de hoogte te blijven of mee te testen? Dan gebruiken we je adres alleen daarvoor, en daarna wissen we het.</p>`],
];

const body = `
<section class="lp-wrap lp-privacy" aria-labelledby="privacy-titel">
<p class="lp-eyebrow">Privé, zoals het hoort</p>
<h1 id="privacy-titel" class="lp-h lp-h1">Onze <em>privacybelofte.</em></h1>
<p class="lp-lead">TeddySteps is gemaakt voor de foto's die je niet op Instagram zet. Dit beloven we je, in gewone taal. De volledige privacyverklaring volgt voordat de app in de winkels staat.</p>
<div class="lp-privacy-list">
${sections.map(([id, title, text]) => `<section id="${id}" class="lp-card lp-privacy-item" aria-labelledby="${id}-titel"><h2 id="${id}-titel" class="lp-h lp-h3">${title}</h2>${text}</section>`).join('\n')}
</div>
<p class="lp-text">Vragen over je gegevens? Mail naar <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>
</section>`;

export function privacy() {
  return page({
    title: 'Onze privacybelofte · TeddySteps',
    description: "Alleen jouw kring, opgeslagen in de EU, nooit verkocht of gebruikt om AI te trainen. Wat TeddySteps belooft over de foto's van je kind.",
    path: '/privacy',
    nav,
    body,
  });
}
