import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  // ─── Identificador único de la app ───────────────────────────────────────
  // Formato: com.tuempresa.tuapp  — NO cambiar después de publicar en stores
  appId: "com.payforce.app",
  appName: "PayForce",

  // ─── Carpeta de assets web ────────────────────────────────────────────────
  // Para Next.js con SSR usamos la URL del servidor desplegado.
  // En desarrollo apuntamos a localhost; en producción a tu dominio real.
  webDir: "out",

  // ─── Servidor remoto (modo recomendado para Next.js con SSR) ─────────────
  // Capacitor carga la URL del servidor en lugar de archivos estáticos.
  // Cambia a tu dominio de producción cuando despliegues.
  server: {
    // URL para desarrollo local — el servidor Next.js debe estar corriendo
    url: "http://localhost:3000",
    // Permite cargar contenido desde el servidor remoto en la WebView nativa
    cleartext: true,
    // Recargar la WebView cuando el servidor cambie (dev only)
    androidScheme: "https",
  },

  // ─── iOS ─────────────────────────────────────────────────────────────────
  ios: {
    // Requiere iOS 15.4+ para Tap to Pay on iPhone
    deploymentTarget: "15.4",
    // Colores del sistema (barra de estado)
    backgroundColor: "#ffffff",
    contentInset: "automatic",
    // Scroll con rebote estilo iOS
    scrollEnabled: true,
    limitsNavigationsToAppBoundDomains: true,
  },

  // ─── Android ─────────────────────────────────────────────────────────────
  android: {
    // API level mínimo para NFC y SoftPOS
    minSdkVersion: 28, // Android 9
    backgroundColor: "#ffffff",
    // Evita que el teclado se superponga al contenido
    windowSoftInputMode: "adjustResize",
  },

  // ─── Plugins nativos ─────────────────────────────────────────────────────
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      launchAutoHide: true,
      backgroundColor: "#0f172a",   // slate-900 — igual al navbar de PayForce
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      iosSpinnerStyle: "large",
      spinnerColor: "#ffffff",
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: "LIGHT",               // texto blanco en barra de estado
      backgroundColor: "#0f172a",
      overlaysWebView: false,
    },
    Keyboard: {
      resize: "body",
      style: "DARK",
      resizeOnFullScreen: true,
    },
  },
};

export default config;
