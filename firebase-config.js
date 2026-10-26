/*
 * Workspace settings. This is the only file you need to edit.
 *
 * 1. Paste your Firebase web app config below (Firebase console → Project settings →
 *    General → Your apps → Web app → "SDK setup and configuration" → Config).
 *    These values are safe to publish: access is controlled by the Firestore rules.
 * 2. Access is enforced by the email list in your Firestore rules (kept in the Firebase
 *    console, not in this public repository). You can optionally repeat the emails below
 *    to show a friendlier "no access" message sooner, but this file is public, so leaving
 *    the list empty keeps your addresses private.
 */
window.RW_FIREBASE_CONFIG = {
  apiKey: "PASTE_API_KEY",
  authDomain: "PASTE_PROJECT_ID.firebaseapp.com",
  projectId: "PASTE_PROJECT_ID",
  storageBucket: "PASTE_PROJECT_ID.appspot.com",
  messagingSenderId: "PASTE_SENDER_ID",
  appId: "PASTE_APP_ID",
  workspaceName: "Remora Orbital"
};

window.RW_ALLOWED_EMAILS = [];
