import { possessive } from '@teddysteps/core';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { border, Button, color, radius, text, useAnnounce } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';
import { TextLink } from '@/components/TextLink';
import { useAuth } from '@/lib/auth';
import { buildExport, ExportStopped, exportSize, NotEnoughSpace, type ExportProgress } from '@/lib/export';
import { useQueue } from '@/lib/trail';

// M6 "Alles downloaden" (board Account-3): every photo in print quality, the captions, firsts
// and hugs, as one or more ZIP files to save in Files, on a computer or wherever you like.
const GB = 1_000_000_000;
const size = (bytes: number) => (bytes >= GB ? `${(bytes / GB).toFixed(1).replace('.', ',')} GB` : `${Math.max(1, Math.round(bytes / 1_000_000))} MB`);

export default function Download() {
  const { state } = useAuth();
  const { queue } = useQueue();
  const [estimate, setEstimate] = useState<{ moments: number; photos: number; bytes: number; parts: number } | null>(null);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [files, setFiles] = useState<string[] | null>(null);
  const [error, setError] = useState<string>();
  useAnnounce(error ?? (files ? 'Klaar. Kies waar je het bewaart.' : undefined));

  const [stopped, setStopped] = useState(false);
  const stopping = useRef(false);
  const load = () => exportSize().then(setEstimate, () => setError('Dat lukte even niet. Check je internet en probeer het opnieuw.'));
  useEffect(() => {
    void load();
  }, []);
  const measure = () => {
    setError(undefined);
    void load();
  };
  // Also while the trail is being deleted (M7): "Eerst alles bewaren?".
  const trail = state.status === 'ready' || state.status === 'leaving' ? state.trail : null;
  if (!trail || (state.status !== 'ready' && state.status !== 'leaving')) return null;
  const email = state.session.user.email ?? null;
  const waiting = queue.length;

  async function start() {
    setError(undefined);
    setFiles(null);
    setStopped(false);
    stopping.current = false;
    setProgress({ done: 0, total: estimate?.photos ?? 0, part: 1, parts: estimate?.parts ?? 1 });
    await activateKeepAwakeAsync('export').catch(() => undefined);
    try {
      setFiles(await buildExport(trail!, email, setProgress, () => stopping.current));
    } catch (e) {
      if (e instanceof ExportStopped) setStopped(true);
      else setError(
        e instanceof NotEnoughSpace
          ? `Je telefoon heeft ongeveer ${size(e.needed)} vrije ruimte nodig. Maak wat ruimte vrij en probeer het opnieuw.`
          : 'Het downloaden stopte halverwege. Check je internet en probeer het opnieuw.',
      );
    }
    setProgress(null);
    deactivateKeepAwake('export');
  }

  async function share(uri: string) {
    if (!(await Sharing.isAvailableAsync())) return setError('Delen kan niet op deze telefoon.');
    await Sharing.shareAsync(uri, { mimeType: 'application/zip', UTI: 'public.zip-archive', dialogTitle: `${possessive(trail!.childName)} pad` });
  }

  return (
    <Screen header={{ title: 'Alles downloaden', color: 'lilac', onBack: progress ? undefined : router.back, character: 'bo' }}>
      <Text style={styles.body}>
        Alle foto’s van {possessive(trail.childName)} pad in printkwaliteit, met de bijschriften, eerste keren en knuffels erbij. Je opent het in elke browser, ook zonder
        TeddySteps.
      </Text>
      {estimate ? (
        <Text style={styles.meta}>
          {estimate.moments === 1 ? '1 moment' : `${estimate.moments} momenten`}, {estimate.photos === 1 ? '1 foto' : `${estimate.photos} foto’s`}, ongeveer{' '}
          {size(estimate.bytes)}
          {estimate.parts > 1 ? `, in ${estimate.parts} delen` : ''}.
        </Text>
      ) : null}
      {waiting ? (
        <Text style={styles.meta}>
          {waiting === 1
            ? '1 moment staat nog alleen op je telefoon en komt er pas in als het is verstuurd.'
            : `${waiting} momenten staan nog alleen op je telefoon en komen er pas in als ze zijn verstuurd.`}
        </Text>
      ) : null}

      {progress ? (
        <View style={styles.progress} accessible accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: progress.total, now: progress.done }}>
          <Text style={styles.progressText}>
            Foto {progress.done} van {progress.total}
            {progress.parts > 1 ? ` · deel ${progress.part} van ${progress.parts}` : ''}
          </Text>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${progress.total ? Math.round((progress.done / progress.total) * 100) : 0}%` }]} />
          </View>
          <Text style={styles.meta}>Laat de app open, liefst op wifi.</Text>
          <TextLink onPress={() => (stopping.current = true)}>Stoppen</TextLink>
        </View>
      ) : files ? (
        <View style={styles.done}>
          <Text role="status" style={styles.progressText}>
            Klaar! Kies waar je het bewaart, bijvoorbeeld in Bestanden of op je computer.
          </Text>
          {files.map((uri, i) => (
            <Button key={uri} block icon="share" variant={i === 0 ? 'primary' : 'paper'} onPress={() => share(uri)}>
              {files.length > 1 ? `Bewaar deel ${i + 1} van ${files.length}` : 'Bewaar het bestand'}
            </Button>
          ))}
        </View>
      ) : estimate && !estimate.photos ? (
        <Text style={styles.meta}>Er staan nog geen foto’s op het pad. Pin je eerste moment, dan kun je het hier bewaren.</Text>
      ) : !estimate && error ? (
        <Button block variant="paper" onPress={measure}>
          Probeer opnieuw
        </Button>
      ) : (
        <Button block icon="download" onPress={start} disabled={!estimate}>
          Alles downloaden
        </Button>
      )}
      {stopped ? <Text style={styles.meta}>Gestopt. Je kunt het later opnieuw proberen.</Text> : null}
      {error ? (
        <Text role="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
      <Text style={styles.meta}>Het bestand is niet versleuteld: bewaar het op een plek die alleen jij kunt openen. Momenten die je verwijderde staan er niet in.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { ...text('body'), fontSize: 15, lineHeight: 22 },
  meta: { ...text('meta'), color: color.inkMuted },
  error: { ...text('meta'), color: color.plum },
  progress: { gap: 8 },
  progressText: { ...text('rowTitle') },
  track: { height: 16, borderRadius: radius.radiusPill, borderWidth: border.edge, borderColor: color.ink, backgroundColor: color.card, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: color.sunshine },
  done: { gap: 10 },
});
