// Interazioni: navigazione, modali, dettaglio lezione, Calendar, "Ho X min", Sync e backup.
// Le funzioni chiamate dagli onclick="..." dell'HTML sono esposte su window in fondo al file.
import { COURSES } from './data.js';
import { STAGES, DONE_STAGE, normalizeUrl, runMigrations } from './state.js';
import { state, ui, saveState, replaceState } from './store.js';
import {
  getCourse, effMinutes, formatHours, formatDateReadable, formatDateShort,
  toIsoDate, escapeHtml, toast, applyTheme
} from './helpers.js';
import { render } from './render.js';
import {
  cleanSupabaseUrl, getSyncConfig, saveSyncConfig, syncConfigError,
  setSyncDiag, syncWithSupabase
} from './sync.js';

// =========================================================================
// 5. INTERACTIONS & NAVIGATION
// =========================================================================
function setView(view) {
  ui.view = view;
  closeMobileSidebar();
  render();
}

function setFilter(filter) {
  ui.filter = filter;
  render();
}

function setSpeed(sp) {
  state.speed = sp;
  saveState();
}

function stepDailyHours(delta) {
  const next = Math.max(0.5, Math.min(10, (Number(state.dailyHours) || 2) + delta));
  state.dailyHours = Math.round(next * 10) / 10;
  saveState();
}

function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme();
  saveState();
}

function cycleStage(ev, id) {
  ev.stopPropagation();
  const l = state.lessons.find(x => x.id === id);
  if (!l) return;
  // Never wrap Completata -> Da vedere on a single click: open the detail instead
  if (l.stage >= DONE_STAGE) {
    openDrawer(id);
    return;
  }
  l.stage += 1;
  l.updatedAt = new Date().toISOString();
  saveState();
  toast(`Stato: ${STAGES[l.stage].label}`);
}

function openMobileSidebar() {
  document.getElementById('sidebar').classList.remove('-translate-x-full');
  document.getElementById('overlay').classList.remove('hidden');
}

function closeMobileSidebar() {
  document.getElementById('sidebar').classList.add('-translate-x-full');
}

function closeAllOverlays() {
  document.getElementById('overlay').classList.add('hidden');
  const drawer = document.getElementById('drawer');
  drawer.classList.add('translate-x-full');
  drawer.setAttribute('inert', '');
  drawer.setAttribute('aria-hidden', 'true');
  ['timetableModal', 'addModal', 'calModal', 'smartModal', 'syncModal'].forEach(id => {
    const el = document.getElementById(id);
    el.classList.add('hidden');
    el.classList.remove('flex');
  });
  closeMobileSidebar();
  ui.deleteArmed = false;
}

function openModal(id) {
  closeAllOverlays();
  document.getElementById('overlay').classList.remove('hidden');
  const el = document.getElementById(id);
  el.classList.remove('hidden');
  el.classList.add('flex');
}

// =========================================================================
// 6. INTERACTIVE POLIMI TIMETABLE MODAL
// =========================================================================
function openTimetableModal() {
  const days = [
    { dow: 1, name: 'Lunedì' },
    { dow: 2, name: 'Martedì' },
    { dow: 3, name: 'Mercoledì' },
    { dow: 4, name: 'Giovedì' },
    { dow: 5, name: 'Venerdì' }
  ];

  document.getElementById('timetableGrid').innerHTML = days.map(day => {
    const slots = [];
    COURSES.forEach(c => {
      c.schedule.filter(s => s.dow === day.dow).forEach(s => {
        slots.push({ course: c, ...s });
      });
    });
    slots.sort((a, b) => a.start.localeCompare(b.start));

    return `
      <div class="rounded-xl border border-black/[0.07] dark:border-white/[0.07] bg-porcelain/70 dark:bg-obsidian/50 p-3 flex flex-col gap-2.5">
        <div class="text-[12px] font-semibold tracking-tight text-[#52525B] dark:text-[#A1A1AA] pb-1.5 border-b border-black/[0.06] dark:border-white/[0.06]">
          ${day.name}
        </div>
        ${slots.length === 0 ? `<div class="text-[11.5px] text-[#8E8E93] py-4 text-center">Nessuna lezione</div>` : slots.map(s => `
          <div class="rounded-lg bg-white dark:bg-cardDark border border-black/[0.07] dark:border-white/[0.07] p-2.5 space-y-2 shadow-sm">
            <div class="flex items-center justify-between gap-1.5">
              <span class="inline-flex items-center gap-1.5 text-[11.5px] font-semibold" style="color:${s.course.color}">
                <span class="w-2 h-2 rounded-full" style="background:${s.course.color}"></span>
                ${s.course.name}
              </span>
              <span class="text-[10.5px] text-[#8E8E93]">${s.room}</span>
            </div>
            <div class="text-[11.5px] tabular-nums text-[#52525B] dark:text-[#A1A1AA]">
              ${s.start}–${s.end}
              <span class="text-[#8E8E93]">· eff. ${formatHours(s.duration)}</span>
            </div>
            <button onclick="addMissedFromSlot('${s.course.id}', ${s.dow}, ${s.duration}, '${s.type}')"
              class="w-full py-1 rounded-md border border-black/[0.08] dark:border-white/[0.08] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[11px] font-medium transition">
              + Segna persa
            </button>
          </div>
        `).join('')}
      </div>
    `;
  }).join('');

  openModal('timetableModal');
}

function getMostRecentWeekdayIso(targetDow) {
  const d = new Date();
  const diff = (d.getDay() - targetDow + 7) % 7;
  d.setDate(d.getDate() - diff);
  return toIsoDate(d);
}

function addMissedFromSlot(courseId, dow, duration, type) {
  openAddModal({
    courseId,
    date: getMostRecentWeekdayIso(dow),
    duration,
    type
  });
}

// =========================================================================
// 8. DETAIL DRAWER
// =========================================================================
function openDrawer(id) {
  const l = state.lessons.find(x => x.id === id);
  if (!l) return;
  ui.activeLessonId = id;
  ui.deleteArmed = false;
  const c = getCourse(l.courseId);

  document.getElementById('drawerHeading').innerHTML = `
    <span class="w-2.5 h-2.5 rounded-full shrink-0" style="background:${c.color}"></span>
    <span>${c.name}</span>
    <span class="text-[#8E8E93] font-normal">·</span>
    <span class="text-[13px] font-medium tabular-nums text-[#52525B] dark:text-[#A1A1AA]">${formatDateReadable(l.date)}</span>
  `;

  document.getElementById('drawerBody').innerHTML = `
    <div>
      <label class="block text-[11.5px] font-medium text-[#71717A] dark:text-[#A1A1AA] mb-1.5">Stato avanzamento</label>
      <div class="grid grid-cols-3 gap-1 p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.06]">
        ${STAGES.map(s => `
          <button type="button" data-set-stage="${s.id}" data-active="${l.stage === s.id ? '1' : '0'}" onclick="selectDrawerStage(${s.id})"
            class="py-1.5 rounded-lg text-[11.5px] font-medium transition ${
              l.stage === s.id
                ? 'bg-white dark:bg-cardDark text-[#111113] dark:text-white shadow-sm font-semibold'
                : 'text-[#71717A] dark:text-[#8E8E93] hover:text-[#111113] dark:hover:text-white'
            }">${s.label}</button>
        `).join('')}
      </div>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-[11.5px] font-medium text-[#71717A] dark:text-[#A1A1AA] mb-1">Data originale</label>
        <input id="edDate" type="date" value="${l.date}"
          class="w-full px-3 py-2 rounded-lg border border-black/[0.09] dark:border-white/[0.09] bg-porcelain dark:bg-obsidian text-[13px] tabular-nums focus:outline-none" />
      </div>
      <div>
        <label class="block text-[11.5px] font-medium text-[#71717A] dark:text-[#A1A1AA] mb-1">Durata effettiva (min)</label>
        <input id="edDuration" type="number" value="${l.duration || c.defaultDuration}" min="15" step="15"
          class="w-full px-3 py-2 rounded-lg border border-black/[0.09] dark:border-white/[0.09] bg-porcelain dark:bg-obsidian text-[13px] tabular-nums focus:outline-none" />
      </div>
    </div>

    <div class="flex items-center gap-2">
      <button type="button" onclick="document.getElementById('edDuration').value=90"
        class="px-2.5 py-1 rounded-md border border-black/[0.08] dark:border-white/[0.08] bg-porcelain dark:bg-obsidian hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[11px] font-medium transition">
        Slot 2h · 1h 30m
      </button>
      <button type="button" onclick="document.getElementById('edDuration').value=135"
        class="px-2.5 py-1 rounded-md border border-black/[0.08] dark:border-white/[0.08] bg-porcelain dark:bg-obsidian hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[11px] font-medium transition">
        Slot 3h · 2h 15m
      </button>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-[11.5px] font-medium text-[#71717A] dark:text-[#A1A1AA] mb-1">Tipo</label>
        <select id="edType"
          class="w-full px-3 py-2 rounded-lg border border-black/[0.09] dark:border-white/[0.09] bg-porcelain dark:bg-obsidian text-[13px] focus:outline-none">
          <option value="Lezione" ${l.type === 'Lezione' ? 'selected' : ''}>Lezione</option>
          <option value="Esercitazione" ${l.type === 'Esercitazione' ? 'selected' : ''}>Esercitazione</option>
          <option value="Laboratorio" ${l.type === 'Laboratorio' ? 'selected' : ''}>Laboratorio</option>
        </select>
      </div>
      <div>
        <label class="block text-[11.5px] font-medium text-[#71717A] dark:text-[#A1A1AA] mb-1">Pianificata il</label>
        <input id="edScheduled" type="datetime-local" value="${l.scheduled || ''}"
          class="w-full px-2.5 py-2 rounded-lg border border-black/[0.09] dark:border-white/[0.09] bg-porcelain dark:bg-obsidian text-[12px] tabular-nums focus:outline-none" />
      </div>
    </div>

    <div>
      <label class="block text-[11.5px] font-medium text-[#71717A] dark:text-[#A1A1AA] mb-1">Argomento</label>
      <textarea id="edTopic" rows="3" placeholder="Argomento trattato..."
        class="w-full px-3 py-2 rounded-lg border border-black/[0.09] dark:border-white/[0.09] bg-porcelain dark:bg-obsidian text-[13px] leading-relaxed focus:outline-none">${escapeHtml(l.topic || '')}</textarea>
    </div>

    <div>
      <label class="block text-[11.5px] font-medium text-[#71717A] dark:text-[#A1A1AA] mb-1">Link registrazione</label>
      <div class="flex gap-2">
        <input id="edUrl" type="url" value="${escapeHtml(l.url || '')}" placeholder="https://webeep.polimi.it/..."
          class="flex-1 min-w-0 px-3 py-2 rounded-lg border border-black/[0.09] dark:border-white/[0.09] bg-porcelain dark:bg-obsidian text-[13px] focus:outline-none" />
        ${normalizeUrl(l.url) ? `<a href="${escapeHtml(normalizeUrl(l.url))}" target="_blank" rel="noopener" class="px-3 py-2 rounded-lg border border-black/[0.08] dark:border-white/[0.08] text-[12.5px] font-medium hover:bg-black/[0.04] dark:hover:bg-white/[0.06] shrink-0">Apri</a>` : ''}
      </div>
    </div>

    <div>
      <label class="block text-[11.5px] font-medium text-[#71717A] dark:text-[#A1A1AA] mb-1">Note e dubbi da rivedere</label>
      <textarea id="edNotes" rows="5" placeholder="Timestamp chiave, dubbi, esercizi da rifare..."
        class="w-full px-3 py-2 rounded-lg border border-black/[0.09] dark:border-white/[0.09] bg-porcelain dark:bg-obsidian text-[13px] leading-relaxed focus:outline-none">${escapeHtml(l.notes || '')}</textarea>
    </div>
  `;

  renderDeleteButton();
  document.getElementById('overlay').classList.remove('hidden');
  const drawer = document.getElementById('drawer');
  drawer.removeAttribute('inert');
  drawer.setAttribute('aria-hidden', 'false');
  drawer.classList.remove('translate-x-full');
}

function selectDrawerStage(stageId) {
  document.querySelectorAll('[data-set-stage]').forEach(btn => {
    const active = Number(btn.dataset.setStage) === stageId;
    btn.className = active
      ? 'py-1.5 rounded-lg text-[11.5px] font-semibold bg-white dark:bg-cardDark text-[#111113] dark:text-white shadow-sm transition'
      : 'py-1.5 rounded-lg text-[11.5px] font-medium text-[#71717A] dark:text-[#8E8E93] hover:text-[#111113] dark:hover:text-white transition';
    btn.dataset.active = active ? '1' : '0';
  });
}

function renderDeleteButton() {
  const wrap = document.getElementById('drawerDeleteWrap');
  if (!ui.deleteArmed) {
    wrap.innerHTML = `<button onclick="armDeleteLesson()" class="px-2.5 py-1.5 rounded-lg text-[12.5px] font-medium text-red-600 dark:text-red-400 hover:bg-red-500/10 transition">Elimina</button>`;
  } else {
    wrap.innerHTML = `<button onclick="confirmDeleteLesson()" class="px-3 py-1.5 rounded-lg text-[12px] font-semibold bg-red-600 text-white hover:bg-red-700 transition">Conferma elimina</button>`;
  }
}

function armDeleteLesson() {
  ui.deleteArmed = true;
  renderDeleteButton();
}

function confirmDeleteLesson() {
  if (!state.deletedLessons) state.deletedLessons = {};
  state.deletedLessons[ui.activeLessonId] = new Date().toISOString();
  state.lessons = state.lessons.filter(x => x.id !== ui.activeLessonId);
  saveState();
  closeAllOverlays();
  toast('Lezione eliminata');
}

function saveDrawer() {
  const l = state.lessons.find(x => x.id === ui.activeLessonId);
  if (!l) return;
  const activeStageBtn = document.querySelector('[data-set-stage][data-active="1"]');
  if (activeStageBtn) l.stage = Number(activeStageBtn.dataset.setStage);
  l.date = document.getElementById('edDate').value || l.date;
  l.duration = Math.max(15, Number(document.getElementById('edDuration').value) || 90);
  l.type = document.getElementById('edType').value;
  l.scheduled = document.getElementById('edScheduled').value;
  l.topic = document.getElementById('edTopic').value.trim();
  l.url = normalizeUrl(document.getElementById('edUrl').value);
  l.notes = document.getElementById('edNotes').value.trim();
  l.updatedAt = new Date().toISOString();
  saveState();
  closeAllOverlays();
  toast('Modifiche salvate');
}

function openCalFromDrawer() {
  const id = ui.activeLessonId;
  openCalModal(null, id);
}

// =========================================================================
// 9. ADD LESSON MODAL
// =========================================================================
function openAddModal(prefill = null) {
  const sel = document.getElementById('addCourse');
  const defaultCourseId = prefill?.courseId || (COURSES.some(c => c.id === ui.view) ? ui.view : 'ACSO');
  sel.innerHTML = COURSES.map(c => `<option value="${c.id}" ${c.id === defaultCourseId ? 'selected' : ''}>${c.name}</option>`).join('');

  document.getElementById('addDate').value = prefill?.date || toIsoDate(new Date());
  document.getElementById('addType').value = prefill?.type || 'Lezione';
  document.getElementById('addDuration').value = prefill?.duration || getCourse(defaultCourseId).defaultDuration;
  document.getElementById('addTopic').value = '';
  document.getElementById('addUrl').value = '';
  openModal('addModal');
}

function onAddCourseChange() {
  const courseId = document.getElementById('addCourse').value;
  document.getElementById('addDuration').value = getCourse(courseId).defaultDuration;
}

function confirmAddLesson() {
  const courseId = document.getElementById('addCourse').value;
  const date = document.getElementById('addDate').value || toIsoDate(new Date());
  state.lessons.push({
    id: `${courseId.toLowerCase()}-${Date.now()}`,
    courseId,
    date,
    type: document.getElementById('addType').value,
    duration: Math.max(15, Number(document.getElementById('addDuration').value) || 90),
    stage: 0,
    topic: document.getElementById('addTopic').value.trim(),
    url: normalizeUrl(document.getElementById('addUrl').value),
    notes: '',
    scheduled: '',
    updatedAt: new Date().toISOString()
  });
  saveState();
  closeAllOverlays();
  toast('Lezione aggiunta');
}

// =========================================================================
// 10. GOOGLE CALENDAR MODAL & .ICS EXPORT
// =========================================================================
function openCalModal(ev, id) {
  if (ev) ev.stopPropagation();
  const l = state.lessons.find(x => x.id === id);
  if (!l) return;
  ui.calLessonId = id;
  const c = getCourse(l.courseId);

  document.getElementById('calLessonSummary').textContent = `Recupero ${c.name} · ${l.type} del ${formatDateReadable(l.date)}`;

  const today = new Date();
  const todayIso = toIsoDate(today);
  const tom = new Date(today);
  tom.setDate(tom.getDate() + 1);
  const tomIso = toIsoDate(tom);

  document.getElementById('calDate').value = l.scheduled ? l.scheduled.split('T')[0] : todayIso;
  document.getElementById('calTime').value = l.scheduled ? (l.scheduled.split('T')[1] || '15:00') : '15:00';
  document.getElementById('calClearBtn').classList.toggle('hidden', !l.scheduled);

  const chips = [
    { label: 'Oggi 14:30', d: todayIso, t: '14:30' },
    { label: 'Oggi 17:30', d: todayIso, t: '17:30' },
    { label: 'Domani 09:00', d: tomIso, t: '09:00' },
    { label: 'Domani 14:30', d: tomIso, t: '14:30' }
  ];
  document.getElementById('calQuickChips').innerHTML = chips.map(ch => `
    <button type="button" onclick="applyCalChip('${ch.d}', '${ch.t}')"
      class="px-2.5 py-1 rounded-lg border border-black/[0.08] dark:border-white/[0.08] bg-porcelain dark:bg-obsidian hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[11.5px] font-medium transition">
      ${ch.label}
    </button>
  `).join('');

  updateCalInfo();
  openModal('calModal');
}

function clearScheduled() {
  const l = state.lessons.find(x => x.id === ui.calLessonId);
  if (!l) return;
  l.scheduled = '';
  l.updatedAt = new Date().toISOString();
  saveState();
  closeAllOverlays();
  toast('Pianificazione rimossa');
}

function applyCalChip(d, t) {
  document.getElementById('calDate').value = d;
  document.getElementById('calTime').value = t;
  updateCalInfo();
}

function updateCalInfo() {
  const l = state.lessons.find(x => x.id === ui.calLessonId);
  if (!l) return;
  const base = l.duration || 90;
  const buf = document.getElementById('calBuffer').checked ? 15 : 0;
  const total = effMinutes(base) + buf;
  document.getElementById('calDurationInfo').textContent = `Blocco stimato: ${formatHours(total)} (effettivi ${formatHours(base)} a ${state.speed}x${buf ? ' + 15m appunti' : ''})`;
}

function escapeIcsText(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

function buildCalPayload() {
  const l = state.lessons.find(x => x.id === ui.calLessonId);
  const c = getCourse(l.courseId);
  const date = document.getElementById('calDate').value;
  const time = document.getElementById('calTime').value || '15:00';
  const buf = document.getElementById('calBuffer').checked ? 15 : 0;
  const totalMins = effMinutes(l.duration || 90) + buf;

  const start = new Date(`${date}T${time}:00`);
  const end = new Date(start.getTime() + totalMins * 60000);
  const fmt = d => d.getFullYear()
    + String(d.getMonth() + 1).padStart(2, '0')
    + String(d.getDate()).padStart(2, '0') + 'T'
    + String(d.getHours()).padStart(2, '0')
    + String(d.getMinutes()).padStart(2, '0') + '00';
  const nowUtc = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

  const title = `Recupero ${l.type.toLowerCase()} ${formatDateShort(l.date)} ${c.name}`;
  const safeUrl = normalizeUrl(l.url);
  const details = [
    l.topic ? `Argomento: ${l.topic}` : '',
    safeUrl ? `Registrazione: ${safeUrl}` : '',
    l.notes ? `Note: ${l.notes}` : ''
  ].filter(Boolean).join('\n');

  l.scheduled = `${date}T${time}`;
  l.updatedAt = new Date().toISOString();
  saveState();
  return { id: l.id, title, details, startStr: fmt(start), endStr: fmt(end), dtstamp: nowUtc };
}

function openGoogleCalendar() {
  const { title, details, startStr, endStr } = buildCalPayload();
  const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startStr}/${endStr}&ctz=Europe/Rome&details=${encodeURIComponent(details)}`;
  window.open(url, '_blank', 'noopener');
  closeAllOverlays();
  toast('Pianificata e aperta su Google Calendar');
}

function downloadICS() {
  const { id, title, details, startStr, endStr, dtstamp } = buildCalPayload();
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RecuperoLezioni//PoliMi//IT',
    'CALSCALE:GREGORIAN',
    'X-WR-TIMEZONE:Europe/Rome',
    'BEGIN:VEVENT',
    `UID:${id}@recupero-lezioni.polimi`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART;TZID=Europe/Rome:${startStr}`,
    `DTEND;TZID=Europe/Rome:${endStr}`,
    `SUMMARY:${escapeIcsText(title)}`,
    `DESCRIPTION:${escapeIcsText(details)}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${title.replace(/\s+/g, '_')}.ics`;
  a.click();
  closeAllOverlays();
  toast('File .ics scaricato');
}

// =========================================================================
// 11. SMART PICK MODAL ("HO X MIN")
// =========================================================================
function openSmartModal() {
  document.getElementById('smartSpeedText').textContent = `${state.speed}x`;
  renderSmartPick();
  openModal('smartModal');
}

function setSmartMins(m) {
  document.getElementById('smartMinutes').value = m;
  renderSmartPick();
}

function renderSmartPick() {
  const mins = Number(document.getElementById('smartMinutes').value) || 90;
  const open = state.lessons
    .filter(l => l.stage < DONE_STAGE)
    .map(l => ({ ...l, eff: effMinutes(l.duration || 90) }))
    .filter(l => l.eff <= mins)
    .sort((a, b) => a.date.localeCompare(b.date));

  const box = document.getElementById('smartResults');
  if (open.length === 0) {
    box.innerHTML = `<div class="p-3.5 rounded-xl border border-black/[0.07] dark:border-white/[0.07] bg-porcelain dark:bg-obsidian text-[12.5px] text-[#71717A] dark:text-[#A1A1AA]">Nessuna lezione completa rientra in ${mins} min a ${state.speed}x.</div>`;
    return;
  }

  box.innerHTML = open.slice(0, 5).map(l => {
    const c = getCourse(l.courseId);
    return `
      <div class="p-3 rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-porcelain/70 dark:bg-obsidian/60 flex items-center justify-between gap-3">
        <div class="min-w-0">
          <div class="flex items-center gap-2 text-[13px] font-semibold">
            <span class="w-2 h-2 rounded-full shrink-0" style="background:${c.color}"></span>
            <span>${c.name}</span>
            <span class="text-[12px] text-[#71717A] dark:text-[#8E8E93] tabular-nums">${formatDateReadable(l.date)}</span>
          </div>
          <div class="text-[11.5px] text-[#71717A] dark:text-[#8E8E93] tabular-nums mt-0.5">
            ${formatHours(l.eff)} a ${state.speed}x · ${escapeHtml(l.type)}
          </div>
        </div>
        <button onclick="openCalModal(null, '${l.id}')"
          class="shrink-0 px-3 py-1.5 rounded-lg bg-[#111113] dark:bg-[#F4F4F5] text-white dark:text-[#0B0B0E] text-[12px] font-medium hover:opacity-90 transition">
          Pianifica
        </button>
      </div>
    `;
  }).join('');
}

// =========================================================================
// 12. SYNC & BACKUP MODAL
// =========================================================================
function openSyncModal() {
  const cfg = getSyncConfig();
  document.getElementById('sbUrl').value = cfg.url;
  document.getElementById('sbKey').value = cfg.key;
  document.getElementById('sbSyncKey').value = cfg.syncKey;
  openModal('syncModal');
}

async function saveAndSync() {
  const cfg = {
    url: cleanSupabaseUrl(document.getElementById('sbUrl').value),
    key: document.getElementById('sbKey').value.trim(),
    syncKey: document.getElementById('sbSyncKey').value.trim()
  };
  // Everything empty = deliberately local-only; otherwise validate before saving
  if (cfg.url || cfg.key || cfg.syncKey) {
    const err = syncConfigError(cfg);
    if (err) {
      setSyncDiag(err, true);
      toast(err);
      return;
    }
  }
  saveSyncConfig(cfg);
  await syncWithSupabase({ silent: false });
}

// 24 symbols from a 32-char alphabet (no 0/o/1/l) = 120 bits, shown as 4 groups of 6
function generateSyncKey() {
  const alphabet = 'abcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const chars = Array.from(bytes, b => alphabet[b % 32]).join('');
  document.getElementById('sbSyncKey').value = chars.match(/.{6}/g).join('-');
  toast('Chiave generata: copiala sugli altri dispositivi');
}

function exportJSON() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `backup-recupero-lezioni-${toIsoDate(new Date())}.json`;
  a.click();
}

function importJSON(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!Array.isArray(parsed.lessons)) throw new Error('Formato non valido');
      runMigrations(parsed);
      replaceState(parsed);
      saveState(true);
      closeAllOverlays();
      toast('Backup importato');
      // Restoring a backup replaces the cloud copy too (no-op when sync isn't configured)
      if (!syncConfigError(getSyncConfig())) syncWithSupabase({ mode: 'push' });
    } catch (err) {
      toast('File JSON non valido');
    }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// Handlers referenced by onclick="..." in index.html and in the generated markup
Object.assign(window, {
  setView, setFilter, setSpeed, stepDailyHours, toggleTheme, cycleStage,
  openMobileSidebar, closeAllOverlays,
  openTimetableModal, addMissedFromSlot,
  openDrawer, selectDrawerStage, armDeleteLesson, confirmDeleteLesson, saveDrawer, openCalFromDrawer,
  openAddModal, onAddCourseChange, confirmAddLesson,
  openCalModal, clearScheduled, applyCalChip, updateCalInfo, openGoogleCalendar, downloadICS,
  openSmartModal, setSmartMins, renderSmartPick,
  openSyncModal, saveAndSync, generateSyncKey, exportJSON, importJSON, syncWithSupabase
});

export { closeAllOverlays, openAddModal };
