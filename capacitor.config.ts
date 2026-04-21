const config = {
  appId: 'com.novavault.app',
  appName: 'NovaVault',
  webDir: 'www',
  bundledWebRuntime: false,
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      showSpinner: false,
      backgroundColor: '#1a1a2e'
    },
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert']
    },
    GoogleSignIn: {
      clientId: '725794322884-5k49648303s2uqiqtam396p2sjfpojom.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  }
};

export default config;
