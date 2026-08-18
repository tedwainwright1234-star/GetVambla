import { Preferences } from '@capacitor/preferences';

const ONBOARDING_KEY = 'vambla_has_seen_welcome';

/**
 * Whether this device has already dismissed the welcome screen.
 * Preferences persists natively (UserDefaults on iOS, SharedPreferences on
 * Android) so this survives app restarts.
 */
export async function hasSeenWelcome(): Promise<boolean> {
  const { value } = await Preferences.get({ key: ONBOARDING_KEY });
  return value === 'true';
}

export async function markWelcomeSeen(): Promise<void> {
  await Preferences.set({ key: ONBOARDING_KEY, value: 'true' });
}

// Handy during development/testing to re-trigger the welcome screen.
export async function resetWelcomeSeen(): Promise<void> {
  await Preferences.remove({ key: ONBOARDING_KEY });
}
