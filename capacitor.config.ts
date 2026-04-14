import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId:   "com.payforce.app",
  appName: "PayForce",
  webDir:  "out",

  server: {
    url:           "http://localhost:3000",
    cleartext:     true,
    androidScheme: "https",
  },

  ios: {
    backgroundColor:                  "#ffffff",
    scrollEnabled:                    true,
    limitsNavigationsToAppBoundDomains: true,
  },

  android: {
    backgroundColor: "#ffffff",
  },

  plugins: {
    SplashScreen: {
      launchShowDuration:         1500,
      launchAutoHide:             true,
      backgroundColor:            "#0f172a",
      androidSplashResourceName:  "splash",
      androidScaleType:           "CENTER_CROP",
      showSpinner:                false,
      iosSpinnerStyle:            "large",
      spinnerColor:               "#ffffff",
      splashFullScreen:           true,
      splashImmersive:            true,
    },
    StatusBar: {
      style:           "LIGHT",
      backgroundColor: "#0f172a",
      overlaysWebView: false,
    },
    Keyboard: {
      resize:             "body",
      style:              "DARK",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
