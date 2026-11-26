// Avvio dell'app: carica lo stato, collega i moduli, registra gli ascoltatori globali.
import { loadState, setStoreHooks, ui } from './store.js';
import { applyTheme } from './helpers.js';
import { render, renderLessonList } from './render.js';
import { scheduleCloudPush, syncWithSupabase, initSyncStatus } from './sync.js';
import { closeAllOverlays, openAddModal } from './ui.js';

loadState();
setStoreHooks({
  changed: () => { applyTheme(); render(); },
  push: scheduleCloudPush
});

document.getElementById('searchInput').addEventListener('input', e => {
  ui.search = e.target.value.trim();
  renderLessonList();
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeAllOverlays();
  const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
  if (e.key.toLowerCase() === 'n' && !typing) {
    e.preventDefault();
    openAddModal();
  }
  if (e.key === '/' && !typing) {
    e.preventDefault();
    document.getElementById('searchInput').focus();
  }
});

window.addEventListener('focus', () => syncWithSupabase());
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') syncWithSupabase();
});

applyTheme();
render();
initSyncStatus();
syncWithSupabase();
