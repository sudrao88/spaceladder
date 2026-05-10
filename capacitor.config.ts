import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.spaceladders.app',
  appName: 'Space & Ladders',
  webDir: 'dist',
  backgroundColor: '#050510',
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: '#050510',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#050510',
      overlaysWebView: false,
    },
  },
};

export default config;
