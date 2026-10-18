// Finishes an upload from the parent app (docs/family-email.md, image pipeline).
// Before a moment becomes visible, it reads every uploaded file and refuses anything that
// still carries metadata (EXIF with GPS, XMP, IPTC) or isn't the file type it claims to be.
// Refused files are deleted. Only then does public.finish_upload mark the moment.
import { createClient } from 'jsr:@supabase/supabase-js@2';

const service = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
});

// JPEG metadata lives in the first segments, before the image data starts.
const JPEG_HEAD = 256 * 1024;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

/** Walks the JPEG segments up to the image data; any APP1 (EXIF, XMP) or APP13 (IPTC) fails. */
export function isCleanJpeg(bytes: Uint8Array): boolean {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return false;
  let i = 2;
  while (i + 4 <= bytes.length) {
    if (bytes[i] !== 0xff) return false;
    const marker = bytes[i + 1];
    if (marker === 0xda) return true; // start of scan: only image data follows
    if (marker === 0xe1 || marker === 0xed) return false;
    i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
  }
  return false;
}

/** Walks the RIFF chunks of a WebP; EXIF or XMP chunks fail. */
export function isCleanWebp(bytes: Uint8Array): boolean {
  const ascii = (from: number) => String.fromCharCode(...bytes.slice(from, from + 4));
  if (ascii(0) !== 'RIFF' || ascii(8) !== 'WEBP') return false;
  let i = 12;
  while (i + 8 <= bytes.length) {
    const id = ascii(i);
    if (id === 'EXIF' || id === 'XMP ') return false;
    const size = bytes[i + 4] | (bytes[i + 5] << 8) | (bytes[i + 6] << 16) | (bytes[i + 7] << 24);
    i += 8 + size + (size % 2);
  }
  return true;
}

async function read(bucket: string, path: string, head?: number): Promise<Uint8Array | null> {
  const { data } = await service.storage.from(bucket).createSignedUrl(path, 60);
  if (!data) return null;
  const response = await fetch(data.signedUrl, head ? { headers: { Range: `bytes=0-${head - 1}` } } : undefined);
  if (!response.ok) return null; // not uploaded yet: finish_upload will report it missing
  return new Uint8Array(await response.arrayBuffer());
}

Deno.serve(async (request) => {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '');
  const { data: auth } = await service.auth.getUser(token);
  if (!auth.user) return json(401, { error: 'not signed in' });

  const { moment_id: momentId, part } = await request.json().catch(() => ({}));
  if (typeof momentId !== 'string' || (part !== 'view' && part !== 'print')) return json(400, { error: 'bad request' });

  const { data: moment } = await service.from('moments').select('trail_id, deleted_at').eq('id', momentId).maybeSingle();
  if (!moment) return json(403, { error: 'not your moment' });
  const { data: parent } = await service.from('trail_parents').select('user_id').eq('trail_id', moment.trail_id).eq('user_id', auth.user.id).maybeSingle();
  if (!parent) return json(403, { error: 'not your moment' });
  if (moment.deleted_at) return json(410, { error: 'moment was deleted' });

  const { data: photos } = await service.from('moment_photos').select('print_path, view_path, small_path').eq('moment_id', momentId);
  const checks: { bucket: string; path: string; clean: (b: Uint8Array) => boolean; head?: number }[] = [];
  for (const p of photos ?? []) {
    if (part === 'view') {
      checks.push({ bucket: 'view', path: p.small_path, clean: isCleanJpeg, head: JPEG_HEAD });
      checks.push({ bucket: 'view', path: p.view_path, clean: isCleanWebp });
    } else {
      checks.push({ bucket: 'print', path: p.print_path, clean: isCleanJpeg, head: JPEG_HEAD });
    }
  }
  const refused: { bucket: string; path: string }[] = [];
  for (const check of checks) {
    const bytes = await read(check.bucket, check.path, check.head);
    if (bytes && !check.clean(bytes)) refused.push(check);
  }
  if (refused.length) {
    for (const bucket of ['view', 'print']) {
      const paths = refused.filter((r) => r.bucket === bucket).map((r) => r.path);
      if (paths.length) await service.storage.from(bucket).remove(paths);
    }
    return json(422, { error: 'photo still has metadata or is not the right type', refused: refused.length });
  }

  const { data, error } = await service.rpc('finish_upload', { parent: auth.user.id, finished_moment: momentId, part });
  if (error) return json(error.code === 'P0002' ? 410 : error.code === '42501' ? 403 : 500, { error: error.message });
  return json(200, { result: data });
});
