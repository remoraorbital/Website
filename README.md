# Remora Orbital Workspace

A shared, Notion-style workspace for the founders: nested pages, a block editor with `/` commands, columns, databases (table, board, list) with filters, in-page databases and a side peek.

It is a static website hosted on **GitHub Pages**. Data is stored in **Cloud Firestore** and people sign in with **Google**, both through a free Firebase project.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The whole app |
| `firebase-adapter.js` | Connects the app to Firebase sign-in and Firestore |
| `firebase-config.js` | **Your settings**: Firebase keys and the allowed emails |
| `firestore.rules` | Security rules to paste into Firebase |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are |

## One-time setup

### 1. Create the Firebase project
1. Go to <https://console.firebase.google.com> and click **Create a project** (Google Analytics is not needed).
2. **Build → Authentication → Get started → Sign-in method → Google → Enable**, choose a support email, then **Save**.
3. **Build → Firestore Database → Create database**. Choose a location close to you (for London, `europe-west2`), and start in **production mode**.
4. **Firestore Database → Rules**: replace everything with the contents of `firestore.rules`, put your two Google emails in the list, then **Publish**. Edit the emails in the Firebase console only; don't commit them to this public repository.
5. **Project settings (gear icon) → General → Your apps → Web (`</>`)**. Register an app (no Firebase Hosting needed) and copy the `firebaseConfig` values.

### 2. Fill in `firebase-config.js`
Paste the values from step 5 into `RW_FIREBASE_CONFIG` and commit the change. Leave `RW_ALLOWED_EMAILS` empty unless you don't mind the emails being public.

These keys are safe to publish. What protects your data is the email list in the Firestore rules.

### 3. Turn on GitHub Pages
Repository **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder `/ (root)`, then **Save**. After a minute the site is live at:

`https://remoraorbital.github.io/Website/`

### 4. Allow that address to sign in
Firebase console → **Authentication → Settings → Authorised domains → Add domain** → `remoraorbital.github.io`.

Open the site, click **Sign in with Google**, and you're in. Your co-founder does the same with their account.

## Adding or removing people
Edit the email list in the Firestore rules in the Firebase console, then **Publish**. Anyone else who signs in sees a "No access" screen.

## Costs
The Firebase free plan (Spark) needs no card and includes 50,000 document reads and 20,000 writes a day. Two people typing notes all day stay far below that.

## Backups
Workspace menu (top of the sidebar) → **Export all data (JSON)** downloads everything.
