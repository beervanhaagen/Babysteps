import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, processLock } from '@supabase/supabase-js';
import * as aesjs from 'aes-js';
import { getRandomValues } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';

// The session is encrypted on the phone: a fresh AES key per write lives in the Keychain
// (iOS) or Keystore (Android); only the encrypted session sits in AsyncStorage, because
// SecureStore can't hold values that large. Pattern from Supabase's Expo guide.
// Keys stay on this device (no iCloud Keychain) and are readable after the first unlock,
// so uploads can still refresh the session while the phone is locked (step 3).
const KEYCHAIN = { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY };

class LargeSecureStore {
  private async encrypt(key: string, value: string) {
    const encryptionKey = getRandomValues(new Uint8Array(256 / 8));
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encrypted = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey), KEYCHAIN);
    return aesjs.utils.hex.fromBytes(encrypted);
  }

  private async decrypt(key: string, value: string) {
    try {
      const keyHex = await SecureStore.getItemAsync(key, KEYCHAIN);
      if (!keyHex) return null;
      const cipher = new aesjs.ModeOfOperation.ctr(aesjs.utils.hex.toBytes(keyHex), new aesjs.Counter(1));
      return aesjs.utils.utf8.fromBytes(cipher.decrypt(aesjs.utils.hex.toBytes(value)));
    } catch {
      // Key and data out of step (e.g. the app stopped mid-write): sign in again rather than crash.
      return null;
    }
  }

  async getItem(key: string) {
    const encrypted = await AsyncStorage.getItem(key);
    return encrypted ? this.decrypt(key, encrypted) : null;
  }

  async setItem(key: string, value: string) {
    await AsyncStorage.setItem(key, await this.encrypt(key, value));
  }

  async removeItem(key: string) {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key, KEYCHAIN);
  }
}

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;
if (!url || !key) {
  throw new Error('EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_KEY are missing. Run `npm run local-env` (see README).');
}

export const supabase = createClient(url, key, {
  auth: {
    storage: new LargeSecureStore(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // One session read or write at a time, so key and data never get out of step.
    lock: processLock,
  },
});

// Only refresh the session while the app is on screen.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});
