import NetInfo from '@react-native-community/netinfo';
import type { CalendarDate } from '@teddysteps/core';
import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { AppState } from 'react-native';
import { makeVersions, type PhotoVersions, type PickedPhoto } from './photos';
import { supabase } from './supabase';

// The upload queue (bouwplan §4, X2, X4). A pinned moment first lands safely on the phone,
// so A4 "Vastgepind!" shows at once, also offline. Then, step by step and safe to repeat:
//   new      -> create_moment hands out the storage paths
//   created  -> small and view versions uploaded, finish_upload('view'): family can see it
//   visible  -> print versions uploaded, finish_upload('print'): ready for export and the book
// Every step can be retried: the server recognises the moment by its client_id, and uploads
// overwrite their own half-finished files.

type Stage = 'new' | 'created' | 'visible';

export interface QueuedPhoto extends PhotoVersions {
  takenOn: CalendarDate | null;
  paths?: { print: string; view: string; small: string };
}

export interface QueuedMoment {
  clientId: string;
  trailWeek: number;
  happenedOn: CalendarDate | null;
  caption: string;
  isFirst: boolean;
  firstLabel: string;
  photos: QueuedPhoto[];
  stage: Stage;
  momentId?: string;
  createdAt: string;
  /** Set after a failed attempt; cleared when one succeeds. */
  failedAt?: string;
  attempts: number;
}

// Made when first needed, not when the module loads.
const root = () => new Directory(Paths.document, 'queue');
const index = () => new File(root(), 'queue.json');
const RETRY_AFTER_MS = 60_000;

let items: QueuedMoment[] = [];
let loaded = false;
let online = true;
const listeners = new Set<() => void>();

function emit() {
  items = [...items];
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getQueue() {
  return items;
}

export function isOnline() {
  return online;
}

async function save() {
  if (!root().exists) root().create({ intermediates: true });
  await index().write(JSON.stringify(items));
}

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    if (index().exists) items = JSON.parse(await index().text()) as QueuedMoment[];
  } catch {
    items = [];
  }
  emit();
}

export interface NewMoment {
  photos: PickedPhoto[];
  trailWeek: number;
  caption: string;
  isFirst: boolean;
  firstLabel: string;
}

/** Makes the photo versions, stores the moment on the phone and starts uploading. */
export async function pin(moment: NewMoment): Promise<QueuedMoment> {
  await load();
  const clientId = randomUUID();
  const folder = new Directory(root(), clientId);
  folder.create({ intermediates: true });
  const photos: QueuedPhoto[] = [];
  for (const [position, photo] of moment.photos.entries()) {
    photos.push({ ...(await makeVersions(photo, position, moment.isFirst, folder)), takenOn: photo.takenOn });
  }
  const dates = photos.map((p) => p.takenOn).filter((d): d is CalendarDate => !!d).sort();
  const queued: QueuedMoment = {
    clientId,
    trailWeek: moment.trailWeek,
    happenedOn: dates[0] ?? null,
    caption: moment.caption.trim(),
    isFirst: moment.isFirst,
    firstLabel: moment.firstLabel.trim(),
    photos,
    stage: 'new',
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  items.push(queued);
  await save();
  emit();
  void run();
  return queued;
}

async function upload(bucket: 'view' | 'print', path: string, uri: string, contentType: string) {
  const body = await new File(uri).arrayBuffer();
  const { error } = await supabase.storage.from(bucket).upload(path, body, { contentType, upsert: true });
  if (error) throw error;
}

async function step(item: QueuedMoment) {
  if (item.stage === 'new') {
    const { data, error } = await supabase.rpc('create_moment', {
      moment_client_id: item.clientId,
      moment_trail_week: item.trailWeek,
      moment_happened_on: item.happenedOn,
      moment_caption: item.caption,
      moment_is_first: item.isFirst,
      moment_first_label: item.firstLabel,
      photos: item.photos.map((p) => ({ taken_at: p.takenOn, width: p.width, height: p.height, print_long_edge: p.printLongEdge })),
    });
    if (error) throw error;
    const rows = data as { moment_id: string; photo_position: number; print_path: string; view_path: string; small_path: string }[];
    item.momentId = rows[0].moment_id;
    for (const row of rows) {
      item.photos[row.photo_position].paths = { print: row.print_path, view: row.view_path, small: row.small_path };
    }
    item.stage = 'created';
  } else if (item.stage === 'created') {
    // Small first: the family page and e-mail need it soonest.
    for (const photo of item.photos) await upload('view', photo.paths!.small, photo.small, 'image/jpeg');
    for (const photo of item.photos) await upload('view', photo.paths!.view, photo.view, 'image/webp');
    const { data, error } = await supabase.rpc('finish_upload', { finished_moment: item.momentId, part: 'view' });
    if (error) throw error;
    if (data !== 'done') throw new Error('view versions missing on the server');
    item.stage = 'visible';
  } else {
    for (const photo of item.photos) await upload('print', photo.paths!.print, photo.print, 'image/jpeg');
    const { data, error } = await supabase.rpc('finish_upload', { finished_moment: item.momentId, part: 'print' });
    if (error) throw error;
    if (data !== 'done') throw new Error('print versions missing on the server');
    // Everything is on the server: the copies on the phone can go.
    new Directory(root(), item.clientId).delete();
    items = items.filter((i) => i.clientId !== item.clientId);
  }
}

let running: Promise<void> | null = null;

/** Works through the queue; only one run at a time. Safe to call as often as you like. */
export function run(): Promise<void> {
  if (!running) {
    running = (async () => {
      await load();
      for (const item of [...items]) {
        if (!online) break;
        try {
          while (items.includes(item)) {
            await step(item);
            item.failedAt = undefined;
            await save();
            emit();
          }
        } catch {
          item.attempts += 1;
          item.failedAt = new Date().toISOString();
          await save();
          emit();
        }
      }
    })().finally(() => {
      running = null;
    });
  }
  return running;
}

/** Retry after coming back online, when the app comes to the front, and every minute. */
export function startQueue() {
  void load().then(run);
  const net = NetInfo.addEventListener((state) => {
    const was = online;
    online = state.isConnected !== false && state.isInternetReachable !== false;
    if (online !== was) emit();
    if (online && !was) void run();
  });
  const app = AppState.addEventListener('change', (state) => state === 'active' && void run());
  const timer = setInterval(() => items.some((i) => i.failedAt) && void run(), RETRY_AFTER_MS);
  return () => {
    net();
    app.remove();
    clearInterval(timer);
  };
}

/** Removes everything on the phone, for signing out. */
export async function clearQueue() {
  items = [];
  if (root().exists) root().delete();
  emit();
}
