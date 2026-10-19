import { File, Paths } from 'expo-file-system';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import { removeStuck } from './queue';
import { supabase } from './supabase';
import type { TrailMoment } from './trail';

// T8 Moment options (step 9). Every change goes through a database function that checks the rules
// (supabase/migrations/20261022150000_moment_options.sql); editing needs a connection.

export interface MomentEdit {
  caption: string;
  trailWeek: number;
  isFirst: boolean;
  firstLabel: string;
  inBook: boolean;
}

export async function updateMoment(moment: TrailMoment, edit: MomentEdit) {
  const { error } = await supabase.rpc('update_moment', {
    moment: moment.momentId!,
    caption: edit.caption,
    trail_week: edit.trailWeek,
    is_first: edit.isFirst,
    first_label: edit.firstLabel,
    in_book: edit.inBook,
  });
  if (error) throw error;
}

/** Gone for everyone at once; for 30 days "Terugzetten" brings it back. */
export async function deleteMoment(moment: TrailMoment) {
  // Still on this phone: stop uploading it too.
  if (moment.queued) await removeStuck(moment.queued.clientId);
  if (!moment.momentId) return;
  const { error } = await supabase.rpc('delete_moment', { moment: moment.momentId });
  if (error) throw error;
}

export async function restoreMoment(momentId: string) {
  const { error } = await supabase.rpc('restore_moment', { moment: momentId });
  if (error) throw error;
}

/**
 * "Foto bewaren op je telefoon": every photo of the moment into the phone's photo library, in
 * the best version there is (the print version; while it's still on the phone, the local copy).
 * Asks only for permission to add photos, never to read the library. 'partial' when a photo
 * couldn't be fetched, so the app never says "saved" when it wasn't.
 */
export async function saveToPhone(moment: TrailMoment): Promise<'saved' | 'partial' | 'denied'> {
  const permission = await requestPermissionsAsync(true);
  if (!permission.granted) return 'denied';
  const stored = moment.momentId
    ? ((await supabase.from('moment_photos').select('position, print_path').eq('moment_id', moment.momentId)).data ?? [])
    : [];
  let saved = 0;
  for (const [i] of moment.photos.entries()) {
    const queued = moment.queued?.photos[i];
    if (queued) {
      await Asset.create(queued.print);
      saved++;
      continue;
    }
    const path = stored.find((p) => p.position === i)?.print_path;
    if (!path) continue;
    const { data } = await supabase.storage.from('print').createSignedUrl(path, 300);
    if (!data) continue;
    const target = new File(Paths.cache, `teddysteps-${moment.momentId}-${i}.jpg`);
    try {
      await File.downloadFileAsync(data.signedUrl, target, { idempotent: true });
      await Asset.create(target.uri);
      saved++;
    } finally {
      if (target.exists) target.delete();
    }
  }
  return saved === moment.photos.length ? 'saved' : 'partial';
}
