import { type ReactNode } from 'react';
import { View } from 'react-native';
import { Callout, color, type CharacterName, type SoftBlock, type TabId } from '@teddysteps/ui';
import { Screen } from '@/components/Screen';
import { Tabs } from '@/components/Tabs';

// Placeholder for a tab whose screens come in a later step (B1 step 9, M3 step 8, M1 step 8).
// Never shipped like this: these are replaced before the test families start.
export function ComingSoon(props: { title: string; tab: TabId; tone: SoftBlock; character: CharacterName; step: string; children?: ReactNode }) {
  return (
    <View style={{ flex: 1, backgroundColor: color.paper }}>
      <Screen header={{ title: props.title, color: props.tone, character: props.character }}>
        <Callout title="Hier wordt nog aan gebouwd" tone={props.tone}>
          {`Dit scherm komt in ${props.step} van het bouwplan.`}
        </Callout>
        {props.children}
      </Screen>
      <Tabs active={props.tab} />
    </View>
  );
}
