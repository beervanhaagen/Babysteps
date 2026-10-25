import { longDutchDate, possessive, todayInAmsterdam, ZipWriter, type CalendarDate } from '@teddysteps/core';
import { Directory, File, FileMode, Paths, type FileHandle } from 'expo-file-system';
import type { Trail } from './auth';
import { supabase } from './supabase';

// M6 "Alles downloaden" (plan tech-architect, step 8): everything of the trail in one or more
// ZIP files, made on the phone (no server, no extra storage): the print versions of the photos,
// a page to read in any browser (momenten.html), the same as data (momenten.json), your own
// account details (account.json) and a leesmij.txt. Family e-mail addresses, devices and
// internal paths stay out. The files sit in the app's cache (not in iCloud or Android backups)
// until shared, and are wiped at the next start.

const FOLDER = 'export';
/** About 1 GB per part (print versions are ~3 MB): small enough for any phone and any mail. */
const PHOTOS_PER_PART = 300;
const ESTIMATE_PER_PHOTO = 3_500_000;
const CHUNK = 1024 * 1024;

interface ExportMoment {
  id: string;
  trail_week: number;
  caption: string | null;
  is_first: boolean;
  first_label: string | null;
  happened_on: CalendarDate | null;
  created_at: string;
  moment_photos: { position: number; print_path: string; view_path: string }[];
  reactions: { kind: string; created_at: string; circle_members: { label: string } | null }[];
}

export interface ExportProgress {
  done: number;
  total: number;
  part: number;
  parts: number;
}

/** The parent tapped "Stoppen": the half-made files are wiped. */
export class ExportStopped extends Error {}

export class NotEnoughSpace extends Error {
  constructor(public needed: number) {
    super('not enough space');
  }
}

const pad = (n: number) => String(n).padStart(2, '0');
const dayOf = (m: ExportMoment) => m.happened_on ?? todayInAmsterdam(new Date(m.created_at));
const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'pad';

/** Wipes exports left from an earlier time (called at start-up). */
export function forgetExports() {
  try {
    const folder = new Directory(Paths.cache, FOLDER);
    if (folder.exists) folder.delete();
  } catch {
    // Already gone, or the system is clearing its cache.
  }
}

/** Every ready moment, a page at a time (the API answers at most 1000 rows per request). */
async function load() {
  const all: ExportMoment[] = [];
  for (let from = 0; ; from += 500) {
    const { data, error } = await supabase
      .from('moments')
      .select('id, trail_week, caption, is_first, first_label, happened_on, created_at, moment_photos(position, print_path, view_path), reactions(kind, created_at, circle_members(label))')
      .eq('status', 'ready')
      .order('trail_week')
      .order('created_at')
      .order('id')
      .range(from, from + 499);
    if (error) throw error;
    all.push(...((data ?? []) as unknown as ExportMoment[]));
    if (!data || data.length < 500) return all;
  }
}

/** A short-lived link to one photo: the print version, or else the view version. Three tries. */
async function linkTo(photo: { path: string; view: string }): Promise<{ url: string; print: boolean } | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const print = await supabase.storage.from('print').createSignedUrl(photo.path, 600);
    if (print.data?.signedUrl) return { url: print.data.signedUrl, print: true };
    const view = await supabase.storage.from('view').createSignedUrl(photo.view, 600);
    if (view.data?.signedUrl) return { url: view.data.signedUrl, print: false };
  }
  return null;
}

/** How big it will roughly be, before starting: for the screen and the free-space check. */
export async function exportSize() {
  const moments = await load();
  const photos = moments.reduce((n, m) => n + m.moment_photos.length, 0);
  return { moments: moments.length, photos, bytes: photos * ESTIMATE_PER_PHOTO, parts: Math.max(1, Math.ceil(photos / PHOTOS_PER_PART)) };
}

function page(trail: Trail, moments: ExportMoment[], names: Map<string, string[]>) {
  const weeks = new Map<number, ExportMoment[]>();
  for (const m of moments) weeks.set(m.trail_week, [...(weeks.get(m.trail_week) ?? []), m]);
  const blocks = [...weeks.entries()]
    .map(([week, list]) => {
      const items = list
        .map((m) => {
          const hugs = m.reactions.filter((r) => r.kind === 'hug' && r.circle_members).map((r) => r.circle_members!.label);
          const photos = (names.get(m.id) ?? []).map((n) => `<img src="${escape(n)}" alt="" loading="lazy">`).join('');
          return `<article>
${m.is_first && m.first_label ? `<p class="first">Eerste keer · ${escape(m.first_label)}</p>` : ''}
${m.caption ? `<h3>${escape(m.caption)}</h3>` : ''}
<p class="meta">${escape(longDutchDate(dayOf(m)))}${hugs.length ? ` · knuffels van ${escape([...new Set(hugs)].join(', '))}` : ''}</p>
<div class="photos">${photos}</div>
</article>`;
        })
        .join('\n');
      return `<section><h2>Week ${week}</h2>\n${items}</section>`;
    })
    .join('\n');
  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escape(possessive(trail.childName))} pad</title>
<style>
body{margin:0;background:#F2ECE1;color:#2D1E2F;font:16px/1.5 -apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif}
main{max-width:760px;margin:0 auto;padding:24px 16px 64px}
h1{font-family:Georgia,serif;font-size:36px;margin:0 0 4px}
h2{font-size:13px;letter-spacing:.14em;text-transform:uppercase;margin:40px 0 12px}
h3{font-family:Georgia,serif;font-size:21px;margin:6px 0}
article{background:#fff;border:2px solid #2D1E2F;border-radius:20px;padding:16px;margin:0 0 16px}
.first{display:inline-block;margin:0;padding:2px 10px;border:1.5px solid #2D1E2F;border-radius:14px;font-size:13px;font-weight:700}
.meta{color:#5E4D5C;font-size:14px;margin:4px 0 12px}
.photos img{display:block;width:100%;height:auto;border-radius:12px;margin:0 0 8px}
</style></head>
<body><main>
<h1>${escape(possessive(trail.childName))} pad</h1>
<p class="meta">${trail.birthDate ? `Geboren ${escape(longDutchDate(trail.birthDate, { weekday: false, year: true }))} · ` : ''}gedownload ${escape(longDutchDate(todayInAmsterdam(), { weekday: false, year: true }))}</p>
${blocks}
</main></body></html>`;
}

function readme(trail: Trail, parts: number, missing: string[]) {
  return `${possessive(trail.childName)} pad, gedownload uit TeddySteps op ${longDutchDate(todayInAmsterdam(), { weekday: false, year: true })}.

Open momenten.html in een browser om alles terug te zien, met de foto's.
In de map fotos staan de foto's in printkwaliteit, met de week en de datum in de naam.
momenten.json bevat hetzelfde als gegevens, en account.json je eigen accountgegevens.
${parts > 1 ? `\nDit is het laatste van ${parts} delen. Pak ze allemaal uit in dezelfde map, dan toont momenten.html alle foto's.\n` : ''}
${missing.length ? `\nDeze foto's konden we niet ophalen; probeer het later opnieuw: ${missing.join(', ')}\n` : ''}
Momenten die je verwijderde staan er niet in. Dit bestand is niet versleuteld: bewaar het op een plek die alleen jij kunt openen.

Vragen? hallo@teddysteps.nl
`;
}

/** One file into the open ZIP: header, the bytes in pieces, descriptor. */
async function addBytes(zip: ZipWriter, out: FileHandle, name: string, bytes: Uint8Array) {
  await out.writeBytes(zip.start(name));
  zip.chunk(bytes);
  await out.writeBytes(bytes);
  await out.writeBytes(zip.end());
}

async function addFile(zip: ZipWriter, out: FileHandle, name: string, file: File) {
  await out.writeBytes(zip.start(name));
  const input = file.open(FileMode.ReadOnly);
  try {
    for (;;) {
      const bytes = await input.readBytes(CHUNK);
      if (!bytes.length) break;
      zip.chunk(bytes);
      await out.writeBytes(bytes);
    }
  } finally {
    input.close();
  }
  await out.writeBytes(zip.end());
}

/**
 * Makes the ZIP part(s) and returns their file URIs. Photos are fetched through 10-minute links
 * from the print bucket (parents only), a few at a time, and never kept outside the ZIP.
 */
export async function buildExport(trail: Trail, email: string | null, onProgress: (p: ExportProgress) => void, stop: () => boolean = () => false): Promise<string[]> {
  forgetExports();
  const moments = await load();
  const folder = new Directory(Paths.cache, FOLDER);
  folder.create({ intermediates: true });

  // Every photo with its name in the ZIP: week, day, and its number within the moment.
  const photos = moments.flatMap((m) =>
    [...m.moment_photos]
      .sort((a, b) => a.position - b.position)
      .map((p, i) => ({ moment: m.id, path: p.print_path, view: p.view_path, name: `fotos/week-${pad(m.trail_week)}_${dayOf(m)}_${m.id.slice(0, 8)}-${i + 1}.jpg` })),
  );
  const parts = Math.max(1, Math.ceil(photos.length / PHOTOS_PER_PART));
  const needed = Math.min(photos.length, PHOTOS_PER_PART) * ESTIMATE_PER_PHOTO * parts + 50_000_000;
  if (Paths.availableDiskSpace < needed) throw new NotEnoughSpace(needed);

  const names = new Map<string, string[]>();
  for (const p of photos) names.set(p.moment, [...(names.get(p.moment) ?? []), p.name]);
  const { data: profile } = await supabase.from('profiles').select('first_name, notify_nudges, notify_reactions, analytics_opt_out, created_at').single();

  const uris: string[] = [];
  const missing: string[] = [];
  let done = 0;
  try {
  for (let part = 0; part < parts; part++) {
    const target = new File(folder, `${slug(trail.childName)}-pad${parts > 1 ? `-deel-${part + 1}` : ''}.zip`);
    target.create({ overwrite: true });
    const out = target.open(FileMode.WriteOnly);
    const zip = new ZipWriter();
    try {
      const mine = photos.slice(part * PHOTOS_PER_PART, (part + 1) * PHOTOS_PER_PART);
      for (const photo of mine) {
        if (stop()) throw new ExportStopped();
        // Signed right before downloading, so a slow connection never meets an expired link.
        const link = await linkTo(photo);
        if (link && !link.print) {
          const webp = photo.name.replace(/\.jpg$/, '.webp');
          names.set(photo.moment, (names.get(photo.moment) ?? []).map((n) => (n === photo.name ? webp : n)));
          photo.name = webp;
        }
        let saved = false;
        for (let attempt = 0; link && !saved && attempt < 3; attempt++) {
          const temp = new File(folder, `foto-${done}.jpg`);
          try {
            await File.downloadFileAsync(link.url, temp, { idempotent: true });
            await addFile(zip, out, photo.name, temp);
            saved = true;
          } catch {
            // A dropped connection: try this photo again (the ZIP only gets it once it's whole).
          } finally {
            if (temp.exists) temp.delete();
          }
        }
        if (!saved) missing.push(photo.name);
        done++;
        onProgress({ done, total: photos.length, part: part + 1, parts });
      }
      if (part === parts - 1) {
        const text = new TextEncoder();
        await addBytes(zip, out, 'leesmij.txt', text.encode(readme(trail, parts, missing)));
        await addBytes(zip, out, 'momenten.html', text.encode(page(trail, moments, names)));
        const data = {
          versie: 1,
          kind: { voornaam: trail.childName, geboortedatum: trail.birthDate, uitgerekend: trail.dueDate },
          momenten: moments.map((m) => ({
            week: m.trail_week,
            dag: dayOf(m),
            bijschrift: m.caption,
            eersteKeer: m.is_first ? m.first_label : null,
            fotos: names.get(m.id) ?? [],
            knuffels: m.reactions.filter((r) => r.kind === 'hug' && r.circle_members).map((r) => ({ van: r.circle_members!.label, op: r.created_at })),
          })),
        };
        await addBytes(zip, out, 'momenten.json', text.encode(JSON.stringify(data, null, 2)));
        await addBytes(zip, out, 'account.json', text.encode(JSON.stringify({ email, ...profile }, null, 2)));
      }
      await out.writeBytes(zip.finish());
    } finally {
      out.close();
    }
    uris.push(target.uri);
  }
  } catch (e) {
    if (e instanceof ExportStopped) forgetExports();
    throw e;
  }
  return uris;
}
