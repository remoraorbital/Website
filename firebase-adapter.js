/*
 * Firebase adapter for the Remora Orbital Workspace.
 *
 * The workspace app was written against a small storage + identity interface
 * (window.claude.use("db" | "user" | "downloads")). This file provides that
 * interface on top of Firebase Authentication and Cloud Firestore, so the same
 * app runs as a normal website on GitHub Pages.
 *
 * Sign-in is a single shared login (one username and password for the whole
 * workspace). The username is mapped to one Firebase email/password account,
 * so the password is checked by Firebase and never stored in this public code.
 *
 * You should not need to edit this file. Put your settings in firebase-config.js.
 */
(function () {
  'use strict';
  window.RW_ENV = 'github';

  var cfg = window.RW_FIREBASE_CONFIG || {};
  var login = window.RW_LOGIN || {};
  var configured = !!(cfg.apiKey && cfg.projectId && login.email && !/YOUR_|PASTE_/i.test(cfg.apiKey + cfg.projectId));
  var wsName = cfg.workspaceName || 'Remora Orbital';

  /* ---------- small DOM helper ---------- */
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'text') n.textContent = v;
      else if (k.slice(0, 2) === 'on' && typeof v === 'function') n.addEventListener(k.slice(2), v);
      else if (v === true) n.setAttribute(k, '');
      else n.setAttribute(k, v);
    }
    (kids || []).forEach(function (c) { if (c) n.append(c); });
    return n;
  }

  /* ---------- login screen ---------- */
  var gate = null;
  function ensureGate() {
    if (gate) return;
    var css = document.createElement('style');
    css.textContent =
      '.rw-gate{position:fixed;inset:0;z-index:100;display:grid;place-items:center;overflow:auto;padding:max(24px,env(safe-area-inset-top,0px)) max(16px,env(safe-area-inset-right,0px)) 24px max(16px,env(safe-area-inset-left,0px));background:var(--bg,#FBFCFE);color:var(--ink,#161A22);font-family:var(--f-ui,system-ui,sans-serif)}' +
      '.rw-card{width:min(400px,100%);display:grid;gap:16px}' +
      '.rw-mark{position:relative;width:34px;height:34px;border-radius:50%;border:2.5px solid var(--ink,#161A22)}' +
      '.rw-mark::after{content:"";position:absolute;width:9px;height:9px;border-radius:50%;background:var(--accent,#2A55E5);top:-4px;right:-4px;box-shadow:0 0 0 3px var(--bg,#FBFCFE)}' +
      '.rw-card h1{margin:4px 0 0;font:750 1.85rem/1.1 var(--f-display,system-ui,sans-serif);letter-spacing:-.025em}' +
      '.rw-card p{margin:0;color:var(--ink-2,#465063);font-size:15px;line-height:1.5}' +
      '.rw-form{display:grid;gap:14px;margin-top:4px}' +
      '.rw-field{display:grid;gap:6px}' +
      '.rw-field label{font-size:13px;font-weight:600;color:var(--ink-2,#465063)}' +
      '.rw-input{width:100%;height:42px;padding:0 12px;border:1px solid var(--line,#E0E5ED);border-radius:9px;background:var(--panel,#fff);color:var(--ink,#161A22);font:15px var(--f-ui,system-ui,sans-serif);outline:none}' +
      '.rw-input:focus{border-color:var(--accent,#2A55E5);box-shadow:0 0 0 3px var(--accent-soft,rgba(42,85,229,.12))}' +
      '.rw-pass{position:relative}.rw-pass .rw-input{padding-right:64px}' +
      '.rw-eye{position:absolute;right:6px;top:6px;height:30px;padding:0 9px;border:0;border-radius:6px;background:none;color:var(--ink-2,#465063);font:600 12px var(--f-ui,system-ui,sans-serif);cursor:pointer}' +
      '.rw-eye:hover{background:var(--hover,rgba(38,52,86,.06))}' +
      '.rw-check{display:flex;align-items:center;gap:8px;font-size:14px;color:var(--ink-2,#465063);cursor:pointer}' +
      '.rw-check input{width:16px;height:16px;margin:0;accent-color:var(--accent,#2A55E5)}' +
      '.rw-btn{height:42px;padding:0 16px;border-radius:9px;border:1px solid var(--line,#E0E5ED);background:var(--panel,#fff);color:var(--ink,#161A22);font:600 14px var(--f-ui,system-ui,sans-serif);cursor:pointer}' +
      '.rw-btn.primary{background:var(--accent,#2A55E5);color:var(--accent-ink,#fff);border-color:transparent}' +
      '.rw-btn:disabled{opacity:.6;cursor:default}' +
      '.rw-link{justify-self:start;border:0;background:none;padding:2px 0;color:var(--accent,#2A55E5);font:600 14px var(--f-ui,system-ui,sans-serif);cursor:pointer;text-decoration:underline;text-underline-offset:3px}' +
      '.rw-msg{font-size:14px;line-height:1.45;padding:10px 12px;border-radius:9px}' +
      '.rw-msg.err{background:var(--danger-soft,rgba(190,58,47,.09));color:var(--danger,#BE3A2F)}' +
      '.rw-msg.ok{background:var(--accent-soft,rgba(42,85,229,.10));color:var(--ink,#161A22)}' +
      '.rw-msg:empty{display:none}' +
      '.rw-foot{font-size:12.5px;color:var(--ink-3,#7F889A)}';
    document.head.append(css);
    gate = el('div', { class: 'rw-gate', role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Sign in' });
    document.body.append(gate);
  }
  function showCard(kids) { ensureGate(); gate.hidden = false; gate.replaceChildren(el('div', { class: 'rw-card' }, [el('div', { class: 'rw-mark' })].concat(kids))); }
  function hideGate() { if (gate) gate.hidden = true; }

  /* ---------- not configured yet ---------- */
  if (!configured || !window.firebase) {
    window.claude = { use: function () { return Promise.resolve(null); } };
    var notReady = function () {
      showCard([el('h1', { text: 'Almost there' }), el('p', { text: window.firebase
        ? 'Firebase is not set up yet. Fill in firebase-config.js with your Firebase project settings, then reload.'
        : 'The sign-in service could not load. Check your internet connection, then reload.' }),
        el('button', { class: 'rw-btn', text: 'Reload', onclick: function () { location.reload(); } })]);
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', notReady); else notReady();
    return;
  }

  firebase.initializeApp(cfg);
  var auth = firebase.auth();
  var fs = firebase.firestore();
  var expectedUser = String(login.username || wsName).trim().toLowerCase().replace(/\s+/g, ' ');

  function friendly(e) {
    var c = e && e.code;
    if (c === 'auth/invalid-credential' || c === 'auth/wrong-password' || c === 'auth/user-not-found' || c === 'auth/invalid-email' || c === 'auth/invalid-login-credentials')
      return 'That username or password is not right.';
    if (c === 'auth/too-many-requests') return 'Too many attempts. Wait a few minutes, or send a password reset email.';
    if (c === 'auth/network-request-failed') return 'No connection. Check your internet and try again.';
    if (c === 'auth/user-disabled') return 'This login has been switched off in Firebase.';
    if (c === 'auth/operation-not-allowed') return 'Email/password sign-in is not switched on in Firebase yet.';
    return 'Sign-in did not work (' + (c || 'unknown error') + ').';
  }

  function renderLogin(note) {
    var msg = el('div', { class: 'rw-msg' + (note ? ' ok' : ''), role: 'status', 'aria-live': 'polite', text: note || '' });
    var user = el('input', { class: 'rw-input', id: 'rw-user', name: 'username', autocomplete: 'username', autocapitalize: 'words', spellcheck: 'false', required: true });
    var pass = el('input', { class: 'rw-input', id: 'rw-pass', name: 'password', type: 'password', autocomplete: 'current-password', required: true });
    var eye = el('button', { class: 'rw-eye', type: 'button', text: 'Show', 'aria-label': 'Show password', onclick: function () {
      var shown = pass.type === 'text'; pass.type = shown ? 'password' : 'text'; eye.textContent = shown ? 'Show' : 'Hide'; eye.setAttribute('aria-label', shown ? 'Show password' : 'Hide password'); pass.focus();
    } });
    var keep = el('input', { type: 'checkbox', id: 'rw-keep', checked: true });
    var go = el('button', { class: 'rw-btn primary', type: 'submit', text: 'Sign in' });
    var form = el('form', { class: 'rw-form', novalidate: true, onsubmit: function (e) {
      e.preventDefault(); msg.className = 'rw-msg'; msg.textContent = '';
      var u = user.value.trim().toLowerCase().replace(/\s+/g, ' ');
      if (!u || !pass.value) { msg.className = 'rw-msg err'; msg.textContent = 'Enter the username and password.'; return; }
      if (u !== expectedUser) { msg.className = 'rw-msg err'; msg.textContent = 'That username or password is not right.'; return; }
      go.disabled = true; go.textContent = 'Signing in…';
      var mode = keep.checked ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION;
      auth.setPersistence(mode).then(function () { return auth.signInWithEmailAndPassword(login.email, pass.value); })
        .catch(function (err) { go.disabled = false; go.textContent = 'Sign in'; msg.className = 'rw-msg err'; msg.textContent = friendly(err); pass.select(); });
    } }, [
      el('div', { class: 'rw-field' }, [el('label', { for: 'rw-user', text: 'Username' }), user]),
      el('div', { class: 'rw-field' }, [el('label', { for: 'rw-pass', text: 'Password' }), el('div', { class: 'rw-pass' }, [pass, eye])]),
      el('label', { class: 'rw-check', for: 'rw-keep' }, [keep, document.createTextNode('Keep this device signed in')]),
      msg, go
    ]);
    var reset = el('button', { class: 'rw-link', type: 'button', text: 'Forgot the password? Send a reset email', onclick: function () {
      reset.disabled = true; msg.className = 'rw-msg'; msg.textContent = '';
      var settings = { url: location.origin + location.pathname, handleCodeInApp: false };
      auth.sendPasswordResetEmail(login.email, settings).catch(function (err) {
        if (err && err.code === 'auth/unauthorized-continue-uri') return auth.sendPasswordResetEmail(login.email);
        throw err;
      }).then(function () {
        msg.className = 'rw-msg ok'; msg.textContent = 'A password reset link was sent to ' + login.email + '. It can take a few minutes, and may land in spam.';
      }, function (err) {
        reset.disabled = false; msg.className = 'rw-msg err';
        msg.textContent = err && err.code === 'auth/too-many-requests' ? 'Too many reset emails. Try again later.' : 'The reset email could not be sent (' + ((err && err.code) || 'unknown error') + ').';
      });
    } });
    showCard([el('h1', { text: wsName + ' Workspace' }), el('p', { text: 'This workspace is private. Sign in to continue.' }), form, reset,
      el('div', { class: 'rw-foot', text: 'Reset emails go to ' + login.email + '.' })]);
    setTimeout(function () { user.focus(); }, 30);
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
    return { id: id, name: name, avatarUrl: p.photo || initials(name || '?', color), color: color, email: null, isMe: !!(me && id === me.uid), guest: false };
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
    me: function () { return Promise.resolve(Object.assign(profile(me.uid), { name: '', email: null, isOwner: true, canEdit: true })); },
    isOwner: function () { return Promise.resolve(true); },
    canEdit: function () { return Promise.resolve(true); },
    can: function () { return Promise.resolve(null); },
    name: function () { return Promise.resolve(''); },
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

  /* ---------- auth flow: the app waits here until the shared login is signed in ---------- */
  var resolveAuthed, authed = new Promise(function (r) { resolveAuthed = r; });
  var started = false;
  function boot() {
    showCard([el('h1', { text: 'Opening the workspace…' })]);
    auth.onAuthStateChanged(function (u) {
      if (started && (!u || (me && u.uid !== me.uid))) { location.reload(); return; }
      if (!u) { if (!gate || gate.hidden || !gate.querySelector('form')) renderLogin(); return; }
      me = u; started = true;
      showCard([el('h1', { text: 'Opening the workspace…' })]);
      var memberWrite = fs.doc('members/' + u.uid).set({ name: wsName, photo: '', lastSeen: Date.now() }, { merge: true });
      peopleReady = new Promise(function (res) {
        fs.collection('members').onSnapshot(function (s) { s.docs.forEach(function (d) { people[d.id] = d.data(); }); res(); }, function () { res(); });
      });
      memberWrite.then(function () { hideGate(); resolveAuthed(); }, function (e) {
        if (e && e.code === 'permission-denied') {
          showCard([el('h1', { text: 'No access' }), el('p', { text: 'Signed in, but the Firestore rules do not allow this login. Check that firestore.rules has been published with ' + login.email + '.' }),
            el('button', { class: 'rw-btn', text: 'Sign out', onclick: function () { auth.signOut(); } })]);
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
