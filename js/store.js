// Stato condiviso tra i moduli e salvataggio su localStorage.
// `state` è sempre lo stesso oggetto: per sostituirlo si usa replaceState(), così ogni
// modulo che lo importa vede subito i dati nuovi.
import { STORAGE_KEY, runMigrations, freshState } from './state.js';

export const state = {};

export const ui = {
  view: 'all',
  filter: 'open',
  search: '',
  activeLessonId: null,
  calLessonId: null,
  deleteArmed: false
};

// Set by app.js: what to do after a change (re-render) and how to push it to the cloud
const hooks = { changed: () => {}, push: () => {} };
export function setStoreHooks(h) {
  Object.assign(hooks, h);
}

function writeLocal() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) {}
}

function assignState(next) {
  if (next === state) return;
  Object.keys(state).forEach(k => { delete state[k]; });
  Object.assign(state, next);
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.lessons)) {
        if (runMigrations(parsed)) {
          parsed.updatedAt = new Date().toISOString();
          localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
        }
        assignState(parsed);
        return;
      }
    }
  } catch (e) {}
  assignState(freshState());
}

// Replaces the whole state (cloud download, merge, backup import) without touching updatedAt
export function replaceState(next) {
  assignState(next);
  writeLocal();
  hooks.changed();
}

// Records a local edit: bumps updatedAt, saves, re-renders and schedules the cloud upload
export function saveState(skipCloud = false) {
  delete state.isFreshDefault;
  state.updatedAt = new Date().toISOString();
  writeLocal();
  hooks.changed();
  if (!skipCloud) hooks.push();
}
