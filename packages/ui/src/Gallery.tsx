import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Button, ChoiceChip, IconButton, Switch } from './actions';
import { icons } from './art';
import { Character, Doodle, Hug, Icon, Wordmark, type CharacterName, type DoodleName, type IconName } from './brand';
import { Avatar, EmptySlot, HugToast, MomentCard, PersonRow, Sticker } from './content';
import { CodeInput, TextField } from './forms';
import { ScreenHeader, StepProgress, TabBar, type TabId } from './navigation';
import { text, type TypeName } from './text';
import { color, space } from './tokens';

// Every component of step 1 with sample copy from the boards, to lay next to the designs.
// Only reachable in development; real screens never import this.
const GANG: CharacterName[] = ['bo', 'tiggy', 'bizzy', 'puddle'];
const DOODLES: DoodleName[] = ['star', 'twinkle', 'heart', 'sparkle', 'sun', 'zigzag', 'squiggle'];
const TYPE: [TypeName, string][] = [
  ['display', 'Vastgepind in week 31!'],
  ['titleL', 'Lottes kring'],
  ['titleM', 'Week 28 · Zat rechtop'],
  ['titleS', 'Geklapt. Nergens om.'],
  ['buttonLg', 'Moment toevoegen'],
  ['rowTitle', 'Familie en delen'],
  ['body', 'Niemand vindt Lottes pad zonder uitnodiging.'],
  ['meta', 'Week 31 · voeg een moment toe'],
  ['note', 'week 9! lachte naar de hond'],
];

export function Gallery({ topInset = 0, bottomInset = 0 }: { topInset?: number; bottomInset?: number }) {
  const [tab, setTab] = useState<TabId>('trail');
  const [born, setBorn] = useState('ja');
  const [firsts, setFirsts] = useState<string[]>(['Lachje']);
  const [sunday, setSunday] = useState(true);
  const [keep, setKeep] = useState(false);
  const toggle = (f: string) => setFirsts((all) => (all.includes(f) ? all.filter((x) => x !== f) : [...all, f]));

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <ScreenHeader title="Galerij" subtitle="Alle onderdelen van stap 1" color="cornflower" character="bizzy" topInset={topInset} />
        <View style={styles.body}>
          <Section title="Woordmerk en de gang">
            <Wordmark size={48} />
            <Row>
              {GANG.map((name, i) => (
                <Character key={name} name={name} size={72} delay={((i % 3) + 1) as 1 | 2 | 3} />
              ))}
            </Row>
            <Row>
              {GANG.map((name) => (
                <Character key={name} name={name} mood="happy" size={72} motion={null} />
              ))}
            </Row>
            <Hug size={140} />
            <Row>
              {DOODLES.map((name, i) => (
                <Doodle key={name} name={name} delay={((i % 3) + 1) as 1 | 2 | 3} />
              ))}
            </Row>
          </Section>

          <Section title="Iconen">
            <Row>
              {(Object.keys(icons) as IconName[]).map((name) => (
                <Icon key={name} name={name} />
              ))}
            </Row>
          </Section>

          <Section title="Letters">
            {TYPE.map(([name, sample]) => (
              <Text key={name} style={[text(name), name === 'note' && { transform: [{ rotate: '-4deg' }] }]}>
                {sample}
              </Text>
            ))}
          </Section>

          <Section title="Knoppen">
            <Button block>Vastpinnen</Button>
            <Button variant="dark" icon="share">Deel het pad</Button>
            <Button variant="paper">Later</Button>
            <Button variant="sunshine" size="md">Waarom?</Button>
            <Button variant="danger" size="md" icon="trash">Pad verwijderen</Button>
            <Button disabled>Nog even wachten</Button>
            <Row>
              <IconButton icon="back" label="Terug" />
              <IconButton icon="close" label="Sluiten" tone="white" />
              <IconButton icon="more" label="Meer" tone="paper" />
            </Row>
          </Section>

          <Section title="Keuzes en schakelaars">
            <Row>
              <ChoiceChip selected={born === 'ja'} onPress={() => setBorn('ja')}>Ja, geboren!</ChoiceChip>
              <ChoiceChip selected={born === 'nee'} onPress={() => setBorn('nee')}>Nog onderweg</ChoiceChip>
            </Row>
            <Row>
              {['Lachje', 'Omrollen', 'Eerste hapje'].map((f) => (
                <ChoiceChip key={f} type="checkbox" selected={firsts.includes(f)} onPress={() => toggle(f)}>
                  {f}
                </ChoiceChip>
              ))}
            </Row>
            <View>
              <Switch label="Seintje op zondag" hint="Als de week nog leeg is, zondag om 19.00 uur" value={sunday} onValueChange={setSunday} />
              <Switch label="Familie mag foto’s bewaren" value={keep} onValueChange={setKeep} />
            </View>
          </Section>

          <Section title="Velden">
            <TextField label="Naam of roepnaam" placeholder="Lotte" />
            <TextField label="Uitgerekende datum" hint="Sprongetjes tellen vanaf deze datum" placeholder="dd-mm-jjjj" />
            <TextField label="E-mailadres" error="Dit e-mailadres klopt nog niet helemaal" defaultValue="oma@" />
            <CodeInput value="482" />
            <StepProgress current={1} total={3} />
          </Section>

          <Section title="Headers">
            <View style={styles.bleed}>
              <ScreenHeader title="Wie is de kleine ontdekker?" onBack={() => {}} step={[1, 3]} character="tiggy" />
            </View>
            <View style={styles.bleed}>
              <ScreenHeader title="Familie" subtitle="Wie volgt Lotte?" color="pistachio" character="puddle" onBack={() => {}} />
            </View>
            <View style={styles.bleed}>
              <ScreenHeader title="Activiteit" color="butter" action={<IconButton icon="plus" label="Iemand uitnodigen" tone="white" />} />
            </View>
          </Section>

          <Section title="Inhoud">
            <Row>
              <Sticker>Week 31</Sticker>
              <Sticker tone="white" icon="lock">Alleen jouw kring</Sticker>
              <Sticker tone="pistachio">Eerste keer</Sticker>
            </Row>
            <Row>
              <Avatar name="Oma Ria" />
              <Avatar name="Opa Henk" tone="butter" />
              <Avatar name="Tante Sanne" tone="lilac" size={56} />
            </Row>
            <View>
              <PersonRow name="Oma Ria" role="Familie · kijkt, knuffelt, spreekt in" action="Wijzig" />
              <PersonRow name="Opa Henk" role="Uitnodiging 2 dagen geleden verstuurd" tone="butter" action="Opnieuw sturen" />
            </View>
            <MomentCard photos={[]} caption="Drie hele seconden lang. Toen omgerold, met stijl." date="za 17 okt" hugs={9} />
            <MomentCard photos={[]} layout="compact" caption="Klapte. Nergens om." date="wo 14 okt" hugs={6} onPress={() => {}} />
            <HugToast title="Oma Ria stuurde een knuffel">Bij week 31: geklapt</HugToast>
            <EmptySlot />
          </Section>
        </View>
      </ScrollView>
      <TabBar active={tab} onChange={setTab} bottomInset={bottomInset} />
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[text('eyebrow'), styles.eyebrow]}>{title}</Text>
      {children}
    </View>
  );
}

function Row({ children }: { children: ReactNode }) {
  return <View style={styles.row}>{children}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  body: { paddingHorizontal: space.space6, gap: space.space7, paddingTop: space.space4 },
  section: { gap: space.space4 },
  eyebrow: { textTransform: 'uppercase', color: color.inkMuted },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.space3, alignItems: 'center' },
  bleed: { marginHorizontal: -space.space6 },
});
