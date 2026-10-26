/*
 * Workspace settings. This is the only file you need to edit.
 *
 * 1. Paste your Firebase web app config below (Firebase console → Project settings →
 *    General → Your apps → Web app → "SDK setup and configuration" → Config).
 *    These values are safe to publish: access is controlled by the Firestore rules.
 *
 * 2. RW_LOGIN is the single shared login. The username is what people type on the
 *    login page; it signs in to the Firebase email/password account below, and
 *    password reset emails go to that address.
 *    NEVER put the password in this file: this repository is public. The password
 *    lives only in Firebase (Authentication → Users).
 */
window.RW_FIREBASE_CONFIG = {
  apiKey: "AIzaSyAMm5iqWrSXauB03-B6fxkvwF5STkY0_-s",
  authDomain: "website-a5247.firebaseapp.com",
  projectId: "website-a5247",
  storageBucket: "website-a5247.firebasestorage.app",
  messagingSenderId: "142833479323",
  appId: "1:142833479323:web:b4db2114bb94cdb20aa03e",
  workspaceName: "Remora Orbital"
};

window.RW_LOGIN = {
  username: "Remora Orbital",
  email: "info@remoraorbital.co.uk"
};
