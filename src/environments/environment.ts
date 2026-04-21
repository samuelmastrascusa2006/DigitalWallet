// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  firebaseConfig: {
  apiKey: "AIzaSyC8byXt5EfFjzgnh0m6NrKAVPsUwJhlyFQ",
  authDomain: "digitalwallet-a096b.firebaseapp.com",
  projectId: "digitalwallet-a096b",
  storageBucket: "digitalwallet-a096b.firebasestorage.app",
  messagingSenderId: "725794322884",
  appId: "1:725794322884:web:a0b4e77830efd4e5410c91"
  },
  googleWebClientId: '725794322884-5k49648303s2uqiqtam396p2sjfpojom.apps.googleusercontent.com',
  googleRedirectUrl: 'http://localhost:8100/login',
  notificationServiceEmail: 'YOUR_NOTIFICATION_EMAIL',
  notificationServicePassword: 'YOUR_NOTIFICATION_PASSWORD'
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
