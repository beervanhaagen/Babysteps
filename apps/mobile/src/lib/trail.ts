import type { CalendarDate } from '@teddysteps/core';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { getQueue, isOnline, subscribe, type QueuedMoment } from './queue';
import { supabase } from './supabase';

export interface MomentPhoto {
  width: number;
  height: number;
  /** Storage paths once uploaded, or files on the phone while still in the queue. */
  view: PhotoSource;
  small: PhotoSource;
}

export type PhotoSource = { path: string } | { local: string };

export interface TrailMoment {
  /** The server id, or the queue's client id while the moment only exists on the phone. */
  key: string;
  momentId?: string;
  trailWeek: number;
  caption: string | null;
  isFirst: boolean;
  firstLabel: string | null;
  happenedOn: CalendarDate | null;
  createdAt: string;
  photos: MomentPhoto[];
  /** Still on the phone (fully or partly): show X2 or X4 for it. */
  queued?: QueuedMoment;
}

interface Row {
  id: string;
  client_id: string;
  trail_week: number;
  caption: string | null;
  is_first: boolean;
  first_label: string | null;
  happened_on: CalendarDate | null;
  created_at: string;
  status: 'uploading' | 'ready';
  moment_photos: { position: number; width: number; height: number; view_path: string; small_path: string }[];
}

function fromQueue(q: QueuedMoment): TrailMoment {
  return {
    key: q.clientId,
    momentId: q.momentId,
    trailWeek: q.trailWeek,
    caption: q.caption || null,
    isFirst: q.isFirst,
    firstLabel: q.firstLabel || null,
    happenedOn: q.happenedOn,
    createdAt: q.createdAt,
    photos: q.photos.map((p) => ({ width: p.width, height: p.height, view: { local: p.view }, small: { local: p.small } })),
    queued: q,
  };
}

/** The queue, live: re-renders when an upload moves on or the connection changes. */
export function useQueue() {
  const queue = useSyncExternalStore(subscribe, getQueue);
  const online = useSyncExternalStore(subscribe, isOnline);
  return { queue, online };
}

/** All moments of the trail, newest week first, including the ones still on the phone. */
export function useTrailMoments() {
  const { queue } = useQueue();
  const [rows, setRows] = useState<Row[]>([]);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from('moments')
      .select('id, client_id, trail_week, caption, is_first, first_label, happened_on, created_at, status, moment_photos(position, width, height, view_path, small_path)')
      .order('trail_week', { ascending: false })
      .order('created_at', { ascending: false });
    if (data) setRows(data as Row[]);
    setLoaded(true);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  // When an upload moves on (a moment became visible or left the queue), the server has news.
  useEffect(() => {
    const signature = () => getQueue().map((q) => q.clientId + q.stage).join();
    let last = signature();
    return subscribe(() => {
      const now = signature();
      if (now !== last) {
        last = now;
        void refresh();
      }
    });
  }, [refresh]);

  const moments: TrailMoment[] = rows.map((row) => {
    const queued = queue.find((q) => q.clientId === row.client_id);
    // Until the server has the photos, show the ones on the phone.
    if (queued && row.status === 'uploading') return { ...fromQueue(queued), key: row.id, momentId: row.id };
    return {
      key: row.id,
      momentId: row.id,
      trailWeek: row.trail_week,
      caption: row.caption,
      isFirst: row.is_first,
      firstLabel: row.first_label,
      happenedOn: row.happened_on,
      createdAt: row.created_at,
      photos: [...row.moment_photos]
        .sort((a, b) => a.position - b.position)
        .map((p) => ({ width: p.width, height: p.height, view: { path: p.view_path }, small: { path: p.small_path } })),
      queued,
    };
  });
  const onlyOnPhone = queue.filter((q) => !rows.some((r) => r.client_id === q.clientId)).map(fromQueue);
  const all = [...onlyOnPhone, ...moments].sort((a, b) => b.trailWeek - a.trailWeek || b.createdAt.localeCompare(a.createdAt));
  return { moments: all, loaded, refresh };
}

// Signed links to private photos, valid for an hour; reused until five minutes before expiry.
const SIGNED_FOR_S = 3600;
const signed = new Map<string, { url: string; until: number }>();

export async function signedUrl(path: string): Promise<string | null> {
  const hit = signed.get(path);
  if (hit && hit.until > Date.now()) return hit.url;
  const { data } = await supabase.storage.from('view').createSignedUrl(path, SIGNED_FOR_S);
  if (!data) return null;
  signed.set(path, { url: data.signedUrl, until: Date.now() + (SIGNED_FOR_S - 300) * 1000 });
  return data.signedUrl;
}

/** An image source for expo-image: a local file, or a signed link cached by its path. */
export function usePhoto(source: PhotoSource | undefined) {
  const local = source && 'local' in source ? source.local : null;
  const path = source && 'path' in source ? source.path : null;
  const [signedFor, setSignedFor] = useState<{ path: string; uri: string } | null>(null);
  useEffect(() => {
    if (!path) return;
    let alive = true;
    signedUrl(path).then((uri) => alive && uri && setSignedFor({ path, uri }));
    return () => {
      alive = false;
    };
  }, [path]);
  const uri = local ?? (signedFor?.path === path ? signedFor.uri : null);
  // The path, not the signed link, identifies the photo in the image cache.
  return uri ? { uri, cacheKey: local ?? path ?? uri } : null;
}
