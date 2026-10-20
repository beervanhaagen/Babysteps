// Two sections with app screens, after the journey boards (design/screens): T1, A4 and F3 in
// "Een kijkje in de app", X3 and B1 in "Elke maand een feestje". Built from the design-system
// components, not copied from the boards (the design system wins). The phones are pictures:
// hidden from screen readers and out of the tab order; each one has a visible caption.
import { raw, ui } from './ui.mjs';

// The reference TabBar is in English; the app says Pad, Familie, Ik.
function tabBar(active) {
  const dutch = { Trail: 'Pad', Book: 'Boek', Family: 'Familie', Me: 'Ik' };
  return ui('TabBar', { active }).replace(/<span>(Trail|Book|Family|Me)<\/span>/g, (_, word) => `<span>${dutch[word]}</span>`);
}

function phone(screen, title, caption) {
  return `<figure class="lp-shot">
<div class="lp-device" aria-hidden="true" inert><div class="lp-screen">${screen}</div></div>
<figcaption><h3 class="lp-h lp-h4">${title}</h3><p>${caption}</p></figcaption>
</figure>`;
}

const trail = `
${ui('ScreenHeader', { title: 'Lottes pad', color: 'cornflower', character: 'bo' }, raw(ui('Sticker', {}, 'Week 31 van 78')))}
<div class="lp-screen-body">
${ui('EmptySlot', { title: 'Deze week is nog leeg!', subtitle: 'Week 31 · voeg een moment toe' })}
${ui('NextUp', { eyebrow: 'Wat komt eraan', title: 'Een nieuw sprongetje', when: 'Over een week of vijf', tone: 'lilac', items: ['Misschien wil ze een paar dagen vaker bij je zijn', 'Mooi om vast te pinnen: haar gezicht als ze iets nieuws ontdekt'] }, 'Een ruwe schatting vanaf de uitgerekende datum: het kan eerder, later of nauwelijks merkbaar zijn. Twijfel je? Het consultatiebureau helpt.')}
${ui('MomentCard', { week: 'Week 30', caption: 'Zelf gezeten. Zonder kussen.', note: 'Heel trots op zichzelf.', hugs: 4, tint: 'lilac', character: 'bo' })}
</div>
<div class="lp-screen-tabs">${tabBar('trail')}</div>`;

const pinned = `
<div class="lp-screen-body lp-screen-party" data-tone="sunshine">
<div class="lp-party-gang">${ui('Character', { name: 'puddle', mood: 'happy', size: 70, decorative: true, delay: 1 })}${ui('Character', { name: 'bizzy', mood: 'happy', size: 64, decorative: true, delay: 2 })}</div>
${ui('MomentCard', { week: 'Week 31 · Eerste keer!', caption: 'De babyschommel', tint: 'pistachio', character: 'tiggy', tilt: 2 })}
<h4 class="ts-display lp-party-title">Vastgepind in week 31!</h4>
<p class="lp-screen-text">Een eerste keer! Tiggy kwam kijken. Alex, Oma Ria en 2 anderen krijgen een kaartje.</p>
${ui('Button', { block: true }, 'Terug naar het pad')}
</div>`;

const family = `
${ui('ScreenHeader', { title: 'Lotte', subtitle: 'Vandaag 7 maanden!', color: 'pistachio', character: 'puddle' })}
<div class="lp-screen-body">
<p class="lp-screen-label">Nieuw deze week</p>
${ui('MomentCard', { week: 'Week 31 · Eerste keer!', caption: 'Voor het eerst in de babyschommel', tint: 'butter', character: 'tiggy' })}
<div class="lp-screen-buttons">${ui('Button', { block: true, icon: 'heart' }, 'Knuffelen')}${ui('Button', { block: true, variant: 'paper', icon: 'mic' }, 'Inspreken')}</div>
<p class="lp-screen-label">Vorige week</p>
${ui('MomentCard', { week: 'Week 30', caption: 'Zelf gezeten. Zonder kussen.', tint: 'lilac', character: 'bo', tilt: 1.5 })}
</div>`;

const month = `
<div class="lp-screen-body lp-screen-party" data-tone="lilac">
<p class="lp-screen-label">Hoera, weer een maand</p>
<div class="lp-month">
${ui('BookCover', { name: 'Lotte', color: 'apricot', size: 200, tilt: -3, subtitle: 'is 7 maanden!' })}
</div>
<div class="lp-party-gang lp-party-row">
${ui('Character', { name: 'bo', mood: 'happy', size: 62, decorative: true })}
${ui('Character', { name: 'tiggy', mood: 'happy', size: 62, decorative: true, delay: 1 })}
${ui('Character', { name: 'bizzy', mood: 'happy', size: 56, decorative: true, delay: 2 })}
${ui('Character', { name: 'puddle', mood: 'happy', size: 62, decorative: true, delay: 3 })}
</div>
${ui('Button', { block: true, icon: 'share' }, 'Deel het kaartje')}
${ui('Button', { block: true, variant: 'paper' }, 'Later')}
</div>`;

const book = `
${ui('ScreenHeader', { title: 'Jullie jaarboek', subtitle: 'Lottes eerste jaar, op papier', color: 'butter', character: 'bo' })}
<div class="lp-screen-body">
<div class="lp-month">${ui('BookCover', { name: 'Lotte', color: 'cornflower', size: 150, tilt: 2, subtitle: 'jaar één!' })}</div>
<div class="lp-grow">
<p class="lp-screen-label">Het boek groeit mee</p>
<div class="lp-grow-bar"><span style="width: 60%"></span></div>
<p class="lp-screen-text"><b>31 van 52 weken</b></p>
<div class="lp-grow-stats"><div><b>47</b>momenten</div><div><b>12</b>eerste keren</div></div>
</div>
<p class="lp-screen-text">Als Lotte één wordt, maken wij van haar pad een boek. Jij kijkt het na.</p>
${ui('Button', { block: true }, 'Laat het me weten')}
</div>
<div class="lp-screen-tabs">${tabBar('book')}</div>`;

export const appSection = `
<section id="app" class="lp-section lp-band" data-tone="lilac" aria-labelledby="app-titel">
<div class="lp-wrap lp-stack">
<div class="lp-intro">
<p class="lp-eyebrow">Een kijkje in de app</p>
<h2 id="app-titel" class="lp-h lp-h2">Zo ziet het eruit, <em>van dichtbij.</em></h2>
<p class="lp-text">Een plekje voor elke week, een feestje bij elk moment, en een pagina voor oma zonder app. Dit zijn schermen uit TeddySteps.</p>
</div>
<div class="lp-phones" role="region" aria-label="Drie schermen uit de app" tabindex="0">
${phone(trail, 'Je pad', 'Elke week een plekje, en zien wat er ongeveer aankomt.')}
${phone(pinned, 'Vastgepind!', 'Een foto en één zin, en je kring krijgt een kaartje.')}
${phone(family, 'Zo ziet oma het', 'In de browser, zonder app of wachtwoord. Eén tik voor een knuffel.')}
</div>
</div>
</section>`;

export const partySection = `
<section id="feestje" class="lp-section lp-band" data-tone="pistachio" aria-labelledby="feest-titel">
<div class="lp-wrap lp-split">
<div class="lp-col">
<p class="lp-eyebrow">Onderweg</p>
<h2 id="feest-titel" class="lp-h lp-h2">Elke maand een feestje. <em>Na een jaar een boek.</em></h2>
<p class="lp-text">Weer een maand! Dat mag gevierd worden. Op elke maandverjaardag maakt TeddySteps een kaartje, klaar om door te sturen naar wie jij wilt. En ondertussen wordt je jaarboek elke week een beetje voller.</p>
</div>
<div class="lp-col lp-phones lp-phones-two" role="region" aria-label="Twee schermen uit de app" tabindex="0">
${phone(month, 'Maandverjaardag', 'Een kaartje met de hele bende, om te delen met wie jij wilt.')}
${phone(book, 'Het boek groeit mee', 'Je ziet elke week hoe je jaarboek voller wordt.')}
</div>
</div>
</section>`;
