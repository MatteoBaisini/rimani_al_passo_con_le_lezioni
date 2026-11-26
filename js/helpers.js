// Formattazione, piccoli helper di dominio e di interfaccia (toast, tema, icone di stato).
import { COURSES } from './data.js';
import { state } from './store.js';

export function getCourse(id) {
  return COURSES.find(c => c.id === id) || COURSES[0];
}

export function effMinutes(baseMins) {
  return Math.round((Number(baseMins) || 90) / (Number(state.speed) || 1.25));
}

export function formatHours(mins) {
  const m = Math.max(0, Math.round(mins));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  return r === 0 ? `${h}h` : `${h}h ${String(r).padStart(2, '0')}m`;
}

export function formatDateReadable(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  const days = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];
  const months = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  return `${days[dt.getDay()]} ${String(d).padStart(2, '0')} ${months[m - 1]}`;
}

export function formatDateShort(iso) {
  if (!iso) return '—';
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
}

export function formatScheduled(str) {
  if (!str) return '';
  const [date, time] = str.split('T');
  return `${formatDateShort(date)} ${time || ''}`.trim();
}

export function toIsoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function parseIsoLocal(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}


export function escapeHtml(str) {
  return String(str || '').replace(/[&<>"']/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[s]));
}

let toastTimer = null;

export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.remove('opacity-0', 'translate-y-2');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    el.classList.add('opacity-0', 'translate-y-2');
  }, 2600);
}

export function applyTheme() {
  const isDark = state.theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  document.getElementById('themeColorMeta').setAttribute('content', isDark ? '#0B0B0E' : '#F6F6F4');
  document.getElementById('themeBtn').innerHTML = isDark
    ? '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"/></svg>'
    : '<svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"/></svg>';
}

export function stageRingSVG(stage) {
  if (stage === 0) {
    return `<svg class="w-[18px] h-[18px] text-[#A1A1AA] dark:text-[#52525B]" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8.5" stroke-dasharray="3.2 2.5" />
    </svg>`;
  }
  if (stage === 1) {
    return `<svg class="w-[18px] h-[18px] text-[#6EC9A4]" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.75" />
      <path d="M12 3.5A8.5 8.5 0 0 1 12 20.5Z" fill="currentColor" />
    </svg>`;
  }
  return `<svg class="w-[18px] h-[18px] text-[#047857] dark:text-[#10B981]" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="8.5" fill="currentColor" />
    <path d="M8.5 12.2l2.3 2.3 4.7-4.8" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>`;
}
