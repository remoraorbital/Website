# Remora Orbital Workspace

A shared, Notion-style workspace for the founders: nested pages, a block editor with `/` commands, columns, databases (table, board, list) with filters, in-page databases and a side peek.

It is a static website hosted on **GitHub Pages** at `https://admin.remoraorbital.co.uk/`. Data is stored in **Cloud Firestore**. Access is behind a single shared login, like a device passcode: one username and password for the workspace, with password resets sent to `info@remoraorbital.co.uk`.

## Files

| File | What it is |
| --- | --- |
| `index.html` | The whole app |
| `firebase-adapter.js` | The login page, plus the connection to Firebase |
| `firebase-config.js` | **Your settings**: Firebase keys and the login username/email |
| `firestore.rules` | Security rules to paste into Firebase |
| `CNAME` | The custom domain, `admin.remoraorbital.co.uk` |
| `.nojekyll` | Tells GitHub Pages to serve the files as they are |

## How the login works
- The login page asks for the username (`Remora Orbital`) and the password.
- Behind the scenes it signs in to one Firebase account, `info@remoraorbital.co.uk`. Firebase checks the password on its servers. The password is **not** in this repository, which is public.
- The Firestore rules only let that one login read or write data, so nobody can reach the data by reading or changing this code.
- **Forgot the password?** sends Firebase's reset email to `info@remoraorbital.co.uk`. Open the link, choose a new password, and use it on the login page.
- **Keep this device signed in** works like a device passcode: the device stays unlocked until someone picks **Sign out** in the workspace menu (top of the sidebar). Untick it to sign out when the browser closes.

## One-time setup

### 1. Create the Firebase project
1. Go to <https://console.firebase.google.com> and click **Create a project** (Google Analytics is not needed).
2. **Build → Authentication → Get started → Sign-in method → Email/Password → Enable** (leave "Email link" off), then **Save**.
3. **Authentication → Users → Add user**. Email: `info@remoraorbital.co.uk`. Password: the workspace password. This is the only place the password is stored.
4. **Authentication → Settings → User actions**: untick **Enable create (sign-up)** and **Enable delete**, then **Save**. That stops anyone creating extra accounts.
5. **Build → Firestore Database → Create database**. Choose a location (for London, `europe-west2`) and start in **production mode**.
6. **Firestore Database → Rules**: replace everything with the contents of `firestore.rules`, then **Publish**.
7. **Project settings (gear icon) → General → Your apps → Web (`</>`)**. Register an app (no Firebase Hosting needed) and copy the `firebaseConfig` values.

### 2. Fill in `firebase-config.js`
Paste the values from step 7 into `RW_FIREBASE_CONFIG` and commit. The keys are safe to publish. Never add the password to this file.

### 3. Turn on GitHub Pages and the custom domain
1. Repository **Settings → Pages → Build and deployment → Source: Deploy from a branch**, branch `main`, folder `/ (root)`, then **Save**.
2. Under **Custom domain**, enter `admin.remoraorbital.co.uk` and **Save**. The `CNAME` file in this repo already holds it.
3. In **Cloudflare → DNS → Records**, add a record: Type `CNAME`, Name `admin`, Target `remoraorbital.github.io`, Proxy status **DNS only** (grey cloud).
4. Back in **Settings → Pages**, wait for the DNS check to pass, then tick **Enforce HTTPS**. The certificate can take up to 24 hours.

The workspace is then at `https://admin.remoraorbital.co.uk/`.

### 4. Allow that address in Firebase
Firebase console → **Authentication → Settings → Authorised domains → Add domain** → `admin.remoraorbital.co.uk`. Without it, the reset email's "continue" link can't bring people back to the workspace.

Open the site and sign in with `Remora Orbital` and the password.

## Changing the password
Use **Forgot the password? Send a reset email** on the login page, or Firebase console → Authentication → Users → ⋮ next to the account → **Reset password**.

## Costs
The Firebase free plan (Spark) needs no card and includes 50,000 document reads and 20,000 writes a day. Two people typing notes all day stay far below that.

## Backups
Workspace menu (top of the sidebar) → **Export all data (JSON)** downloads everything.
