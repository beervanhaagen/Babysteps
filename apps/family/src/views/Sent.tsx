import { possessive } from '@teddysteps/core';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { border, Button, Character, color, fontFamily, Hug, Scallop, shadow, space, text } from '@teddysteps/ui';
import { api, type FamilyPage } from '../api';
import { navigate, useView } from '../route';
import { Heading, Page, TextLink } from './shared';

// F4 Stuur liefde, after "Knuffelen" on a card (the hug itself is sent from the card, so
// reloading this page never sends another). Voice notes come in step 6. "Naar Sam en Alex"
// needs the parents' first names, which aren't asked yet.
export function Sent({ page, onBookList }: { page: FamilyPage; onBookList: () => void }) {
  const name = page.child.firstName;
  const [failed, setFailed] = useState(false);
  useView('Knuffel verstuurd');

  async function joinList() {
    try {
      await api.bookList();
      onBookList();
    } catch {
      setFailed(true);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.band}>
        <View role="status" style={styles.status}>
          <Hug size={56} decorative />
          <Heading style={styles.title}>Knuffel verstuurd!</Heading>
        </View>
      </View>
      <Scallop color="pistachio" />
      <Page>
        <View style={styles.book}>
          <View style={styles.cover} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Character name="puddle" size={70} motion={null} decorative />
          </View>
          <View style={styles.bookText}>
            <Text style={text('titleS')}>Dit later op papier?</Text>
            <Text style={styles.body}>Na een jaar wordt {possessive(name)} pad een boek. Ook een voor jou?</Text>
            {page.me.onBookList ? (
              <Text role="status" style={styles.done}>
                Genoteerd! We laten het je weten.
              </Text>
            ) : (
              <Button size="md" variant="sunshine" onPress={joinList}>
                Laat het me weten
              </Button>
            )}
            {failed ? (
              <Text role="alert" style={styles.error}>
                Dat lukte even niet. Probeer het zo nog eens.
              </Text>
            ) : null}
          </View>
        </View>
        <TextLink onPress={() => navigate('/')}>Terug naar de kaartjes</TextLink>
      </Page>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  band: { backgroundColor: color.pistachio, paddingHorizontal: 22, paddingTop: 20, paddingBottom: 10 },
  status: { flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%', maxWidth: 520, alignSelf: 'center' },
  title: { ...text('titleL'), flex: 1 },
  book: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
    padding: 14,
    marginTop: space.space4,
    borderRadius: 20,
    borderWidth: border.edge,
    borderColor: color.ink,
    backgroundColor: color.butter,
    boxShadow: shadow.shadowMd,
    transform: [{ rotate: '-1deg' }],
  },
  cover: {
    width: 92,
    height: 92,
    borderRadius: 10,
    borderWidth: border.edge,
    borderColor: color.ink,
    backgroundColor: color.pistachio,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  bookText: { flex: 1, gap: 8, alignItems: 'flex-start' },
  body: { fontFamily: fontFamily('sans', 700), fontSize: 15, lineHeight: 21, color: color.ink },
  done: { fontFamily: fontFamily('sans', 800), fontSize: 15, color: color.ink },
  error: { fontFamily: fontFamily('sans', 700), fontSize: 14, color: color.plum },
});
