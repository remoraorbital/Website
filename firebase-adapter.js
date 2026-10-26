/*
 * Firebase adapter for the Remora Orbital Workspace.
 *
 * The workspace app was written against a small storage + identity interface
 * (window.claude.use("db" | "user" | "downloads")). This file provides that
 * interface on top of Firebase Authentication (Google sign-in) and Cloud
 * Firestore, so the same app runs as a normal website on GitHub Pages.
 *
 * You should not need to edit this file. Put your settings in firebase-config.js.
 */
(function () {
  'use strict';
  window.RW_ENV = 'github';

  var cfg = window.RW_FIREBASE_CONFIG || {};
  var allowed = (window.RW_ALLOWED_EMAILS || []).map(function (e) { return String(e).trim().toLowerCase(); }).filter(Boolean);
  var configured = !!(cfg.apiKey && cfg.projectId && !/YOUR_|PASTE_/i.test(cfg.apiKey + cfg.projectId));

  /* ---------- sign-in screen ---------- */
  var gate = null;
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) { if (k === 'text') n.textContent = attrs[k]; else if (k === 'onclick') n.addEventListener('click', attrs[k]); else n.setAttribute(k, attrs[k]); }
    (kids || []).forEach(function (c) { if (c) n.append(c); });
    return n;
  }
  function showGate(title, body, buttons) {
    if (!gate) {
      gate = el('div', { class: 'rw-gate', role: 'dialog', 'aria-modal': 'true' });
      var css = document.createElement('style');
      css.textContent =
        '.rw-gate{position:fixed;inset:0;z-index:100;display:grid;place-items:center;padding:24px;background:var(--bg,#FBFCFE);color:var(--ink,#161A22);font-family:var(--f-ui,system-ui,sans-serif)}' +
        '.rw-card{width:min(420px,100%);display:grid;gap:14px;justify-items:start}' +
        '.rw-mark{position:relative;width:34px;height:34px;border-radius:50%;border:2.5px solid var(--ink,#161A22)}' +
        '.rw-mark::after{content:"";position:absolute;width:9px;height:9px;border-radius:50%;background:var(--accent,#2A55E5);top:-4px;right:-4px}' +
        '.rw-card h1{margin:6px 0 0;font:750 1.9rem/1.1 var(--f-display,system-ui,sans-serif);letter-spacing:-.025em}' +
        '.rw-card p{margin:0;color:var(--ink-2,#465063);font-size:15px;line-height:1.5}' +
        '.rw-card code{font-family:var(--f-mono,monospace);font-size:13px;background:var(--code-bg,#F0F2F6);padding:1px 5px;border-radius:4px}' +
        '.rw-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:6px}' +
        '.rw-btn{height:40px;padding:0 16px;border-radius:9px;border:1px solid var(--line,#E0E5ED);background:var(--panel,#fff);color:var(--ink,#161A22);font:600 14px var(--f-ui,system-ui,sans-serif);cursor:pointer}' +
        '.rw-btn.primary{background:var(--accent,#2A55E5);color:var(--accent-ink,#fff);border-color:transparent}' +
        '.rw-err{color:var(--danger,#BE3A2F);font-size:13px}';
      document.head.append(css);
      document.body.append(gate);
    }
    gate.hidden = false;
    gate.replaceChildren(el('div', { class: 'rw-card' }, [el('div', { class: 'rw-mark' }), el('h1', { text: title })].concat(body).concat([el('div', { class: 'rw-row' }, buttons)])));
  }
  function hideGate() { if (gate) gate.hidden = true; }

  /* ---------- not configured yet ---------- */
  if (!configured || !window.firebase) {
    var noop = function () { return Promise.resolve(null); };
    window.claude = { use: noop };
    var whenReady = function () {
      showGate('Almost there', [
        el('p', { text: window.firebase ? 'Firebase is not set up yet. Fill in firebase-config.js with your Firebase project settings, then reload.' : 'The Firebase scripts could not load. Check your internet connection, then reload.' })
      ], [el('button', { class: 'rw-btn', text: 'Reload', onclick: function () { location.reload(); } })]);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', whenReady); else whenReady();
    return;
  }

  firebase.initializeApp(cfg);
  var auth = firebase.auth();
  var fs = firebase.firestore();
  var provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });

  function signIn(errBox) {
    auth.signInWithPopup(provider).catch(function (e) {
      if (e && (e.code === 'auth/popup-blocked' || e.code === 'auth/operation-not-supported-in-this-environment')) return auth.signInWithRedirect(provider);
      if (e && e.code === 'auth/unauthorized-domain') { errBox.textContent = 'This website address is not on Firebase’s list of authorised domains yet. Add it under Authentication → Settings → Authorised domains.'; return; }
      if (e && e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') errBox.textContent = 'Sign-in did not work: ' + (e.message || e.code);
    });
  }
  window.RW_SIGN_OUT = function () { auth.signOut().then(function () { location.reload(); }); };

  /* ---------- people (members collection doubles as the profile directory) ---------- */
  var people = {}, peopleReady = null, me = null;
  function colorFor(id) { var h = 0; for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0; var pal = ['#2A55E5', '#0E8A7A', '#B5402B', '#7D4BD1', '#B07A00', '#C2407A', '#3F7A3F', '#5A6378']; return pal[h % pal.length]; }
  function initials(name, color) {
    var ch = (String(name || '?').trim()[0] || '?').toUpperCase().replace(/[&<>"']/g, '');
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="' + color + '"/><text x="20" y="26" font-family="system-ui,sans-serif" font-size="17" font-weight="600" fill="#fff" text-anchor="middle">' + ch + '</text></svg>';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  function profile(id) {
    var p = people[id] || {}, color = colorFor(id || 'x'), name = p.name || '';
    return { id: id, name: name, avatarUrl: p.photo || initials(name || '?', color), color: color, email: p.email || null, isMe: !!(me && id === me.uid), guest: false };
  }

  /* ---------- Firestore wrapper with the interface the app expects ---------- */
  var ERR = { 'not-found': 'invalid_argument', 'permission-denied': 'not_granted', 'unauthenticated': 'not_granted', 'resource-exhausted': 'quota_exceeded', 'unavailable': 'unavailable', 'deadline-exceeded': 'unavailable', 'invalid-argument': 'invalid_argument', 'failed-precondition': 'invalid_argument' };
  function mapErr(e) { return { code: ERR[e && e.code] || 'unavailable', message: (e && e.message) || String(e) }; }
  function wrap(p) { return p.catch(function (e) { throw mapErr(e); }); }
  // The app's partial updates merge nested objects; Firestore needs dotted paths for that.
  function flatten(obj, prefix, out) {
    for (var k in obj) {
      var v = obj[k], key = prefix ? prefix + '.' + k : k;
      if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length) flatten(v, key, out); else out[key] = v;
    }
    return out;
  }
  function docRef(path) {
    var r = fs.doc(path);
    return {
      id: r.id, path: path,
      get: function () { return wrap(r.get()); },
      set: function (d) { return wrap(r.set(d)); },
      update: function (d) { return wrap(r.update(flatten(d, '', {}))); },
      delete: function () { return wrap(r.delete()); },
      onSnapshot: function (next, err) { return r.onSnapshot(next, function (e) { if (err) err(mapErr(e)); }); },
      collection: function (p) { return colRef(path + '/' + p); }
    };
  }
  function colRef(path) {
    var c = fs.collection(path);
    return {
      path: path,
      doc: function (id) { return docRef(path + '/' + (id || c.doc().id)); },
      get: function () { return wrap(c.get()); },
      onSnapshot: function (next, err) { return c.onSnapshot(next, function (e) { if (err) err(mapErr(e)); }); }
    };
  }
  var dbApi = { doc: docRef, collection: colRef };

  var userApi = {
    id: function () { return Promise.resolve(me ? me.uid : null); },
    me: function () { return Promise.resolve(Object.assign(profile(me.uid), { name: me.displayName || (people[me.uid] || {}).name || '', email: me.email || null, isOwner: true, canEdit: true })); },
    isOwner: function () { return Promise.resolve(true); },
    canEdit: function () { return Promise.resolve(true); },
    can: function () { return Promise.resolve(null); },
    name: function () { return Promise.resolve(me ? me.displayName || '' : ''); },
    profiles: function (ids) { return (peopleReady || Promise.resolve()).then(function () { var out = {}; [].concat(ids || []).forEach(function (id) { out[id] = profile(id); }); return out; }); },
    search: function (q) { q = String(q || '').toLowerCase(); return Promise.resolve(Object.keys(people).map(profile).filter(function (p) { return p.name && (!q || p.name.toLowerCase().indexOf(q) >= 0); }).slice(0, 8)); }
  };

  var downloadsApi = {
    save: function (req) {
      try {
        var blob = req.data instanceof Blob ? req.data : new Blob([req.data], { type: 'application/json' });
        var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = req.filename || 'export.json';
        document.body.append(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000);
        return Promise.resolve({ status: 'saved' });
      } catch (e) { return Promise.reject({ code: 'unavailable', message: String(e) }); }
    }
  };

  /* ---------- auth flow: the app waits here until someone allowed has signed in ---------- */
  var resolveAuthed, authed = new Promise(function (r) { resolveAuthed = r; });
  var started = false;
  function renderSignIn() {
    var err = el('p', { class: 'rw-err' });
    showGate((cfg.workspaceName || 'Remora Orbital') + ' Workspace', [
      el('p', { text: 'Sign in with the Google account that has access to this workspace.' }), err
    ], [el('button', { class: 'rw-btn primary', text: 'Sign in with Google', onclick: function () { err.textContent = ''; signIn(err); } })]);
  }
  function boot() {
    auth.getRedirectResult().catch(function () {});
    auth.onAuthStateChanged(function (u) {
      if (started && (!u || (me && u.uid !== me.uid))) { location.reload(); return; }
      if (!u) { renderSignIn(); return; }
      var email = String(u.email || '').toLowerCase();
      if (allowed.length && allowed.indexOf(email) < 0) {
        showGate('No access', [el('p', { text: 'The account ' + (u.email || 'you signed in with') + ' is not on this workspace’s access list.' })],
          [el('button', { class: 'rw-btn', text: 'Use another account', onclick: function () { auth.signOut(); } })]);
        return;
      }
      me = u; started = true;
      showGate('Opening the workspace…', [], []);
      var memberWrite = fs.doc('members/' + u.uid).set({ name: u.displayName || u.email || '', photo: u.photoURL || '', email: u.email || '', lastSeen: Date.now() }, { merge: true });
      peopleReady = new Promise(function (res) {
        fs.collection('members').onSnapshot(function (s) { s.docs.forEach(function (d) { people[d.id] = d.data(); }); res(); }, function () { res(); });
      });
      memberWrite.then(function () { hideGate(); resolveAuthed(); }, function (e) {
        if (e && e.code === 'permission-denied') {
          showGate('No access', [el('p', { text: 'Firestore refused this account. Check that ' + (u.email || 'this email') + ' is listed in your Firestore security rules.' })],
            [el('button', { class: 'rw-btn', text: 'Use another account', onclick: function () { auth.signOut(); } })]);
        } else { hideGate(); resolveAuthed(); }
      });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();

  window.claude = {
    use: function (name) {
      if (name === 'db') return authed.then(function () { return dbApi; });
      if (name === 'user') return authed.then(function () { return userApi; });
      if (name === 'downloads') return Promise.resolve(downloadsApi);
      return Promise.resolve(null);
    }
  };
})();
