import { useFonts } from 'expo-font';

// Static, Latin-subset fonts built by scripts/build-fonts.py. The app bundles TTF;
// the family page gets WOFF2 from fonts.web.ts. Never load fonts from Google.
const fontAssets = {
  'Fraunces-Bold': require('../assets/fonts/Fraunces-Bold.ttf'),
  'Fraunces-ExtraBold': require('../assets/fonts/Fraunces-ExtraBold.ttf'),
  'Fraunces-ExtraBoldItalic': require('../assets/fonts/Fraunces-ExtraBoldItalic.ttf'),
  'Nunito-Regular': require('../assets/fonts/Nunito-Regular.ttf'),
  'Nunito-Bold': require('../assets/fonts/Nunito-Bold.ttf'),
  'Nunito-ExtraBold': require('../assets/fonts/Nunito-ExtraBold.ttf'),
  'ShantellSans-Medium': require('../assets/fonts/ShantellSans-Medium.ttf'),
  'ShantellSans-Bold': require('../assets/fonts/ShantellSans-Bold.ttf'),
  'BagelFatOne-Regular': require('../assets/fonts/BagelFatOne-Regular.ttf'),
};

/** Loads the TeddySteps fonts. Render nothing (or the splash) until it returns true. */
export function useTeddyFonts(): boolean {
  const [loaded, error] = useFonts(fontAssets);
  // On a font error we still render, with system fonts, rather than a blank screen.
  return loaded || error != null;
}
