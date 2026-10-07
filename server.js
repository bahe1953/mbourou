/*
 * Mbourou — Gestion de Boulangerie (مخبزة مبرو)
 * Serveur full-stack 100 % hors ligne : Node.js (>= 22.13) + SQLite intégré (node:sqlite).
 * Aucune dépendance externe : aucun "npm install" n'est nécessaire.
 */
'use strict';
process.removeAllListeners('warning'); // masque l'avertissement "SQLite experimental"
process.on('warning', w => { if (!String(w.message).includes('SQLite')) console.warn(w.message); });

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
let DatabaseSync;
try { ({ DatabaseSync } = require('node:sqlite')); }
catch (e) {
  console.error('\n  ❌  Cette version de Node.js (' + process.version + ') ne contient pas SQLite intégré.');
  console.error('      Installez Node.js 22.13 ou plus récent (24 LTS conseillé) depuis le dossier « installation » ou nodejs.org.\n');
  process.exit(1);
}

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'mbourou.db');
const PUBLIC_DIR = path.join(__dirname, 'public');
fs.mkdirSync(DATA_DIR, { recursive: true });

/* ------------------------------------------------------------------ */
/* Utilitaires                                                         */
/* ------------------------------------------------------------------ */
const pad = n => String(n).padStart(2, '0');
function nowStr(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
const today = () => nowStr().slice(0, 10);
function addDays(dateStr, n) {
  const d = new Date(dateStr.slice(0, 10) + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return nowStr(d).slice(0, 10);
}
const round2 = x => Math.round((Number(x) || 0) * 100) / 100;
const num = (x, def = 0) => { const n = Number(x); return Number.isFinite(n) ? n : def; };
class ApiError extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const bad = msg => { throw new ApiError(400, msg); };

function hashPassword(pw, salt = crypto.randomBytes(16).toString('hex')) {
  const h = crypto.scryptSync(String(pw), salt, 32).toString('hex');
  return `${salt}:${h}`;
}
function checkPassword(pw, stored) {
  const [salt, h] = String(stored).split(':');
  if (!salt || !h) return false;
  const h2 = crypto.scryptSync(String(pw), salt, 32).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(h, 'hex'), Buffer.from(h2, 'hex'));
}

/* ------------------------------------------------------------------ */
/* Base de données                                                     */
/* ------------------------------------------------------------------ */
let db;
const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, nom TEXT, password TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'caissier', actif INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS matieres (
  id INTEGER PRIMARY KEY, nom TEXT NOT NULL, nom_ar TEXT, unite TEXT NOT NULL DEFAULT 'kg',
  stock REAL NOT NULL DEFAULT 0, stock_min REAL NOT NULL DEFAULT 0, prix_moyen REAL NOT NULL DEFAULT 0,
  actif INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS produits (
  id INTEGER PRIMARY KEY, nom TEXT NOT NULL, nom_ar TEXT, categorie TEXT NOT NULL DEFAULT 'Pains',
  prix REAL NOT NULL DEFAULT 0, stock REAL NOT NULL DEFAULT 0, stock_min REAL NOT NULL DEFAULT 0,
  cout_revient REAL NOT NULL DEFAULT 0, emoji TEXT, image TEXT, actif INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS recettes (
  id INTEGER PRIMARY KEY, produit_id INTEGER NOT NULL UNIQUE REFERENCES produits(id) ON DELETE CASCADE,
  rendement REAL NOT NULL DEFAULT 100, main_oeuvre REAL NOT NULL DEFAULT 0, energie REAL NOT NULL DEFAULT 0,
  emballage REAL NOT NULL DEFAULT 0, autres REAL NOT NULL DEFAULT 0, pertes_pct REAL NOT NULL DEFAULT 0, notes TEXT);
CREATE TABLE IF NOT EXISTS recette_lignes (
  id INTEGER PRIMARY KEY, recette_id INTEGER NOT NULL REFERENCES recettes(id) ON DELETE CASCADE,
  matiere_id INTEGER NOT NULL REFERENCES matieres(id), quantite REAL NOT NULL);
CREATE TABLE IF NOT EXISTS productions (
  id INTEGER PRIMARY KEY, date TEXT NOT NULL, produit_id INTEGER NOT NULL REFERENCES produits(id),
  quantite REAL NOT NULL, cout_matieres REAL NOT NULL DEFAULT 0, cout_charges REAL NOT NULL DEFAULT 0,
  cout_total REAL NOT NULL DEFAULT 0, cout_unitaire REAL NOT NULL DEFAULT 0, notes TEXT);
CREATE TABLE IF NOT EXISTS production_conso (
  id INTEGER PRIMARY KEY, production_id INTEGER NOT NULL REFERENCES productions(id) ON DELETE CASCADE,
  matiere_id INTEGER NOT NULL REFERENCES matieres(id), quantite REAL NOT NULL, cout REAL NOT NULL);
CREATE TABLE IF NOT EXISTS clients (
  id INTEGER PRIMARY KEY, nom TEXT NOT NULL, telephone TEXT, adresse TEXT, solde REAL NOT NULL DEFAULT 0,
  plafond REAL NOT NULL DEFAULT 0, actif INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS fournisseurs (
  id INTEGER PRIMARY KEY, nom TEXT NOT NULL, telephone TEXT, adresse TEXT, solde REAL NOT NULL DEFAULT 0,
  actif INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS ventes (
  id INTEGER PRIMARY KEY, numero TEXT, date TEXT NOT NULL, client_id INTEGER REFERENCES clients(id),
  sous_total REAL NOT NULL, remise REAL NOT NULL DEFAULT 0, total REAL NOT NULL, cout_revient REAL NOT NULL DEFAULT 0,
  mode_paiement TEXT NOT NULL DEFAULT 'Espèces', user_id INTEGER, annulee INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS vente_lignes (
  id INTEGER PRIMARY KEY, vente_id INTEGER NOT NULL REFERENCES ventes(id) ON DELETE CASCADE,
  produit_id INTEGER REFERENCES produits(id), nom TEXT, prix REAL NOT NULL, quantite REAL NOT NULL,
  total REAL NOT NULL, cout_unitaire REAL NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS achats (
  id INTEGER PRIMARY KEY, numero TEXT, date TEXT NOT NULL, fournisseur_id INTEGER REFERENCES fournisseurs(id),
  total REAL NOT NULL, paye REAL NOT NULL DEFAULT 0, mode_paiement TEXT, notes TEXT);
CREATE TABLE IF NOT EXISTS achat_lignes (
  id INTEGER PRIMARY KEY, achat_id INTEGER NOT NULL REFERENCES achats(id) ON DELETE CASCADE,
  matiere_id INTEGER NOT NULL REFERENCES matieres(id), quantite REAL NOT NULL, prix_unitaire REAL NOT NULL, total REAL NOT NULL);
CREATE TABLE IF NOT EXISTS paiements (
  id INTEGER PRIMARY KEY, date TEXT NOT NULL, tiers_type TEXT NOT NULL, tiers_id INTEGER NOT NULL,
  montant REAL NOT NULL, mode TEXT NOT NULL DEFAULT 'Espèces', notes TEXT);
CREATE TABLE IF NOT EXISTS depenses (
  id INTEGER PRIMARY KEY, date TEXT NOT NULL, categorie TEXT NOT NULL, montant REAL NOT NULL,
  description TEXT, mode TEXT NOT NULL DEFAULT 'Espèces', employe_id INTEGER);
CREATE TABLE IF NOT EXISTS caisse_mouvements (
  id INTEGER PRIMARY KEY, date TEXT NOT NULL, type TEXT NOT NULL, montant REAL NOT NULL, motif TEXT);
CREATE TABLE IF NOT EXISTS caisse_sessions (
  id INTEGER PRIMARY KEY, jour TEXT NOT NULL UNIQUE, fond_initial REAL NOT NULL DEFAULT 0,
  theorique REAL, reel REAL, ecart REAL, cloturee INTEGER NOT NULL DEFAULT 0, cloture_date TEXT, notes TEXT);
CREATE TABLE IF NOT EXISTS employes (
  id INTEGER PRIMARY KEY, nom TEXT NOT NULL, poste TEXT, telephone TEXT, salaire REAL NOT NULL DEFAULT 0,
  date_embauche TEXT, actif INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS mouvements_stock (
  id INTEGER PRIMARY KEY, date TEXT NOT NULL, article_type TEXT NOT NULL, article_id INTEGER NOT NULL,
  quantite REAL NOT NULL, motif TEXT NOT NULL, ref TEXT, valeur REAL NOT NULL DEFAULT 0);
CREATE INDEX IF NOT EXISTS ix_ventes_date ON ventes(date);
CREATE INDEX IF NOT EXISTS ix_prod_date ON productions(date);
CREATE INDEX IF NOT EXISTS ix_dep_date ON depenses(date);
CREATE INDEX IF NOT EXISTS ix_achats_date ON achats(date);
`;

const all = (sql, ...p) => db.prepare(sql).all(...p).map(r => ({ ...r }));
const get = (sql, ...p) => { const r = db.prepare(sql).get(...p); return r ? { ...r } : null; };
const run = (sql, ...p) => db.prepare(sql).run(...p);
function tx(fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}
function getSettings() {
  const s = {};
  for (const r of all('SELECT key, value FROM settings')) s[r.key] = r.value;
  return s;
}
const setting = (k, def = '') => { const r = get('SELECT value FROM settings WHERE key=?', k); return r ? r.value : def; };
function nextNumero(prefix, table) {
  const r = get(`SELECT COUNT(*) n FROM ${table}`);
  return prefix + String((r.n || 0) + 1).padStart(6, '0');
}
function logStock(date, type, id, qte, motif, ref = '', valeur = 0) {
  run('INSERT INTO mouvements_stock(date,article_type,article_id,quantite,motif,ref,valeur) VALUES (?,?,?,?,?,?,?)',
    date, type, id, round2(qte * 1000) / 1000 === 0 ? qte : qte, motif, ref, round2(valeur));
}

/* ------------------------------------------------------------------ */
/* Prix de revient                                                     */
/* ------------------------------------------------------------------ */
/**
 * Calcule le prix de revient d'une recette (pour un lot de "rendement" unités).
 *   coût matières = Σ quantité × prix moyen pondéré de la matière
 *   pertes        = coût matières × pertes %
 *   charges       = main d'œuvre + énergie + emballage + autres (par lot)
 *   coût total    = matières + pertes + charges
 *   coût unitaire = coût total / rendement
 */
function calculRecette(recette, lignes, prixVente, margeCible) {
  const details = lignes.map(l => {
    const m = get('SELECT * FROM matieres WHERE id=?', l.matiere_id) || {};
    const cout = round2(num(l.quantite) * num(m.prix_moyen));
    return { matiere_id: l.matiere_id, nom: m.nom, nom_ar: m.nom_ar, unite: m.unite, quantite: num(l.quantite),
      prix_unitaire: num(m.prix_moyen), cout, stock: num(m.stock) };
  });
  const cout_matieres = round2(details.reduce((s, d) => s + d.cout, 0));
  const pertes = round2(cout_matieres * num(recette.pertes_pct) / 100);
  const charges = round2(num(recette.main_oeuvre) + num(recette.energie) + num(recette.emballage) + num(recette.autres));
  const cout_total = round2(cout_matieres + pertes + charges);
  const rendement = Math.max(num(recette.rendement, 1), 0.0001);
  const cout_unitaire = round2(cout_total / rendement);
  const pv = num(prixVente);
  const marge_unitaire = round2(pv - cout_unitaire);
  const taux_marge = pv > 0 ? round2(marge_unitaire / pv * 100) : 0;       // marge sur prix de vente
  const taux_marque = cout_unitaire > 0 ? round2(marge_unitaire / cout_unitaire * 100) : 0; // marge sur coût
  const coefficient = cout_unitaire > 0 ? round2(pv / cout_unitaire) : 0;
  const mc = Math.min(num(margeCible, 40), 95);
  const prix_conseille = cout_unitaire > 0 ? Math.ceil(cout_unitaire / (1 - mc / 100) / 5) * 5 : 0;
  for (const d of details) d.part = cout_total > 0 ? round2(d.cout / cout_total * 100) : 0;
  return { details, cout_matieres, pertes, charges, cout_total, rendement, cout_unitaire, prix_vente: pv,
    marge_unitaire, taux_marge, taux_marque, coefficient, marge_cible: mc, prix_conseille,
    marge_lot: round2(marge_unitaire * rendement), ca_lot: round2(pv * rendement) };
}
function recetteComplete(produitId) {
  const p = get('SELECT * FROM produits WHERE id=?', produitId);
  if (!p) return null;
  const r = get('SELECT * FROM recettes WHERE produit_id=?', produitId);
  if (!r) return { produit: p, recette: null, lignes: [], calcul: null };
  const lignes = all('SELECT * FROM recette_lignes WHERE recette_id=? ORDER BY id', r.id);
  const calcul = calculRecette(r, lignes, p.prix, setting('marge_cible', '40'));
  return { produit: p, recette: r, lignes, calcul };
}
function majCoutsProduits() {
  for (const r of all('SELECT produit_id FROM recettes')) {
    const rc = recetteComplete(r.produit_id);
    if (rc && rc.calcul) run('UPDATE produits SET cout_revient=? WHERE id=?', rc.calcul.cout_unitaire, r.produit_id);
  }
}

/* ------------------------------------------------------------------ */
/* Opérations métier                                                   */
/* ------------------------------------------------------------------ */
function creerProduction({ produit_id, quantite, date, notes, forcer }) {
  produit_id = num(produit_id); quantite = num(quantite);
  if (!produit_id || quantite <= 0) bad('Produit et quantité obligatoires');
  const rc = recetteComplete(produit_id);
  if (!rc) bad('Produit introuvable');
  if (!rc.recette) bad(`Aucune recette définie pour « ${rc.produit.nom} ». Créez la recette d'abord.`);
  const ratio = quantite / rc.calcul.rendement;
  const conso = rc.calcul.details.map(d => ({ ...d, besoin: round2(d.quantite * ratio * 1000) / 1000 }));
  const manques = conso.filter(c => c.besoin > c.stock + 1e-9);
  if (manques.length && !forcer) {
    const e = new ApiError(409, 'Stock de matières insuffisant : ' + manques.map(m => `${m.nom} (besoin ${m.besoin} ${m.unite}, dispo ${round2(m.stock)})`).join(', '));
    e.manques = manques; throw e;
  }
  const d = date ? (date.length === 10 ? date + nowStr().slice(10) : date) : nowStr();
  return tx(() => {
    const cout_matieres = round2(conso.reduce((s, c) => s + c.besoin * c.prix_unitaire, 0) * (1 + num(rc.recette.pertes_pct) / 100));
    const cout_charges = round2(rc.calcul.charges * ratio);
    const cout_total = round2(cout_matieres + cout_charges);
    const cout_unitaire = round2(cout_total / quantite);
    const info = run('INSERT INTO productions(date,produit_id,quantite,cout_matieres,cout_charges,cout_total,cout_unitaire,notes) VALUES (?,?,?,?,?,?,?,?)',
      d, produit_id, quantite, cout_matieres, cout_charges, cout_total, cout_unitaire, notes || null);
    const pid = Number(info.lastInsertRowid);
    for (const c of conso) {
      run('INSERT INTO production_conso(production_id,matiere_id,quantite,cout) VALUES (?,?,?,?)', pid, c.matiere_id, c.besoin, round2(c.besoin * c.prix_unitaire));
      run('UPDATE matieres SET stock = stock - ? WHERE id=?', c.besoin, c.matiere_id);
      logStock(d, 'matiere', c.matiere_id, -c.besoin, 'Production', 'PROD-' + pid, c.besoin * c.prix_unitaire);
    }
    run('UPDATE produits SET stock = stock + ?, cout_revient=? WHERE id=?', quantite, cout_unitaire, produit_id);
    logStock(d, 'produit', produit_id, quantite, 'Production', 'PROD-' + pid, cout_total);
    return get('SELECT * FROM productions WHERE id=?', pid);
  });
}
function supprimerProduction(id) {
  const p = get('SELECT * FROM productions WHERE id=?', id);
  if (!p) bad('Production introuvable');
  tx(() => {
    for (const c of all('SELECT * FROM production_conso WHERE production_id=?', id)) {
      run('UPDATE matieres SET stock = stock + ? WHERE id=?', c.quantite, c.matiere_id);
      logStock(nowStr(), 'matiere', c.matiere_id, c.quantite, 'Annulation production', 'PROD-' + id, c.cout);
    }
    run('UPDATE produits SET stock = stock - ? WHERE id=?', p.quantite, p.produit_id);
    logStock(nowStr(), 'produit', p.produit_id, -p.quantite, 'Annulation production', 'PROD-' + id, p.cout_total);
    run('DELETE FROM productions WHERE id=?', id);
  });
}

const MODES = ['Espèces', 'Bankily', 'Sedad', 'Masrivi', 'Crédit client'];
function creerVente({ lignes, remise, mode_paiement, client_id, date }, user) {
  if (!Array.isArray(lignes) || !lignes.length) bad('Le panier est vide');
  const mode = MODES.includes(mode_paiement) ? mode_paiement : 'Espèces';
  client_id = client_id ? num(client_id) : null;
  if (mode === 'Crédit client' && !client_id) bad('Choisissez un client pour une vente à crédit');
  const d = date || nowStr();
  return tx(() => {
    let sous_total = 0, cout = 0; const lg = [];
    for (const l of lignes) {
      const p = get('SELECT * FROM produits WHERE id=?', num(l.produit_id));
      if (!p) bad('Produit introuvable');
      const q = num(l.quantite); if (q <= 0) continue;
      const prix = l.prix != null ? num(l.prix) : p.prix;
      const t = round2(prix * q);
      sous_total += t; cout += p.cout_revient * q;
      lg.push({ p, q, prix, t });
    }
    if (!lg.length) bad('Le panier est vide');
    sous_total = round2(sous_total);
    const rem = Math.min(Math.max(num(remise), 0), sous_total);
    const total = round2(sous_total - rem);
    if (mode === 'Crédit client') {
      const c = get('SELECT * FROM clients WHERE id=?', client_id);
      if (!c) bad('Client introuvable');
      if (c.plafond > 0 && (-c.solde + total) > c.plafond) bad(`Plafond de crédit dépassé pour ${c.nom} (plafond ${c.plafond} MRU)`);
      run('UPDATE clients SET solde = solde - ? WHERE id=?', total, client_id);
    }
    const numero = nextNumero('T', 'ventes');
    const info = run('INSERT INTO ventes(numero,date,client_id,sous_total,remise,total,cout_revient,mode_paiement,user_id) VALUES (?,?,?,?,?,?,?,?,?)',
      numero, d, client_id, sous_total, rem, total, round2(cout), mode, user ? user.id : null);
    const vid = Number(info.lastInsertRowid);
    for (const x of lg) {
      run('INSERT INTO vente_lignes(vente_id,produit_id,nom,prix,quantite,total,cout_unitaire) VALUES (?,?,?,?,?,?,?)',
        vid, x.p.id, x.p.nom, x.prix, x.q, x.t, x.p.cout_revient);
      run('UPDATE produits SET stock = stock - ? WHERE id=?', x.q, x.p.id);
      logStock(d, 'produit', x.p.id, -x.q, 'Vente', numero, x.p.cout_revient * x.q);
    }
    return venteDetail(vid);
  });
}
function venteDetail(id) {
  const v = get(`SELECT v.*, c.nom client_nom, u.nom user_nom FROM ventes v LEFT JOIN clients c ON c.id=v.client_id
                 LEFT JOIN users u ON u.id=v.user_id WHERE v.id=?`, id);
  if (!v) return null;
  v.lignes = all(`SELECT l.*, p.nom_ar FROM vente_lignes l LEFT JOIN produits p ON p.id=l.produit_id WHERE vente_id=?`, id);
  return v;
}
function annulerVente(id) {
  const v = get('SELECT * FROM ventes WHERE id=?', id);
  if (!v) bad('Vente introuvable');
  if (v.annulee) bad('Vente déjà annulée');
  tx(() => {
    for (const l of all('SELECT * FROM vente_lignes WHERE vente_id=?', id)) {
      run('UPDATE produits SET stock = stock + ? WHERE id=?', l.quantite, l.produit_id);
      logStock(nowStr(), 'produit', l.produit_id, l.quantite, 'Annulation vente', v.numero);
    }
    if (v.mode_paiement === 'Crédit client' && v.client_id) run('UPDATE clients SET solde = solde + ? WHERE id=?', v.total, v.client_id);
    run('UPDATE ventes SET annulee=1 WHERE id=?', id);
  });
}

function creerAchat({ fournisseur_id, lignes, paye, mode_paiement, date, notes }) {
  if (!Array.isArray(lignes) || !lignes.length) bad('Ajoutez au moins une matière');
  const d = date ? (date.length === 10 ? date + nowStr().slice(10) : date) : nowStr();
  return tx(() => {
    let total = 0; const lg = [];
    for (const l of lignes) {
      const m = get('SELECT * FROM matieres WHERE id=?', num(l.matiere_id));
      if (!m) bad('Matière introuvable');
      const q = num(l.quantite), pu = num(l.prix_unitaire);
      if (q <= 0) continue;
      lg.push({ m, q, pu, t: round2(q * pu) }); total += q * pu;
    }
    if (!lg.length) bad('Quantités invalides');
    total = round2(total);
    const p = Math.min(Math.max(num(paye, total), 0), total);
    const numero = nextNumero('A', 'achats');
    const info = run('INSERT INTO achats(numero,date,fournisseur_id,total,paye,mode_paiement,notes) VALUES (?,?,?,?,?,?,?)',
      numero, d, fournisseur_id ? num(fournisseur_id) : null, total, p, mode_paiement || 'Espèces', notes || null);
    const aid = Number(info.lastInsertRowid);
    for (const x of lg) {
      run('INSERT INTO achat_lignes(achat_id,matiere_id,quantite,prix_unitaire,total) VALUES (?,?,?,?,?)', aid, x.m.id, x.q, x.pu, x.t);
      // Prix moyen pondéré (PMP)
      const cur = get('SELECT stock, prix_moyen FROM matieres WHERE id=?', x.m.id);
      const st = Math.max(cur.stock, 0);
      const pmp = st + x.q > 0 ? (st * cur.prix_moyen + x.q * x.pu) / (st + x.q) : x.pu;
      run('UPDATE matieres SET stock = stock + ?, prix_moyen=? WHERE id=?', x.q, round2(pmp), x.m.id);
      logStock(d, 'matiere', x.m.id, x.q, 'Achat', numero, x.t);
    }
    if (fournisseur_id && total - p > 0) run('UPDATE fournisseurs SET solde = solde - ? WHERE id=?', round2(total - p), num(fournisseur_id));
    majCoutsProduits();
    return get('SELECT * FROM achats WHERE id=?', aid);
  });
}

function creerPaiement({ tiers_type, tiers_id, montant, mode, notes, date }) {
  if (!['client', 'fournisseur'].includes(tiers_type)) bad('Type invalide');
  const m = num(montant); if (m <= 0) bad('Montant invalide');
  const table = tiers_type === 'client' ? 'clients' : 'fournisseurs';
  const t = get(`SELECT * FROM ${table} WHERE id=?`, num(tiers_id));
  if (!t) bad('Tiers introuvable');
  return tx(() => {
    run('INSERT INTO paiements(date,tiers_type,tiers_id,montant,mode,notes) VALUES (?,?,?,?,?,?)', date || nowStr(), tiers_type, t.id, m, mode || 'Espèces', notes || null);
    run(`UPDATE ${table} SET solde = solde + ? WHERE id=?`, m, t.id);
    return get(`SELECT * FROM ${table} WHERE id=?`, t.id);
  });
}

/* ------------------------------------------------------------------ */
/* Caisse                                                              */
/* ------------------------------------------------------------------ */
function caisseJour(jour = today()) {
  const like = jour + '%';
  let s = get('SELECT * FROM caisse_sessions WHERE jour=?', jour);
  if (!s) {
    const prev = get('SELECT * FROM caisse_sessions WHERE jour < ? AND cloturee=1 ORDER BY jour DESC LIMIT 1', jour);
    const fond = prev ? num(prev.reel) : num(setting('fond_caisse', '20000'));
    run('INSERT INTO caisse_sessions(jour, fond_initial) VALUES (?,?)', jour, fond);
    s = get('SELECT * FROM caisse_sessions WHERE jour=?', jour);
  }
  const q = (sql) => num((get(sql, like) || {}).t);
  const ventes_especes = q(`SELECT SUM(total) t FROM ventes WHERE date LIKE ? AND annulee=0 AND mode_paiement='Espèces'`);
  const encaissements = q(`SELECT SUM(montant) t FROM paiements WHERE date LIKE ? AND tiers_type='client' AND mode='Espèces'`);
  const depenses = q(`SELECT SUM(montant) t FROM depenses WHERE date LIKE ? AND mode='Espèces'`);
  const reglements = q(`SELECT SUM(montant) t FROM paiements WHERE date LIKE ? AND tiers_type='fournisseur' AND mode='Espèces'`)
    + q(`SELECT SUM(paye) t FROM achats WHERE date LIKE ? AND mode_paiement='Espèces'`);
  const retraits = q(`SELECT SUM(montant) t FROM caisse_mouvements WHERE date LIKE ? AND type='retrait'`);
  const apports = q(`SELECT SUM(montant) t FROM caisse_mouvements WHERE date LIKE ? AND type='apport'`);
  const electronique = all(`SELECT mode_paiement mode, SUM(total) total, COUNT(*) n FROM ventes WHERE date LIKE ? AND annulee=0 AND mode_paiement NOT IN ('Espèces') GROUP BY mode_paiement`, like);
  const theorique = round2(s.fond_initial + ventes_especes + encaissements + apports - depenses - reglements - retraits);
  return { ...s, jour, ventes_especes, encaissements, depenses, reglements, retraits, apports, theorique, electronique,
    mouvements: all('SELECT * FROM caisse_mouvements WHERE date LIKE ? ORDER BY date DESC', like),
    ecart_courant: s.cloturee ? s.ecart : null };
}

/* ------------------------------------------------------------------ */
/* Tableau de bord & rapports                                          */
/* ------------------------------------------------------------------ */
function periode(p, from, to) {
  const t = today();
  if (from && to) return [from, to];
  switch (p) {
    case '7j': return [addDays(t, -6), t];
    case '30j': return [addDays(t, -29), t];
    case 'mois': return [t.slice(0, 8) + '01', t];
    case 'annee': return [t.slice(0, 5) + '01-01', t];
    default: return [t, t];
  }
}
function previousPeriod(from, to) {
  const days = Math.round((new Date(to) - new Date(from)) / 864e5) + 1;
  return [addDays(from, -days), addDays(from, -1)];
}
function statsPeriode(from, to) {
  const a = from, b = to + ' 23:59:59';
  const v = get('SELECT COUNT(*) n, COALESCE(SUM(total),0) ca, COALESCE(SUM(cout_revient),0) cout, COALESCE(SUM(remise),0) remises FROM ventes WHERE annulee=0 AND date BETWEEN ? AND ?', a, b);
  const pr = get('SELECT COALESCE(SUM(quantite),0) q, COUNT(DISTINCT produit_id) np, COALESCE(SUM(cout_total),0) cout FROM productions WHERE date BETWEEN ? AND ?', a, b);
  const dep = get('SELECT COALESCE(SUM(montant),0) t FROM depenses WHERE date BETWEEN ? AND ?', a, b);
  const ach = get('SELECT COALESCE(SUM(total),0) t FROM achats WHERE date BETWEEN ? AND ?', a, b);
  const marge_brute = round2(v.ca - v.cout);
  return { ventes: v.n, ca: round2(v.ca), cout_ventes: round2(v.cout), remises: round2(v.remises), marge_brute,
    production_qte: pr.q, production_produits: pr.np, production_cout: round2(pr.cout),
    depenses: round2(dep.t), achats: round2(ach.t), benefice: round2(marge_brute - dep.t) };
}
const pct = (a, b) => b ? round2((a - b) / Math.abs(b) * 100) : (a ? 100 : 0);
function dashboard(p) {
  const [from, to] = periode(p);
  const [pf, pt] = previousPeriod(from, to);
  const cur = statsPeriode(from, to), prev = statsPeriode(pf, pt);
  const t = today();
  const evolution = [];
  for (let i = 6; i >= 0; i--) {
    const d = addDays(t, -i);
    const r = get('SELECT COALESCE(SUM(total),0) t, COUNT(*) n FROM ventes WHERE annulee=0 AND date LIKE ?', d + '%');
    evolution.push({ date: d, total: round2(r.t), n: r.n });
  }
  const top = all(`SELECT l.produit_id, l.nom, p.nom_ar, p.emoji, p.image, SUM(l.quantite) q, SUM(l.total) t FROM vente_lignes l
     JOIN ventes v ON v.id=l.vente_id LEFT JOIN produits p ON p.id=l.produit_id
     WHERE v.annulee=0 AND v.date BETWEEN ? AND ? GROUP BY l.produit_id ORDER BY q DESC LIMIT 5`, from, to + ' 23:59:59');
  const alertes = [];
  for (const m of all('SELECT * FROM matieres WHERE actif=1 AND stock <= stock_min ORDER BY stock/NULLIF(stock_min,0)')) {
    alertes.push({ niveau: m.stock <= m.stock_min * 0.5 ? 'danger' : 'warning', type: m.stock <= m.stock_min * 0.5 ? 'stock_faible' : 'presque_epuise',
      titre: m.nom, nom_ar: m.nom_ar, detail: { stock: round2(m.stock), unite: m.unite, seuil: m.stock_min } });
  }
  for (const f of all('SELECT * FROM fournisseurs WHERE solde < 0 ORDER BY solde')) alertes.push({ niveau: 'danger', type: 'facture_impayee', titre: f.nom, detail: { montant: -f.solde } });
  for (const c of all('SELECT * FROM clients WHERE solde < 0 ORDER BY solde LIMIT 5')) alertes.push({ niveau: 'danger', type: 'client_debiteur', titre: c.nom, detail: { montant: -c.solde } });
  for (const pr of all('SELECT * FROM produits WHERE actif=1 AND stock_min > 0 AND stock <= stock_min')) alertes.push({ niveau: 'warning', type: 'produit_bas', titre: pr.nom, detail: { stock: pr.stock } });
  const suivis = all(`SELECT * FROM matieres WHERE actif=1 ORDER BY CASE WHEN nom LIKE 'Farine%' THEN 0 WHEN nom LIKE 'Levure%' THEN 1 ELSE 2 END, id LIMIT 2`);
  const caisse = caisseJour();
  return { periode: { from, to }, stats: cur, precedent: prev,
    variations: { ca: pct(cur.ca, prev.ca), production: pct(cur.production_qte, prev.production_qte), benefice: pct(cur.benefice, prev.benefice), depenses: pct(cur.depenses, prev.depenses) },
    evolution, top, alertes, suivis, caisse_especes: caisse.theorique };
}
function rapport(from, to) {
  const b = to + ' 23:59:59';
  const stats = statsPeriode(from, to);
  const parJour = all(`SELECT substr(date,1,10) jour, COUNT(*) n, SUM(total) ca, SUM(cout_revient) cout FROM ventes WHERE annulee=0 AND date BETWEEN ? AND ? GROUP BY jour ORDER BY jour`, from, b);
  const depJour = Object.fromEntries(all(`SELECT substr(date,1,10) jour, SUM(montant) t FROM depenses WHERE date BETWEEN ? AND ? GROUP BY jour`, from, b).map(r => [r.jour, r.t]));
  for (const j of parJour) { j.depenses = round2(depJour[j.jour] || 0); j.marge = round2(j.ca - j.cout); j.benefice = round2(j.marge - j.depenses); }
  const parProduit = all(`SELECT l.produit_id, l.nom, SUM(l.quantite) q, SUM(l.total) ca, SUM(l.cout_unitaire*l.quantite) cout FROM vente_lignes l JOIN ventes v ON v.id=l.vente_id
     WHERE v.annulee=0 AND v.date BETWEEN ? AND ? GROUP BY l.produit_id ORDER BY ca DESC`, from, b)
    .map(r => ({ ...r, marge: round2(r.ca - r.cout), taux: r.ca ? round2((r.ca - r.cout) / r.ca * 100) : 0 }));
  const parMode = all(`SELECT mode_paiement mode, COUNT(*) n, SUM(total) total FROM ventes WHERE annulee=0 AND date BETWEEN ? AND ? GROUP BY mode_paiement ORDER BY total DESC`, from, b);
  const parCategorieDep = all(`SELECT categorie, SUM(montant) total FROM depenses WHERE date BETWEEN ? AND ? GROUP BY categorie ORDER BY total DESC`, from, b);
  const production = all(`SELECT p.produit_id, pr.nom, SUM(p.quantite) q, SUM(p.cout_total) cout, SUM(p.cout_total)/SUM(p.quantite) cu FROM productions p JOIN produits pr ON pr.id=p.produit_id
     WHERE p.date BETWEEN ? AND ? GROUP BY p.produit_id ORDER BY q DESC`, from, b);
  const consommation = all(`SELECT m.nom, m.unite, SUM(c.quantite) q, SUM(c.cout) cout FROM production_conso c JOIN productions p ON p.id=c.production_id JOIN matieres m ON m.id=c.matiere_id
     WHERE p.date BETWEEN ? AND ? GROUP BY c.matiere_id ORDER BY cout DESC`, from, b);
  const valeurStock = get('SELECT COALESCE(SUM(stock*prix_moyen),0) v FROM matieres WHERE stock>0').v;
  const valeurProduits = get('SELECT COALESCE(SUM(stock*cout_revient),0) v FROM produits WHERE stock>0').v;
  return { from, to, stats, parJour, parProduit, parMode, parCategorieDep, production, consommation,
    valeur_stock_matieres: round2(valeurStock), valeur_stock_produits: round2(valeurProduits) };
}

/* ------------------------------------------------------------------ */
/* Données de démonstration (reprend la maquette)                      */
/* ------------------------------------------------------------------ */
function seed() {
  const has = get('SELECT COUNT(*) n FROM users').n;
  if (has) return;
  console.log('Initialisation de la base avec des données de démonstration…');
  const S = { nom: 'Boulangerie Mbourou', nom_ar: 'مخبزة مبرو', slogan: 'Du bon pain pour tous', slogan_ar: 'خبز جيد للجميع',
    ville: 'Nouakchott - Mauritanie', telephone: '46 12 34 56', devise: 'MRU', marge_cible: '40', fond_caisse: '20000',
    ticket_message: 'Merci pour votre confiance !', ticket_message_ar: 'شكرا لثقتكم', langue: 'fr', demo: '1' };
  tx(() => {
    for (const [k, v] of Object.entries(S)) run('INSERT OR REPLACE INTO settings(key,value) VALUES (?,?)', k, v);
    run('INSERT INTO users(username,nom,password,role) VALUES (?,?,?,?)', 'admin', 'Admin', hashPassword('admin'), 'admin');
    run('INSERT INTO users(username,nom,password,role) VALUES (?,?,?,?)', 'caisse', 'Caissier', hashPassword('1234'), 'caissier');
    const M = [ // nom, ar, unité, stock, min, prix
      ['Farine', 'دقيق', 'kg', 900, 200, 18], ['Levure', 'خميرة', 'kg', 20, 5, 120], ['Sucre', 'سكر', 'kg', 200, 50, 18],
      ['Sel', 'ملح', 'kg', 100, 30, 5], ['Huile', 'زيت', 'L', 100, 20, 24], ['Beurre', 'زبدة', 'kg', 60, 10, 250],
      ['Lait', 'حليب', 'L', 60, 20, 40], ['Œufs', 'بيض', 'pcs', 600, 100, 7], ['Chocolat', 'شوكولاتة', 'kg', 15, 3, 300],
      ['Fromage', 'جبن', 'kg', 20, 5, 280], ['Tomate concentrée', 'معجون طماطم', 'kg', 15, 3, 60], ['Thon', 'تونة', 'kg', 15, 3, 220],
      ['Eau', 'ماء', 'L', 99999, 0, 0.1], ['Emballage sachet', 'كيس تغليف', 'pcs', 3000, 500, 0.5]];
    const mid = {};
    for (const m of M) mid[m[0]] = Number(run('INSERT INTO matieres(nom,nom_ar,unite,stock,stock_min,prix_moyen) VALUES (?,?,?,?,?,?)', ...m).lastInsertRowid);
    const P = [ // nom, ar, cat, prix, emoji, rendement, charges[MO,énergie,emb], lignes
      ['Pain normal', 'خبز عادي', 'Pains', 50, '🥖', 100, [1500, 800, 100], [['Farine', 10], ['Levure', 0.2], ['Sel', 0.15], ['Sucre', 0.5], ['Eau', 6]]],
      ['Baguette', 'باغيت', 'Pains', 70, '🥖', 100, [1800, 900, 100], [['Farine', 14], ['Levure', 0.25], ['Sel', 0.25], ['Eau', 9]]],
      ['Pain complet', 'خبز كامل', 'Pains', 60, '🍞', 50, [500, 250, 25], [['Farine', 6], ['Levure', 0.1], ['Sel', 0.1], ['Huile', 0.3], ['Eau', 4]]],
      ['Croissant', 'كرواسون', 'Viennoiseries', 100, '🥐', 50, [600, 250, 25], [['Farine', 2.5], ['Beurre', 1.25], ['Sucre', 0.3], ['Levure', 0.06], ['Lait', 0.6], ['Œufs', 4], ['Sel', 0.05]]],
      ['Pain au chocolat', 'خبز بالشوكولاتة', 'Viennoiseries', 120, '🍫', 50, [600, 250, 25], [['Farine', 2.5], ['Beurre', 1.25], ['Chocolat', 0.5], ['Sucre', 0.3], ['Levure', 0.06], ['Lait', 0.6], ['Œufs', 4]]],
      ['Beignet', 'فطيرة', 'Viennoiseries', 80, '🍩', 50, [400, 200, 25], [['Farine', 3], ['Sucre', 0.6], ['Levure', 0.08], ['Huile', 1.5], ['Œufs', 6], ['Lait', 0.5]]],
      ['Gâteau', 'كعكة', 'Pâtisseries', 500, '🎂', 10, [500, 200, 50], [['Farine', 1.5], ['Sucre', 1.2], ['Beurre', 0.8], ['Œufs', 20], ['Lait', 1], ['Chocolat', 0.4]]],
      ['Pizza', 'بيتزا', 'Sandwichs', 400, '🍕', 10, [400, 200, 30], [['Farine', 2], ['Levure', 0.04], ['Huile', 0.2], ['Fromage', 1], ['Tomate concentrée', 0.5], ['Thon', 0.4], ['Sel', 0.03]]],
      ['Sandwich', 'ساندويتش', 'Sandwichs', 300, '🥪', 20, [400, 100, 20], [['Farine', 1.6], ['Levure', 0.03], ['Thon', 0.8], ['Fromage', 0.5], ['Huile', 0.2], ['Œufs', 10]]],
    ];
    const pid = {};
    for (const p of P) {
      const id = Number(run('INSERT INTO produits(nom,nom_ar,categorie,prix,emoji,stock_min) VALUES (?,?,?,?,?,?)', p[0], p[1], p[2], p[3], p[4], 10).lastInsertRowid);
      pid[p[0]] = id;
      const rid = Number(run('INSERT INTO recettes(produit_id,rendement,main_oeuvre,energie,emballage,autres,pertes_pct) VALUES (?,?,?,?,?,?,?)', id, p[5], p[6][0], p[6][1], p[6][2], 0, 2).lastInsertRowid);
      for (const [n, q] of p[7]) run('INSERT INTO recette_lignes(recette_id,matiere_id,quantite) VALUES (?,?,?)', rid, mid[n], q);
    }
    for (const c of [['Restaurant Al Baraka', '46 12 34 56', 30000], ['Hôtel Sahara', '34 56 78 90', 50000], ['Café Mauritanie', '22 33 44 55', 40000], ['Boutique Eden', '48 76 54 32', 20000], ['Revendeur El Mina', '33 22 11 00', 20000]])
      run('INSERT INTO clients(nom,telephone,plafond) VALUES (?,?,?)', ...c);
    for (const f of [['Grossiste Farine', '46 12 22 33'], ['Fournisseur Levure', '44 56 66 77'], ['Sucre Mauritanie', '22 44 66 88'], ['Huile & Co', '33 55 77 99']])
      run('INSERT INTO fournisseurs(nom,telephone) VALUES (?,?)', ...f);
    for (const e of [['Mohamed Salem', 'Boulanger chef', '22 11 33 44', 15000], ['Aminetou Mint Ahmed', 'Caissière', '33 44 55 66', 9000], ['Sidi Ould Cheikh', 'Pâtissier', '44 55 66 77', 12000], ['Brahim Ba', 'Livreur', '36 22 11 88', 7000]])
      run('INSERT INTO employes(nom,poste,telephone,salaire,date_embauche) VALUES (?,?,?,?,?)', ...e, addDays(today(), -400));
  });
  majCoutsProduits();

  // Historique : 30 jours d'activité simulée
  const rnd = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
  const t = today();
  const plan = { 'Pain normal': [180, 260], 'Baguette': [120, 180], 'Croissant': [50, 80], 'Beignet': [40, 70], 'Pain complet': [30, 50], 'Pain au chocolat': [25, 45], 'Gâteau': [2, 6], 'Pizza': [3, 8], 'Sandwich': [8, 18] };
  const prods = all('SELECT * FROM produits');
  const byName = Object.fromEntries(prods.map(p => [p.nom, p]));
  for (let i = 29; i >= 0; i--) {
    const d = addDays(t, -i);
    // réapprovisionnement hebdomadaire
    if (i % 7 === 0 || i === 29) {
      creerAchat({ fournisseur_id: 1, lignes: [{ matiere_id: 1, quantite: 400, prix_unitaire: 18 }], paye: i === 0 ? 0 : 7200, date: d + ' 07:30:00', mode_paiement: 'Espèces' });
      creerAchat({ fournisseur_id: 2, lignes: [{ matiere_id: 2, quantite: 8, prix_unitaire: 120 }, { matiere_id: 6, quantite: 18, prix_unitaire: 250 }], paye: 5460, date: d + ' 07:40:00', mode_paiement: 'Bankily' });
      creerAchat({ fournisseur_id: 3, lignes: [{ matiere_id: 3, quantite: 25, prix_unitaire: 18 }, { matiere_id: 8, quantite: 240, prix_unitaire: 7 }, { matiere_id: 7, quantite: 15, prix_unitaire: 40 }], paye: i < 7 ? 1000 : 2730, date: d + ' 07:45:00' });
      creerAchat({ fournisseur_id: 4, lignes: [{ matiere_id: 5, quantite: 15, prix_unitaire: 24 }, { matiere_id: 9, quantite: 4, prix_unitaire: 300 }, { matiere_id: 10, quantite: 6, prix_unitaire: 280 }, { matiere_id: 12, quantite: 5, prix_unitaire: 220 }, { matiere_id: 11, quantite: 3, prix_unitaire: 60 }, { matiere_id: 4, quantite: 3, prix_unitaire: 5 }], paye: 4515, date: d + ' 07:50:00' });
    }
    const vol = {};
    for (const [n, [a, b]] of Object.entries(plan)) {
      const q = rnd(a, b); vol[n] = q;
      try { creerProduction({ produit_id: byName[n].id, quantite: q + rnd(0, Math.ceil(q * 0.06)), date: d + ' 05:' + pad(rnd(0, 50)) + ':00', forcer: true }); } catch (e) { /* ignore */ }
    }
    // ventes du jour
    const nbVentes = rnd(26, 40);
    const modes = ['Espèces', 'Espèces', 'Espèces', 'Espèces', 'Bankily', 'Bankily', 'Sedad', 'Masrivi'];
    const restant = { ...vol };
    for (let k = 0; k < nbVentes; k++) {
      const lignes = [];
      for (const n of Object.keys(restant)) {
        if (restant[n] <= 0) continue;
        if (Math.random() < 0.35) {
          const q = Math.min(restant[n], Math.max(1, Math.round(restant[n] / (nbVentes - k) * (0.6 + Math.random()))));
          lignes.push({ produit_id: byName[n].id, quantite: q }); restant[n] -= q;
        }
      }
      if (!lignes.length) continue;
      const h = 6 + Math.floor(k / nbVentes * 14);
      const credit = Math.random() < 0.06;
      try {
        creerVente({ lignes, mode_paiement: credit ? 'Crédit client' : modes[rnd(0, modes.length - 1)], client_id: credit ? rnd(1, 5) : null,
          date: `${d} ${pad(h)}:${pad(rnd(0, 59))}:${pad(rnd(0, 59))}` });
      } catch (e) { /* plafond */ }
    }
    // dépenses
    if (i % 10 === 3) run('INSERT INTO depenses(date,categorie,montant,description,mode) VALUES (?,?,?,?,?)', d + ' 10:00:00', 'Électricité', 1200, 'Facture SOMELEC', 'Espèces');
    if (i % 15 === 4) run('INSERT INTO depenses(date,categorie,montant,description,mode) VALUES (?,?,?,?,?)', d + ' 10:10:00', 'Eau', 450, 'Facture SNDE', 'Espèces');
    if (i % 7 === 2) run('INSERT INTO depenses(date,categorie,montant,description,mode) VALUES (?,?,?,?,?)', d + ' 11:00:00', 'Gaz', 800, 'Bouteilles de gaz', 'Espèces');
    if (i % 3 === 0) run('INSERT INTO depenses(date,categorie,montant,description,mode) VALUES (?,?,?,?,?)', d + ' 12:00:00', 'Transport', 600, 'Livraison', 'Espèces');
    if (i % 2 === 0) run('INSERT INTO depenses(date,categorie,montant,description,mode) VALUES (?,?,?,?,?)', d + ' 13:00:00', 'Autres', 350, 'Divers', 'Espèces');
    // encaissement client occasionnel
    if (i % 6 === 1) { const c = get('SELECT * FROM clients WHERE solde < 0 ORDER BY RANDOM() LIMIT 1'); if (c) creerPaiement({ tiers_type: 'client', tiers_id: c.id, montant: Math.min(-c.solde, 3000), mode: 'Espèces', date: d + ' 16:00:00' }); }
    // clôture de caisse des jours passés
    if (i > 0) {
      const c0 = caisseJour(d);
      if (c0.theorique > 20000) run('INSERT INTO caisse_mouvements(date,type,montant,motif) VALUES (?,?,?,?)', d + ' 20:30:00', 'retrait', round2(c0.theorique - 20000), 'Versement en banque');
      const cs = caisseJour(d); run('UPDATE caisse_sessions SET theorique=?, reel=?, ecart=0, cloturee=1, cloture_date=? WHERE jour=?', cs.theorique, cs.theorique, d + ' 21:00:00', d);
    }
  }
  // salaires du mois précédent
  for (const e of all('SELECT * FROM employes')) run('INSERT INTO depenses(date,categorie,montant,description,mode,employe_id) VALUES (?,?,?,?,?,?)', addDays(t, -5) + ' 09:00:00', 'Salaires', e.salaire, 'Salaire ' + e.nom, 'Bankily', e.id);
  // Remettre levure en alerte comme sur la maquette
  run(`UPDATE matieres SET stock=2.5 WHERE nom='Levure'`);
  console.log('Données de démonstration créées.');
}

function openDb() {
  db = new DatabaseSync(DB_FILE);
  db.exec(SCHEMA);
  seed();
}
openDb();

/* ------------------------------------------------------------------ */
/* Authentification                                                    */
/* ------------------------------------------------------------------ */
const sessions = new Map(); // token -> {user, exp}
function authUser(req) {
  const h = req.headers['authorization'] || '';
  const tok = h.startsWith('Bearer ') ? h.slice(7) : null;
  const s = tok && sessions.get(tok);
  if (!s) return null;
  if (s.exp < Date.now()) { sessions.delete(tok); return null; }
  s.exp = Date.now() + 12 * 3600e3;
  return s.user;
}

/* ------------------------------------------------------------------ */
/* CRUD générique                                                      */
/* ------------------------------------------------------------------ */
const RES = {
  matieres: { cols: ['nom', 'nom_ar', 'unite', 'stock', 'stock_min', 'prix_moyen', 'actif'], order: 'nom', admin: false },
  produits: { cols: ['nom', 'nom_ar', 'categorie', 'prix', 'stock', 'stock_min', 'emoji', 'image', 'actif', 'cout_revient'], order: 'categorie, nom' },
  clients: { cols: ['nom', 'telephone', 'adresse', 'plafond', 'solde', 'actif'], order: 'nom' },
  fournisseurs: { cols: ['nom', 'telephone', 'adresse', 'solde', 'actif'], order: 'nom' },
  employes: { cols: ['nom', 'poste', 'telephone', 'salaire', 'date_embauche', 'actif'], order: 'nom', admin: true },
  depenses: { cols: ['date', 'categorie', 'montant', 'description', 'mode', 'employe_id'], order: 'date DESC' },
};
const NUMERIC = new Set(['stock', 'stock_min', 'prix_moyen', 'prix', 'plafond', 'solde', 'salaire', 'montant', 'actif', 'cout_revient', 'employe_id']);
function cleanRow(res, body, isNew) {
  const out = {};
  for (const c of RES[res].cols) {
    if (body[c] === undefined) continue;
    out[c] = NUMERIC.has(c) ? (body[c] === '' || body[c] === null ? (c === 'employe_id' ? null : 0) : num(body[c])) : (body[c] === null ? null : String(body[c]).trim());
  }
  if (isNew && 'nom' in Object.fromEntries(RES[res].cols.map(c => [c, 1])) && !out.nom && res !== 'depenses') bad('Le nom est obligatoire');
  if (res === 'depenses') {
    if (isNew && !out.montant) bad('Montant obligatoire');
    if (isNew && !out.date) out.date = nowStr();
    if (out.date && out.date.length === 10) out.date += nowStr().slice(10);
    if (isNew && !out.categorie) out.categorie = 'Autres';
  }
  if (out.image && out.image.length > 2_500_000) bad('Image trop lourde (max ~2 Mo)');
  return out;
}

/* ------------------------------------------------------------------ */
/* Routeur                                                             */
/* ------------------------------------------------------------------ */
const routes = [];
const route = (method, pattern, handler, opts = {}) => {
  const keys = []; const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; }) + '$');
  routes.push({ method, re, keys, handler, ...opts });
};

route('POST', '/api/login', ({ body }) => {
  const u = get('SELECT * FROM users WHERE username=? AND actif=1', String(body.username || '').trim().toLowerCase());
  if (!u || !checkPassword(body.password || '', u.password)) throw new ApiError(401, 'Identifiant ou mot de passe incorrect');
  const token = crypto.randomBytes(24).toString('hex');
  const user = { id: u.id, username: u.username, nom: u.nom, role: u.role };
  sessions.set(token, { user, exp: Date.now() + 12 * 3600e3 });
  return { token, user, settings: getSettings() };
}, { public: true });
route('GET', '/api/public-settings', () => { const s = getSettings(); return { nom: s.nom, nom_ar: s.nom_ar, slogan: s.slogan, slogan_ar: s.slogan_ar, langue: s.langue, demo: s.demo }; }, { public: true });
route('POST', '/api/logout', ({ req }) => { const h = req.headers.authorization || ''; sessions.delete(h.slice(7)); return { ok: true }; });
route('GET', '/api/me', ({ user }) => ({ user, settings: getSettings() }));

route('GET', '/api/settings', () => getSettings());
route('PUT', '/api/settings', ({ body }) => {
  const allowed = ['nom', 'nom_ar', 'slogan', 'slogan_ar', 'ville', 'telephone', 'devise', 'marge_cible', 'fond_caisse', 'ticket_message', 'ticket_message_ar', 'langue', 'adresse', 'nif'];
  tx(() => { for (const k of allowed) if (body[k] !== undefined) run('INSERT OR REPLACE INTO settings(key,value) VALUES (?,?)', k, String(body[k])); });
  return getSettings();
}, { admin: true });

// Utilisateurs
route('GET', '/api/users', () => all('SELECT id, username, nom, role, actif FROM users ORDER BY id'), { admin: true });
route('POST', '/api/users', ({ body }) => {
  const u = String(body.username || '').trim().toLowerCase();
  if (!u || !body.password) bad('Identifiant et mot de passe obligatoires');
  if (get('SELECT id FROM users WHERE username=?', u)) bad('Cet identifiant existe déjà');
  run('INSERT INTO users(username,nom,password,role) VALUES (?,?,?,?)', u, body.nom || u, hashPassword(body.password), body.role === 'admin' ? 'admin' : 'caissier');
  return { ok: true };
}, { admin: true });
route('PUT', '/api/users/:id', ({ params, body, user }) => {
  const id = num(params.id);
  if (body.password) run('UPDATE users SET password=? WHERE id=?', hashPassword(body.password), id);
  if (body.nom !== undefined) run('UPDATE users SET nom=? WHERE id=?', body.nom, id);
  if (body.role && id !== user.id) run('UPDATE users SET role=? WHERE id=?', body.role === 'admin' ? 'admin' : 'caissier', id);
  if (body.actif !== undefined && id !== user.id) run('UPDATE users SET actif=? WHERE id=?', body.actif ? 1 : 0, id);
  return { ok: true };
}, { admin: true });
route('POST', '/api/me/password', ({ body, user }) => {
  const u = get('SELECT * FROM users WHERE id=?', user.id);
  if (!checkPassword(body.ancien || '', u.password)) bad('Ancien mot de passe incorrect');
  if (!body.nouveau || String(body.nouveau).length < 4) bad('Nouveau mot de passe trop court (4 caractères min.)');
  run('UPDATE users SET password=? WHERE id=?', hashPassword(body.nouveau), user.id);
  return { ok: true };
});

// CRUD générique
for (const res of Object.keys(RES)) {
  const o = { admin: RES[res].admin };
  route('GET', `/api/${res}`, ({ query }) => {
    let where = '1=1'; const p = [];
    if (res === 'depenses') {
      if (query.from) { where += ' AND date >= ?'; p.push(query.from); }
      if (query.to) { where += ' AND date <= ?'; p.push(query.to + ' 23:59:59'); }
      if (query.categorie) { where += ' AND categorie = ?'; p.push(query.categorie); }
    }
    if (query.q && res !== 'depenses') { where += ' AND nom LIKE ?'; p.push('%' + query.q + '%'); }
    const lim = res === 'depenses' ? ' LIMIT 1000' : '';
    let rows = all(`SELECT * FROM ${res} WHERE ${where} ORDER BY ${RES[res].order}${lim}`, ...p);
    if (res === 'produits') { const has = new Set(all('SELECT produit_id FROM recettes').map(r => r.produit_id)); rows = rows.map(r => ({ ...r, a_recette: has.has(r.id) })); }
    return rows;
  }, o);
  route('GET', `/api/${res}/:id`, ({ params }) => get(`SELECT * FROM ${res} WHERE id=?`, num(params.id)) || bad('Introuvable'), o);
  route('POST', `/api/${res}`, ({ body }) => {
    const row = cleanRow(res, body, true); const ks = Object.keys(row);
    const info = run(`INSERT INTO ${res}(${ks.join(',')}) VALUES (${ks.map(() => '?').join(',')})`, ...ks.map(k => row[k]));
    const id = Number(info.lastInsertRowid);
    if (res === 'matieres' && row.stock) logStock(nowStr(), 'matiere', id, row.stock, 'Stock initial', '', row.stock * (row.prix_moyen || 0));
    return get(`SELECT * FROM ${res} WHERE id=?`, id);
  }, o);
  route('PUT', `/api/${res}/:id`, ({ params, body }) => {
    const id = num(params.id); const row = cleanRow(res, body, false);
    const old = get(`SELECT * FROM ${res} WHERE id=?`, id); if (!old) bad('Introuvable');
    const ks = Object.keys(row); if (!ks.length) return old;
    run(`UPDATE ${res} SET ${ks.map(k => k + '=?').join(',')} WHERE id=?`, ...ks.map(k => row[k]), id);
    if ((res === 'matieres' || res === 'produits') && row.stock !== undefined && row.stock !== old.stock)
      logStock(nowStr(), res === 'matieres' ? 'matiere' : 'produit', id, row.stock - old.stock, 'Correction manuelle');
    if (res === 'matieres' && row.prix_moyen !== undefined) majCoutsProduits();
    return get(`SELECT * FROM ${res} WHERE id=?`, id);
  }, o);
  route('DELETE', `/api/${res}/:id`, ({ params }) => {
    const id = num(params.id);
    try { run(`DELETE FROM ${res} WHERE id=?`, id); }
    catch (e) { // utilisé ailleurs -> désactivation
      if (RES[res].cols.includes('actif')) { run(`UPDATE ${res} SET actif=0 WHERE id=?`, id); return { ok: true, desactive: true }; }
      throw e;
    }
    return { ok: true };
  }, { ...o, admin: true });
}

// Recettes & prix de revient
route('GET', '/api/recettes', () => all('SELECT id FROM produits WHERE actif=1 ORDER BY categorie, nom').map(p => {
  const rc = recetteComplete(p.id); return { produit: rc.produit, recette: rc.recette, calcul: rc.calcul };
}));
route('GET', '/api/recettes/:produitId', ({ params }) => recetteComplete(num(params.produitId)) || bad('Produit introuvable'));
route('POST', '/api/recettes/simuler', ({ body }) => {
  const p = body.produit_id ? get('SELECT * FROM produits WHERE id=?', num(body.produit_id)) : null;
  return calculRecette(body.recette || {}, body.lignes || [], body.prix_vente != null ? body.prix_vente : (p ? p.prix : 0), body.marge_cible ?? setting('marge_cible', '40'));
});
route('PUT', '/api/recettes/:produitId', ({ params, body }) => {
  const pid = num(params.produitId);
  if (!get('SELECT id FROM produits WHERE id=?', pid)) bad('Produit introuvable');
  const r = body.recette || {};
  if (num(r.rendement) <= 0) bad('Le rendement (nombre d\'unités par fournée) doit être > 0');
  tx(() => {
    let rec = get('SELECT * FROM recettes WHERE produit_id=?', pid);
    const vals = [num(r.rendement), num(r.main_oeuvre), num(r.energie), num(r.emballage), num(r.autres), num(r.pertes_pct), r.notes || null];
    if (rec) run('UPDATE recettes SET rendement=?,main_oeuvre=?,energie=?,emballage=?,autres=?,pertes_pct=?,notes=? WHERE id=?', ...vals, rec.id);
    else rec = { id: Number(run('INSERT INTO recettes(rendement,main_oeuvre,energie,emballage,autres,pertes_pct,notes,produit_id) VALUES (?,?,?,?,?,?,?,?)', ...vals, pid).lastInsertRowid) };
    run('DELETE FROM recette_lignes WHERE recette_id=?', rec.id);
    for (const l of body.lignes || []) if (num(l.matiere_id) && num(l.quantite) > 0) run('INSERT INTO recette_lignes(recette_id,matiere_id,quantite) VALUES (?,?,?)', rec.id, num(l.matiere_id), num(l.quantite));
    if (body.prix_vente != null && num(body.prix_vente) > 0) run('UPDATE produits SET prix=? WHERE id=?', num(body.prix_vente), pid);
  });
  majCoutsProduits();
  return recetteComplete(pid);
}, { admin: true });
route('DELETE', '/api/recettes/:produitId', ({ params }) => { run('DELETE FROM recettes WHERE produit_id=?', num(params.produitId)); return { ok: true }; }, { admin: true });

// Production
route('GET', '/api/productions', ({ query }) => {
  const [from, to] = periode(query.p, query.from, query.to);
  return all(`SELECT p.*, pr.nom produit_nom, pr.nom_ar, pr.emoji, pr.prix FROM productions p JOIN produits pr ON pr.id=p.produit_id WHERE p.date BETWEEN ? AND ? ORDER BY p.date DESC`, from, to + ' 23:59:59')
    .map(p => ({ ...p, conso: all('SELECT c.*, m.nom, m.nom_ar, m.unite FROM production_conso c JOIN matieres m ON m.id=c.matiere_id WHERE production_id=?', p.id) }));
});
route('POST', '/api/productions/preview', ({ body }) => {
  const rc = recetteComplete(num(body.produit_id)); if (!rc || !rc.recette) bad('Aucune recette pour ce produit');
  const ratio = num(body.quantite) / rc.calcul.rendement;
  return { calcul: rc.calcul, ratio, conso: rc.calcul.details.map(d => ({ ...d, besoin: round2(d.quantite * ratio * 1000) / 1000, suffisant: d.quantite * ratio <= d.stock + 1e-9 })),
    cout_total: round2(rc.calcul.cout_total * ratio), cout_unitaire: rc.calcul.cout_unitaire };
});
route('POST', '/api/productions', ({ body }) => creerProduction(body));
route('DELETE', '/api/productions/:id', ({ params }) => { supprimerProduction(num(params.id)); return { ok: true }; }, { admin: true });

// Ventes
route('GET', '/api/ventes', ({ query }) => {
  const [from, to] = periode(query.p, query.from, query.to);
  return all(`SELECT v.*, c.nom client_nom, (SELECT GROUP_CONCAT(nom || ' x' || printf('%g', quantite), ', ') FROM vente_lignes WHERE vente_id=v.id) articles
              FROM ventes v LEFT JOIN clients c ON c.id=v.client_id WHERE v.date BETWEEN ? AND ? ORDER BY v.date DESC LIMIT 2000`, from, to + ' 23:59:59');
});
route('GET', '/api/ventes/:id', ({ params }) => venteDetail(num(params.id)) || bad('Vente introuvable'));
route('POST', '/api/ventes', ({ body, user }) => creerVente(body, user));
route('POST', '/api/ventes/:id/annuler', ({ params }) => { annulerVente(num(params.id)); return { ok: true }; }, { admin: true });

// Achats
route('GET', '/api/achats', ({ query }) => {
  const [from, to] = periode(query.p || '30j', query.from, query.to);
  return all(`SELECT a.*, f.nom fournisseur_nom, (SELECT GROUP_CONCAT(m.nom || ' ' || printf('%g', l.quantite) || ' ' || m.unite, ', ') FROM achat_lignes l JOIN matieres m ON m.id=l.matiere_id WHERE achat_id=a.id) articles
              FROM achats a LEFT JOIN fournisseurs f ON f.id=a.fournisseur_id WHERE a.date BETWEEN ? AND ? ORDER BY a.date DESC`, from, to + ' 23:59:59');
});
route('POST', '/api/achats', ({ body }) => creerAchat(body));

// Paiements (encaissements clients / règlements fournisseurs)
route('GET', '/api/paiements', ({ query }) => all(`SELECT * FROM paiements WHERE (? IS NULL OR tiers_type=?) AND (? IS NULL OR tiers_id=?) ORDER BY date DESC LIMIT 500`,
  query.type || null, query.type || null, query.id ? num(query.id) : null, query.id ? num(query.id) : null));
route('POST', '/api/paiements', ({ body }) => creerPaiement(body));
route('GET', '/api/clients/:id/historique', ({ params }) => {
  const id = num(params.id);
  const v = all(`SELECT 'vente' type, date, numero ref, total montant, mode_paiement mode FROM ventes WHERE client_id=? AND annulee=0`, id);
  const p = all(`SELECT 'paiement' type, date, '' ref, montant, mode FROM paiements WHERE tiers_type='client' AND tiers_id=?`, id);
  return [...v, ...p].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 200);
});
route('GET', '/api/fournisseurs/:id/historique', ({ params }) => {
  const id = num(params.id);
  const a = all(`SELECT 'achat' type, date, numero ref, total montant, paye, mode_paiement mode FROM achats WHERE fournisseur_id=?`, id);
  const p = all(`SELECT 'paiement' type, date, '' ref, montant, mode FROM paiements WHERE tiers_type='fournisseur' AND tiers_id=?`, id);
  return [...a, ...p].sort((x, y) => y.date.localeCompare(x.date)).slice(0, 200);
});

// Caisse
route('GET', '/api/caisse', ({ query }) => caisseJour(query.jour || today()));
route('GET', '/api/caisse/historique', () => all('SELECT * FROM caisse_sessions ORDER BY jour DESC LIMIT 60'));
route('PUT', '/api/caisse/fond', ({ body }) => { const c = caisseJour(); if (c.cloturee) bad('Caisse déjà clôturée'); run('UPDATE caisse_sessions SET fond_initial=? WHERE jour=?', num(body.fond_initial), c.jour); return caisseJour(); });
route('POST', '/api/caisse/mouvement', ({ body }) => {
  if (!['retrait', 'apport'].includes(body.type)) bad('Type invalide'); if (num(body.montant) <= 0) bad('Montant invalide');
  run('INSERT INTO caisse_mouvements(date,type,montant,motif) VALUES (?,?,?,?)', nowStr(), body.type, num(body.montant), body.motif || ''); return caisseJour();
});
route('POST', '/api/caisse/cloturer', ({ body }) => {
  const c = caisseJour(); if (c.cloturee) bad('Caisse déjà clôturée');
  const reel = num(body.reel);
  run('UPDATE caisse_sessions SET theorique=?, reel=?, ecart=?, cloturee=1, cloture_date=?, notes=? WHERE jour=?', c.theorique, reel, round2(reel - c.theorique), nowStr(), body.notes || null, c.jour);
  return caisseJour();
}, { admin: true });
route('POST', '/api/caisse/rouvrir', () => { run('UPDATE caisse_sessions SET cloturee=0 WHERE jour=?', today()); return caisseJour(); }, { admin: true });

// Inventaire
route('GET', '/api/inventaire', () => ({
  matieres: all('SELECT * FROM matieres WHERE actif=1 ORDER BY nom'),
  produits: all('SELECT * FROM produits WHERE actif=1 ORDER BY categorie, nom'),
  historique: all(`SELECT ms.*, CASE ms.article_type WHEN 'matiere' THEN m.nom ELSE p.nom END nom, CASE ms.article_type WHEN 'matiere' THEN m.unite ELSE 'pcs' END unite
                   FROM mouvements_stock ms LEFT JOIN matieres m ON ms.article_type='matiere' AND m.id=ms.article_id LEFT JOIN produits p ON ms.article_type='produit' AND p.id=ms.article_id
                   ORDER BY ms.id DESC LIMIT 300`),
}));
route('POST', '/api/inventaire', ({ body }) => {
  const d = nowStr(); let n = 0, valeur = 0;
  tx(() => {
    for (const l of body.lignes || []) {
      const table = l.type === 'produit' ? 'produits' : 'matieres';
      const a = get(`SELECT * FROM ${table} WHERE id=?`, num(l.id)); if (!a) continue;
      const reel = num(l.reel); const ecart = round2((reel - a.stock) * 1000) / 1000;
      if (Math.abs(ecart) < 1e-9) continue;
      const pu = l.type === 'produit' ? a.cout_revient : a.prix_moyen;
      run(`UPDATE ${table} SET stock=? WHERE id=?`, reel, a.id);
      logStock(d, l.type === 'produit' ? 'produit' : 'matiere', a.id, ecart, l.motif || 'Inventaire', 'INV', ecart * pu);
      n++; valeur += ecart * pu;
    }
  });
  return { ajustements: n, valeur: round2(valeur) };
});
route('POST', '/api/pertes', ({ body }) => { // pertes / invendus
  const table = body.type === 'produit' ? 'produits' : 'matieres';
  const a = get(`SELECT * FROM ${table} WHERE id=?`, num(body.id)); if (!a) bad('Article introuvable');
  const q = num(body.quantite); if (q <= 0) bad('Quantité invalide');
  const pu = body.type === 'produit' ? a.cout_revient : a.prix_moyen;
  run(`UPDATE ${table} SET stock = stock - ? WHERE id=?`, q, a.id);
  logStock(nowStr(), body.type === 'produit' ? 'produit' : 'matiere', a.id, -q, body.motif || 'Perte / invendu', 'PERTE', -q * pu);
  return { ok: true, valeur: round2(q * pu) };
});

// Tableau de bord & rapports
route('GET', '/api/dashboard', ({ query }) => dashboard(query.p || 'jour'));
route('GET', '/api/rapports', ({ query }) => { const [f, t] = periode(query.p || 'mois', query.from, query.to); return rapport(f, t); });
route('POST', '/api/employes/:id/salaire', ({ params, body }) => {
  const e = get('SELECT * FROM employes WHERE id=?', num(params.id)); if (!e) bad('Employé introuvable');
  const m = num(body.montant, e.salaire);
  run('INSERT INTO depenses(date,categorie,montant,description,mode,employe_id) VALUES (?,?,?,?,?,?)', nowStr(), 'Salaires', m, (body.description || 'Salaire') + ' ' + e.nom, body.mode || 'Espèces', e.id);
  return { ok: true };
}, { admin: true });
route('GET', '/api/employes/:id/paiements', ({ params }) => all(`SELECT * FROM depenses WHERE employe_id=? ORDER BY date DESC`, num(params.id)), { admin: true });

// Recherche globale
route('GET', '/api/recherche', ({ query }) => {
  const q = '%' + (query.q || '') + '%';
  return {
    produits: all('SELECT id, nom, nom_ar, prix FROM produits WHERE actif=1 AND (nom LIKE ? OR nom_ar LIKE ?) LIMIT 6', q, q),
    clients: all('SELECT id, nom, telephone, solde FROM clients WHERE nom LIKE ? OR telephone LIKE ? LIMIT 6', q, q),
    ventes: all('SELECT id, numero, date, total FROM ventes WHERE numero LIKE ? ORDER BY id DESC LIMIT 6', q),
    matieres: all('SELECT id, nom, stock, unite FROM matieres WHERE nom LIKE ? OR nom_ar LIKE ? LIMIT 6', q, q),
  };
});

// Sauvegarde / restauration / réinitialisation
route('GET', '/api/backup', () => {
  const f = path.join(DATA_DIR, `backup-${Date.now()}.db`);
  db.exec(`VACUUM INTO '${f.replace(/'/g, "''")}'`);
  const buf = fs.readFileSync(f); fs.unlinkSync(f);
  return { __raw: buf, type: 'application/octet-stream', filename: `mbourou-sauvegarde-${today()}.db` };
}, { admin: true });
route('POST', '/api/restore', ({ body }) => {
  const buf = Buffer.from(String(body.data || ''), 'base64');
  if (buf.slice(0, 15).toString() !== 'SQLite format 3') bad('Fichier de sauvegarde invalide');
  const safety = path.join(DATA_DIR, `avant-restauration-${Date.now()}.db`);
  db.exec(`VACUUM INTO '${safety.replace(/'/g, "''")}'`);
  db.close();
  for (const s of ['-wal', '-shm']) { try { fs.unlinkSync(DB_FILE + s); } catch { } }
  fs.writeFileSync(DB_FILE, buf);
  openDb(); sessions.clear();
  return { ok: true };
}, { admin: true });
route('POST', '/api/reset', ({ body }) => {
  const safety = path.join(DATA_DIR, `avant-reinitialisation-${Date.now()}.db`);
  db.exec(`VACUUM INTO '${safety.replace(/'/g, "''")}'`);
  if (body.mode === 'vide') {
    tx(() => {
      for (const t of ['vente_lignes', 'ventes', 'production_conso', 'productions', 'achat_lignes', 'achats', 'paiements', 'depenses', 'caisse_mouvements', 'caisse_sessions', 'mouvements_stock']) run(`DELETE FROM ${t}`);
      run('UPDATE clients SET solde=0'); run('UPDATE fournisseurs SET solde=0'); run('UPDATE produits SET stock=0');
      run("INSERT OR REPLACE INTO settings(key,value) VALUES ('demo','0')");
    });
    return { ok: true };
  }
  db.close();
  for (const s of ['', '-wal', '-shm']) { try { fs.unlinkSync(DB_FILE + s); } catch { } }
  openDb(); sessions.clear();
  return { ok: true, relogin: true };
}, { admin: true });

// Export CSV
route('GET', '/api/export/:type', ({ params, query }) => {
  const [from, to] = periode(query.p || 'mois', query.from, query.to);
  const b = to + ' 23:59:59';
  const map = {
    ventes: () => all(`SELECT v.numero, v.date, c.nom client, v.mode_paiement, v.sous_total, v.remise, v.total, v.cout_revient, v.total - v.cout_revient marge, v.annulee FROM ventes v LEFT JOIN clients c ON c.id=v.client_id WHERE v.date BETWEEN ? AND ? ORDER BY v.date`, from, b),
    depenses: () => all('SELECT date, categorie, montant, mode, description FROM depenses WHERE date BETWEEN ? AND ? ORDER BY date', from, b),
    productions: () => all('SELECT p.date, pr.nom produit, p.quantite, p.cout_matieres, p.cout_charges, p.cout_total, p.cout_unitaire FROM productions p JOIN produits pr ON pr.id=p.produit_id WHERE p.date BETWEEN ? AND ? ORDER BY p.date', from, b),
    achats: () => all('SELECT a.numero, a.date, f.nom fournisseur, a.total, a.paye FROM achats a LEFT JOIN fournisseurs f ON f.id=a.fournisseur_id WHERE a.date BETWEEN ? AND ? ORDER BY a.date', from, b),
    matieres: () => all('SELECT nom, unite, stock, stock_min, prix_moyen, stock*prix_moyen valeur FROM matieres ORDER BY nom'),
    'prix-revient': () => all('SELECT id FROM produits WHERE actif=1').map(p => recetteComplete(p.id)).filter(r => r.calcul).map(r => ({
      produit: r.produit.nom, rendement: r.calcul.rendement, cout_matieres: r.calcul.cout_matieres, pertes: r.calcul.pertes, charges: r.calcul.charges,
      cout_total_lot: r.calcul.cout_total, cout_unitaire: r.calcul.cout_unitaire, prix_vente: r.calcul.prix_vente, marge_unitaire: r.calcul.marge_unitaire,
      taux_marge_pct: r.calcul.taux_marge, coefficient: r.calcul.coefficient, prix_conseille: r.calcul.prix_conseille })),
  };
  if (!map[params.type]) bad('Export inconnu');
  const rows = map[params.type]();
  const cols = rows.length ? Object.keys(rows[0]) : ['vide'];
  const esc = v => { const s = v == null ? '' : typeof v === 'number' ? String(v).replace('.', ',') : String(v); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const csv = '﻿' + [cols.join(';'), ...rows.map(r => cols.map(c => esc(r[c])).join(';'))].join('\r\n');
  return { __raw: Buffer.from(csv, 'utf8'), type: 'text/csv; charset=utf-8', filename: `mbourou-${params.type}-${from}_${to}.csv` };
});

/* ------------------------------------------------------------------ */
/* Serveur HTTP                                                        */
/* ------------------------------------------------------------------ */
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.woff2': 'font/woff2' };

function send(res, status, data, headers = {}) {
  const body = typeof data === 'string' || Buffer.isBuffer(data) ? data : JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', c => { size += c.length; if (size > 60e6) { reject(new ApiError(413, 'Requête trop volumineuse')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => { const s = Buffer.concat(chunks).toString('utf8'); if (!s) return resolve({}); try { resolve(JSON.parse(s)); } catch { reject(new ApiError(400, 'JSON invalide')); } });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const pathname = decodeURIComponent(url.pathname);
  if (pathname.startsWith('/api/')) {
    const r = routes.find(r => r.method === req.method && r.re.test(pathname));
    if (!r) return send(res, 404, { error: 'Route inconnue' });
    try {
      let user = authUser(req);
      // autorise le téléchargement via ?token= (sauvegardes, CSV)
      if (!user && url.searchParams.get('token')) { const s = sessions.get(url.searchParams.get('token')); if (s) user = s.user; }
      if (!r.public && !user) return send(res, 401, { error: 'Session expirée, reconnectez-vous' });
      if (r.admin && user.role !== 'admin') return send(res, 403, { error: 'Accès réservé à l\'administrateur' });
      const m = pathname.match(r.re); const params = {}; r.keys.forEach((k, i) => params[k] = m[i + 1]);
      const body = ['POST', 'PUT'].includes(req.method) ? await readBody(req) : {};
      const result = await r.handler({ req, params, query: Object.fromEntries(url.searchParams), body, user });
      if (result && result.__raw) return send(res, 200, result.__raw, { 'Content-Type': result.type, 'Content-Disposition': `attachment; filename="${result.filename}"` });
      return send(res, 200, result ?? { ok: true });
    } catch (e) {
      const status = e.status || 500;
      if (status === 500) console.error(e);
      return send(res, status, { error: e.message || 'Erreur serveur', manques: e.manques });
    }
  }
  // Fichiers statiques
  let file = path.normalize(path.join(PUBLIC_DIR, pathname));
  if (!file.startsWith(PUBLIC_DIR)) return send(res, 403, 'Interdit', { 'Content-Type': 'text/plain' });
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(PUBLIC_DIR, 'index.html');
  res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
});

server.listen(PORT, HOST, () => {
  console.log('\n  🥖  Mbourou — Gestion de Boulangerie  |  مخبزة مبرو');
  console.log('  ──────────────────────────────────────────────');
  console.log(`  Sur cet ordinateur :  http://localhost:${PORT}`);
  for (const ifs of Object.values(os.networkInterfaces())) for (const i of ifs || [])
    if (i.family === 'IPv4' && !i.internal) console.log(`  Sur le réseau local : http://${i.address}:${PORT}  (tablette / 2e caisse)`);
  console.log(`  Base de données     :  ${DB_FILE}`);
  console.log('  Comptes par défaut  :  admin / admin   —   caisse / 1234');
  console.log('  (Ctrl + C pour arrêter)\n');
});
module.exports = { server };
