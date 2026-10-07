/* Mbourou — application front (vanilla JS, aucune dépendance, 100 % hors ligne) */
'use strict';

/* =================================================================== */
/* État, utilitaires                                                    */
/* =================================================================== */
const S = {
  token: localStorage.getItem('mb_token'), user: null, settings: {}, lang: localStorage.getItem('mb_lang') || 'fr',
  cart: [], remise: 0, remiseType: 'mru', mode: 'Espèces', clientId: '', recu: '', posCat: 'Tous', posQ: '',
  dashP: 'jour', rcSel: null,
};
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const n0 = x => Number(x) || 0;
const round2 = x => Math.round(n0(x) * 100) / 100;
function fmt(x, dec = 2) {
  const v = n0(x);
  // espace insécable (classe bidi CS) : garde l'ordre des chiffres en arabe (RTL)
  return v.toLocaleString('fr-FR', { maximumFractionDigits: dec, minimumFractionDigits: 0 }).replace(/[\u202f\u00a0 ]/g, '\u00a0');
}
const cur = () => t(S.settings.devise || 'MRU');
const money = (x, dec = 0) => `<span class="num">${fmt(x, dec)}</span> ${cur()}`;
const moneyTxt = (x, dec = 0) => `${fmt(x, dec)} ${cur()}`;
const isAr = () => S.lang === 'ar';
const pn = p => (isAr() && p && p.nom_ar) ? p.nom_ar : (p ? p.nom : '');
const pad = n => String(n).padStart(2, '0');
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
function fmtDate(s, withTime = true) {
  if (!s) return '';
  const [d, tm] = String(s).split(' ');
  const [y, m, j] = d.split('-');
  return `${j}/${m}/${y}` + (withTime && tm ? ' ' + tm.slice(0, 5) : '');
}
const locale = () => isAr() ? 'ar-u-nu-latn' : 'fr-FR';
const dayShort = d => new Date(d + 'T12:00:00').toLocaleDateString(locale(), { weekday: 'short' }).replace('.', '');
const signPct = v => `<span dir="ltr" class="${v >= 0 ? 'up' : 'down'}">${v >= 0 ? '↑' : '↓'} ${v >= 0 ? '+' : ''}${fmt(v, 0)}%</span>`;
const debounce = (fn, ms = 250) => { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; };

async function api(path, opts = {}) {
  const res = await fetch('/api' + path, {
    method: opts.method || (opts.body ? 'POST' : 'GET'),
    headers: { 'Content-Type': 'application/json', ...(S.token ? { Authorization: 'Bearer ' + S.token } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { }
  if (res.status === 401 && !path.startsWith('/login')) { logout(true); throw new Error(t('Session expirée, reconnectez-vous')); }
  if (!res.ok) { const e = new Error(t((data && data.error) || 'Erreur')); e.data = data; e.status = res.status; throw e; }
  return data;
}
function toast(msg, type = 'ok') {
  const el = document.createElement('div'); el.className = 'toast ' + type; el.textContent = msg;
  $('#toasts').appendChild(el); setTimeout(() => el.remove(), type === 'err' ? 5000 : 2600);
}
const fail = e => toast(e.message || String(e), 'err');
const isAdmin = () => S.user && S.user.role === 'admin';

/* =================================================================== */
/* Icônes (SVG inline)                                                 */
/* =================================================================== */
const P = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  cart: 'M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h9.2a1 1 0 0 0 1-.8L21 8H6.2M9 20.5a1 1 0 1 0 0-.01M17 20.5a1 1 0 1 0 0-.01',
  box: 'M21 8 12 3 3 8v8l9 5 9-5zM3 8l9 5 9-5M12 13v8',
  wheat: 'M12 22V8M12 8c-2-1-3-3-3-5 2 0 3 2 3 5zm0 0c2-1 3-3 3-5-2 0-3 2-3 5zm0 5c-2-1-4-2-4-5 2 0 4 2 4 5zm0 0c2-1 4-2 4-5-2 0-4 2-4 5zm0 5c-2-1-4-2-4-5 2 0 4 2 4 5zm0 0c2-1 4-2 4-5-2 0-4 2-4 5z',
  factory: 'M2 20V10l6 3V10l6 3V6l8-3v17zM2 20h20M6 16h2m4 0h2m4 0h2',
  book: 'M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5zM4 21.5A2.5 2.5 0 0 1 6.5 19H20v3H6.5M8 7h8M8 11h6',
  truck: 'M1 4h13v12H1zM14 8h4l3 4v4h-7M5.5 19.5a1.5 1.5 0 1 0 0-.01M17.5 19.5a1.5 1.5 0 1 0 0-.01',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8',
  building: 'M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h3a1 1 0 0 1 1 1v11M2 21h20M8 7h4M8 11h4M8 15h4',
  cash: 'M2 6h20v12H2zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M6 9v.01M18 15v.01',
  receipt: 'M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2zM9 7h6M9 11h6M9 15h4',
  clipboard: 'M9 2h6v4H9zM8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2M9 13l2 2 4-4',
  chart: 'M3 3v18h18M7 16v-5M12 16V8M17 16v-8',
  tie: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21a8 8 0 0 1 16 0M12 12l-1.5 3L12 21l1.5-6z',
  gear: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16M21 21l-4.3-4.3',
  calendar: 'M3 5h18v16H3zM16 3v4M8 3v4M3 10h18',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20M12 6v6l4 2',
  plus: 'M12 5v14M5 12h14', minus: 'M5 12h14', x: 'M18 6 6 18M6 6l12 12', check: 'M20 6 9 17l-5-5',
  edit: 'M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6',
  print: 'M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2M6 14h12v8H6z',
  alert: 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0M12 9v4M12 17h.01',
  bell: 'M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0',
  star: 'm12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  upload: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9',
  coins: 'M8 14a6 6 0 1 0 0-12 6 6 0 0 0 0 12M18.1 10.4A6 6 0 1 1 10.3 18M7 6h1v4M16.7 13.9l.7.7-2.8 2.8',
  wallet: 'M20 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15v4M3 5v14a2 2 0 0 0 2 2h15v-4M18 12a2 2 0 0 0 0 4h4v-4z',
  eye: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6',
  history: 'M3 12a9 9 0 1 0 3-6.7L3 8M3 3v5h5M12 7v5l4 2',
  percent: 'M19 5 5 19M6.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5M17.5 20a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5',
  refresh: 'M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16',
  trend: 'M22 7 13.5 15.5l-5-5L2 17M16 7h6v6',
  lock: 'M5 11h14v10H5zM8 11V7a4 4 0 0 1 8 0v4',
  calc: 'M4 2h16v20H4zM8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h4',
  phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z',
};
const ic = (n, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${P[n] || ''}"/></svg>`;
const BREAD_SVG = `<svg viewBox="0 0 120 80"><defs><linearGradient id="bg1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7b65a"/><stop offset=".6" stop-color="#e0882a"/><stop offset="1" stop-color="#a85612"/></linearGradient></defs>
<ellipse cx="60" cy="44" rx="56" ry="28" fill="url(#bg1)" stroke="#7a3a0c" stroke-width="2"/>
<path d="M28 34q8 10 4 22M46 28q9 12 5 28M65 26q9 13 5 30M84 30q8 12 4 24" stroke="#fde3b5" stroke-width="5" fill="none" stroke-linecap="round"/>
<path d="M28 34q8 10 4 22M46 28q9 12 5 28M65 26q9 13 5 30M84 30q8 12 4 24" stroke="#b5641c" stroke-width="1.5" fill="none" stroke-linecap="round"/></svg>`;
const FLAG_MR = `<svg class="flag" viewBox="0 0 30 20"><rect width="30" height="20" fill="#00a95c"/><rect width="30" height="3" fill="#d01c1f"/><rect y="17" width="30" height="3" fill="#d01c1f"/>
<path d="M9.5 8.2a5.6 5.6 0 0 0 11 0 5.4 5.4 0 0 1-11 0z" fill="#ffd700"/><path d="m15 4.4.6 1.8h1.9l-1.5 1.1.6 1.8-1.6-1.1-1.6 1.1.6-1.8-1.5-1.1h1.9z" fill="#ffd700"/></svg>`;

/* =================================================================== */
/* Modales & formulaires                                               */
/* =================================================================== */
function modal({ title, body, foot, cls = '', onMount }) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `<div class="modal ${cls}"><div class="modal-h"><h3>${title}</h3><button class="icon-btn" data-close>${ic('x')}</button></div>
    <div class="modal-b">${body}</div>${foot ? `<div class="modal-f">${foot}</div>` : ''}</div>`;
  document.body.appendChild(bg);
  const close = () => { bg.remove(); document.removeEventListener('keydown', onKey); };
  const onKey = e => { if (e.key === 'Escape') close(); };
  document.addEventListener('keydown', onKey);
  bg.addEventListener('click', e => { if (e.target.closest('[data-close]')) close(); });
  bg.close = close;
  if (onMount) onMount(bg);
  const f = bg.querySelector('input:not([type=hidden]):not([readonly]), select, textarea'); if (f) setTimeout(() => f.focus(), 30);
  return bg;
}
function confirmBox(msg, { ok = t('Confirmer'), danger = true } = {}) {
  return new Promise(res => {
    const m = modal({ title: t('Confirmation'), cls: 'narrow', body: `<p style="margin:0;line-height:1.5">${msg}</p>`,
      foot: `<button class="btn" data-close>${t('Annuler')}</button><button class="btn ${danger ? 'danger fill' : 'primary'}" id="cf-ok">${ok}</button>` });
    $('#cf-ok', m).onclick = () => { m.close(); res(true); };
    m.addEventListener('click', e => { if (e.target.closest('[data-close]')) res(false); });
  });
}
function fieldHtml(f, v) {
  const val = v ?? f.value ?? '';
  const req = f.required ? 'required' : '';
  let inp;
  if (f.type === 'select') inp = `<select class="input" name="${f.name}" ${req}>${f.options.map(o => { const [ov, ol] = Array.isArray(o) ? o : [o, t(o)]; return `<option value="${esc(ov)}" ${String(ov) === String(val) ? 'selected' : ''}>${esc(ol)}</option>`; }).join('')}</select>`;
  else if (f.type === 'textarea') inp = `<textarea class="input" name="${f.name}">${esc(val)}</textarea>`;
  else inp = `<input class="input ${f.ar ? 'ar' : ''}" ${f.ar ? 'dir="rtl"' : ''} name="${f.name}" type="${f.type || 'text'}" ${f.type === 'number' ? `step="${f.step || 'any'}" min="${f.min ?? ''}"` : ''} value="${esc(val)}" ${req} ${f.ro ? 'readonly' : ''} placeholder="${esc(f.ph || '')}">`;
  return `<div class="field" style="${f.full ? 'grid-column:1/-1' : ''}"><label>${f.label}${f.required ? ' *' : ''}</label>${inp}${f.help ? `<span class="small muted">${f.help}</span>` : ''}</div>`;
}
function readForm(el) {
  const o = {};
  $$('[name]', el).forEach(i => { o[i.name] = i.type === 'checkbox' ? (i.checked ? 1 : 0) : i.value; });
  return o;
}
function formModal({ title, fields, data = {}, onSubmit, cls = '', extra = '', submitLabel }) {
  const m = modal({
    title, cls,
    body: `<form id="fm"><div class="frow">${fields.map(f => fieldHtml(f, data[f.name])).join('')}</div>${extra}<button type="submit" hidden></button></form>`,
    foot: `<button class="btn" data-close>${t('Annuler')}</button><button class="btn primary" id="fm-ok">${ic('check')} ${submitLabel || t('Enregistrer')}</button>`,
  });
  const submit = async e => {
    e && e.preventDefault();
    const form = $('#fm', m);
    if (!form.reportValidity()) return;
    const btn = $('#fm-ok', m); btn.disabled = true;
    try { await onSubmit(readForm(form), m); m.close(); } catch (er) { fail(er); } finally { btn.disabled = false; }
  };
  $('#fm', m).onsubmit = submit; $('#fm-ok', m).onclick = submit;
  return m;
}
function download(path) {
  const a = document.createElement('a');
  a.href = '/api' + path + (path.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(S.token);
  a.download = ''; document.body.appendChild(a); a.click(); a.remove();
}
function printHtml(html, report = false) {
  const pa = $('#print-area'); pa.className = report ? 'report' : ''; pa.innerHTML = html;
  setTimeout(() => window.print(), 50);
}

/* =================================================================== */
/* Langue                                                              */
/* =================================================================== */
function applyLang() {
  document.documentElement.lang = S.lang;
  document.documentElement.dir = isAr() ? 'rtl' : 'ltr';
  document.title = isAr() ? `${S.settings.nom_ar || 'مخبزة مبرو'} — تسيير المخبزة` : 'Mbourou — Gestion de Boulangerie';
}
function setLang(l) { S.lang = l; localStorage.setItem('mb_lang', l); applyLang(); if (S.user) renderShell(); else renderLogin(); }

/* =================================================================== */
/* Connexion                                                           */
/* =================================================================== */
async function renderLogin() {
  applyLang();
  let pub = {}; try { pub = await api('/public-settings'); } catch { }
  $('#root').innerHTML = `<div class="login"><form class="login-box" id="lf">
    <div class="lg">${BREAD_SVG}<h1>${isAr() ? esc(pub.nom_ar || 'مخبزة مبرو') : 'Mbourou'} <span class="ar" style="font-size:20px">${isAr() ? 'Mbourou' : esc(pub.nom_ar || 'مخبزة مبرو')}</span></h1>
    <div class="muted">${t('Gestion de Boulangerie Mauritanienne')}</div></div>
    <div class="field"><label>${t('Identifiant')}</label><input class="input" name="username" autocomplete="username" required value="admin"></div>
    <div class="field"><label>${t('Mot de passe')}</label><input class="input" name="password" type="password" autocomplete="current-password" required></div>
    <button class="btn orange lg" style="width:100%">${ic('lock')} ${t('Se connecter')}</button>
    <div class="row" style="justify-content:center;margin-top:14px"><div class="lang-switch" style="background:var(--cream)">
      <button type="button" class="${!isAr() ? 'on' : ''}" style="color:var(--brown-700)" data-l="fr">FR</button><button type="button" class="${isAr() ? 'on' : ''}" style="color:var(--brown-700)" data-l="ar">ع</button></div></div>
    <div class="hint">${t('Comptes par défaut')} : <b>admin / admin</b> — <b>caisse / 1234</b><br>${t('Fonctionne 100 % hors ligne')}</div>
  </form></div>`;
  $$('[data-l]').forEach(b => b.onclick = () => setLang(b.dataset.l));
  $('#lf').onsubmit = async e => {
    e.preventDefault();
    try {
      const r = await api('/login', { body: readForm(e.target) });
      S.token = r.token; S.user = r.user; S.settings = r.settings;
      localStorage.setItem('mb_token', r.token);
      location.hash = r.user.role === 'admin' ? '#/dashboard' : '#/pos';
      renderShell();
    } catch (er) { fail(er); }
  };
  setTimeout(() => $('[name=password]').focus(), 50);
}
function logout(silent) {
  if (!silent) api('/logout', { method: 'POST' }).catch(() => { });
  S.token = null; S.user = null; localStorage.removeItem('mb_token'); renderLogin();
}

/* =================================================================== */
/* Coquille (barre du haut + menu)                                     */
/* =================================================================== */
const NAV = [
  ['dashboard', 'Tableau de bord', 'home'], ['pos', 'Ventes (POS)', 'cart'], ['produits', 'Produits', 'box'],
  ['matieres', 'Matières premières', 'wheat'], ['production', 'Production', 'factory'], ['recettes', 'Recettes & prix de revient', 'book'],
  ['achats', 'Achats', 'truck'], ['clients', 'Clients', 'users'], ['fournisseurs', 'Fournisseurs', 'building'],
  ['caisse', 'Caisse', 'cash'], ['depenses', 'Dépenses', 'receipt'], ['inventaire', 'Inventaire', 'clipboard'],
  ['rapports', 'Rapports', 'chart'], ['employes', 'Employés', 'tie'], ['parametres', 'Paramètres', 'gear'],
];
const CAISSIER_PAGES = ['dashboard', 'pos', 'production', 'clients', 'caisse', 'depenses', 'inventaire'];
const allowed = p => isAdmin() || CAISSIER_PAGES.includes(p);

function renderShell() {
  applyLang();
  const s = S.settings;
  $('#root').innerHTML = `<div id="app">
    <header class="topbar">
      <a class="brand" href="#/dashboard">${BREAD_SVG}<div><div class="brand-name">${isAr() ? `<span class="ar">${esc(s.nom_ar || 'مخبزة مبرو')}</span><span style="font-size:19px">Mbourou</span>` : `Mbourou <span class="ar">${esc(s.nom_ar || 'مخبزة مبرو')}</span>`}</div>
        <div class="brand-sub">${t('Gestion de Boulangerie Mauritanienne')}</div></div></a>
      <div class="gsearch">${ic('search')}<input id="gs" placeholder="${t('Rechercher un produit, un client, une facture…')}" autocomplete="off"><div class="gsearch-res" id="gsr"></div></div>
      <div class="top-right">
        <div class="ti hide-md">${FLAG_MR}<span>${esc(s.ville || 'Nouakchott - Mauritanie')}</span></div>
        <div class="ti">${ic('calendar', 'ic')}<span id="tdate"></span></div>
        <div class="ti">${ic('clock', 'ic')}<span id="ttime" class="num"></span></div>
        <button class="user-btn" id="ubtn"><span class="avatar">${esc((S.user.nom || 'A')[0].toUpperCase())}</span><span>${esc(S.user.nom)}</span> ▾</button>
        <div class="lang-switch"><button class="${!isAr() ? 'on' : ''}" data-l="fr">FR</button><button class="${isAr() ? 'on' : ''}" data-l="ar">ع</button></div>
      </div>
    </header>
    <aside class="sidebar">
      <nav class="nav">${NAV.filter(n => allowed(n[0])).map(([k, l, i]) => `<a href="#/${k}" data-k="${k}">${ic(i)}<span>${t(l)}</span></a>`).join('')}</nav>
      <div class="side-deco"><div class="s1">${esc(s.slogan || 'Du bon pain pour tous')}</div><div class="s2">${esc(s.slogan_ar || 'خبز جيد للجميع')}</div><div class="breads">🥖🥐🍞</div></div>
      <div class="side-status"><span class="dot"></span> Mbourou v1.0 | ${t('Mode hors ligne')} - SQLite</div>
    </aside>
    <main id="main"></main>
  </div>`;
  $$('[data-l]').forEach(b => b.onclick = () => setLang(b.dataset.l));
  $('#ubtn').onclick = e => { e.stopPropagation(); userMenu(); };
  tick(); clearInterval(S.clock); S.clock = setInterval(tick, 15000);
  setupSearch();
  route();
}
function tick() {
  const d = new Date();
  const el = $('#tdate'); if (!el) return;
  const s = d.toLocaleDateString(locale(), { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  el.textContent = s.charAt(0).toUpperCase() + s.slice(1);
  $('#ttime').textContent = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function userMenu() {
  const ex = $('.user-menu'); if (ex) return ex.remove();
  const m = document.createElement('div'); m.className = 'user-menu';
  m.innerHTML = `<div class="h"><b>${esc(S.user.nom)}</b><div class="small muted">${esc(S.user.username)} · ${t(S.user.role === 'admin' ? 'Administrateur' : 'Caissier')}</div></div>
    <button id="um-pw">${t('Changer mon mot de passe')}</button><button id="um-out" class="red">${t('Se déconnecter')}</button>`;
  $('.topbar').appendChild(m);
  const off = e => { if (!m.contains(e.target)) { m.remove(); document.removeEventListener('click', off); } };
  setTimeout(() => document.addEventListener('click', off));
  $('#um-out', m).onclick = () => logout();
  $('#um-pw', m).onclick = () => { m.remove(); changePassword(); };
}
function changePassword() {
  formModal({ title: t('Changer mon mot de passe'), cls: 'narrow', fields: [
    { name: 'ancien', label: t('Ancien mot de passe'), type: 'password', required: true, full: true },
    { name: 'nouveau', label: t('Nouveau mot de passe'), type: 'password', required: true, full: true }],
    onSubmit: async d => { await api('/me/password', { body: d }); toast(t('Mot de passe modifié')); } });
}
function setupSearch() {
  const inp = $('#gs'), box = $('#gsr');
  const go = debounce(async () => {
    const q = inp.value.trim(); if (q.length < 2) { box.classList.remove('open'); return; }
    try {
      const r = await api('/recherche?q=' + encodeURIComponent(q));
      let h = '';
      if (r.produits.length) h += `<div class="grp">${t('Produits')}</div>` + r.produits.map(p => `<div class="it" data-go="prod" data-id="${p.id}"><span>${esc(pn(p))}</span><b>${money(p.prix)}</b></div>`).join('');
      if (r.clients.length && allowed('clients')) h += `<div class="grp">${t('Clients')}</div>` + r.clients.map(c => `<div class="it" data-go="client" data-id="${c.id}"><span>${esc(c.nom)} <span class="muted small">${esc(c.telephone || '')}</span></span><b class="${c.solde < 0 ? 'red' : ''}">${money(c.solde)}</b></div>`).join('');
      if (r.ventes.length) h += `<div class="grp">${t('Tickets')}</div>` + r.ventes.map(v => `<div class="it" data-go="vente" data-id="${v.id}"><span>${esc(v.numero)} · ${fmtDate(v.date)}</span><b>${money(v.total)}</b></div>`).join('');
      if (r.matieres.length && allowed('matieres')) h += `<div class="grp">${t('Matières premières')}</div>` + r.matieres.map(m => `<div class="it" data-go="mat"><span>${esc(m.nom)}</span><b>${fmt(m.stock)} ${esc(m.unite)}</b></div>`).join('');
      box.innerHTML = h || `<div class="empty">${t('Aucun résultat')}</div>`; box.classList.add('open');
    } catch (e) { fail(e); }
  });
  inp.oninput = go;
  inp.onblur = () => setTimeout(() => box.classList.remove('open'), 200);
  box.onclick = e => {
    const it = e.target.closest('.it'); if (!it) return;
    const id = Number(it.dataset.id); inp.value = ''; box.classList.remove('open');
    if (it.dataset.go === 'prod') { addToCart(id); location.hash = '#/pos'; }
    if (it.dataset.go === 'client') { location.hash = '#/clients'; setTimeout(() => clientHistory(id), 300); }
    if (it.dataset.go === 'vente') showTicket(id);
    if (it.dataset.go === 'mat') location.hash = '#/matieres';
  };
}

/* =================================================================== */
/* Routeur                                                             */
/* =================================================================== */
const PAGES = {};
async function route() {
  if (!S.user) return;
  let p = (location.hash.replace(/^#\//, '') || 'dashboard').split('?')[0];
  if (!PAGES[p] || !allowed(p)) p = isAdmin() ? 'dashboard' : 'pos';
  $$('.nav a').forEach(a => a.classList.toggle('active', a.dataset.k === p));
  const main = $('#main'); if (!main) return;
  main.innerHTML = `<div class="loading">${t('Chargement…')}</div>`;
  main.scrollTop = 0;
  try { await PAGES[p](main); } catch (e) { main.innerHTML = `<div class="card empty">${esc(e.message)}</div>`; console.error(e); }
}
window.addEventListener('hashchange', route);
const head = (title, sub, actions = '') => `<div class="page-head"><div><h1>${title}</h1>${sub ? `<p>${sub}</p>` : ''}</div><div class="actions">${actions}</div></div>`;
const cardH = (title, icon, right = '') => `<div class="card-h"><h3><span class="hic">${ic(icon)}</span>${title}</h3>${right}</div>`;
const thumb = p => p && p.image ? `<img class="prod-thumb" src="${p.image}" alt="">` : `<span class="prod-thumb">${esc((p && p.emoji) || '🍞')}</span>`;

/* =================================================================== */
/* Graphique en barres (SVG)                                           */
/* =================================================================== */
function barChart(data, { h = 250, color = '#f29a2e', fmtV = v => fmt(v, 0) } = {}) {
  const W = 560, H = h, L = 46, B = 40, T = 12, R = 10;
  const max = Math.max(...data.map(d => d.value), 1);
  const step = Math.pow(10, Math.floor(Math.log10(max)));
  const top = Math.ceil(max / step / (max / step > 5 ? 1 : 0.5)) * step * (max / step > 5 ? 1 : 0.5) || 1;
  const ticks = 4; const ih = H - B - T; const iw = W - L - R;
  const bw = Math.min(46, iw / data.length * 0.62);
  let g = '';
  for (let i = 0; i <= ticks; i++) {
    const v = top / ticks * i; const y = T + ih - ih * i / ticks;
    g += `<line x1="${L}" x2="${W - R}" y1="${y}" y2="${y}" stroke="#efe6da" stroke-dasharray="${i ? 3 : 0}"/><text x="${L - 7}" y="${y + 4}" text-anchor="end" font-size="11" fill="#8a7766">${v >= 1000 ? fmt(v / 1000, 1) + 'k' : fmt(v, 0)}</text>`;
  }
  data.forEach((d, i) => {
    const cx = L + iw / data.length * (i + 0.5); const bh = ih * d.value / top; const y = T + ih - bh;
    g += `<rect x="${cx - bw / 2}" y="${y}" width="${bw}" height="${Math.max(bh, 0)}" rx="3" fill="url(#gbar)"><title>${esc(d.label)} ${esc(d.sub || '')}: ${fmtV(d.value)}</title></rect>
      <text x="${cx}" y="${H - B + 16}" text-anchor="middle" font-size="11.5" fill="#4a3a2a">${esc(d.label)}</text>
      <text x="${cx}" y="${H - B + 31}" text-anchor="middle" font-size="11" fill="#8a7766">${esc(d.sub || '')}</text>`;
  });
  return `<div class="chart" dir="ltr"><svg viewBox="0 0 ${W} ${H}"><defs><linearGradient id="gbar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7a23a"/><stop offset="1" stop-color="${color}"/></linearGradient></defs>${g}</svg></div>`;
}

/* =================================================================== */
/* Tableau de bord                                                     */
/* =================================================================== */
PAGES.dashboard = async el => {
  const [d, mats, rcs, caisse, deps] = await Promise.all([
    api('/dashboard?p=' + S.dashP), api('/matieres'), isAdmin() ? api('/recettes') : Promise.resolve([]), api('/caisse'),
    api('/depenses?from=' + todayStr().slice(0, 8) + '01'),
  ]);
  const st = d.stats, v = d.variations;
  const PER = [['jour', "Aujourd'hui"], ['7j', '7 jours'], ['30j', '30 jours'], ['mois', 'Ce mois'], ['annee', 'Cette année']];
  const lblP = { jour: "aujourd'hui", '7j': '7 jours', '30j': '30 jours', mois: 'ce mois', annee: 'cette année' }[S.dashP];
  const kpi = (icon, bg, label, val, unit, foot1, foot2, compact) => `<div class="card kpi ${compact ? 'compact' : ''}"><div class="kic ${bg}">${ic(icon)}</div>
    <div class="kl">${label}</div><div class="kv">${val} <small>${unit || ''}</small></div><div class="kf"><span>${foot1 || ''}</span><span>${foot2 || ''}</span></div></div>`;
  const stockKpi = m => {
    if (!m) return '';
    const ok = m.stock > m.stock_min;
    const sacs = m.nom.toLowerCase().startsWith('farine') && m.unite === 'kg' ? `<div class="small muted">(${fmt(m.stock / 50, 0)} ${t('sacs')} × 50 kg)</div>` : '';
    return `<div class="card kpi compact"><div class="kic ${ok ? 'bg-yellow' : 'bg-red'}">${ic('wheat')}</div><div class="kl">${t('Stock')} ${esc(pn(m)).toLowerCase()}</div>
      <div class="kv">${fmt(m.stock, 1)} <small>${esc(m.unite)}</small></div><div class="kf" style="display:block">${sacs}${ok ? `<span class="up">✔ ${t('OK')}</span>` : `<span class="down">⚠ ${t('Stock faible')}</span>`}</div></div>`;
  };
  const alertTxt = a => {
    const m = { stock_faible: ['Stock faible', 'bg-red', '!'], presque_epuise: ['Matière première presque épuisée', 'bg-yellow', '!'], facture_impayee: ['Facture fournisseur impayée', 'bg-red', '$'],
      client_debiteur: ['Client débiteur', 'bg-red', '$'], produit_bas: ['Produit fini bientôt épuisé', 'bg-yellow', '!'] }[a.type];
    const nm = isAr() && a.nom_ar ? a.nom_ar : a.titre;
    const det = a.detail.montant != null ? `${esc(a.titre)} (${moneyTxt(a.detail.montant)})` : `${esc(nm)} : ${fmt(a.detail.stock, 2)} ${esc(a.detail.unite || t('pcs'))}${a.detail.seuil != null ? ` (${t('seuil')} ${fmt(a.detail.seuil)})` : ''}`;
    return `<div class="alert-it"><span class="ai ${m[1]}">${m[2]}</span><div><b class="${m[1] === 'bg-red' ? 'red' : ''}">${t(m[0])}</b><div class="small">${det}</div></div></div>`;
  };
  const maxTop = Math.max(...d.top.map(x => x.q), 1);
  el.innerHTML = head(t('Tableau de bord'), t("Vue d'ensemble de votre boulangerie"),
    `<div class="tabs">${PER.map(([k, l]) => `<button class="${S.dashP === k ? 'on' : ''}" data-p="${k}" style="${S.dashP === k ? 'background:var(--orange);border-color:var(--orange)' : ''}">${t(l)}</button>`).join('')}</div>`) +
  `<div class="kpis">
    ${kpi('cart', 'bg-green', t('Ventes') + ' ' + t(lblP), fmt(st.ca, 0), cur(), `${st.ventes} ${t('ventes')}`, signPct(v.ca))}
    ${kpi('factory', 'bg-orange', t('Production') + ' ' + t(lblP), fmt(st.production_qte, 0), t('pcs'), `${st.production_produits} ${t('produits')}`, signPct(v.production))}
    ${kpi('coins', 'bg-blue', t('Bénéfice estimé'), fmt(st.benefice, 0), cur(), `${t('Marge brute')} ${fmt(st.marge_brute, 0)}`, signPct(v.benefice))}
    ${kpi('receipt', 'bg-red', t('Dépenses'), fmt(st.depenses, 0), cur(), '', signPct(v.depenses).replace('up', 'tmp').replace('down', 'up').replace('tmp', 'down'))}
    ${stockKpi(d.suivis[0])}${stockKpi(d.suivis[1])}
    ${kpi('cash', 'bg-teal', t('Caisse (espèces)'), fmt(d.caisse_especes, 0), cur(), `<span class="up">✔ ${t('OK')}</span>`, '', true)}
  </div>
  <div class="grid g-dash mt">
    <div class="card">${cardH(t('Évolution des ventes'), 'chart', `<span class="badge b-gray">${t('7 derniers jours')}</span>`)}
      ${barChart(d.evolution.map(e => ({ label: dayShort(e.date), sub: fmtDate(e.date, false).slice(0, 5), value: e.total })))}</div>
    <div class="card">${cardH(t('Top 5 produits les plus vendus'), 'star')}
      <div class="bars-h">${d.top.map(x => `<div class="r">${thumb(x)}<span>${esc(pn(x))}</span><div class="bar"><i style="width:${x.q / maxTop * 100}%"></i></div><span class="num">${fmt(x.q, 0)} ${t('pcs')}</span><b>${money(x.t)}</b></div>`).join('') || `<div class="empty">${t('Aucune vente sur la période')}</div>`}</div></div>
    <div class="card">${cardH(t('Alertes'), 'bell', d.alertes.length ? `<span class="count-badge">${d.alertes.length}</span>` : '')}
      <div style="max-height:260px;overflow:auto">${d.alertes.map(alertTxt).join('') || `<div class="empty">✔ ${t('Aucune alerte')}</div>`}</div></div>
  </div>
  <div class="grid g4 mt">
    <div class="card">${cardH(t('Matières premières'), 'wheat', allowed('matieres') ? `<a href="#/matieres" class="small">${t('Voir tout')}</a>` : '')}
      <div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>${t('Nom')}</th><th class="n">${t('Stock')}</th><th class="n">${t('Min')}</th></tr></thead>
      <tbody>${mats.filter(m => m.actif && m.prix_moyen > 0.5).slice(0, 8).map(m => `<tr><td>${esc(pn(m))}</td><td class="n ${m.stock <= m.stock_min ? 'red bold' : 'green bold'}">${fmt(m.stock, 1)} ${esc(m.unite)}</td><td class="n muted">${fmt(m.stock_min)}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="card">${cardH(t('Prix de revient'), 'calc', isAdmin() ? `<a href="#/recettes" class="small">${t('Détails')}</a>` : '')}
      ${isAdmin() ? `<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>${t('Produit')}</th><th class="n">${t('Coût')}</th><th class="n">${t('Prix')}</th><th class="n">${t('Marge')}</th></tr></thead>
      <tbody>${rcs.filter(r => r.calcul).slice(0, 8).map(r => `<tr><td>${esc(pn(r.produit))}</td><td class="n">${fmt(r.calcul.cout_unitaire, 1)}</td><td class="n">${fmt(r.calcul.prix_vente)}</td><td class="n">${marginPill(r.calcul.taux_marge)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="empty">${t('Réservé à l\'administrateur')}</div>`}</div>
    <div class="card">${cardH(t('Caisse'), 'cash', `<a href="#/caisse" class="small">${t('Ouvrir')}</a>`)}
      <div class="cash-lines">${cashLines(caisse)}</div></div>
    <div class="card">${cardH(t('Dépenses'), 'receipt', `<a href="#/depenses" class="small">${t('Voir tout')}</a>`)}
      <div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>${t('Catégorie')}</th><th class="n">${t('Montant')}</th><th>${t('Date')}</th></tr></thead>
      <tbody>${deps.slice(0, 7).map(x => `<tr><td>${t(x.categorie)}</td><td class="n">${fmt(x.montant)}</td><td class="small">${fmtDate(x.date, false)}</td></tr>`).join('') || `<tr><td colspan="3" class="empty">—</td></tr>`}</tbody></table></div></div>
  </div>`;
  $$('[data-p]', el).forEach(b => b.onclick = () => { S.dashP = b.dataset.p; route(); });
};
const marginPill = tm => `<span class="margin-pill ${tm >= 50 ? 'b-green' : tm >= 25 ? 'b-orange' : 'b-red'}">${fmt(tm, 0)}%</span>`;
function cashLines(c) {
  const l = (a, b, cls = '') => `<div class="ln ${cls}"><span>${a}</span><b class="num">${b}</b></div>`;
  return l(t('Caisse initiale'), fmt(c.fond_initial)) + l(t('Ventes espèces'), fmt(c.ventes_especes)) + l(t('Encaissements clients'), fmt(c.encaissements)) +
    (c.apports ? l(t('Apports'), fmt(c.apports)) : '') + l(t('Dépenses'), '- ' + fmt(c.depenses)) + l(t('Règlements fournisseurs'), '- ' + fmt(c.reglements)) +
    l(t('Retraits'), '- ' + fmt(c.retraits)) + l(t('Caisse théorique'), money(c.theorique), 'total');
}

/* =================================================================== */
/* Point de vente (POS)                                                */
/* =================================================================== */
const PAY = [['Espèces', 'pm-cash', '💵'], ['Bankily', 'pm-bankily', '📱'], ['Sedad', 'pm-sedad', '📲'], ['Masrivi', 'pm-masrivi', '💳'], ['Crédit client', 'pm-credit', '👤']];
let POS = { produits: [], clients: [] };
function addToCart(id, q = 1) {
  const l = S.cart.find(x => x.produit_id === id);
  if (l) l.quantite = round2(l.quantite + q);
  else { const p = POS.produits.find(x => x.id === id); S.cart.push({ produit_id: id, quantite: q, prix: p ? p.prix : 0, nom: p ? p.nom : '', nom_ar: p ? p.nom_ar : '' }); }
  S.cart = S.cart.filter(x => x.quantite > 0);
}
function cartTotals() {
  const st = round2(S.cart.reduce((s, l) => s + l.prix * l.quantite, 0));
  const rem = S.remiseType === 'pct' ? round2(st * n0(S.remise) / 100) : Math.min(n0(S.remise), st);
  return { st, rem, total: round2(st - rem) };
}
PAGES.pos = async el => {
  const [produits, clients] = await Promise.all([api('/produits'), api('/clients')]);
  POS = { produits: produits.filter(p => p.actif), clients: clients.filter(c => c.actif) };
  S.cart.forEach(l => { const p = POS.produits.find(x => x.id === l.produit_id); if (p) { l.nom = p.nom; l.nom_ar = p.nom_ar; } });
  const cats = ['Tous', ...new Set(POS.produits.map(p => p.categorie))];
  el.innerHTML = `<div class="pos">
    <div class="card">${cardH(t('Produits'), 'box', `<div class="row"><input class="input sm" id="pq" placeholder="${t('Rechercher un produit…')}" value="${esc(S.posQ)}" style="width:220px">
      <button class="btn sm" id="hist">${ic('history')} ${t('Historique')}</button></div>`)}
      <div class="tabs" style="margin-bottom:10px">${cats.map(c => `<button data-c="${esc(c)}" class="${S.posCat === c ? 'on' : ''}">${t(c)}</button>`).join('')}</div>
      <div class="pgrid" id="pgrid"></div></div>
    <div class="card">${cardH(t('Vente rapide'), 'cart', `<kbd>F2</kbd>`)}
      <div class="cart" id="cart"></div>
      <div id="cart-foot"></div></div>
  </div>`;
  const drawGrid = () => {
    const q = S.posQ.toLowerCase();
    const list = POS.produits.filter(p => (S.posCat === 'Tous' || p.categorie === S.posCat) && (!q || p.nom.toLowerCase().includes(q) || (p.nom_ar || '').includes(q)));
    $('#pgrid').innerHTML = list.map(p => `<div class="pcard" data-id="${p.id}"><span class="pst ${p.stock <= p.stock_min ? 'low' : ''}">${fmt(p.stock, 0)}</span>
      <div class="pimg">${p.image ? `<img src="${p.image}" alt="">` : esc(p.emoji || '🍞')}</div><div class="pn">${esc(pn(p))}</div><div class="pp">${money(p.prix)}</div></div>`).join('') || `<div class="empty">${t('Aucun produit')}</div>`;
  };
  const drawCart = () => {
    const { st, rem, total } = cartTotals();
    $('#cart').innerHTML = S.cart.length ? `<table class="tbl compact"><thead><tr><th>${t('Produit')}</th><th class="n">${t('Prix')}</th><th class="c">${t('Qté')}</th><th class="n">${t('Total')}</th><th></th></tr></thead><tbody>
      ${S.cart.map((l, i) => `<tr><td>${esc(pn(l))}</td><td class="n">${fmt(l.prix)}</td><td class="c"><span class="qty" dir="ltr"><button data-m="${i}">−</button><input data-q="${i}" value="${l.quantite}" inputmode="decimal"><button data-pl="${i}">+</button></span></td>
      <td class="n bold">${fmt(l.prix * l.quantite)}</td><td><button class="icon-btn del" data-rm="${i}">${ic('trash')}</button></td></tr>`).join('')}</tbody></table>`
      : `<div class="empty">🛒<br>${t('Touchez un produit pour l\'ajouter au panier')}</div>`;
    const credit = S.mode === 'Crédit client';
    const rendu = n0(S.recu) - total;
    $('#cart-foot').innerHTML = `<div class="sep"></div>
      <div class="row" style="justify-content:space-between"><span>${t('Sous-total')}</span><b>${money(st)}</b></div>
      <div class="row" style="justify-content:space-between;margin-top:6px"><span>${t('Remise')}</span>
        <div class="row" style="gap:4px"><input class="input sm" id="rem" style="width:100px" type="number" min="0" value="${S.remise || ''}" placeholder="0">
        <button class="btn sm ${S.remiseType === 'pct' ? 'orange' : ''}" id="remt">${S.remiseType === 'pct' ? '%' : cur()}</button>${rem ? `<span class="red small">-${fmt(rem)}</span>` : ''}</div></div>
      <div class="total-box"><span>${t('Total')}</span><span class="tv">${money(total)}</span></div>
      <div class="small bold" style="margin-bottom:6px">${t('Mode de paiement')}</div>
      <div class="pay-modes">${PAY.map(([m, c, e]) => `<button class="${c} ${S.mode === m ? 'on' : ''}" data-mode="${m}">${e} ${t(m)}</button>`).join('')}</div>
      <div class="row" style="margin-top:10px">
        <select class="input sm" id="cli" style="flex:1"><option value="">${credit ? '— ' + t('Choisir un client') + ' —' : t('Client de passage')}</option>${POS.clients.map(c => `<option value="${c.id}" ${String(S.clientId) === String(c.id) ? 'selected' : ''}>${esc(c.nom)}${c.solde < 0 ? ` (${fmt(c.solde)})` : ''}</option>`).join('')}</select>
        ${S.mode === 'Espèces' ? `<input class="input sm" id="recu" type="number" min="0" placeholder="${t('Montant reçu')}" value="${S.recu}" style="width:120px">` : ''}</div>
      ${S.mode === 'Espèces' && n0(S.recu) > 0 ? `<div class="row" style="justify-content:space-between;margin-top:6px"><span>${t('Monnaie à rendre')}</span><b class="${rendu < 0 ? 'red' : 'green'}">${money(rendu)}</b></div>` : ''}
      <div class="row" style="margin-top:12px"><button class="btn" id="clr" style="flex:1">${ic('x')} ${t('Annuler')}</button>
        <button class="btn primary lg" id="val" style="flex:2" ${S.cart.length ? '' : 'disabled'}>${ic('check')} ${t('Valider la vente')} (F2)</button></div>`;
    bindFoot();
  };
  const bindFoot = () => {
    $('#rem').oninput = e => { S.remise = e.target.value; const { rem, total } = cartTotals(); $('.tv').innerHTML = money(total); };
    $('#rem').onchange = drawCart;
    $('#remt').onclick = () => { S.remiseType = S.remiseType === 'pct' ? 'mru' : 'pct'; drawCart(); };
    $$('[data-mode]').forEach(b => b.onclick = () => { S.mode = b.dataset.mode; drawCart(); });
    $('#cli').onchange = e => S.clientId = e.target.value;
    const r = $('#recu'); if (r) { r.onchange = e => { S.recu = e.target.value; drawCart(); }; }
    $('#clr').onclick = () => { S.cart = []; S.remise = 0; S.recu = ''; S.clientId = ''; drawCart(); };
    $('#val').onclick = validate;
  };
  const validate = async () => {
    if (!S.cart.length) return;
    const recu = $('#recu'); if (recu) S.recu = recu.value;
    const { total } = cartTotals();
    if (S.mode === 'Crédit client' && !S.clientId) return toast(t('Choisissez un client pour une vente à crédit'), 'err');
    try {
      const v = await api('/ventes', { body: { lignes: S.cart.map(l => ({ produit_id: l.produit_id, quantite: l.quantite })), remise: cartTotals().rem, mode_paiement: S.mode, client_id: S.clientId || null } });
      const rendu = S.mode === 'Espèces' && n0(S.recu) > total ? n0(S.recu) - total : 0;
      toast(`${t('Vente enregistrée')} — ${v.numero} — ${moneyTxt(v.total)}${rendu ? ' — ' + t('Rendu') + ' ' + moneyTxt(rendu) : ''}`);
      S.cart = []; S.remise = 0; S.recu = ''; S.clientId = ''; S.mode = 'Espèces';
      v.lignes.forEach(l => { const p = POS.produits.find(x => x.id === l.produit_id); if (p) p.stock -= l.quantite; });
      drawGrid(); drawCart();
      showTicket(v.id, v, rendu);
    } catch (e) { fail(e); }
  };
  $$('[data-c]', el).forEach(b => b.onclick = () => { S.posCat = b.dataset.c; $$('[data-c]', el).forEach(x => x.classList.toggle('on', x === b)); drawGrid(); });
  $('#pq').oninput = e => { S.posQ = e.target.value; drawGrid(); };
  $('#pgrid').onclick = e => { const c = e.target.closest('.pcard'); if (c) { addToCart(Number(c.dataset.id)); drawCart(); } };
  $('#cart').onclick = e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.m) S.cart[b.dataset.m].quantite -= 1;
    if (b.dataset.pl) S.cart[b.dataset.pl].quantite += 1;
    if (b.dataset.rm) S.cart.splice(Number(b.dataset.rm), 1);
    S.cart = S.cart.filter(x => x.quantite > 0); drawCart();
  };
  $('#cart').onchange = e => { if (e.target.dataset.q) { S.cart[e.target.dataset.q].quantite = n0(e.target.value.replace(',', '.')); S.cart = S.cart.filter(x => x.quantite > 0); drawCart(); } };
  $('#hist').onclick = ventesHistory;
  S.posKey = e => { if (e.key === 'F2' && location.hash.includes('pos')) { e.preventDefault(); validate(); } };
  drawGrid(); drawCart();
};
document.addEventListener('keydown', e => S.posKey && S.posKey(e));

function ticketHtml(v, rendu = 0) {
  const s = S.settings;
  return `<div class="ticket"><div class="tc"><div class="tt">${esc(s.nom || 'Boulangerie Mbourou')}</div><div class="ar" style="font-size:14px">${esc(s.nom_ar || '')}</div>
    <div>${esc(s.ville || '')}</div><div>Tél : ${esc(s.telephone || '')}</div></div><hr>
    <table><tr><td>Ticket N° : ${esc(v.numero)}</td><td class="n">${fmtDate(v.date)}</td></tr>${v.client_nom ? `<tr><td colspan="2">Client : ${esc(v.client_nom)}</td></tr>` : ''}</table><hr>
    <table>${v.lignes.map(l => `<tr><td>${esc(l.nom)}${l.nom_ar ? `<br><span class="ar">${esc(l.nom_ar)}</span>` : ''}</td><td class="n">${fmt(l.quantite)} x ${fmt(l.prix)}</td><td class="n">${fmt(l.total)}</td></tr>`).join('')}</table><hr>
    <table>${v.remise ? `<tr><td>Sous-total</td><td class="n">${fmt(v.sous_total)}</td></tr><tr><td>Remise</td><td class="n">-${fmt(v.remise)}</td></tr>` : ''}
    <tr class="tt"><td><b>TOTAL المجموع</b></td><td class="n"><b>${fmt(v.total)} MRU</b></td></tr>
    <tr><td>Paiement : ${esc(v.mode_paiement)}</td><td class="n">${rendu ? 'Rendu : ' + fmt(rendu) : ''}</td></tr></table>${v.annulee ? '<div class="tc"><b>*** ANNULÉ ***</b></div>' : ''}<hr>
    <div class="tc">${esc(s.ticket_message || '')}<br><span class="ar">${esc(s.ticket_message_ar || '')}</span></div></div>`;
}
async function showTicket(id, v, rendu = 0) {
  try {
    v = v || await api('/ventes/' + id);
    const m = modal({ title: t('Aperçu ticket'), cls: 'narrow', body: `<div class="ticket-preview">${ticketHtml(v, rendu)}</div>`,
      foot: `${isAdmin() && !v.annulee ? `<button class="btn danger" id="tk-an">${t('Annuler la vente')}</button><span class="spacer"></span>` : ''}<button class="btn" data-close>${t('Fermer')}</button><button class="btn orange" id="tk-pr">${ic('print')} ${t('Imprimer')}</button>` });
    $('#tk-pr', m).onclick = () => printHtml(ticketHtml(v, rendu));
    const an = $('#tk-an', m);
    if (an) an.onclick = async () => { if (await confirmBox(t('Annuler cette vente ? Le stock sera remis et le crédit client corrigé.'))) { try { await api(`/ventes/${v.id}/annuler`, { method: 'POST' }); toast(t('Vente annulée')); m.close(); route(); } catch (e) { fail(e); } } };
  } catch (e) { fail(e); }
}
async function ventesHistory() {
  const m = modal({ title: t('Historique des ventes'), cls: 'wide', body: `<div class="row" style="margin-bottom:10px"><input type="date" class="input sm" id="hd" value="${todayStr()}" style="width:170px"><span class="spacer"></span><b id="htot"></b></div><div id="hl" class="tbl-wrap"></div>` });
  const load = async () => {
    const d = $('#hd', m).value;
    const rows = await api(`/ventes?from=${d}&to=${d}`);
    $('#htot', m).innerHTML = `${rows.filter(r => !r.annulee).length} ${t('ventes')} — ${money(rows.filter(r => !r.annulee).reduce((s, r) => s + r.total, 0))}`;
    $('#hl', m).innerHTML = `<table class="tbl compact"><thead><tr><th>N°</th><th>${t('Heure')}</th><th>${t('Articles')}</th><th>${t('Paiement')}</th><th class="n">${t('Total')}</th><th></th></tr></thead><tbody>
      ${rows.map(r => `<tr style="${r.annulee ? 'opacity:.5;text-decoration:line-through' : ''}"><td>${r.numero}</td><td>${r.date.slice(11, 16)}</td><td class="small">${esc(r.articles || '')}${r.client_nom ? ` <span class="badge b-blue">${esc(r.client_nom)}</span>` : ''}</td><td>${t(r.mode_paiement)}</td><td class="n bold">${fmt(r.total)}</td>
      <td><button class="icon-btn" data-v="${r.id}">${ic('eye')}</button></td></tr>`).join('') || `<tr><td colspan="6" class="empty">${t('Aucune vente')}</td></tr>`}</tbody></table>`;
  };
  $('#hd', m).onchange = load; $('#hl', m).onclick = e => { const b = e.target.closest('[data-v]'); if (b) { m.close(); showTicket(Number(b.dataset.v)); } };
  load().catch(fail);
}

/* =================================================================== */
/* Produits                                                            */
/* =================================================================== */
const EMOJIS = ['🥖', '🍞', '🥐', '🍫', '🍩', '🎂', '🍰', '🧁', '🍪', '🥨', '🥯', '🫓', '🍕', '🥪', '🌯', '🥧', '🍮', '☕', '🥤', '🧃'];
const CATS = ['Pains', 'Viennoiseries', 'Pâtisseries', 'Sandwichs', 'Boissons', 'Autres'];
PAGES.produits = async el => {
  const rows = await api('/produits');
  const f = S.prodCat || 'Tous';
  const list = rows.filter(p => f === 'Tous' || p.categorie === f);
  el.innerHTML = head(t('Produits'), t('Catalogue, prix de vente, stock et marge'), `<button class="btn primary" id="np">${ic('plus')} ${t('Nouveau produit')}</button>`) +
    `<div class="card"><div class="tabs" style="margin-bottom:12px">${['Tous', ...CATS].map(c => `<button data-c="${c}" class="${f === c ? 'on' : ''}">${t(c)}</button>`).join('')}</div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th></th><th>${t('Nom')}</th><th>${t('Nom arabe')}</th><th>${t('Catégorie')}</th><th class="n">${t('Prix de vente')}</th><th class="n">${t('Coût de revient')}</th><th class="n">${t('Marge')}</th><th class="n">${t('Stock')}</th><th>${t('Recette')}</th><th>${t('Statut')}</th><th></th></tr></thead><tbody>
    ${list.map(p => { const tm = p.prix ? (p.prix - p.cout_revient) / p.prix * 100 : 0; return `<tr style="${p.actif ? '' : 'opacity:.5'}"><td>${thumb(p)}</td><td class="bold">${esc(p.nom)}</td><td class="ar">${esc(p.nom_ar || '')}</td><td>${t(p.categorie)}</td>
      <td class="n bold">${money(p.prix)}</td><td class="n">${p.cout_revient ? money(p.cout_revient, 1) : '—'}</td><td class="n">${p.cout_revient ? marginPill(tm) : '—'}</td>
      <td class="n ${p.stock <= p.stock_min ? 'red bold' : ''}">${fmt(p.stock)}</td><td>${p.a_recette ? `<span class="badge b-green">✔</span>` : `<span class="badge b-orange">${t('À définir')}</span>`}</td>
      <td>${p.actif ? `<span class="badge b-green">${t('Actif')}</span>` : `<span class="badge b-gray">${t('Inactif')}</span>`}</td>
      <td class="c" style="white-space:nowrap"><button class="icon-btn" data-rc="${p.id}" title="${t('Recette')}">${ic('book')}</button><button class="icon-btn" data-e="${p.id}">${ic('edit')}</button><button class="icon-btn del" data-d="${p.id}">${ic('trash')}</button></td></tr>`; }).join('') || `<tr><td colspan="11" class="empty">${t('Aucun produit')}</td></tr>`}
    </tbody></table></div></div>`;
  $$('[data-c]', el).forEach(b => b.onclick = () => { S.prodCat = b.dataset.c; route(); });
  $('#np').onclick = () => produitForm();
  el.onclick = async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.e) produitForm(rows.find(p => p.id == b.dataset.e));
    if (b.dataset.rc) { S.rcSel = Number(b.dataset.rc); location.hash = '#/recettes'; }
    if (b.dataset.d && await confirmBox(t('Supprimer ce produit ?'))) { try { const r = await api('/produits/' + b.dataset.d, { method: 'DELETE' }); toast(r.desactive ? t('Produit utilisé : il a été désactivé') : t('Supprimé')); route(); } catch (er) { fail(er); } }
  };
};
function produitForm(p = {}) {
  let img = p.image || null, emoji = p.emoji || '🍞';
  const m = formModal({
    title: p.id ? t('Modifier le produit') : t('Nouveau produit'), cls: 'wide', data: { categorie: 'Pains', actif: 1, stock_min: 10, ...p },
    fields: [
      { name: 'nom', label: t('Nom (français)'), required: true }, { name: 'nom_ar', label: t('Nom (arabe)'), ar: true },
      { name: 'categorie', label: t('Catégorie'), type: 'select', options: CATS }, { name: 'prix', label: t('Prix de vente') + ' (' + cur() + ')', type: 'number', required: true, min: 0 },
      { name: 'stock', label: t('Stock actuel'), type: 'number' }, { name: 'stock_min', label: t('Stock minimum (alerte)'), type: 'number', min: 0 },
      { name: 'actif', label: t('Statut'), type: 'select', options: [[1, t('Actif')], [0, t('Inactif')]] },
    ],
    extra: `<div class="sep"></div><div class="row" style="align-items:flex-start;gap:18px"><div><div class="small bold muted" style="margin-bottom:6px">${t('Photo')}</div>
      <label class="img-drop" id="imgd">${img ? `<img src="${img}">` : emoji}<input type="file" accept="image/*" hidden id="imgf"></label>
      <button type="button" class="btn sm ghost red" id="imgx" style="margin-top:4px">${t('Retirer la photo')}</button></div>
      <div style="flex:1"><div class="small bold muted" style="margin-bottom:6px">${t('Ou choisissez une icône')}</div><div class="emoji-pick">${EMOJIS.map(x => `<button type="button" data-em="${x}" class="${x === emoji ? 'on' : ''}">${x}</button>`).join('')}</div>
      <p class="small muted">${t('Le coût de revient est calculé automatiquement depuis la recette.')}</p></div></div>`,
    onSubmit: async d => {
      const body = { ...d, image: img, emoji };
      if (p.id) await api('/produits/' + p.id, { method: 'PUT', body }); else await api('/produits', { body });
      toast(t('Produit enregistré')); route();
    },
  });
  const draw = () => { $('#imgd', m).innerHTML = (img ? `<img src="${img}">` : emoji) + '<input type="file" accept="image/*" hidden id="imgf">'; $('#imgf', m).onchange = onFile; };
  const onFile = e => {
    const file = e.target.files[0]; if (!file) return;
    const r = new FileReader(); r.onload = () => {
      const im = new Image(); im.onload = () => {
        const c = document.createElement('canvas'); const sz = 360; const sc = Math.max(sz / im.width, sz / im.height);
        c.width = sz; c.height = sz; const x = c.getContext('2d');
        x.drawImage(im, (sz - im.width * sc) / 2, (sz - im.height * sc) / 2, im.width * sc, im.height * sc);
        img = c.toDataURL('image/jpeg', 0.82); draw();
      }; im.src = r.result;
    }; r.readAsDataURL(file);
  };
  $('#imgf', m).onchange = onFile;
  $('#imgx', m).onclick = () => { img = null; draw(); };
  $$('[data-em]', m).forEach(b => b.onclick = () => { emoji = b.dataset.em; $$('[data-em]', m).forEach(x => x.classList.toggle('on', x === b)); if (!img) draw(); });
}

/* =================================================================== */
/* Matières premières                                                  */
/* =================================================================== */
const UNITES = ['kg', 'g', 'L', 'ml', 'pcs', 'sac', 'boîte'];
PAGES.matieres = async el => {
  const rows = await api('/matieres');
  const valeur = rows.reduce((s, m) => s + Math.max(m.stock, 0) * m.prix_moyen, 0);
  const alertes = rows.filter(m => m.actif && m.stock <= m.stock_min).length;
  el.innerHTML = head(t('Matières premières'), t('Stocks, seuils d\'alerte et prix moyen pondéré (PMP)'),
    `${isAdmin() ? `<button class="btn" id="ach">${ic('truck')} ${t('Entrée de stock (achat)')}</button>` : ''}<button class="btn" id="exp">${ic('download')} CSV</button><button class="btn primary" id="nm">${ic('plus')} ${t('Nouvelle matière')}</button>`) +
    `<div class="grid g3" style="margin-bottom:14px"><div class="stat-mini"><div class="l">${t('Valeur du stock')}</div><div class="v">${money(valeur)}</div></div>
     <div class="stat-mini"><div class="l">${t('Articles')}</div><div class="v">${rows.filter(m => m.actif).length}</div></div>
     <div class="stat-mini"><div class="l">${t('En alerte')}</div><div class="v ${alertes ? 'red' : 'green'}">${alertes}</div></div></div>
    <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${t('Nom')}</th><th>${t('Nom arabe')}</th><th class="n">${t('Stock actuel')}</th><th>${t('Unité')}</th><th class="n">${t('Stock min')}</th><th class="n">${t('Prix moyen')} (PMP)</th><th class="n">${t('Valeur')}</th><th>${t('Statut')}</th><th></th></tr></thead><tbody>
    ${rows.map(m => { const st = m.stock <= m.stock_min * 0.5 ? ['b-red', 'Critique'] : m.stock <= m.stock_min ? ['b-orange', 'Faible'] : ['b-green', 'OK']; return `<tr style="${m.actif ? '' : 'opacity:.5'}">
      <td class="bold">${esc(m.nom)}</td><td class="ar">${esc(m.nom_ar || '')}</td><td class="n bold ${st[0] === 'b-green' ? 'green' : st[0] === 'b-red' ? 'red' : 'orange'}">${fmt(m.stock, 3)}</td><td>${esc(m.unite)}</td>
      <td class="n">${fmt(m.stock_min)}</td><td class="n">${money(m.prix_moyen, 2)}</td><td class="n">${money(Math.max(m.stock, 0) * m.prix_moyen)}</td><td><span class="badge ${st[0]}">${t(st[1])}</span></td>
      <td class="c" style="white-space:nowrap"><button class="icon-btn" data-e="${m.id}">${ic('edit')}</button>${isAdmin() ? `<button class="icon-btn del" data-d="${m.id}">${ic('trash')}</button>` : ''}</td></tr>`; }).join('')}
    </tbody></table></div><p class="small muted">${t('Le PMP est recalculé automatiquement à chaque achat : (stock × ancien prix + quantité achetée × prix d\'achat) ÷ nouveau stock.')}</p></div>`;
  $('#nm').onclick = () => matiereForm();
  $('#exp').onclick = () => download('/export/matieres');
  if ($('#ach')) $('#ach').onclick = () => achatForm();
  el.onclick = async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.e) matiereForm(rows.find(x => x.id == b.dataset.e));
    if (b.dataset.d && await confirmBox(t('Supprimer cette matière ?'))) { try { const r = await api('/matieres/' + b.dataset.d, { method: 'DELETE' }); toast(r.desactive ? t('Matière utilisée : elle a été désactivée') : t('Supprimé')); route(); } catch (er) { fail(er); } }
  };
};
function matiereForm(m = {}) {
  formModal({ title: m.id ? t('Modifier la matière') : t('Nouvelle matière'), data: { unite: 'kg', actif: 1, ...m },
    fields: [{ name: 'nom', label: t('Nom (français)'), required: true }, { name: 'nom_ar', label: t('Nom (arabe)'), ar: true },
      { name: 'unite', label: t('Unité'), type: 'select', options: UNITES.map(u => [u, u]) }, { name: 'stock', label: t('Stock actuel'), type: 'number' },
      { name: 'stock_min', label: t('Stock minimum (alerte)'), type: 'number', min: 0 }, { name: 'prix_moyen', label: t('Prix unitaire moyen') + ` (${cur()})`, type: 'number', min: 0, help: t('Utilisé pour le calcul du prix de revient') },
      { name: 'actif', label: t('Statut'), type: 'select', options: [[1, t('Actif')], [0, t('Inactif')]] }],
    onSubmit: async d => { if (m.id) await api('/matieres/' + m.id, { method: 'PUT', body: d }); else await api('/matieres', { body: d }); toast(t('Enregistré')); route(); } });
}

/* =================================================================== */
/* Production                                                          */
/* =================================================================== */
PAGES.production = async el => {
  S.prodDate = S.prodDate || todayStr();
  const [produits, rows] = await Promise.all([api('/produits'), api(`/productions?from=${S.prodDate}&to=${S.prodDate}`)]);
  const withR = produits.filter(p => p.actif && p.a_recette);
  const conso = {};
  rows.forEach(r => r.conso.forEach(c => { const k = c.matiere_id; conso[k] = conso[k] || { nom: c.nom, nom_ar: c.nom_ar, unite: c.unite, q: 0, cout: 0 }; conso[k].q += c.quantite; conso[k].cout += c.cout; }));
  const tot = rows.reduce((s, r) => ({ q: s.q + r.quantite, c: s.c + r.cout_total, ca: s.ca + r.quantite * r.prix }), { q: 0, c: 0, ca: 0 });
  const EM = { Farine: '🌾', Levure: '🧫', Sel: '🧂', Sucre: '🍚', Huile: '🫗', Beurre: '🧈', Lait: '🥛', 'Œufs': '🥚', Chocolat: '🍫', Fromage: '🧀', Eau: '💧', Thon: '🐟' };
  el.innerHTML = head(t('Production'), t('Enregistrez les fournées : le stock de matières est déduit et le coût de revient calculé'),
    `<input type="date" class="input" id="pd" value="${S.prodDate}" style="width:170px">`) +
  `<div class="grid g-rc"><div class="card">${cardH(t('Productions du') + ' ' + fmtDate(S.prodDate, false), 'factory')}
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>${t('Heure')}</th><th>${t('Produit')}</th><th class="n">${t('Quantité produite')}</th><th class="n">${t('Coût matières')}</th><th class="n">${t('Charges')}</th><th class="n">${t('Coût de production')}</th><th class="n">${t('Coût unitaire')}</th><th class="n">${t('Valeur de vente')}</th><th></th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${r.date.slice(11, 16)}</td><td><span class="row">${thumb({ emoji: r.emoji })} <b>${esc(pn({ nom: r.produit_nom, nom_ar: r.nom_ar }))}</b></span></td><td class="n bold">${fmt(r.quantite)}</td><td class="n">${fmt(r.cout_matieres)}</td><td class="n">${fmt(r.cout_charges)}</td>
      <td class="n bold">${money(r.cout_total)}</td><td class="n">${fmt(r.cout_unitaire, 2)}</td><td class="n green">${fmt(r.quantite * r.prix)}</td><td>${isAdmin() ? `<button class="icon-btn del" data-d="${r.id}">${ic('trash')}</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="9" class="empty">${t('Aucune production ce jour')}</td></tr>`}
    </tbody>${rows.length ? `<tfoot><tr><td colspan="2">${t('Total')}</td><td class="n">${fmt(tot.q)}</td><td></td><td></td><td class="n">${money(tot.c)}</td><td></td><td class="n green">${money(tot.ca)}</td><td></td></tr></tfoot>` : ''}</table></div>
    <div class="card-h mt"><h3 style="font-size:15px">${t('Consommation des matières premières')}</h3></div>
    <div class="conso-chips">${Object.values(conso).map(c => `<div class="chip"><span class="ce">${EM[c.nom] || '📦'}</span><div><div class="small">${esc(pn(c))}</div><b class="red num">-${fmt(c.q, 2)} ${esc(c.unite)}</b><div class="small muted">${moneyTxt(c.cout)}</div></div></div>`).join('') || `<span class="muted">—</span>`}</div>
  </div>
  <div class="card">${cardH(t('Nouvelle production'), 'plus')}
    <div class="field"><label>${t('Produit')}</label><select class="input" id="np-p">${withR.map(p => `<option value="${p.id}">${esc(pn(p))}</option>`).join('')}</select>
      ${produits.some(p => p.actif && !p.a_recette) ? `<span class="small muted">${t('Seuls les produits ayant une recette sont listés.')}</span>` : ''}</div>
    <div class="field"><label>${t('Quantité produite')} (${t('pcs')})</label><input class="input" type="number" id="np-q" min="1" value="100"></div>
    <div class="field"><label>${t('Notes')}</label><input class="input" id="np-n"></div>
    <div id="np-prev"></div>
    <button class="btn primary lg" id="np-go" style="width:100%">${ic('check')} ${t('Enregistrer la production')}</button>
  </div></div>`;
  $('#pd').onchange = e => { S.prodDate = e.target.value; route(); };
  const prev = debounce(async () => {
    const pid = $('#np-p').value, q = n0($('#np-q').value);
    if (!pid || q <= 0) { $('#np-prev').innerHTML = ''; return; }
    try {
      const r = await api('/productions/preview', { body: { produit_id: pid, quantite: q } });
      const p = produits.find(x => x.id == pid);
      $('#np-prev').innerHTML = `<div class="tbl-wrap" style="margin-bottom:10px"><table class="tbl compact"><thead><tr><th>${t('Matière')}</th><th class="n">${t('Besoin')}</th><th class="n">${t('Disponible')}</th><th class="n">${t('Coût')}</th></tr></thead><tbody>
        ${r.conso.map(c => `<tr><td>${esc(pn(c))}</td><td class="n bold">${fmt(c.besoin, 3)} ${esc(c.unite)}</td><td class="n ${c.suffisant ? 'green' : 'red bold'}">${fmt(c.stock, 2)}</td><td class="n">${fmt(c.besoin * c.prix_unitaire)}</td></tr>`).join('')}</tbody></table></div>
        <div class="grid g3" style="margin-bottom:12px"><div class="stat-mini"><div class="l">${t('Coût de production')}</div><div class="v">${money(r.cout_total)}</div></div>
        <div class="stat-mini"><div class="l">${t('Coût unitaire')}</div><div class="v">${money(r.cout_unitaire, 2)}</div></div>
        <div class="stat-mini"><div class="l">${t('Marge prévue')}</div><div class="v green">${money(q * p.prix - r.cout_total)}</div></div></div>
        ${r.conso.some(c => !c.suffisant) ? `<div class="badge b-red" style="display:block;padding:8px;margin-bottom:10px">⚠ ${t('Stock insuffisant pour certaines matières')}</div>` : ''}`;
    } catch (e) { $('#np-prev').innerHTML = `<div class="red small">${esc(e.message)}</div>`; }
  }, 200);
  $('#np-p').onchange = prev; $('#np-q').oninput = prev; prev();
  $('#np-go').onclick = async () => {
    const body = { produit_id: $('#np-p').value, quantite: $('#np-q').value, notes: $('#np-n').value, date: S.prodDate === todayStr() ? null : S.prodDate };
    try { await api('/productions', { body }); toast(t('Production enregistrée')); route(); }
    catch (e) {
      if (e.status === 409 && isAdmin() && await confirmBox(e.message + '<br><br>' + t('Enregistrer quand même (stock négatif) ?'), { ok: t('Forcer'), danger: true })) {
        try { await api('/productions', { body: { ...body, forcer: true } }); toast(t('Production enregistrée')); route(); } catch (er) { fail(er); }
      } else fail(e);
    }
  };
  el.onclick = async e => { const b = e.target.closest('[data-d]'); if (b && await confirmBox(t('Supprimer cette production ? Les matières seront remises en stock.'))) { try { await api('/productions/' + b.dataset.d, { method: 'DELETE' }); toast(t('Supprimé')); route(); } catch (er) { fail(er); } } };
};

/* =================================================================== */
/* Recettes & prix de revient                                          */
/* =================================================================== */
function calcRecette(rec, lignes, prix, margeCible, mats) {
  const details = lignes.filter(l => l.matiere_id).map(l => { const m = mats.find(x => x.id == l.matiere_id) || {}; const cout = round2(n0(l.quantite) * n0(m.prix_moyen)); return { ...l, nom: m.nom, nom_ar: m.nom_ar, unite: m.unite, prix_unitaire: n0(m.prix_moyen), cout }; });
  const cout_matieres = round2(details.reduce((s, d) => s + d.cout, 0));
  const pertes = round2(cout_matieres * n0(rec.pertes_pct) / 100);
  const charges = round2(n0(rec.main_oeuvre) + n0(rec.energie) + n0(rec.emballage) + n0(rec.autres));
  const cout_total = round2(cout_matieres + pertes + charges);
  const rendement = Math.max(n0(rec.rendement), 0.0001);
  const cout_unitaire = round2(cout_total / rendement);
  const pv = n0(prix);
  const marge_unitaire = round2(pv - cout_unitaire);
  const taux_marge = pv > 0 ? round2(marge_unitaire / pv * 100) : 0;
  const coefficient = cout_unitaire > 0 ? round2(pv / cout_unitaire) : 0;
  const mc = Math.min(n0(margeCible), 95);
  const prix_conseille = cout_unitaire > 0 ? Math.ceil(cout_unitaire / (1 - mc / 100) / 5) * 5 : 0;
  details.forEach(d => d.part = cout_total ? round2(d.cout / cout_total * 100) : 0);
  return { details, cout_matieres, pertes, charges, cout_total, rendement, cout_unitaire, prix_vente: pv, marge_unitaire, taux_marge, coefficient, prix_conseille, marge_cible: mc,
    taux_marque: cout_unitaire > 0 ? round2(marge_unitaire / cout_unitaire * 100) : 0 };
}
PAGES.recettes = async el => {
  const [list, mats] = await Promise.all([api('/recettes'), api('/matieres')]);
  if (!S.rcSel || !list.find(r => r.produit.id === S.rcSel)) S.rcSel = list[0] && list[0].produit.id;
  el.innerHTML = head(t('Recettes & prix de revient'), t('Fiches techniques : ingrédients, charges et calcul automatique du coût de revient'),
    `<button class="btn" id="exp">${ic('download')} ${t('Exporter')} CSV</button>`) +
  `<div class="card">${cardH(t('Synthèse des coûts de revient'), 'calc', `<span class="small muted">${t('Marge cible')} : <b>${fmt(S.settings.marge_cible || 40)}%</b></span>`)}
    <div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>${t('Produit')}</th><th class="n">${t('Rendement')}</th><th class="n">${t('Coût matières')}</th><th class="n">${t('Charges & pertes')}</th><th class="n">${t('Coût du lot')}</th><th class="n">${t('Coût unitaire')}</th><th class="n">${t('Prix de vente')}</th><th class="n">${t('Marge unitaire')}</th><th class="n">${t('Taux de marge')}</th><th class="n">${t('Coefficient')}</th><th class="n">${t('Prix conseillé')}</th></tr></thead><tbody>
    ${list.map(r => { const c = r.calcul; return `<tr data-sel="${r.produit.id}" style="cursor:pointer;${r.produit.id === S.rcSel ? 'background:var(--orange-100)' : ''}"><td><span class="row">${thumb(r.produit)}<b>${esc(pn(r.produit))}</b></span></td>
      ${c ? `<td class="n">${fmt(c.rendement)}</td><td class="n">${fmt(c.cout_matieres)}</td><td class="n">${fmt(c.charges + c.pertes)}</td><td class="n">${fmt(c.cout_total)}</td><td class="n bold">${fmt(c.cout_unitaire, 2)}</td><td class="n">${fmt(c.prix_vente)}</td>
      <td class="n ${c.marge_unitaire < 0 ? 'red' : 'green'} bold">${fmt(c.marge_unitaire, 2)}</td><td class="n">${marginPill(c.taux_marge)}</td><td class="n">× ${fmt(c.coefficient, 2)}</td><td class="n ${c.prix_conseille > c.prix_vente ? 'orange bold' : 'muted'}">${fmt(c.prix_conseille)}</td>`
      : `<td colspan="10" class="c"><span class="badge b-orange">${t('Recette non définie — cliquez pour la créer')}</span></td>`}</tr>`; }).join('')}
    </tbody></table></div></div>
  <div id="rc-ed" class="mt"></div>`;
  $('#exp').onclick = () => download('/export/prix-revient');
  $$('[data-sel]', el).forEach(r => r.onclick = () => { S.rcSel = Number(r.dataset.sel); route(); });
  if (S.rcSel) recetteEditor($('#rc-ed'), await api('/recettes/' + S.rcSel), mats);
};
function recetteEditor(box, data, mats) {
  const p = data.produit;
  const rec = { rendement: 100, main_oeuvre: 0, energie: 0, emballage: 0, autres: 0, pertes_pct: 2, notes: '', ...(data.recette || {}) };
  let lignes = data.lignes.length ? data.lignes.map(l => ({ matiere_id: l.matiere_id, quantite: l.quantite })) : [{ matiere_id: '', quantite: '' }];
  let prix = p.prix, simQ = rec.rendement;
  const activeMats = mats.filter(m => m.actif || lignes.some(l => l.matiere_id == m.id));
  const COLORS = ['#e8891d', '#6a3512', '#f2b01e', '#2d6fe0', '#1e9e57', '#8a5cf5', '#e03636', '#12a594', '#c2185b', '#7b8794', '#a0522d', '#5c6bc0'];
  box.innerHTML = `<div class="grid g-rc">
   <div class="card">${cardH(`${t('Recette')} : ${esc(pn(p))}`, 'book', `<div class="row"><button class="btn sm" id="rc-pr">${ic('print')} ${t('Fiche technique')}</button>${isAdmin() ? `<button class="btn primary" id="rc-sv">${ic('check')} ${t('Enregistrer la recette')}</button>` : ''}</div>`)}
     <div class="frow">
       <div class="field"><label>${t('Rendement (unités par fournée)')}</label><input class="input" type="number" min="1" data-r="rendement" value="${rec.rendement}"></div>
       <div class="field"><label>${t('Prix de vente unitaire')} (${cur()})</label><input class="input" type="number" min="0" id="rc-pv" value="${prix}"></div>
       <div class="field"><label>${t('Pertes / chutes')} (%)</label><input class="input" type="number" min="0" step="0.5" data-r="pertes_pct" value="${rec.pertes_pct}"></div>
     </div>
     <div class="small bold" style="margin:4px 0 8px">${t('Ingrédients (pour une fournée)')}</div>
     <div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>${t('Ingrédient')}</th><th class="n">${t('Quantité')}</th><th>${t('Unité')}</th><th class="n">${t('Prix unitaire')}</th><th class="n">${t('Coût')}</th><th class="n">%</th><th></th></tr></thead><tbody id="rc-lines"></tbody></table></div>
     <button class="btn sm" id="rc-add" style="margin-top:8px">${ic('plus')} ${t('Ajouter un ingrédient')}</button>
     <div class="small bold" style="margin:16px 0 8px">${t('Charges par fournée')} (${cur()})</div>
     <div class="frow">
       <div class="field"><label>${t("Main d'œuvre")}</label><input class="input" type="number" min="0" data-r="main_oeuvre" value="${rec.main_oeuvre}"></div>
       <div class="field"><label>${t('Énergie (gaz, électricité)')}</label><input class="input" type="number" min="0" data-r="energie" value="${rec.energie}"></div>
       <div class="field"><label>${t('Emballage')}</label><input class="input" type="number" min="0" data-r="emballage" value="${rec.emballage}"></div>
       <div class="field"><label>${t('Autres frais')}</label><input class="input" type="number" min="0" data-r="autres" value="${rec.autres}"></div>
     </div>
     <div class="field"><label>${t('Notes / mode opératoire')}</label><textarea class="input" data-r="notes">${esc(rec.notes || '')}</textarea></div>
   </div>
   <div><div class="card" id="rc-res"></div>
     <div class="card mt">${cardH(t('Simulation de production'), 'calc')}
       <div class="field"><label>${t('Quantité à produire')} (${t('pcs')})</label><input class="input" type="number" min="1" id="rc-simq" value="${simQ}"></div><div id="rc-sim"></div></div>
   </div></div>`;
  const matOpts = sel => `<option value="">—</option>` + activeMats.map(m => `<option value="${m.id}" ${m.id == sel ? 'selected' : ''}>${esc(pn(m))}</option>`).join('');
  const calc = () => calcRecette(rec, lignes, prix, S.settings.marge_cible || 40, mats);
  const drawLines = () => {
    const c = calc();
    $('#rc-lines', box).innerHTML = lignes.map((l, i) => { const m = mats.find(x => x.id == l.matiere_id); const d = c.details.find(x => x.matiere_id == l.matiere_id) || {};
      return `<tr><td><select class="input sm" data-lm="${i}">${matOpts(l.matiere_id)}</select></td><td class="n"><input class="input sm" style="width:90px" type="number" min="0" step="any" data-lq="${i}" value="${l.quantite}"></td>
        <td>${m ? esc(m.unite) : ''}</td><td class="n">${m ? fmt(m.prix_moyen, 2) : ''}</td><td class="n bold" data-lc="${i}">${d.cout != null ? fmt(d.cout, 2) : ''}</td><td class="n muted" data-lp="${i}">${d.part != null ? fmt(d.part, 1) : ''}</td>
        <td><button class="icon-btn del" data-lx="${i}">${ic('trash')}</button></td></tr>`; }).join('');
  };
  const drawRes = () => {
    const c = calc();
    // met à jour coûts des lignes sans redessiner les champs
    lignes.forEach((l, i) => { const d = c.details.find(x => x.matiere_id == l.matiere_id); const a = $(`[data-lc="${i}"]`, box), b = $(`[data-lp="${i}"]`, box); if (a) a.textContent = d ? fmt(d.cout, 2) : ''; if (b) b.textContent = d ? fmt(d.part, 1) : ''; });
    const parts = [...c.details.map((d, i) => ({ l: pn(d), v: d.cout, c: COLORS[i % COLORS.length] })), { l: t('Pertes'), v: c.pertes, c: '#bdb0a0' }, { l: t("Main d'œuvre"), v: n0(rec.main_oeuvre), c: '#3d1d09' }, { l: t('Énergie'), v: n0(rec.energie), c: '#ff6f61' }, { l: t('Emballage'), v: n0(rec.emballage), c: '#9ccc65' }, { l: t('Autres'), v: n0(rec.autres), c: '#90a4ae' }].filter(x => x.v > 0);
    const L = (a, b, cls = '') => `<div class="ln ${cls}"><span>${a}</span><b>${b}</b></div>`;
    $('#rc-res', box).innerHTML = `${cardH(t('Prix de revient'), 'calc')}
      <div class="hero-cost"><div><div class="l">${t('Coût unitaire')}</div><div class="v">${fmt(c.cout_unitaire, 2)} <small>${cur()}</small></div></div>
        <div><div class="l">${t('Prix de vente')}</div><div class="v">${fmt(c.prix_vente)} <small>${cur()}</small></div></div>
        <div><div class="l">${t('Marge unitaire')}</div><div class="v" style="color:${c.marge_unitaire < 0 ? '#ff8a80' : '#9ff0b8'}">${fmt(c.marge_unitaire, 2)}</div></div></div>
      <div class="cost-bar">${parts.map(x => `<i style="width:${c.cout_total ? x.v / c.cout_total * 100 : 0}%;background:${x.c}" title="${esc(x.l)}"></i>`).join('')}</div>
      <div class="legend">${parts.map(x => `<span style="--c:${x.c}">${esc(x.l)} ${fmt(c.cout_total ? x.v / c.cout_total * 100 : 0, 0)}%</span>`).join('')}</div>
      <div class="cost-summary mt">
        ${L(t('Coût des matières premières'), money(c.cout_matieres, 2))}${L(t('Pertes / chutes') + ` (${fmt(rec.pertes_pct)}%)`, money(c.pertes, 2))}${L(t('Charges (main d\'œuvre, énergie, emballage…)'), money(c.charges, 2))}
        ${L(t('Coût de production') + ` (${fmt(c.rendement)} ${t('pcs')})`, money(c.cout_total, 2), 'bold')}
        ${L(t('Coût unitaire'), money(c.cout_unitaire, 2), 'big')}
        ${L(t('Chiffre d\'affaires de la fournée'), money(c.prix_vente * c.rendement))}${L(t('Marge de la fournée'), `<span class="${c.marge_unitaire < 0 ? 'red' : 'green'}">${money(c.marge_unitaire * c.rendement)}</span>`)}
        ${L(t('Taux de marge (sur prix de vente)'), marginPill(c.taux_marge))}${L(t('Taux de marque (sur coût)'), fmt(c.taux_marque, 1) + '%')}${L(t('Coefficient multiplicateur'), '× ' + fmt(c.coefficient, 2))}
      </div>
      <div class="stat-mini mt" style="display:flex;align-items:center;gap:10px;justify-content:space-between"><div><div class="l">${t('Prix conseillé pour')} ${fmt(c.marge_cible)}% ${t('de marge')}</div><div class="v orange">${money(c.prix_conseille)}</div></div>
        ${isAdmin() && c.prix_conseille && c.prix_conseille !== c.prix_vente ? `<button class="btn sm orange" id="rc-ap">${t('Appliquer')}</button>` : ''}</div>
      ${c.marge_unitaire < 0 ? `<div class="badge b-red mt" style="display:block;padding:8px">⚠ ${t('Attention : ce produit est vendu à perte !')}</div>` : ''}`;
    const ap = $('#rc-ap', box); if (ap) ap.onclick = () => { prix = c.prix_conseille; $('#rc-pv', box).value = prix; drawRes(); };
    drawSim();
  };
  const drawSim = () => {
    const c = calc(); const q = n0($('#rc-simq', box).value); const ratio = q / c.rendement;
    $('#rc-sim', box).innerHTML = `<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>${t('Matière')}</th><th class="n">${t('Besoin')}</th><th class="n">${t('En stock')}</th></tr></thead><tbody>
      ${c.details.map(d => { const m = mats.find(x => x.id == d.matiere_id) || {}; const need = d.quantite * ratio; return `<tr><td>${esc(pn(d))}</td><td class="n bold">${fmt(need, 3)} ${esc(d.unite)}</td><td class="n ${need > m.stock ? 'red bold' : 'green'}">${fmt(m.stock, 2)}</td></tr>`; }).join('')}</tbody></table></div>
      <div class="grid g2 mt"><div class="stat-mini"><div class="l">${t('Coût total')}</div><div class="v">${money(c.cout_total * ratio)}</div></div><div class="stat-mini"><div class="l">${t('Bénéfice estimé')}</div><div class="v green">${money(c.marge_unitaire * q)}</div></div></div>`;
  };
  drawLines(); drawRes();
  box.oninput = e => {
    const x = e.target;
    if (x.dataset.r) { rec[x.dataset.r] = x.value; drawRes(); }
    if (x.id === 'rc-pv') { prix = x.value; drawRes(); }
    if (x.dataset.lq != null) { lignes[x.dataset.lq].quantite = x.value; drawRes(); }
    if (x.id === 'rc-simq') drawSim();
  };
  box.onchange = e => { const x = e.target; if (x.dataset.lm != null) { lignes[x.dataset.lm].matiere_id = x.value ? Number(x.value) : ''; drawLines(); drawRes(); } };
  box.onclick = async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.lx != null) { lignes.splice(Number(b.dataset.lx), 1); if (!lignes.length) lignes.push({ matiere_id: '', quantite: '' }); drawLines(); drawRes(); }
    if (b.id === 'rc-add') { lignes.push({ matiere_id: '', quantite: '' }); drawLines(); }
    if (b.id === 'rc-sv') {
      try { await api('/recettes/' + p.id, { method: 'PUT', body: { recette: rec, lignes: lignes.filter(l => l.matiere_id && n0(l.quantite) > 0), prix_vente: prix } }); toast(t('Recette enregistrée — coût de revient mis à jour')); route(); } catch (er) { fail(er); }
    }
    if (b.id === 'rc-pr') {
      const c = calc(); const s = S.settings;
      printHtml(`<div class="print-report"><h2>${esc(s.nom)} — ${t('Fiche technique')}</h2><h3>${esc(p.nom)} ${p.nom_ar ? '/ ' + esc(p.nom_ar) : ''}</h3>
        <p>${t('Rendement')} : <b>${fmt(c.rendement)} ${t('pcs')}</b> — ${t('Prix de vente')} : <b>${moneyTxt(c.prix_vente)}</b> — ${t('Date')} : ${fmtDate(todayStr(), false)}</p>
        <table><tr><th>${t('Ingrédient')}</th><th>${t('Quantité')}</th><th>${t('Prix unitaire')}</th><th>${t('Coût')}</th><th>%</th></tr>
        ${c.details.map(d => `<tr><td>${esc(d.nom)}</td><td class="n">${fmt(d.quantite, 3)} ${esc(d.unite)}</td><td class="n">${fmt(d.prix_unitaire, 2)}</td><td class="n">${fmt(d.cout, 2)}</td><td class="n">${fmt(d.part, 1)}</td></tr>`).join('')}</table>
        <table><tr><td>${t('Coût des matières premières')}</td><td class="n">${fmt(c.cout_matieres, 2)}</td></tr><tr><td>${t('Pertes / chutes')}</td><td class="n">${fmt(c.pertes, 2)}</td></tr>
        <tr><td>${t("Main d'œuvre")}</td><td class="n">${fmt(rec.main_oeuvre)}</td></tr><tr><td>${t('Énergie')}</td><td class="n">${fmt(rec.energie)}</td></tr><tr><td>${t('Emballage')}</td><td class="n">${fmt(rec.emballage)}</td></tr><tr><td>${t('Autres frais')}</td><td class="n">${fmt(rec.autres)}</td></tr>
        <tr><th>${t('Coût de production')}</th><th class="n">${fmt(c.cout_total, 2)}</th></tr><tr><th>${t('Coût unitaire')}</th><th class="n">${fmt(c.cout_unitaire, 2)} ${cur()}</th></tr>
        <tr><td>${t('Marge unitaire')}</td><td class="n">${fmt(c.marge_unitaire, 2)}</td></tr><tr><td>${t('Taux de marge (sur prix de vente)')}</td><td class="n">${fmt(c.taux_marge, 1)}%</td></tr><tr><td>${t('Coefficient multiplicateur')}</td><td class="n">${fmt(c.coefficient, 2)}</td></tr></table>
        ${rec.notes ? `<p><b>${t('Notes / mode opératoire')}</b><br>${esc(rec.notes).replace(/\n/g, '<br>')}</p>` : ''}</div>`, true);
    }
  };
}

/* =================================================================== */
/* Achats                                                              */
/* =================================================================== */
PAGES.achats = async el => {
  S.achP = S.achP || '30j';
  const rows = await api('/achats?p=' + S.achP);
  const tot = rows.reduce((s, r) => ({ t: s.t + r.total, p: s.p + r.paye }), { t: 0, p: 0 });
  el.innerHTML = head(t('Achats'), t('Réceptions de matières premières auprès des fournisseurs'), `<button class="btn primary" id="na">${ic('plus')} ${t('Nouvel achat')}</button>`) +
  `<div class="card"><div class="row" style="margin-bottom:12px"><div class="tabs">${[['jour', "Aujourd'hui"], ['7j', '7 jours'], ['30j', '30 jours'], ['annee', 'Cette année']].map(([k, l]) => `<button data-p="${k}" class="${S.achP === k ? 'on' : ''}">${t(l)}</button>`).join('')}</div><span class="spacer"></span>
    <span>${t('Total')} : <b>${money(tot.t)}</b> · ${t('Payé')} : <b class="green">${money(tot.p)}</b> · ${t('Reste')} : <b class="red">${money(tot.t - tot.p)}</b></span></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>N°</th><th>${t('Date')}</th><th>${t('Fournisseur')}</th><th>${t('Articles')}</th><th class="n">${t('Total')}</th><th class="n">${t('Payé')}</th><th>${t('Paiement')}</th><th>${t('Statut')}</th></tr></thead><tbody>
  ${rows.map(r => `<tr><td>${r.numero}</td><td>${fmtDate(r.date)}</td><td class="bold">${esc(r.fournisseur_nom || '—')}</td><td class="small">${esc(r.articles || '')}</td><td class="n bold">${fmt(r.total)}</td><td class="n">${fmt(r.paye)}</td><td>${t(r.mode_paiement || '')}</td>
    <td>${r.paye >= r.total ? `<span class="badge b-green">${t('Payé')}</span>` : r.paye > 0 ? `<span class="badge b-orange">${t('Partiel')}</span>` : `<span class="badge b-red">${t('Impayé')}</span>`}</td></tr>`).join('') || `<tr><td colspan="8" class="empty">${t('Aucun achat')}</td></tr>`}
  </tbody></table></div></div>`;
  $$('[data-p]', el).forEach(b => b.onclick = () => { S.achP = b.dataset.p; route(); });
  $('#na').onclick = () => achatForm();
};
async function achatForm() {
  const [fours, mats] = await Promise.all([api('/fournisseurs'), api('/matieres')]);
  let lignes = [{ matiere_id: '', quantite: '', prix_unitaire: '' }];
  const m = modal({ title: t('Nouvel achat'), cls: 'wide', body: `<div class="frow">
      <div class="field"><label>${t('Fournisseur')}</label><select class="input" id="a-f"><option value="">—</option>${fours.filter(f => f.actif).map(f => `<option value="${f.id}">${esc(f.nom)}</option>`).join('')}</select></div>
      <div class="field"><label>${t('Date')}</label><input class="input" type="date" id="a-d" value="${todayStr()}"></div></div>
    <div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>${t('Matière')}</th><th class="n">${t('Quantité')}</th><th class="n">${t('Prix unitaire')}</th><th class="n">${t('Total')}</th><th></th></tr></thead><tbody id="a-l"></tbody></table></div>
    <button class="btn sm" id="a-add" style="margin-top:8px">${ic('plus')} ${t('Ajouter une ligne')}</button>
    <div class="sep"></div><div class="frow"><div class="field"><label>${t('Montant total')}</label><input class="input bold" id="a-t" readonly></div>
      <div class="field"><label>${t('Montant payé')}</label><input class="input" type="number" min="0" id="a-p"></div>
      <div class="field"><label>${t('Mode de paiement')}</label><select class="input" id="a-m">${PAY.slice(0, 4).map(p => `<option value="${p[0]}">${t(p[0])}</option>`).join('')}</select></div></div>
    <div class="field"><label>${t('Notes')}</label><input class="input" id="a-n"></div>
    <p class="small muted">${t('Le stock et le prix moyen pondéré (PMP) des matières sont mis à jour automatiquement. Le reste à payer est ajouté au solde du fournisseur.')}</p>`,
    foot: `<button class="btn" data-close>${t('Annuler')}</button><button class="btn primary" id="a-ok">${ic('check')} ${t('Enregistrer l\'achat')}</button>` });
  let paidTouched = false;
  const total = () => lignes.reduce((s, l) => s + n0(l.quantite) * n0(l.prix_unitaire), 0);
  const upd = () => { $('#a-t', m).value = fmt(total()); if (!paidTouched) $('#a-p', m).value = round2(total()); lignes.forEach((l, i) => { const c = $(`[data-tt="${i}"]`, m); if (c) c.textContent = fmt(n0(l.quantite) * n0(l.prix_unitaire)); }); };
  const draw = () => {
    $('#a-l', m).innerHTML = lignes.map((l, i) => `<tr><td><select class="input sm" data-m="${i}"><option value="">—</option>${mats.filter(x => x.actif).map(x => `<option value="${x.id}" ${x.id == l.matiere_id ? 'selected' : ''}>${esc(pn(x))} (${esc(x.unite)})</option>`).join('')}</select></td>
      <td class="n"><input class="input sm" type="number" min="0" step="any" style="width:100px" data-q="${i}" value="${l.quantite}"></td><td class="n"><input class="input sm" type="number" min="0" step="any" style="width:100px" data-pu="${i}" value="${l.prix_unitaire}"></td>
      <td class="n bold" data-tt="${i}">${fmt(n0(l.quantite) * n0(l.prix_unitaire))}</td><td><button class="icon-btn del" data-x="${i}">${ic('trash')}</button></td></tr>`).join('');
    upd();
  };
  m.oninput = e => { const x = e.target; if (x.dataset.q != null) lignes[x.dataset.q].quantite = x.value; if (x.dataset.pu != null) lignes[x.dataset.pu].prix_unitaire = x.value; if (x.id === 'a-p') paidTouched = true; upd(); };
  m.onchange = e => { const x = e.target; if (x.dataset.m != null) { lignes[x.dataset.m].matiere_id = x.value; const mt = mats.find(z => z.id == x.value); if (mt && !lignes[x.dataset.m].prix_unitaire) lignes[x.dataset.m].prix_unitaire = mt.prix_moyen; draw(); } };
  m.addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.x != null) { lignes.splice(Number(b.dataset.x), 1); if (!lignes.length) lignes.push({ matiere_id: '', quantite: '', prix_unitaire: '' }); draw(); }
    if (b.id === 'a-add') { lignes.push({ matiere_id: '', quantite: '', prix_unitaire: '' }); draw(); }
    if (b.id === 'a-ok') {
      try {
        const d = $('#a-d', m).value;
        await api('/achats', { body: { fournisseur_id: $('#a-f', m).value || null, date: d === todayStr() ? null : d, lignes: lignes.filter(l => l.matiere_id && n0(l.quantite) > 0), paye: $('#a-p', m).value, mode_paiement: $('#a-m', m).value, notes: $('#a-n', m).value } });
        toast(t('Achat enregistré — stock mis à jour')); m.close(); route();
      } catch (er) { fail(er); }
    }
  });
  draw();
}

/* =================================================================== */
/* Clients & fournisseurs                                              */
/* =================================================================== */
function tiersPage(kind) {
  const isC = kind === 'clients';
  return async el => {
    const rows = await api('/' + kind);
    const dues = rows.reduce((s, r) => s + (r.solde < 0 ? -r.solde : 0), 0);
    el.innerHTML = head(t(isC ? 'Clients' : 'Fournisseurs'), t(isC ? 'Comptes clients, crédits et encaissements' : 'Fournisseurs, dettes et règlements'),
      `<button class="btn primary" id="nt">${ic('plus')} ${t(isC ? 'Nouveau client' : 'Nouveau fournisseur')}</button>`) +
    `<div class="grid g3" style="margin-bottom:14px"><div class="stat-mini"><div class="l">${t(isC ? 'Total des créances clients' : 'Total des dettes fournisseurs')}</div><div class="v red">${money(dues)}</div></div>
      <div class="stat-mini"><div class="l">${t(isC ? 'Clients débiteurs' : 'Fournisseurs à régler')}</div><div class="v">${rows.filter(r => r.solde < 0).length}</div></div>
      <div class="stat-mini"><div class="l">${t('Total')}</div><div class="v">${rows.length}</div></div></div>
    <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${t('Nom')}</th><th>${t('Téléphone')}</th><th>${t('Adresse')}</th>${isC ? `<th class="n">${t('Plafond crédit')}</th>` : ''}<th class="n">${t('Solde')}</th><th>${t('Statut')}</th><th></th></tr></thead><tbody>
    ${rows.map(r => `<tr style="${r.actif ? '' : 'opacity:.5'}"><td class="bold">${esc(r.nom)}</td><td class="num">${esc(r.telephone || '')}</td><td class="small">${esc(r.adresse || '')}</td>${isC ? `<td class="n">${r.plafond ? fmt(r.plafond) : '∞'}</td>` : ''}
      <td class="n bold ${r.solde < 0 ? 'red' : ''}">${fmt(r.solde)}</td><td>${r.solde < 0 ? `<span class="badge b-red">${t(isC ? 'Débiteur' : 'À régler')}</span>` : `<span class="badge b-green">${t('Actif')}</span>`}</td>
      <td style="white-space:nowrap" class="c">${r.solde < 0 ? `<button class="btn sm primary" data-pay="${r.id}">${ic('coins')} ${t(isC ? 'Encaisser' : 'Régler')}</button>` : ''}
        <button class="icon-btn" data-h="${r.id}" title="${t('Historique')}">${ic('history')}</button><button class="icon-btn" data-e="${r.id}">${ic('edit')}</button>${isAdmin() ? `<button class="icon-btn del" data-d="${r.id}">${ic('trash')}</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="7" class="empty">—</td></tr>`}
    </tbody></table></div></div>`;
    const form = (r = {}) => formModal({ title: t(r.id ? 'Modifier' : (isC ? 'Nouveau client' : 'Nouveau fournisseur')), data: { actif: 1, ...r },
      fields: [{ name: 'nom', label: t('Nom'), required: true, full: true }, { name: 'telephone', label: t('Téléphone') }, { name: 'adresse', label: t('Adresse') },
        ...(isC ? [{ name: 'plafond', label: t('Plafond crédit') + ` (${cur()})`, type: 'number', min: 0, help: t('0 = illimité') }] : []),
        ...(!r.id ? [{ name: 'solde', label: t('Solde initial (négatif = dette)'), type: 'number' }] : []),
        { name: 'actif', label: t('Statut'), type: 'select', options: [[1, t('Actif')], [0, t('Inactif')]] }],
      onSubmit: async d => { if (r.id) await api(`/${kind}/${r.id}`, { method: 'PUT', body: d }); else await api('/' + kind, { body: d }); toast(t('Enregistré')); route(); } });
    $('#nt').onclick = () => form();
    el.onclick = async e => {
      const b = e.target.closest('button'); if (!b) return;
      const r = rows.find(x => x.id == (b.dataset.e || b.dataset.pay || b.dataset.h || b.dataset.d));
      if (b.dataset.e) form(r);
      if (b.dataset.pay) payForm(isC ? 'client' : 'fournisseur', r);
      if (b.dataset.h) isC ? clientHistory(r.id) : fournHistory(r.id);
      if (b.dataset.d && await confirmBox(t('Supprimer ?'))) { try { const x = await api(`/${kind}/${r.id}`, { method: 'DELETE' }); toast(x.desactive ? t('Désactivé (historique existant)') : t('Supprimé')); route(); } catch (er) { fail(er); } }
    };
  };
}
PAGES.clients = tiersPage('clients');
PAGES.fournisseurs = tiersPage('fournisseurs');
function payForm(type, r) {
  formModal({ title: `${t(type === 'client' ? 'Encaissement client' : 'Règlement fournisseur')} — ${esc(r.nom)}`, cls: 'narrow',
    data: { montant: Math.max(-r.solde, 0), mode: 'Espèces' },
    fields: [{ name: 'montant', label: t('Montant') + ` (${cur()})`, type: 'number', required: true, min: 1, full: true, help: `${t('Solde actuel')} : ${moneyTxt(r.solde)}` },
      { name: 'mode', label: t('Mode de paiement'), type: 'select', options: PAY.slice(0, 4).map(p => [p[0], t(p[0])]), full: true }, { name: 'notes', label: t('Notes'), full: true }],
    onSubmit: async d => { await api('/paiements', { body: { ...d, tiers_type: type, tiers_id: r.id } }); toast(t('Paiement enregistré')); route(); } });
}
async function clientHistory(id) {
  const [c, h] = await Promise.all([api('/clients/' + id), api(`/clients/${id}/historique`)]);
  modal({ title: `${t('Historique')} — ${esc(c.nom)}`, cls: 'wide', body: `<div class="stat-mini" style="margin-bottom:10px"><div class="l">${t('Solde')}</div><div class="v ${c.solde < 0 ? 'red' : 'green'}">${money(c.solde)}</div></div>
    <div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>${t('Date')}</th><th>${t('Type')}</th><th>${t('Référence')}</th><th>${t('Paiement')}</th><th class="n">${t('Montant')}</th></tr></thead><tbody>
    ${h.map(x => `<tr><td>${fmtDate(x.date)}</td><td>${x.type === 'vente' ? `<span class="badge b-blue">${t('Achat')}</span>` : `<span class="badge b-green">${t('Paiement')}</span>`}</td><td>${esc(x.ref)}</td><td>${t(x.mode)}</td>
    <td class="n bold ${x.type === 'vente' && x.mode === 'Crédit client' ? 'red' : x.type === 'paiement' ? 'green' : ''}">${fmt(x.montant)}</td></tr>`).join('') || `<tr><td colspan="5" class="empty">—</td></tr>`}</tbody></table></div>` });
}
async function fournHistory(id) {
  const [f, h] = await Promise.all([api('/fournisseurs/' + id), api(`/fournisseurs/${id}/historique`)]);
  modal({ title: `${t('Historique')} — ${esc(f.nom)}`, cls: 'wide', body: `<div class="stat-mini" style="margin-bottom:10px"><div class="l">${t('Solde')}</div><div class="v ${f.solde < 0 ? 'red' : 'green'}">${money(f.solde)}</div></div>
    <div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>${t('Date')}</th><th>${t('Type')}</th><th>${t('Référence')}</th><th class="n">${t('Montant')}</th><th class="n">${t('Payé')}</th></tr></thead><tbody>
    ${h.map(x => `<tr><td>${fmtDate(x.date)}</td><td>${x.type === 'achat' ? `<span class="badge b-orange">${t('Achat')}</span>` : `<span class="badge b-green">${t('Paiement')}</span>`}</td><td>${esc(x.ref)}</td><td class="n bold">${fmt(x.montant)}</td><td class="n">${x.paye != null ? fmt(x.paye) : ''}</td></tr>`).join('') || `<tr><td colspan="5" class="empty">—</td></tr>`}</tbody></table></div>` });
}

/* =================================================================== */
/* Caisse                                                              */
/* =================================================================== */
PAGES.caisse = async el => {
  const [c, hist] = await Promise.all([api('/caisse'), api('/caisse/historique')]);
  const elecTot = c.electronique.reduce((s, x) => s + x.total, 0);
  el.innerHTML = head(t('Caisse'), `${t('Journée du')} ${fmtDate(c.jour, false)} — ${c.cloturee ? `<span class="badge b-gray">${t('Clôturée')}</span>` : `<span class="badge b-green">${t('Ouverte')}</span>`}`,
    !c.cloturee ? `<button class="btn" id="mv-r">${ic('minus')} ${t('Retrait')}</button><button class="btn" id="mv-a">${ic('plus')} ${t('Apport')}</button>` : (isAdmin() ? `<button class="btn" id="reo">${ic('refresh')} ${t('Rouvrir')}</button>` : '')) +
  `<div class="grid g3"><div class="card">${cardH(t('Caisse espèces'), 'cash')}
      <div class="cash-lines"><div class="ln"><span>${t('Caisse initiale')}</span>${c.cloturee ? `<b>${fmt(c.fond_initial)}</b>` : `<input class="input sm" type="number" id="fond" style="width:120px" value="${c.fond_initial}">`}</div>
      ${cashLines(c).split('</div>').slice(1).join('</div>')}
      <div class="ln" style="margin-top:8px;align-items:center"><span class="bold">${t('Caisse réelle (comptée)')}</span>${c.cloturee ? `<b>${fmt(c.reel)}</b>` : `<input class="input" type="number" id="reel" style="width:140px" placeholder="0">`}</div>
      <div class="ln"><span class="bold red">${t('Différence')}</span><b id="diff" class="${c.cloturee && c.ecart !== 0 ? 'red' : 'green'}">${c.cloturee ? fmt(c.ecart) : '—'}</b></div></div>
      ${!c.cloturee && isAdmin() ? `<button class="btn orange lg mt" id="clo" style="width:100%">${ic('lock')} ${t('Clôturer la caisse')}</button>` : ''}
    </div>
    <div class="card">${cardH(t('Paiements électroniques'), 'wallet')}
      ${c.electronique.map(x => `<div class="cash-lines"><div class="ln"><span>${t(x.mode)} <span class="muted small">(${x.n})</span></span><b>${money(x.total)}</b></div></div>`).join('') || `<div class="empty">—</div>`}
      <div class="cash-lines"><div class="ln total"><span>${t('Total')}</span><b>${money(elecTot)}</b></div></div>
      <div class="small muted mt">${t('Les ventes Bankily, Sedad, Masrivi et à crédit ne passent pas par la caisse espèces.')}</div></div>
    <div class="card">${cardH(t('Mouvements de caisse'), 'history')}
      <div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>${t('Heure')}</th><th>${t('Type')}</th><th>${t('Motif')}</th><th class="n">${t('Montant')}</th></tr></thead><tbody>
      ${c.mouvements.map(m => `<tr><td>${m.date.slice(11, 16)}</td><td>${m.type === 'retrait' ? `<span class="badge b-red">${t('Retrait')}</span>` : `<span class="badge b-green">${t('Apport')}</span>`}</td><td>${esc(m.motif)}</td><td class="n">${fmt(m.montant)}</td></tr>`).join('') || `<tr><td colspan="4" class="empty">—</td></tr>`}</tbody></table></div></div>
  </div>
  <div class="card mt">${cardH(t('Historique des clôtures'), 'calendar')}<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>${t('Jour')}</th><th class="n">${t('Caisse initiale')}</th><th class="n">${t('Caisse théorique')}</th><th class="n">${t('Caisse réelle')}</th><th class="n">${t('Différence')}</th><th>${t('Statut')}</th></tr></thead><tbody>
    ${hist.map(h => `<tr><td>${fmtDate(h.jour, false)}</td><td class="n">${fmt(h.fond_initial)}</td><td class="n">${h.theorique != null ? fmt(h.theorique) : '—'}</td><td class="n">${h.reel != null ? fmt(h.reel) : '—'}</td><td class="n ${h.ecart ? 'red bold' : 'green'}">${h.ecart != null ? fmt(h.ecart) : '—'}</td><td>${h.cloturee ? `<span class="badge b-gray">${t('Clôturée')}</span>` : `<span class="badge b-green">${t('Ouverte')}</span>`}</td></tr>`).join('')}
  </tbody></table></div></div>`;
  const reel = $('#reel'); if (reel) reel.oninput = () => { const d = n0(reel.value) - c.theorique; $('#diff').textContent = fmt(d); $('#diff').className = d === 0 ? 'green' : 'red'; };
  const fond = $('#fond'); if (fond) fond.onchange = async () => { try { await api('/caisse/fond', { method: 'PUT', body: { fond_initial: fond.value } }); route(); } catch (e) { fail(e); } };
  const mv = type => formModal({ title: t(type === 'retrait' ? 'Retrait de caisse' : 'Apport en caisse'), cls: 'narrow',
    fields: [{ name: 'montant', label: t('Montant'), type: 'number', required: true, min: 1, full: true }, { name: 'motif', label: t('Motif'), full: true }],
    onSubmit: async d => { await api('/caisse/mouvement', { body: { ...d, type } }); toast(t('Enregistré')); route(); } });
  if ($('#mv-r')) { $('#mv-r').onclick = () => mv('retrait'); $('#mv-a').onclick = () => mv('apport'); }
  if ($('#clo')) $('#clo').onclick = async () => {
    if (reel.value === '') return toast(t('Saisissez le montant réellement compté'), 'err');
    if (await confirmBox(`${t('Clôturer la caisse avec')} ${moneyTxt(reel.value)} ? ${t('Différence')} : ${moneyTxt(n0(reel.value) - c.theorique)}`, { danger: false })) {
      try { await api('/caisse/cloturer', { body: { reel: reel.value } }); toast(t('Caisse clôturée')); route(); } catch (e) { fail(e); }
    }
  };
  if ($('#reo')) $('#reo').onclick = async () => { try { await api('/caisse/rouvrir', { method: 'POST' }); route(); } catch (e) { fail(e); } };
};

/* =================================================================== */
/* Dépenses                                                            */
/* =================================================================== */
const DEP_CATS = ['Électricité', 'Eau', 'Gaz', 'Transport', 'Salaires', 'Loyer', 'Entretien', 'Impôts & taxes', 'Téléphone', 'Autres'];
PAGES.depenses = async el => {
  S.depFrom = S.depFrom || todayStr().slice(0, 8) + '01'; S.depTo = S.depTo || todayStr();
  const rows = await api(`/depenses?from=${S.depFrom}&to=${S.depTo}`);
  const tot = rows.reduce((s, r) => s + r.montant, 0);
  const byCat = {}; rows.forEach(r => byCat[r.categorie] = (byCat[r.categorie] || 0) + r.montant);
  const maxC = Math.max(...Object.values(byCat), 1);
  el.innerHTML = head(t('Dépenses'), t('Charges de fonctionnement de la boulangerie'),
    `<input type="date" class="input" id="df" value="${S.depFrom}" style="width:160px"><input type="date" class="input" id="dt" value="${S.depTo}" style="width:160px"><button class="btn" id="exp">${ic('download')} CSV</button><button class="btn primary" id="nd">${ic('plus')} ${t('Nouvelle dépense')}</button>`) +
  `<div class="grid g-rc"><div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${t('Date')}</th><th>${t('Catégorie')}</th><th>${t('Description')}</th><th>${t('Paiement')}</th><th class="n">${t('Montant')}</th><th></th></tr></thead><tbody>
    ${rows.map(r => `<tr><td>${fmtDate(r.date)}</td><td><span class="badge b-orange">${t(r.categorie)}</span></td><td>${esc(r.description || '')}</td><td>${t(r.mode)}</td><td class="n bold">${fmt(r.montant)}</td>
      <td style="white-space:nowrap"><button class="icon-btn" data-e="${r.id}">${ic('edit')}</button>${isAdmin() ? `<button class="icon-btn del" data-d="${r.id}">${ic('trash')}</button>` : ''}</td></tr>`).join('') || `<tr><td colspan="6" class="empty">${t('Aucune dépense')}</td></tr>`}
    </tbody>${rows.length ? `<tfoot><tr><td colspan="4">${t('Total')}</td><td class="n">${money(tot)}</td><td></td></tr></tfoot>` : ''}</table></div></div>
    <div class="card">${cardH(t('Par catégorie'), 'chart')}<div class="bars-h">${Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([k, v]) => `<div class="r" style="grid-template-columns:1fr 1.2fr auto"><span>${t(k)}</span><div class="bar"><i style="width:${v / maxC * 100}%"></i></div><b>${money(v)}</b></div>`).join('') || `<div class="empty">—</div>`}</div>
      <div class="sep"></div><div class="row" style="justify-content:space-between;font-size:17px"><b>${t('Total')}</b><b class="red">${money(tot)}</b></div></div></div>`;
  $('#df').onchange = e => { S.depFrom = e.target.value; route(); }; $('#dt').onchange = e => { S.depTo = e.target.value; route(); };
  $('#exp').onclick = () => download(`/export/depenses?from=${S.depFrom}&to=${S.depTo}`);
  const form = (r = {}) => formModal({ title: t(r.id ? 'Modifier la dépense' : 'Nouvelle dépense'), data: { date: todayStr(), mode: 'Espèces', categorie: 'Autres', ...r, date: (r.date || todayStr()).slice(0, 10) },
    fields: [{ name: 'categorie', label: t('Catégorie'), type: 'select', options: DEP_CATS }, { name: 'montant', label: t('Montant') + ` (${cur()})`, type: 'number', required: true, min: 1 },
      { name: 'date', label: t('Date'), type: 'date' }, { name: 'mode', label: t('Mode de paiement'), type: 'select', options: PAY.slice(0, 4).map(p => [p[0], t(p[0])]) },
      { name: 'description', label: t('Description'), full: true }],
    onSubmit: async d => { if (r.id) await api('/depenses/' + r.id, { method: 'PUT', body: d }); else await api('/depenses', { body: d }); toast(t('Enregistré')); route(); } });
  $('#nd').onclick = () => form();
  el.onclick = async e => { const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.e) form(rows.find(r => r.id == b.dataset.e));
    if (b.dataset.d && await confirmBox(t('Supprimer cette dépense ?'))) { try { await api('/depenses/' + b.dataset.d, { method: 'DELETE' }); toast(t('Supprimé')); route(); } catch (er) { fail(er); } } };
};

/* =================================================================== */
/* Inventaire                                                          */
/* =================================================================== */
PAGES.inventaire = async el => {
  const d = await api('/inventaire');
  S.invTab = S.invTab || 'matiere';
  const items = S.invTab === 'matiere' ? d.matieres : d.produits;
  el.innerHTML = head(t('Inventaire'), t('Comptage physique, ajustement des stocks et déclaration des pertes'),
    `<button class="btn" id="perte">${ic('alert')} ${t('Déclarer une perte / invendu')}</button><button class="btn primary" id="valid">${ic('check')} ${t('Valider l\'inventaire')}</button>`) +
  `<div class="card"><div class="tabs" style="margin-bottom:12px"><button data-t="matiere" class="${S.invTab === 'matiere' ? 'on' : ''}">${t('Matières premières')}</button><button data-t="produit" class="${S.invTab === 'produit' ? 'on' : ''}">${t('Produits finis')}</button></div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr><th>${t('Article')}</th><th>${t('Unité')}</th><th class="n">${t('Stock théorique')}</th><th class="n">${t('Stock réel (compté)')}</th><th class="n">${t('Écart')}</th><th class="n">${t('Valeur écart')}</th></tr></thead><tbody>
    ${items.map(a => `<tr><td class="bold">${esc(pn(a))}</td><td>${esc(a.unite || t('pcs'))}</td><td class="n">${fmt(a.stock, 3)}</td><td class="n"><input class="input sm" style="width:110px" type="number" step="any" data-id="${a.id}" data-st="${a.stock}" data-pu="${a.prix_moyen ?? a.cout_revient}" placeholder="${fmt(a.stock, 3)}"></td><td class="n" data-ec="${a.id}">—</td><td class="n" data-va="${a.id}">—</td></tr>`).join('')}
    </tbody><tfoot><tr><td colspan="5">${t('Valeur totale des écarts')}</td><td class="n" id="vtot">0</td></tr></tfoot></table></div>
    <p class="small muted">${t('Laissez vide les articles non comptés. Seuls les écarts sont enregistrés.')}</p></div>
  <div class="card mt">${cardH(t('Mouvements de stock récents'), 'history')}<div class="tbl-wrap" style="max-height:380px;overflow:auto"><table class="tbl compact"><thead><tr><th>${t('Date')}</th><th>${t('Article')}</th><th>${t('Motif')}</th><th>${t('Référence')}</th><th class="n">${t('Quantité')}</th><th class="n">${t('Valeur')}</th></tr></thead><tbody>
    ${d.historique.map(h => `<tr><td>${fmtDate(h.date)}</td><td>${esc(h.nom || '')}</td><td>${t(h.motif)}</td><td class="small muted">${esc(h.ref || '')}</td><td class="n ${h.quantite < 0 ? 'red' : 'green'}">${h.quantite > 0 ? '+' : ''}${fmt(h.quantite, 3)} ${esc(h.unite || '')}</td><td class="n">${fmt(h.valeur)}</td></tr>`).join('')}
  </tbody></table></div></div>`;
  $$('[data-t]', el).forEach(b => b.onclick = () => { S.invTab = b.dataset.t; route(); });
  el.oninput = e => {
    const x = e.target; if (!x.dataset.id) return;
    const ec = x.value === '' ? null : n0(x.value) - n0(x.dataset.st);
    $(`[data-ec="${x.dataset.id}"]`).innerHTML = ec == null ? '—' : `<b class="${ec < 0 ? 'red' : ec > 0 ? 'green' : ''}">${ec > 0 ? '+' : ''}${fmt(ec, 3)}</b>`;
    $(`[data-va="${x.dataset.id}"]`).textContent = ec == null ? '—' : fmt(ec * n0(x.dataset.pu));
    let v = 0; $$('[data-id]', el).forEach(i => { if (i.value !== '') v += (n0(i.value) - n0(i.dataset.st)) * n0(i.dataset.pu); });
    $('#vtot').innerHTML = `<span class="${v < 0 ? 'red' : 'green'}">${money(v)}</span>`;
  };
  $('#valid').onclick = async () => {
    const lignes = $$('[data-id]', el).filter(i => i.value !== '').map(i => ({ type: S.invTab, id: i.dataset.id, reel: i.value }));
    if (!lignes.length) return toast(t('Saisissez au moins un stock compté'), 'err');
    if (!await confirmBox(t('Valider l\'inventaire et ajuster les stocks ?'), { danger: false })) return;
    try { const r = await api('/inventaire', { body: { lignes } }); toast(`${r.ajustements} ${t('ajustement(s)')} — ${moneyTxt(r.valeur)}`); route(); } catch (e) { fail(e); }
  };
  $('#perte').onclick = () => {
    const all = [...d.produits.map(p => [`produit:${p.id}`, `${t('Produit')} — ${pn(p)}`]), ...d.matieres.map(m => [`matiere:${m.id}`, `${t('Matière')} — ${pn(m)}`])];
    formModal({ title: t('Déclarer une perte / invendu'), cls: 'narrow', fields: [{ name: 'art', label: t('Article'), type: 'select', options: all, full: true },
      { name: 'quantite', label: t('Quantité'), type: 'number', required: true, min: 0, full: true }, { name: 'motif', label: t('Motif'), type: 'select', options: ['Invendu', 'Perte / casse', 'Périmé', 'Consommation interne', 'Don'], full: true }],
      onSubmit: async f => { const [type, id] = f.art.split(':'); const r = await api('/pertes', { body: { type, id, quantite: f.quantite, motif: f.motif } }); toast(`${t('Perte enregistrée')} — ${moneyTxt(r.valeur)}`); route(); } });
  };
};

/* =================================================================== */
/* Rapports                                                            */
/* =================================================================== */
PAGES.rapports = async el => {
  S.rapP = S.rapP || 'mois';
  const q = S.rapP === 'custom' ? `from=${S.rapFrom}&to=${S.rapTo}` : `p=${S.rapP}`;
  const r = await api('/rapports?' + q);
  const st = r.stats;
  const tbl = (cols, rows, foot) => `<div class="tbl-wrap"><table class="tbl compact"><thead><tr>${cols.map(c => `<th class="${c[1] || ''}">${c[0]}</th>`).join('')}</tr></thead><tbody>${rows.join('') || `<tr><td colspan="${cols.length}" class="empty">—</td></tr>`}</tbody>${foot ? `<tfoot>${foot}</tfoot>` : ''}</table></div>`;
  const tile = (l, v, cls = '') => `<div class="stat-mini"><div class="l">${l}</div><div class="v ${cls}">${v}</div></div>`;
  el.innerHTML = head(t('Rapports'), `${t('Période du')} ${fmtDate(r.from, false)} ${t('au')} ${fmtDate(r.to, false)}`,
    `<div class="tabs">${[['jour', "Aujourd'hui"], ['7j', '7 jours'], ['mois', 'Ce mois'], ['30j', '30 jours'], ['annee', 'Cette année'], ['custom', 'Personnalisé']].map(([k, l]) => `<button data-p="${k}" class="${S.rapP === k ? 'on' : ''}">${t(l)}</button>`).join('')}</div>
    ${S.rapP === 'custom' ? `<input type="date" class="input" id="rf" value="${r.from}" style="width:150px"><input type="date" class="input" id="rt" value="${r.to}" style="width:150px">` : ''}
    <button class="btn" id="rpr">${ic('print')} ${t('Imprimer')}</button>`) +
  `<div class="grid g4">
    ${tile(t("Chiffre d'affaires"), money(st.ca), 'green')}${tile(t('Nombre de ventes'), fmt(st.ventes))}${tile(t('Coût de revient des ventes'), money(st.cout_ventes))}
    ${tile(t('Marge brute'), money(st.marge_brute), 'blue')}${tile(t('Dépenses'), money(st.depenses), 'red')}${tile(t('Bénéfice net estimé'), money(st.benefice), st.benefice >= 0 ? 'green' : 'red')}
    ${tile(t('Achats de matières'), money(st.achats))}${tile(t('Valeur stock matières'), money(r.valeur_stock_matieres))}
  </div>
  <div class="grid g2 mt"><div class="card">${cardH(t("Chiffre d'affaires par jour"), 'chart')}${barChart(r.parJour.slice(-31).map(j => ({ label: j.jour.slice(8, 10), sub: j.jour.slice(5, 7), value: j.ca })))}</div>
    <div class="card">${cardH(t('Ventes par mode de paiement'), 'wallet')}${tbl([[t('Mode')], [t('Nombre'), 'n'], [t('Montant'), 'n'], ['%', 'n']], r.parMode.map(m => `<tr><td>${t(m.mode)}</td><td class="n">${m.n}</td><td class="n bold">${fmt(m.total)}</td><td class="n">${fmt(st.ca ? m.total / st.ca * 100 : 0, 1)}</td></tr>`))}
      <div class="mt">${cardH(t('Dépenses par catégorie'), 'receipt')}${tbl([[t('Catégorie')], [t('Montant'), 'n']], r.parCategorieDep.map(m => `<tr><td>${t(m.categorie)}</td><td class="n">${fmt(m.total)}</td></tr>`))}</div></div></div>
  <div class="card mt">${cardH(t('Rentabilité par produit'), 'star', `<button class="btn sm" data-x="ventes">${ic('download')} ${t('Ventes')} CSV</button>`)}
    ${tbl([[t('Produit')], [t('Quantité'), 'n'], [t("Chiffre d'affaires"), 'n'], [t('Coût de revient'), 'n'], [t('Marge'), 'n'], [t('Taux de marge'), 'n']],
      r.parProduit.map(p => `<tr><td class="bold">${esc(p.nom)}</td><td class="n">${fmt(p.q)}</td><td class="n">${fmt(p.ca)}</td><td class="n">${fmt(p.cout)}</td><td class="n green bold">${fmt(p.marge)}</td><td class="n">${marginPill(p.taux)}</td></tr>`),
      `<tr><td>${t('Total')}</td><td></td><td class="n">${fmt(st.ca)}</td><td class="n">${fmt(st.cout_ventes)}</td><td class="n">${fmt(st.marge_brute)}</td><td class="n">${fmt(st.ca ? st.marge_brute / st.ca * 100 : 0, 1)}%</td></tr>`)}</div>
  <div class="grid g2 mt"><div class="card">${cardH(t('Production et coût de revient réel'), 'factory', `<button class="btn sm" data-x="productions">${ic('download')} CSV</button>`)}
      ${tbl([[t('Produit')], [t('Quantité'), 'n'], [t('Coût total'), 'n'], [t('Coût unitaire moyen'), 'n']], r.production.map(p => `<tr><td>${esc(p.nom)}</td><td class="n">${fmt(p.q)}</td><td class="n">${fmt(p.cout)}</td><td class="n bold">${fmt(p.cu, 2)}</td></tr>`))}</div>
    <div class="card">${cardH(t('Consommation de matières premières'), 'wheat')}
      ${tbl([[t('Matière')], [t('Quantité'), 'n'], [t('Coût'), 'n']], r.consommation.map(c => `<tr><td>${esc(c.nom)}</td><td class="n">${fmt(c.q, 2)} ${esc(c.unite)}</td><td class="n">${fmt(c.cout)}</td></tr>`))}</div></div>
  <div class="card mt">${cardH(t('Détail journalier'), 'calendar', `<button class="btn sm" data-x="depenses">${ic('download')} ${t('Dépenses')} CSV</button><button class="btn sm" data-x="achats">${ic('download')} ${t('Achats')} CSV</button>`)}
    ${tbl([[t('Jour')], [t('Ventes'), 'n'], [t("Chiffre d'affaires"), 'n'], [t('Coût de revient'), 'n'], [t('Marge brute'), 'n'], [t('Dépenses'), 'n'], [t('Bénéfice'), 'n']],
      r.parJour.slice().reverse().map(j => `<tr><td>${fmtDate(j.jour, false)}</td><td class="n">${j.n}</td><td class="n">${fmt(j.ca)}</td><td class="n">${fmt(j.cout)}</td><td class="n">${fmt(j.marge)}</td><td class="n red">${fmt(j.depenses)}</td><td class="n bold ${j.benefice < 0 ? 'red' : 'green'}">${fmt(j.benefice)}</td></tr>`))}</div>`;
  $$('[data-p]', el).forEach(b => b.onclick = () => { S.rapP = b.dataset.p; if (S.rapP === 'custom') { S.rapFrom = S.rapFrom || r.from; S.rapTo = S.rapTo || r.to; } route(); });
  if ($('#rf')) { $('#rf').onchange = e => { S.rapFrom = e.target.value; route(); }; $('#rt').onchange = e => { S.rapTo = e.target.value; route(); }; }
  $$('[data-x]', el).forEach(b => b.onclick = () => download(`/export/${b.dataset.x}?from=${r.from}&to=${r.to}`));
  $('#rpr').onclick = () => {
    const s = S.settings;
    printHtml(`<div class="print-report"><h2>${esc(s.nom)} — ${t('Rapport')}</h2><p>${t('Période du')} ${fmtDate(r.from, false)} ${t('au')} ${fmtDate(r.to, false)}</p>
      <table><tr><td>${t("Chiffre d'affaires")}</td><td class="n">${fmt(st.ca)}</td><td>${t('Coût de revient des ventes')}</td><td class="n">${fmt(st.cout_ventes)}</td></tr>
      <tr><td>${t('Marge brute')}</td><td class="n">${fmt(st.marge_brute)}</td><td>${t('Dépenses')}</td><td class="n">${fmt(st.depenses)}</td></tr><tr><th>${t('Bénéfice net estimé')}</th><th class="n">${fmt(st.benefice)}</th><td>${t('Achats de matières')}</td><td class="n">${fmt(st.achats)}</td></tr></table>
      <h3>${t('Rentabilité par produit')}</h3><table><tr><th>${t('Produit')}</th><th>${t('Quantité')}</th><th>CA</th><th>${t('Coût')}</th><th>${t('Marge')}</th><th>%</th></tr>${r.parProduit.map(p => `<tr><td>${esc(p.nom)}</td><td class="n">${fmt(p.q)}</td><td class="n">${fmt(p.ca)}</td><td class="n">${fmt(p.cout)}</td><td class="n">${fmt(p.marge)}</td><td class="n">${fmt(p.taux, 1)}</td></tr>`).join('')}</table>
      <h3>${t('Détail journalier')}</h3><table><tr><th>${t('Jour')}</th><th>CA</th><th>${t('Coût')}</th><th>${t('Dépenses')}</th><th>${t('Bénéfice')}</th></tr>${r.parJour.map(j => `<tr><td>${fmtDate(j.jour, false)}</td><td class="n">${fmt(j.ca)}</td><td class="n">${fmt(j.cout)}</td><td class="n">${fmt(j.depenses)}</td><td class="n">${fmt(j.benefice)}</td></tr>`).join('')}</table></div>`, true);
  };
};

/* =================================================================== */
/* Employés                                                            */
/* =================================================================== */
PAGES.employes = async el => {
  const rows = await api('/employes');
  const masse = rows.filter(e => e.actif).reduce((s, e) => s + e.salaire, 0);
  el.innerHTML = head(t('Employés'), t('Personnel et paiement des salaires'), `<button class="btn primary" id="ne">${ic('plus')} ${t('Nouvel employé')}</button>`) +
  `<div class="grid g3" style="margin-bottom:14px">${`<div class="stat-mini"><div class="l">${t('Employés actifs')}</div><div class="v">${rows.filter(e => e.actif).length}</div></div><div class="stat-mini"><div class="l">${t('Masse salariale mensuelle')}</div><div class="v">${money(masse)}</div></div>`}</div>
  <div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>${t('Nom')}</th><th>${t('Poste')}</th><th>${t('Téléphone')}</th><th>${t('Date d\'embauche')}</th><th class="n">${t('Salaire mensuel')}</th><th>${t('Statut')}</th><th></th></tr></thead><tbody>
  ${rows.map(e => `<tr style="${e.actif ? '' : 'opacity:.5'}"><td class="bold">${esc(e.nom)}</td><td>${esc(e.poste || '')}</td><td class="num">${esc(e.telephone || '')}</td><td>${fmtDate(e.date_embauche, false)}</td><td class="n bold">${fmt(e.salaire)}</td>
    <td>${e.actif ? `<span class="badge b-green">${t('Actif')}</span>` : `<span class="badge b-gray">${t('Inactif')}</span>`}</td>
    <td style="white-space:nowrap" class="c"><button class="btn sm primary" data-pay="${e.id}">${ic('coins')} ${t('Payer salaire')}</button><button class="icon-btn" data-h="${e.id}">${ic('history')}</button><button class="icon-btn" data-e="${e.id}">${ic('edit')}</button><button class="icon-btn del" data-d="${e.id}">${ic('trash')}</button></td></tr>`).join('') || `<tr><td colspan="7" class="empty">—</td></tr>`}
  </tbody></table></div></div>`;
  const form = (r = {}) => formModal({ title: t(r.id ? 'Modifier' : 'Nouvel employé'), data: { actif: 1, date_embauche: todayStr(), ...r },
    fields: [{ name: 'nom', label: t('Nom'), required: true }, { name: 'poste', label: t('Poste') }, { name: 'telephone', label: t('Téléphone') }, { name: 'salaire', label: t('Salaire mensuel'), type: 'number', min: 0 },
      { name: 'date_embauche', label: t('Date d\'embauche'), type: 'date' }, { name: 'actif', label: t('Statut'), type: 'select', options: [[1, t('Actif')], [0, t('Inactif')]] }],
    onSubmit: async d => { if (r.id) await api('/employes/' + r.id, { method: 'PUT', body: d }); else await api('/employes', { body: d }); toast(t('Enregistré')); route(); } });
  $('#ne').onclick = () => form();
  el.onclick = async e => {
    const b = e.target.closest('button'); if (!b) return;
    const r = rows.find(x => x.id == (b.dataset.e || b.dataset.pay || b.dataset.h || b.dataset.d));
    if (b.dataset.e) form(r);
    if (b.dataset.pay) formModal({ title: `${t('Payer salaire')} — ${esc(r.nom)}`, cls: 'narrow', data: { montant: r.salaire, mode: 'Espèces', description: t('Salaire') + ' ' + new Date().toLocaleDateString(locale(), { month: 'long', year: 'numeric' }) },
      fields: [{ name: 'montant', label: t('Montant'), type: 'number', required: true, full: true }, { name: 'mode', label: t('Mode de paiement'), type: 'select', options: PAY.slice(0, 4).map(p => [p[0], t(p[0])]), full: true }, { name: 'description', label: t('Description'), full: true }],
      onSubmit: async d => { await api(`/employes/${r.id}/salaire`, { body: d }); toast(t('Salaire enregistré dans les dépenses')); } });
    if (b.dataset.h) { const h = await api(`/employes/${r.id}/paiements`); modal({ title: `${t('Paiements')} — ${esc(r.nom)}`, body: `<div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>${t('Date')}</th><th>${t('Description')}</th><th>${t('Paiement')}</th><th class="n">${t('Montant')}</th></tr></thead><tbody>${h.map(x => `<tr><td>${fmtDate(x.date)}</td><td>${esc(x.description || '')}</td><td>${t(x.mode)}</td><td class="n">${fmt(x.montant)}</td></tr>`).join('') || `<tr><td colspan="4" class="empty">—</td></tr>`}</tbody></table></div>` }); }
    if (b.dataset.d && await confirmBox(t('Supprimer cet employé ?'))) { try { await api('/employes/' + r.id, { method: 'DELETE' }); toast(t('Supprimé')); route(); } catch (er) { fail(er); } }
  };
};

/* =================================================================== */
/* Paramètres                                                          */
/* =================================================================== */
PAGES.parametres = async el => {
  const [s, users] = await Promise.all([api('/settings'), api('/users')]);
  const F = (name, label, o = {}) => fieldHtml({ name, label, ...o }, s[name]);
  el.innerHTML = head(t('Paramètres'), t('Configuration de la boulangerie, utilisateurs et sauvegardes')) +
  `<div class="grid g2"><div class="card">${cardH(t('Boulangerie'), 'building')}<form id="sf"><div class="frow">
      ${F('nom', t('Nom (français)'))}${F('nom_ar', t('Nom (arabe)'), { ar: true })}${F('slogan', t('Slogan (français)'))}${F('slogan_ar', t('Slogan (arabe)'), { ar: true })}
      ${F('ville', t('Ville / pays'))}${F('telephone', t('Téléphone'))}${F('adresse', t('Adresse'))}${F('nif', t('NIF / Registre'))}
      ${F('devise', t('Devise'))}${F('marge_cible', t('Marge cible (%)'), { type: 'number', help: t('Sert au calcul du prix de vente conseillé') })}
      ${F('fond_caisse', t('Fond de caisse par défaut'), { type: 'number' })}
      ${F('ticket_message', t('Message du ticket (français)'))}${F('ticket_message_ar', t('Message du ticket (arabe)'), { ar: true })}
    </div><button class="btn primary">${ic('check')} ${t('Enregistrer')}</button></form></div>
    <div><div class="card">${cardH(t('Utilisateurs'), 'users', `<button class="btn sm primary" id="nu">${ic('plus')} ${t('Ajouter')}</button>`)}
      <div class="tbl-wrap"><table class="tbl compact"><thead><tr><th>${t('Identifiant')}</th><th>${t('Nom')}</th><th>${t('Rôle')}</th><th>${t('Statut')}</th><th></th></tr></thead><tbody>
      ${users.map(u => `<tr><td class="bold">${esc(u.username)}</td><td>${esc(u.nom)}</td><td>${t(u.role === 'admin' ? 'Administrateur' : 'Caissier')}</td><td>${u.actif ? `<span class="badge b-green">${t('Actif')}</span>` : `<span class="badge b-gray">${t('Inactif')}</span>`}</td>
        <td><button class="icon-btn" data-u="${u.id}">${ic('edit')}</button></td></tr>`).join('')}</tbody></table></div>
      <p class="small muted">${t('Le caissier a accès aux ventes, à la production, aux clients, à la caisse, aux dépenses et à l\'inventaire.')}</p></div>
    <div class="card mt">${cardH(t('Sauvegarde & restauration'), 'download')}
      <p class="small muted" style="margin-top:0">${t('Toutes les données sont stockées localement dans le fichier data/mbourou.db. Faites une sauvegarde régulière sur une clé USB.')}</p>
      <div class="actions"><button class="btn orange" id="bk">${ic('download')} ${t('Télécharger une sauvegarde')}</button>
        <label class="btn">${ic('upload')} ${t('Restaurer une sauvegarde')}<input type="file" id="rs" accept=".db,.sqlite" hidden></label></div>
      <div class="sep"></div>
      <div class="small bold red" style="margin-bottom:8px">${t('Zone de danger')}</div>
      <div class="actions"><button class="btn danger" id="rz-v">${t('Vider les opérations (garder catalogue)')}</button><button class="btn danger" id="rz-d">${t('Réinitialiser avec données de démo')}</button></div>
      <p class="small muted">${t('Une copie de sécurité est créée automatiquement dans le dossier data/ avant toute restauration ou réinitialisation.')}</p></div></div></div>`;
  $('#sf').onsubmit = async e => { e.preventDefault(); try { S.settings = await api('/settings', { method: 'PUT', body: readForm(e.target) }); toast(t('Paramètres enregistrés')); renderShell(); } catch (er) { fail(er); } };
  const ufrm = (u = {}) => formModal({ title: t(u.id ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'), cls: 'narrow', data: { role: 'caissier', actif: 1, ...u },
    fields: [...(u.id ? [] : [{ name: 'username', label: t('Identifiant'), required: true, full: true }]), { name: 'nom', label: t('Nom'), full: true },
      { name: 'password', label: t(u.id ? 'Nouveau mot de passe (laisser vide)' : 'Mot de passe'), type: 'password', required: !u.id, full: true },
      { name: 'role', label: t('Rôle'), type: 'select', options: [['caissier', t('Caissier')], ['admin', t('Administrateur')]], full: true },
      ...(u.id ? [{ name: 'actif', label: t('Statut'), type: 'select', options: [[1, t('Actif')], [0, t('Inactif')]], full: true }] : [])],
    onSubmit: async d => { if (u.id) await api('/users/' + u.id, { method: 'PUT', body: { ...d, actif: Number(d.actif) } }); else await api('/users', { body: d }); toast(t('Enregistré')); route(); } });
  $('#nu').onclick = () => ufrm();
  $$('[data-u]', el).forEach(b => b.onclick = () => ufrm(users.find(u => u.id == b.dataset.u)));
  $('#bk').onclick = () => download('/backup');
  $('#rs').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    if (!await confirmBox(t('Restaurer cette sauvegarde ? Les données actuelles seront remplacées.'))) return;
    const buf = await f.arrayBuffer(); let bin = ''; const u8 = new Uint8Array(buf);
    for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    try { await api('/restore', { body: { data: btoa(bin) } }); toast(t('Sauvegarde restaurée')); setTimeout(() => logout(true), 800); } catch (er) { fail(er); }
  };
  $('#rz-v').onclick = async () => { if (await confirmBox(t('Supprimer toutes les ventes, productions, achats, dépenses et mouvements ? Le catalogue, les recettes, clients et fournisseurs sont conservés.'))) { try { await api('/reset', { body: { mode: 'vide' } }); toast(t('Opérations vidées')); route(); } catch (er) { fail(er); } } };
  $('#rz-d').onclick = async () => { if (await confirmBox(t('Effacer toute la base et recréer les données de démonstration ?'))) { try { await api('/reset', { body: { mode: 'demo' } }); toast(t('Base réinitialisée')); setTimeout(() => logout(true), 800); } catch (er) { fail(er); } } };
};

/* =================================================================== */
/* Démarrage                                                           */
/* =================================================================== */
(async function boot() {
  applyLang();
  if (!S.token) return renderLogin();
  try { const r = await api('/me'); S.user = r.user; S.settings = r.settings; renderShell(); }
  catch { renderLogin(); }
})();
