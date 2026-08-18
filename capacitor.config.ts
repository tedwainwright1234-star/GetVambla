import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vambla.app',
  appName: 'Vambla',
  // We're wrapping your live Vercel deploy rather than bundling a static
  // export — the app always shows whatever is currently live on vambla.com.
  // webDir is still required by the CLI even though it's not what gets loaded.
  webDir: 'out',
  server: {
    url: 'https://vambla.com',
    cleartext: false,
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
  },
};

export default config;
