import type { CapacitorConfig } from '@capacitor/cli';

// Capacitor wraps the built web app inside a native Android shell.
// Point `webDir` at the client SPA build output. See MOBILE_DESKTOP_BUILD.md.
const config: CapacitorConfig = {
  appId: 'app.streamflix.mobile',
  appName: 'StreamFlix',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
  },
};

export default config;