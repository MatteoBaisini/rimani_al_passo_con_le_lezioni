// Stato dell'app: costanti, validazione, migrazioni e merge tra dispositivi.
// Logica pura (niente DOM, niente localStorage), così è testabile da tests.html.
import { DEFAULT_LESSONS, SEED_VERSION } from './data.js';

export const STORAGE_KEY = 'recupero_lezioni_state_v2';

// Validation for data loaded from storage / cloud / backup (see sanitizeState)
const SAFE_ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;
export const LESSON_TYPES = ['Lezione', 'Esercitazione', 'Laboratorio'];

export const STAGES = [
  { id: 0, label: 'Da vedere' },
  { id: 1, label: 'Iniziata' },
  { id: 2, label: 'Completata' }
];
export const DONE_STAGE = STAGES.length - 1;

// One green ramp for progress, so it never clashes with course colors (same hues as stageRingSVG)
export const STAGE_COLORS = ['#A1A1AA', '#6EC9A4', '#047857'];

export const SPEED_OPTIONS = [1, 1.25, 1.5, 1.75, 2];

// Deleted lessons leave a tombstone for this long, so other devices learn about the deletion.
export const TOMBSTONE_DAYS = 90;

// Flags of the one-off migrations that predate the seed mechanism (kept so that a stale
// cached client never re-runs them).
const LEGACY_FLAGS = ['effectiveDurationMigrated', 'leaDiaryMigrated', 'analisiNorisMigrated', 'analisiEseMigrated', 'stagesV2Migrated'];

export function normalizeUrl(raw) {
  const s = String(raw || '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s)) return '';
  return `https://${s}`;
}

// A default lesson as stored in the state (without the `since` seed marker)
function seedCopy(ref) {
  const { since, ...lesson } = ref;
  return { ...lesson };
}

export function freshState() {
  const s = {
    lessons: DEFAULT_LESSONS.map(seedCopy),
    deletedLessons: {},
    speed: 1.25,
    dailyHours: 2.0,
    theme: 'light',
    seedVersion: SEED_VERSION,
    isFreshDefault: true,
    updatedAt: null
  };
  LEGACY_FLAGS.forEach(f => { s[f] = true; });
  return s;
}

// =========================================================================
// Validation
// =========================================================================
// Ids and dates are interpolated into HTML/onclick attributes, so anything coming
// from localStorage, the cloud or an imported backup is validated before use.
export function sanitizeState(targetState) {
  if (!targetState || !Array.isArray(targetState.lessons)) return false;
  const before = JSON.stringify(targetState);
  targetState.lessons = targetState.lessons.filter(l =>
    l && SAFE_ID_RE.test(String(l.id)) && ISO_DATE_RE.test(String(l.date))
  );
  targetState.lessons.forEach(l => {
    l.courseId = String(l.courseId || '');
    if (!LESSON_TYPES.includes(l.type)) l.type = 'Lezione';
    const st = Number(l.stage);
    l.stage = Number.isInteger(st) && st >= 0 && st <= 3 ? st : 0;
    const dur = Number(l.duration);
    l.duration = Number.isFinite(dur) && dur >= 15 && dur <= 600 ? dur : 90;
    if (!ISO_DATETIME_RE.test(String(l.scheduled || ''))) l.scheduled = '';
    l.topic = String(l.topic || '');
    l.notes = String(l.notes || '');
    l.url = normalizeUrl(l.url);
    if (l.updatedAt && !Date.parse(l.updatedAt)) delete l.updatedAt;
  });
  if (!targetState.deletedLessons || typeof targetState.deletedLessons !== 'object' || Array.isArray(targetState.deletedLessons)) {
    targetState.deletedLessons = {};
  }
  if (!SPEED_OPTIONS.includes(Number(targetState.speed))) targetState.speed = 1.25;
  else targetState.speed = Number(targetState.speed);
  const dh = Number(targetState.dailyHours);
  targetState.dailyHours = Number.isFinite(dh) ? Math.max(0.5, Math.min(10, dh)) : 2.0;
  if (targetState.theme !== 'dark') targetState.theme = 'light';
  if ('seedVersion' in targetState && !(Number.isInteger(targetState.seedVersion) && targetState.seedVersion >= 1)) {
    delete targetState.seedVersion;
  }
  return JSON.stringify(targetState) !== before;
}

// =========================================================================
// Legacy one-off migrations (states saved before the seed mechanism).
// They only run on states without `seedVersion`, each guarded by its own flag.
// Do not add new ones: new lessons go in data.js with `since` (see there).
// =========================================================================
function migrateEffectiveDurations(targetState) {
  if (targetState.effectiveDurationMigrated) return false;
  targetState.lessons.forEach(l => {
    if (l.duration === 180) l.duration = 135;
    else if (l.duration === 120) l.duration = 90;
  });
  targetState.effectiveDurationMigrated = true;
  return true;
}

function migrateLeaDiary(targetState) {
  if (targetState.leaDiaryMigrated) return false;
  const defaultsById = new Map(DEFAULT_LESSONS.filter(l => l.courseId === 'LEA').map(l => [l.id, l]));
  const placeholders = new Set(['', 'Settimana scorsa', 'Settimana corrente']);
  targetState.lessons.forEach(l => {
    if (l.courseId !== 'LEA') return;
    if (l.id === 'lea-2026-10-10' && !targetState.lessons.some(x => x.id === 'lea-2026-10-09')) {
      l.id = 'lea-2026-10-09';
      l.date = '2026-10-09';
    }
    const ref = defaultsById.get(l.id);
    if (!ref) return;
    l.type = ref.type;
    if (placeholders.has((l.topic || '').trim())) {
      l.topic = ref.topic;
    }
  });
  targetState.leaDiaryMigrated = true;
  return true;
}

// Replaces the old Analisi II placeholders (generated from Piovano's timetable) with the
// Noris theory lessons and the Migliavacca exercise blocks. Untouched placeholders that are
// not Noris lessons are tombstoned; edited ones are kept. updatedAt is not bumped, so real
// progress still wins in the merge.
function migrateAnalisiNoris(targetState) {
  if (targetState.analisiNorisMigrated) return false;
  const defaults = DEFAULT_LESSONS.filter(l => l.courseId === 'ANALISI2');
  const defaultsById = new Map(defaults.map(l => [l.id, l]));
  const nowIso = new Date().toISOString();
  targetState.lessons = targetState.lessons.filter(l => {
    if (l.courseId !== 'ANALISI2' || defaultsById.has(l.id)) return true;
    const untouched = !l.stage && !(l.topic || '').trim() && !(l.notes || '').trim() && !l.scheduled && !l.url;
    if (untouched) targetState.deletedLessons[l.id] = nowIso;
    return !untouched;
  });
  targetState.lessons.forEach(l => {
    const ref = defaultsById.get(l.id);
    if (!ref) return;
    if (!(l.topic || '').trim()) {
      l.topic = ref.topic;
      l.duration = ref.duration;
      l.type = ref.type;
    }
    if (!(l.notes || '').trim()) l.notes = ref.notes;
  });
  defaults.forEach(ref => {
    delete targetState.deletedLessons[ref.id];
    if (!targetState.lessons.some(l => l.id === ref.id)) targetState.lessons.push(seedCopy(ref));
  });
  targetState.analisiNorisMigrated = true;
  return true;
}

// Adds the Migliavacca exercise blocks on devices that already ran migrateAnalisiNoris.
function migrateAnalisiEsercitazioni(targetState) {
  if (targetState.analisiEseMigrated) return false;
  DEFAULT_LESSONS
    .filter(l => l.courseId === 'ANALISI2' && l.type === 'Esercitazione')
    .forEach(ref => {
      delete targetState.deletedLessons[ref.id];
      if (!targetState.lessons.some(l => l.id === ref.id)) targetState.lessons.push(seedCopy(ref));
    });
  targetState.analisiEseMigrated = true;
  return true;
}

// =========================================================================
// Seeds: brings a state up to SEED_VERSION (see the comment in data.js).
// =========================================================================
export function applySeeds(targetState, defaults = DEFAULT_LESSONS, version = SEED_VERSION) {
  let changed = false;
  if (!Number.isInteger(targetState.seedVersion)) {
    // Saved before the seed mechanism: finish the old migrations, then it is at version 1
    migrateEffectiveDurations(targetState);
    migrateLeaDiary(targetState);
    migrateAnalisiNoris(targetState);
    migrateAnalisiEsercitazioni(targetState);
    targetState.seedVersion = 1;
    changed = true;
  }
  if (targetState.seedVersion >= version) return changed;

  const byId = new Map(targetState.lessons.map(l => [l.id, l]));
  defaults
    .filter(ref => (ref.since || 1) > targetState.seedVersion)
    .forEach(ref => {
      const l = byId.get(ref.id);
      if (!l) {
        // A tombstone means it was deleted on purpose (possibly on another device)
        if (!targetState.deletedLessons[ref.id]) targetState.lessons.push(seedCopy(ref));
        return;
      }
      if (!(l.topic || '').trim()) {
        l.topic = ref.topic;
        l.type = ref.type;
        l.duration = ref.duration;
      }
      if (!(l.notes || '').trim()) l.notes = ref.notes || '';
    });
  targetState.seedVersion = version;
  return true;
}

// Old 4-step flow (Da vedere / Vista / Appunti OK / Completata) -> 3 steps
// (Da vedere / Iniziata / Completata): 1,2 -> 1 and 3 -> 2. Once migrated, any stray
// old value (e.g. pushed by a stale cached client) is clamped to Completata.
function migrateStages(targetState) {
  let changed = false;
  if (!targetState.stagesV2Migrated) {
    targetState.lessons.forEach(l => {
      l.stage = l.stage >= 3 ? 2 : (l.stage >= 1 ? 1 : 0);
    });
    targetState.stagesV2Migrated = true;
    return true;
  }
  targetState.lessons.forEach(l => {
    if (l.stage > DONE_STAGE) { l.stage = DONE_STAGE; changed = true; }
  });
  return changed;
}

export function runMigrations(targetState) {
  if (!targetState || !Array.isArray(targetState.lessons)) return false;
  const m0 = sanitizeState(targetState);
  const m1 = applySeeds(targetState);
  const m2 = migrateStages(targetState);
  return m0 || m1 || m2;
}

// =========================================================================
// Merge between devices
// =========================================================================
// prunedBefore (ms, optional): this device was in sync with the cloud at that time.
// A local lesson that the cloud no longer has and that was not touched since then was
// deleted elsewhere, even if its tombstone has already expired: drop it instead of
// resurrecting it. Used when a device is re-paired after a long absence.
export function mergeStates(localState, remoteState, { prunedBefore = 0 } = {}) {
  const loc = JSON.parse(JSON.stringify(localState));
  const rem = JSON.parse(JSON.stringify(remoteState));
  runMigrations(loc);
  runMigrations(rem);

  const locGlobalTs = Date.parse(loc.updatedAt || 0) || 0;
  const remGlobalTs = Date.parse(rem.updatedAt || 0) || 0;
  const cutoff = Date.now() - TOMBSTONE_DAYS * 86400000;

  const deletedLessons = {};
  for (const src of [loc.deletedLessons || {}, rem.deletedLessons || {}]) {
    for (const [id, ts] of Object.entries(src)) {
      const ms = Date.parse(ts || 0) || 0;
      if (ms < cutoff) continue;
      if (!deletedLessons[id] || ms > (Date.parse(deletedLessons[id]) || 0)) {
        deletedLessons[id] = ts;
      }
    }
  }

  const locMap = new Map((loc.lessons || []).map(l => [l.id, l]));
  const remMap = new Map((rem.lessons || []).map(l => [l.id, l]));
  const allIds = new Set([...locMap.keys(), ...remMap.keys()]);
  const mergedLessons = [];

  // A lesson without its own updatedAt has never been edited (e.g. a built-in default):
  // it must lose against any edited copy, never borrow the state's global timestamp,
  // otherwise a fresh device would overwrite real progress with pristine defaults.
  // (Explicit check: Date.parse(0) is year 2000 in Chrome but NaN in Safari.)
  const lessonTs = l => (l.updatedAt && Date.parse(l.updatedAt)) || 0;

  for (const id of allIds) {
    const lItem = locMap.get(id);
    const rItem = remMap.get(id);
    const delTs = deletedLessons[id] ? (Date.parse(deletedLessons[id]) || 0) : 0;

    if (lItem && rItem) {
      const lTs = lessonTs(lItem);
      const rTs = lessonTs(rItem);
      const winner = rTs > lTs ? rItem : lItem;
      const winTs = Math.max(lTs, rTs);
      if (delTs > winTs) continue;
      mergedLessons.push(winner);
    } else if (lItem) {
      const lTs = lessonTs(lItem);
      if (delTs > lTs) continue;
      if (prunedBefore && lTs <= prunedBefore) continue;
      mergedLessons.push(lItem);
    } else if (rItem) {
      const rTs = lessonTs(rItem);
      if (delTs > rTs) continue;
      mergedLessons.push(rItem);
    }
  }

  const settingsSrc = remGlobalTs > locGlobalTs ? rem : loc;
  const merged = {
    lessons: mergedLessons,
    deletedLessons,
    speed: settingsSrc.speed ?? 1.25,
    dailyHours: settingsSrc.dailyHours ?? 2.0,
    theme: settingsSrc.theme ?? 'light',
    seedVersion: Math.max(loc.seedVersion, rem.seedVersion),
    updatedAt: new Date(Math.max(locGlobalTs, remGlobalTs)).toISOString()
  };
  LEGACY_FLAGS.forEach(f => { merged[f] = true; });

  const sig = s => JSON.stringify({
    lessons: [...(s.lessons || [])].sort((a, b) => a.id.localeCompare(b.id)),
    deletedLessons: s.deletedLessons || {},
    speed: s.speed,
    dailyHours: s.dailyHours,
    theme: s.theme
  });

  const changedVsLocal = sig(merged) !== sig(localState);
  const changedVsRemote = sig(merged) !== sig(remoteState);
  if (changedVsLocal && changedVsRemote) {
    merged.updatedAt = new Date().toISOString();
  }
  return { merged, changedVsLocal, changedVsRemote };
}
