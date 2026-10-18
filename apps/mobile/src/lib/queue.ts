import NetInfo from '@react-native-community/netinfo';
import type { CalendarDate } from '@teddysteps/core';
import { randomUUID } from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { AppState } from 'react-native';
import { forgetPickerCopies, makeVersions, type PhotoVersions, type PickedPhoto } from './photos';
import { supabase } from './supabase';

// The upload queue (bouwplan §4, X2, X4). A pinned moment first lands safely on the phone,
// so A4 "Vastgepind!" shows at once, also offline. Then, step by step and safe to repeat:
//   new      -> create_moment hands out the storage paths
//   created  -> small and view versions uploaded, checked by `finish-upload`: family can see it
//   visible  -> print versions uploaded and checked: ready for export and the book
// Each queue belongs to one parent and one trail, in its own folder: if someone else signs
// in on this phone, nothing of the previous parent is ever sent to their trail.

type Stage = 'new' | 'created' | 'visible';
type Part = 'small' | 'view' | 'print';

export interface QueuedPhoto extends PhotoVersions {
  takenOn: CalendarDate | null;
  paths?: Record<Part, string>;
  /** Files already on the server, so a retry only sends what's missing. */
  sent?: Partial<Record<Part, true>>;
}

export interface QueuedMoment {
  clientId: string;
  userId: string;
  trailId: string;
  trailWeek: number;
  happenedOn: CalendarDate | null;
  caption: string;
  isFirst: boolean;
  firstLabel: string;
  photos: QueuedPhoto[];
  stage: Stage;
  momentId?: string;
  createdAt: string;
  attempts: number;
  /** Set after a failed attempt; cleared when one succeeds. */
  failedAt?: string;
  nextTryAt?: string;
  /** Will never work (moment deleted elsewhere, refused by the server): X4 offers to remove it. */
  stuck?: boolean;
}

// Waits after failed attempts: 1, 2, 5, 15 minutes, then every hour.
const BACKOFF_MS = [60_000, 120_000, 300_000, 900_000, 3_600_000];
const CHECK_EVERY_MS = 30_000;

let owner: { userId: string; trailId: string } | null = null;
let items: QueuedMoment[] = [];
let loading: Promise<void> | null = null;
let online = true;
let generation = 0;
const listeners = new Set<() => void>();

const rootOf = (userId: string) => new Directory(Paths.document, 'queue', userId);
const indexOf = (userId: string) => new File(rootOf(userId), 'queue.json');

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
  if (!owner) return;
  const root = rootOf(owner.userId);
  if (!root.exists) root.create({ intermediates: true });
  await indexOf(owner.userId).write(JSON.stringify(items));
}

function load(userId: string): Promise<void> {
  loading ??= (async () => {
    try {
      const index = indexOf(userId);
      items = index.exists ? (JSON.parse(await index.text()) as QueuedMoment[]).filter((q) => q.userId === userId) : [];
      // Folders left behind by a crash while pinning, or by a moment that finished.
      const root = rootOf(userId);
      if (root.exists) {
        for (const entry of root.list()) {
          if (entry instanceof Directory && !items.some((q) => q.clientId === entry.name)) entry.delete();
        }
      }
    } catch {
      items = [];
    }
    emit();
  })();
  return loading;
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
  if (!owner) throw new Error('The queue has not started');
  await loading;
  const clientId = randomUUID();
  const folder = new Directory(rootOf(owner.userId), clientId);
  folder.create({ intermediates: true });
  const photos: QueuedPhoto[] = [];
  for (const [position, photo] of moment.photos.entries()) {
    photos.push({ ...(await makeVersions(photo, position, moment.isFirst, folder)), takenOn: photo.takenOn });
  }
  forgetPickerCopies(moment.photos);
  const dates = photos.map((p) => p.takenOn).filter((d): d is CalendarDate => !!d).sort();
  const queued: QueuedMoment = {
    clientId,
    userId: owner.userId,
    trailId: owner.trailId,
    trailWeek: Math.min(Math.max(moment.trailWeek, 1), 104),
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

/** A failure that retrying won't fix. */
class Permanent extends Error {}
/** The signed-in parent changed: stop, and leave this queue alone. */
class OtherParent extends Error {}

const PERMANENT_DB = ['42501', '22023', '22007', '23514', 'P0002'];

function classify(error: unknown): Error {
  const e = error as { code?: string; status?: number; statusCode?: string | number; context?: { status?: number } };
  const status = Number(e.status ?? e.statusCode ?? e.context?.status);
  if ((e.code && PERMANENT_DB.includes(e.code)) || [400, 403, 404, 410, 413, 422].includes(status)) return new Permanent(String(e.code ?? status));
  return error instanceof Error ? error : new Error(String(error));
}

const CONTENT: Record<Part, { bucket: 'view' | 'print'; type: string }> = {
  small: { bucket: 'view', type: 'image/jpeg' },
  view: { bucket: 'view', type: 'image/webp' },
  print: { bucket: 'print', type: 'image/jpeg' },
};

async function send(photo: QueuedPhoto, part: Part) {
  if (photo.sent?.[part]) return;
  const body = await new File(photo[part]).arrayBuffer();
  const { bucket, type } = CONTENT[part];
  const { error } = await supabase.storage.from(bucket).upload(photo.paths![part], body, { contentType: type, upsert: true });
  if (error) throw classify(error);
  photo.sent = { ...photo.sent, [part]: true };
  await save();
}

async function finish(item: QueuedMoment, part: 'view' | 'print') {
  const { data, error } = await supabase.functions.invoke('finish-upload', { body: { moment_id: item.momentId, part } });
  if (error) throw classify(error);
  if (data?.result !== 'done') {
    // The server misses files we thought were sent: send them all again next time.
    for (const photo of item.photos) photo.sent = {};
    throw new Error(`${part} versions missing on the server`);
  }
}

async function step(item: QueuedMoment) {
  // Never send one parent's photos with another parent's session.
  const { data } = await supabase.auth.getSession();
  if (data.session?.user.id !== item.userId) throw new OtherParent();

  if (item.stage === 'new') {
    const { data: rows, error } = await supabase.rpc('create_moment', {
      expected_trail: item.trailId,
      moment_client_id: item.clientId,
      moment_trail_week: item.trailWeek,
      moment_happened_on: item.happenedOn,
      moment_caption: item.caption,
      moment_is_first: item.isFirst,
      moment_first_label: item.firstLabel,
      photos: item.photos.map((p) => ({ taken_at: p.takenOn, width: p.width, height: p.height, print_long_edge: p.printLongEdge })),
    });
    if (error) throw classify(error);
    const paths = rows as { moment_id: string; photo_position: number; print_path: string; view_path: string; small_path: string }[];
    item.momentId = paths[0].moment_id;
    for (const row of paths) {
      item.photos[row.photo_position].paths = { print: row.print_path, view: row.view_path, small: row.small_path };
    }
    item.stage = 'created';
  } else if (item.stage === 'created') {
    // Small first: the family page and e-mail need it soonest.
    for (const photo of item.photos) await send(photo, 'small');
    for (const photo of item.photos) await send(photo, 'view');
    await finish(item, 'view');
    item.stage = 'visible';
  } else {
    for (const photo of item.photos) await send(photo, 'print');
    await finish(item, 'print');
    forget(item.clientId);
  }
}

function forget(clientId: string) {
  if (owner) {
    const folder = new Directory(rootOf(owner.userId), clientId);
    if (folder.exists) folder.delete();
  }
  items = items.filter((i) => i.clientId !== clientId);
}

let running: Promise<void> | null = null;
let again = false;

const due = (item: QueuedMoment, now: number) => !item.stuck && (!item.nextTryAt || Date.parse(item.nextTryAt) <= now);

/**
 * Works through the queue; only one run at a time. Called again while running, it runs once
 * more afterwards, so a moment pinned during an upload doesn't wait. `force` ignores waiting
 * times (the "Nu opnieuw proberen" button).
 */
export function run(force = false): Promise<void> {
  if (force) for (const item of items) item.nextTryAt = undefined;
  if (running) {
    again = true;
    return running;
  }
  const started = generation;
  running = (async () => {
    do {
      again = false;
      await loading;
      for (const item of [...items]) {
        if (!online || generation !== started) return;
        if (!due(item, Date.now())) continue;
        try {
          while (items.includes(item) && generation === started) {
            await step(item);
            item.failedAt = item.nextTryAt = undefined;
            item.attempts = 0;
            await save();
            emit();
          }
        } catch (error) {
          if (error instanceof OtherParent) return;
          item.attempts += 1;
          item.failedAt = new Date().toISOString();
          if (error instanceof Permanent) item.stuck = true;
          else item.nextTryAt = new Date(Date.now() + BACKOFF_MS[Math.min(item.attempts, BACKOFF_MS.length) - 1]).toISOString();
          await save();
          emit();
        }
      }
    } while (again && generation === started);
  })().finally(() => {
    running = null;
  });
  return running;
}

/** Starts the queue for this parent and trail. Retries on reconnect, on return to the app, and when a wait is over. */
export function startQueue(userId: string, trailId: string) {
  if (owner?.userId !== userId) {
    generation += 1;
    loading = null;
    items = [];
  }
  owner = { userId, trailId };
  void load(userId).then(() => run());
  const net = NetInfo.addEventListener((state) => {
    const was = online;
    online = state.isConnected !== false && state.isInternetReachable !== false;
    if (online !== was) emit();
    if (online && !was) void run();
  });
  const app = AppState.addEventListener('change', (state) => state === 'active' && void run());
  const timer = setInterval(() => {
    const now = Date.now();
    if (items.some((i) => i.failedAt && due(i, now))) void run();
  }, CHECK_EVERY_MS);
  return () => {
    net();
    app.remove();
    clearInterval(timer);
  };
}

/** X4 "Van telefoon verwijderen" for a moment that will never upload. */
export async function removeStuck(clientId: string) {
  forget(clientId);
  await save();
  emit();
}

/** Stops uploading and removes this parent's queue from the phone, for signing out. */
export async function clearQueue() {
  generation += 1;
  await running;
  if (owner) {
    const root = rootOf(owner.userId);
    if (root.exists) root.delete();
  }
  owner = null;
  loading = null;
  items = [];
  emit();
}
