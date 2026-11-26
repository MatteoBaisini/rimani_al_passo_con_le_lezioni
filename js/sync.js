// Sincronizzazione con Supabase (vedi supabase_setup.sql).
//
// - Concorrenza: ogni caricamento dichiara la versione della riga cloud (updated_at) su cui
//   ha fatto il merge. Se nel frattempo un altro dispositivo ha salvato, il server rifiuta
//   e qui si riscarica, si rifà il merge e si riprova: nessuna modifica viene sovrascritta.
// - Scadenza: un dispositivo che non si sincronizza da SYNC_EXPIRY_DAYS giorni viene
//   scollegato (la SYNC_KEY locale viene rimossa) e va ricollegato reinserendola.
import { runMigrations, mergeStates } from './state.js';
import { state, replaceState } from './store.js';
import { toast } from './helpers.js';

const SYNC_CFG_KEY = 'recupero_lezioni_sync_cfg_v1';
export const MIN_SYNC_KEY_LEN = 24; // must match supabase_setup.sql
export const SYNC_EXPIRY_DAYS = 30;
const MAX_SYNC_ATTEMPTS = 4;

// ---- Device config (localStorage only) -------------------------------------
// { url, key, syncKey, lastSyncAt?, expired?: { syncKey, lastSyncAt, at }, repair?: { lastSyncAt } }
function readCfg() {
  try {
    const c = JSON.parse(localStorage.getItem(SYNC_CFG_KEY) || '{}');
    return c && typeof c === 'object' ? c : {};
  } catch (e) {
    return {};
  }
}

function writeCfg(c) {
  try { localStorage.setItem(SYNC_CFG_KEY, JSON.stringify(c)); } catch (e) {}
}

// Accept URLs pasted with a trailing slash or the /rest/v1 suffix
export function cleanSupabaseUrl(raw) {
  return String(raw || '').trim().replace(/\/+$/, '').replace(/\/rest\/v1$/i, '').replace(/\/+$/, '');
}

// The SYNC_KEY only ever comes from this device's storage, never from config.js (public).
export function getSyncConfig() {
  const local = readCfg();
  const fileCfg = window.APP_CONFIG || {};
  return {
    url: cleanSupabaseUrl(local.url || fileCfg.SUPABASE_URL),
    key: (local.key || fileCfg.SUPABASE_ANON_KEY || '').trim(),
    syncKey: (local.syncKey || '').trim()
  };
}

export function saveSyncConfig({ url, key, syncKey }) {
  const prev = readCfg();
  const next = { url, key, syncKey };
  if (syncKey && syncKey === prev.syncKey) {
    if (prev.lastSyncAt) next.lastSyncAt = prev.lastSyncAt;
    if (prev.repair) next.repair = prev.repair;
  }
  if (prev.expired) {
    if (!syncKey) {
      next.expired = prev.expired; // still unpaired
    } else if (syncKey === prev.expired.syncKey) {
      // Re-paired to the same cloud: the first merge drops lessons deleted elsewhere meanwhile
      next.repair = { lastSyncAt: prev.expired.lastSyncAt };
    }
  }
  writeCfg(next);
}

export function isDeviceExpired() {
  const c = readCfg();
  return !c.syncKey && Boolean(c.expired);
}

// Unpairs this device if its last successful sync is older than SYNC_EXPIRY_DAYS.
// Returns true when it has just been unpaired.
export function checkSyncExpiry() {
  const c = readCfg();
  if (!c.syncKey) return false;
  const last = Date.parse(c.lastSyncAt || '') || 0;
  if (!last) {
    // Paired before this feature existed (or never synced yet): the clock starts now
    c.lastSyncAt = new Date().toISOString();
    writeCfg(c);
    return false;
  }
  if (Date.now() - last <= SYNC_EXPIRY_DAYS * 86400000) return false;
  c.expired = { syncKey: c.syncKey, lastSyncAt: c.lastSyncAt, at: new Date().toISOString() };
  c.syncKey = '';
  delete c.lastSyncAt;
  delete c.repair;
  writeCfg(c);
  return true;
}

function markSynced() {
  const c = readCfg();
  c.lastSyncAt = new Date().toISOString();
  delete c.repair;
  delete c.expired;
  writeCfg(c);
}

export function syncConfigError(cfg) {
  if (!cfg.url || !cfg.key || !cfg.syncKey) return 'Credenziali non configurate (modalità solo locale)';
  if (!/^https?:\/\/[^/\s]+$/i.test(cfg.url)) return 'URL Supabase non valido: usa il formato https://xxxx.supabase.co';
  if (cfg.syncKey.length < MIN_SYNC_KEY_LEN) return `SYNC_KEY troppo corta: servono almeno ${MIN_SYNC_KEY_LEN} caratteri (usa "Genera chiave")`;
  return '';
}

// ---- Status UI ------------------------------------------------------------------
let lastSyncDiag = '';

export function setSyncDiag(msg, isErr = false) {
  lastSyncDiag = msg || '';
  const el = document.getElementById('syncDiag');
  if (!el) return;
  if (!lastSyncDiag) {
    el.classList.add('hidden');
    el.textContent = '';
    return;
  }
  el.classList.remove('hidden');
  el.className = `p-2.5 rounded-lg border text-[11.5px] font-mono break-all ${
    isErr
      ? 'border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300'
      : 'border-black/[0.07] dark:border-white/[0.07] bg-porcelain dark:bg-obsidian text-[#52525B] dark:text-[#A1A1AA]'
  }`;
  el.textContent = lastSyncDiag;
}

export function setSyncUI(status, text) {
  const dot = document.getElementById('syncDot');
  const label = document.getElementById('syncLabel');
  const colors = {
    ok: 'bg-emerald-500',
    busy: 'bg-amber-500 animate-pulse',
    err: 'bg-red-500',
    '': 'bg-[#A1A1AA]'
  };
  dot.className = `w-2 h-2 rounded-full shrink-0 ${colors[status] || colors['']}`;
  label.textContent = text;
}

const EXPIRED_MSG = `Dispositivo scollegato: non si sincronizzava da più di ${SYNC_EXPIRY_DAYS} giorni. Reinserisci la SYNC_KEY per ricollegarlo (i dati locali vengono uniti a quelli del cloud).`;

function showExpired(toastToo) {
  setSyncUI('err', 'Scollegato');
  setSyncDiag(EXPIRED_MSG, true);
  if (toastToo) toast('Dispositivo scollegato: reinserisci la SYNC_KEY');
}

// ---- Supabase transport ---------------------------------------------------------
function describeSbError(status, text) {
  let info = {};
  try { info = JSON.parse(text); } catch (e) {}
  const msg = String(info.message || info.msg || info.error || text || '').slice(0, 160);
  if (/Invalid sync_key/i.test(msg)) return `SYNC_KEY rifiutata dal server: deve avere almeno ${MIN_SYNC_KEY_LEN} caratteri`;
  if (status === 404 || info.code === 'PGRST202') return `Funzione RPC non trovata o non aggiornata (HTTP ${status}): riesegui supabase_setup.sql nel SQL Editor di Supabase`;
  if (/permission denied/i.test(msg)) return `Permesso negato (HTTP ${status}): riesegui supabase_setup.sql · ${msg}`;
  if (status === 401 || status === 403) return `Chiave API rifiutata (HTTP ${status}): controlla la Anon/Publishable key in Project Settings → API · ${msg}`;
  return `HTTP ${status} · ${msg}`;
}

async function sbRpc(cfg, fn, body) {
  const headers = { 'apikey': cfg.key, 'Content-Type': 'application/json' };
  // Legacy anon keys are JWTs and also go in Authorization. New publishable keys
  // (sb_publishable_...) are not JWTs: sending them as Bearer makes the request fail.
  if (cfg.key.startsWith('eyJ')) headers['Authorization'] = `Bearer ${cfg.key}`;
  const payload = JSON.stringify(body); // snapshot now, before any await
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  let res;
  try {
    res = await fetch(`${cfg.url}/rest/v1/rpc/${fn}`, { method: 'POST', headers, body: payload, signal: ctrl.signal });
  } catch (e) {
    throw new Error(e.name === 'AbortError'
      ? 'Timeout: Supabase non risponde (progetto in pausa?)'
      : 'Server non raggiungibile: sei offline, l\'URL è sbagliato o il progetto Supabase è in pausa');
  } finally {
    clearTimeout(timer);
  }
  const text = await res.text();
  if (!res.ok) throw new Error(describeSbError(res.status, text));
  return text ? JSON.parse(text) : null;
}

// Returns the cloud payload (null if missing/invalid) and the row version (its updated_at,
// kept as the raw string so that it round-trips to the server exactly).
async function download(cfg) {
  const rows = await sbRpc(cfg, 'get_study_state', { p_sync_key: cfg.syncKey });
  const row = Array.isArray(rows) && rows[0] ? rows[0] : null;
  const payload = row && row.payload;
  return {
    remote: payload && Array.isArray(payload.lessons) ? payload : null,
    version: row ? row.updated_at : null
  };
}

// expectedVersion: the row version the upload is based on (null = the row must not exist yet).
// force: overwrite regardless (explicit "Invia (forza)"). Returns false on a conflict.
async function upload(cfg, expectedVersion, force = false) {
  const res = await sbRpc(cfg, 'upsert_study_state', {
    p_sync_key: cfg.syncKey,
    p_payload: state,
    p_updated_at: state.updatedAt || new Date().toISOString(),
    p_expected_updated_at: force ? null : expectedVersion,
    p_check: !force
  });
  return res !== false;
}

// ---- Sync orchestration -------------------------------------------------
// mode: 'merge' (default: download, merge, upload if needed)
//       'pull'  (overwrite this device with the cloud)
//       'push'  (overwrite the cloud with this device)
let syncInFlight = null;
let syncQueued = false;
let syncTimer = null;

export function scheduleCloudPush() {
  if (syncConfigError(getSyncConfig())) return;
  clearTimeout(syncTimer);
  setSyncUI('busy', 'Salvataggio...');
  syncTimer = setTimeout(() => syncWithSupabase({ dirty: true }), 800);
}

export async function syncWithSupabase({ silent = true, mode = 'merge', dirty = false } = {}) {
  if (syncInFlight) {
    if (mode === 'merge') {
      // A local edit during a running sync must not be lost: run once more afterwards
      if (dirty) syncQueued = true;
      return syncInFlight;
    }
    while (syncInFlight) await syncInFlight;
  }
  syncInFlight = runSync(silent, mode).finally(() => {
    syncInFlight = null;
    if (syncQueued) {
      syncQueued = false;
      syncWithSupabase({ silent: true });
    }
  });
  return syncInFlight;
}

// Shows the right status at startup without contacting the server
export function initSyncStatus() {
  const justExpired = checkSyncExpiry();
  if (justExpired || isDeviceExpired()) showExpired(justExpired);
}

async function runSync(silent, mode) {
  if (checkSyncExpiry() || isDeviceExpired()) {
    showExpired(!silent);
    return;
  }
  const cfg = getSyncConfig();
  const cfgErr = syncConfigError(cfg);
  if (cfgErr) {
    const unconfigured = !cfg.url || !cfg.key || !cfg.syncKey;
    setSyncUI(unconfigured ? '' : 'err', unconfigured ? 'Solo locale' : 'Config. errata');
    setSyncDiag(cfgErr, !unconfigured);
    if (!silent) toast(unconfigured ? 'Inserisci URL, chiave API e SYNC_KEY' : cfgErr);
    return;
  }

  const time = () => new Date().toLocaleTimeString('it-IT');
  const done = (diag, msg) => {
    markSynced();
    setSyncUI('ok', 'Sincronizzato');
    setSyncDiag(`OK · ${diag} alle ${time()} (${state.lessons.length} lezioni)`);
    if (!silent) toast(msg);
  };

  setSyncUI('busy', 'Sincronizzazione...');
  try {
    if (mode === 'push') {
      delete state.isFreshDefault;
      if (!state.updatedAt) state.updatedAt = new Date().toISOString();
      replaceState(state);
      await upload(cfg, null, true);
      done('inviato', 'Dati del dispositivo inviati al cloud');
      return;
    }

    const repair = readCfg().repair;
    const prunedBefore = repair ? (Date.parse(repair.lastSyncAt) || 0) : 0;

    for (let attempt = 1; attempt <= MAX_SYNC_ATTEMPTS; attempt++) {
      const { remote, version } = await download(cfg);

      if (!remote) {
        if (mode === 'pull') {
          setSyncUI('ok', 'Cloud vuoto');
          setSyncDiag('Nessun dato sul cloud per questa SYNC_KEY', true);
          if (!silent) toast('Nessun dato sul cloud per questa SYNC_KEY');
          return;
        }
        // First device for this key: the cloud starts from this device's data
        delete state.isFreshDefault;
        if (!state.updatedAt) state.updatedAt = new Date().toISOString();
        replaceState(state);
        if (!(await upload(cfg, version))) continue; // another device got there first
        done('primo invio', 'Dati salvati sul cloud');
        return;
      }

      if (mode === 'pull' || state.isFreshDefault) {
        const next = JSON.parse(JSON.stringify(remote));
        const migrated = runMigrations(next);
        delete next.isFreshDefault;
        if (!next.updatedAt) next.updatedAt = new Date().toISOString();
        replaceState(next);
        // On a conflict the cloud already has newer data: the next sync merges it
        if (migrated) await upload(cfg, version);
        done('scaricato', 'Dati scaricati dal cloud');
        return;
      }

      const { merged, changedVsLocal, changedVsRemote } = mergeStates(state, remote, { prunedBefore });
      if (changedVsLocal) replaceState(merged);
      // Conflict: someone saved after our download. Download again and merge on top of it.
      if (changedVsRemote && !(await upload(cfg, version))) continue;
      done(attempt > 1 ? `sincronizzato (${attempt} tentativi)` : 'sincronizzato',
        changedVsLocal && changedVsRemote ? 'Sincronizzato e unito'
          : changedVsLocal ? 'Aggiornato dal cloud'
          : changedVsRemote ? 'Aggiornato sul cloud'
          : 'Già aggiornato');
      return;
    }
    throw new Error('Conflitto: un altro dispositivo continua a salvare, riprova tra poco');
  } catch (err) {
    console.error(err);
    setSyncUI('err', 'Errore sync');
    setSyncDiag(`Errore · ${err.message || err}`, true);
    if (!silent) toast('Errore sync: dettagli nella finestra Sync');
  }
}
