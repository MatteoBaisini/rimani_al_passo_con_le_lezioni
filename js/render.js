// Disegno dell'interfaccia: sidebar, KPI, "prossima da recuperare", materie e lista lezioni.
// I pulsanti generati usano onclick="..." verso le funzioni esposte su window da ui.js.
import { COURSES } from './data.js';
import { STAGES, DONE_STAGE, STAGE_COLORS, SPEED_OPTIONS, normalizeUrl } from './state.js';
import { state, ui } from './store.js';
import {
  getCourse, effMinutes, formatHours, formatDateReadable, formatDateShort, formatScheduled,
  toIsoDate, parseIsoLocal, escapeHtml, stageRingSVG
} from './helpers.js';

export function getScopedLessons() {
  if (ui.view === 'all' || ui.view === 'scheduled') return state.lessons;
  return state.lessons.filter(l => l.courseId === ui.view);
}

export function getFilteredLessons() {
  return state.lessons
    .filter(l => {
      if (ui.view === 'scheduled') return Boolean(l.scheduled) && l.stage < DONE_STAGE;
      if (ui.view !== 'all' && l.courseId !== ui.view) return false;
      return true;
    })
    .filter(l => {
      if (ui.filter === 'open') return l.stage < DONE_STAGE;
      if (ui.filter === 'done') return l.stage === DONE_STAGE;
      return true;
    })
    .filter(l => {
      if (!ui.search) return true;
      const q = ui.search.toLowerCase();
      return (
        l.date.includes(q) ||
        formatDateShort(l.date).includes(q) ||
        formatDateReadable(l.date).includes(q) ||
        (l.topic || '').toLowerCase().includes(q) ||
        (l.notes || '').toLowerCase().includes(q) ||
        l.courseId.toLowerCase().includes(q) ||
        l.type.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function render() {
  renderSidebar();
  renderHeaderAndKPIs();
  renderNextUp();
  renderCourseOverview();
  renderFilterTabs();
  renderLessonList();
}

export function renderSidebar() {
  const openAll = state.lessons.filter(l => l.stage < DONE_STAGE);
  document.getElementById('cnt-all').textContent = openAll.length;
  document.getElementById('cnt-scheduled').textContent = openAll.filter(l => l.scheduled).length;

  const styleNav = (id, active) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.className = active
      ? 'w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[13px] font-semibold bg-black/[0.06] dark:bg-white/[0.09] text-[#111113] dark:text-white transition'
      : 'w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[13px] font-medium text-[#52525B] dark:text-[#A1A1AA] hover:bg-black/[0.035] dark:hover:bg-white/[0.05] hover:text-[#111113] dark:hover:text-white transition';
  };

  styleNav('nav-all', ui.view === 'all');
  styleNav('nav-scheduled', ui.view === 'scheduled');

  document.getElementById('courseNav').innerHTML = COURSES.map(c => {
    const cnt = openAll.filter(l => l.courseId === c.id).length;
    const active = ui.view === c.id;
    return `
      <button onclick="setView('${c.id}')"
        class="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-[13px] transition ${
          active
            ? 'font-semibold bg-black/[0.06] dark:bg-white/[0.09] text-[#111113] dark:text-white'
            : 'font-medium text-[#52525B] dark:text-[#A1A1AA] hover:bg-black/[0.035] dark:hover:bg-white/[0.05] hover:text-[#111113] dark:hover:text-white'
        }">
        <span class="flex items-center gap-2.5 min-w-0">
          <span class="w-2 h-2 rounded-full shrink-0" style="background:${c.color}"></span>
          <span class="truncate">${c.name}</span>
        </span>
        <span class="text-[11px] tabular-nums px-1.5 py-0.5 rounded-md bg-black/[0.04] dark:bg-white/[0.06] text-[#71717A] dark:text-[#A1A1AA]">${cnt}</span>
      </button>
    `;
  }).join('');

  // Speed pills
  document.getElementById('speedIndicator').textContent = `${state.speed}x`;
  document.getElementById('speedPills').innerHTML = SPEED_OPTIONS.map(sp => {
    const active = Number(state.speed) === sp;
    return `<button onclick="setSpeed(${sp})"
      class="py-1 rounded-md text-[11px] tabular-nums font-medium transition ${
        active
          ? 'bg-white dark:bg-cardDark text-[#111113] dark:text-white shadow-sm'
          : 'text-[#71717A] dark:text-[#8E8E93] hover:text-[#111113] dark:hover:text-white'
      }">${sp}x</button>`;
  }).join('');

  document.getElementById('dailyHoursLabel').textContent = `${Number(state.dailyHours).toFixed(1)}h`;
}

export function renderHeaderAndKPIs() {
  const scopeLessons = getScopedLessons();
  const scopeOpen = scopeLessons.filter(l => l.stage < DONE_STAGE);

  const baseMins = scopeOpen.reduce((s, l) => s + (l.duration || 90), 0);
  const adjMins = scopeOpen.reduce((s, l) => s + effMinutes(l.duration || 90), 0);
  const dailyHrs = Number(state.dailyHours) || 2;
  const daysNeeded = adjMins > 0 ? Math.ceil((adjMins / 60) / dailyHrs) : 0;
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + daysNeeded);
  const targetStr = daysNeeded === 0
      ? 'In pari'
    : targetDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });

  // Header title & subtitle
  const dot = document.getElementById('viewHeaderDot');
  const title = document.getElementById('viewTitle');
  const sub = document.getElementById('viewSubtitle');

  if (ui.view === 'all') {
    dot.classList.add('hidden');
    title.textContent = 'Tutte le lezioni';
    sub.innerHTML = daysNeeded
      ? `<span class="sm:hidden">${formatHours(adjMins)} · entro ${targetStr}</span><span class="hidden sm:inline">${formatHours(adjMins)} da recuperare a ${state.speed}x · in pari entro ${targetStr}</span>`
      : 'Nessun arretrato';
  } else if (ui.view === 'scheduled') {
    dot.classList.add('hidden');
    title.textContent = 'Pianificate su Calendar';
    const schedCnt = scopeOpen.filter(l => l.scheduled).length;
    sub.textContent = `${schedCnt} ${schedCnt === 1 ? 'sessione' : 'sessioni'} in calendario`;
  } else {
    const c = getCourse(ui.view);
    dot.classList.remove('hidden');
    dot.style.background = c.color;
    title.textContent = c.fullName;
    sub.textContent = `${scopeOpen.length} da recuperare · ${formatHours(adjMins)} a ${state.speed}x`;
  }

  // KPI Cards
  const scheduledOpen = scopeOpen.filter(l => l.scheduled).length;
  const kpi = (label, value, sub) => `
    <div class="bg-white dark:bg-cardDark px-5 py-4">
      <div class="text-[12px] font-medium text-[#71717A] dark:text-[#8E8E93]">${label}</div>
      <div class="mt-1 text-[24px] leading-8 font-semibold tabular-nums tracking-tight">${value}</div>
      ${sub ? `<div class="text-[11.5px] text-[#8E8E93] tabular-nums">${sub}</div>` : ''}
    </div>`;
  const daysLabel = daysNeeded === 1 ? 'giorno' : 'giorni';
  document.getElementById('kpiGrid').innerHTML = [
    kpi('Da recuperare', scopeOpen.length),
    kpi(`Tempo a ${state.speed}x`, formatHours(adjMins), `${formatHours(baseMins)} a velocità normale`),
    kpi('In pari entro', targetStr, daysNeeded ? `${daysNeeded} ${daysLabel} a ${dailyHrs.toFixed(1)}h al giorno` : 'Nessun arretrato'),
    kpi('In calendario', scheduledOpen, `su ${scopeOpen.length} da recuperare`)
  ].join('');

  // Overall Completion Bar
  const total = scopeLessons.length;
  const weightedDone = scopeLessons.reduce((acc, l) => acc + (l.stage / DONE_STAGE), 0);
  const pct = total === 0 ? 100 : Math.round((weightedDone / total) * 100);
  document.getElementById('overallPctText').textContent = pct === null ? '—' : `${pct}%`;

  // One segment per started stage (done first), "Da vedere" is the empty track
  const stageCounts = STAGES.map(s => scopeLessons.filter(l => l.stage === s.id).length);
  document.getElementById('overallProgressBar').innerHTML = total === 0 ? '' : [2, 1]
    .filter(s => stageCounts[s] > 0)
    .map(s => `<div class="h-full transition-all duration-300" style="width:${(stageCounts[s] / total) * 100}%; background:${STAGE_COLORS[s]}" title="${STAGES[s].label}: ${stageCounts[s]}"></div>`)
    .join('');
  document.getElementById('stageLegend').innerHTML = STAGES.map(s => `
    <span class="inline-flex items-center gap-1.5">
      <span class="w-2 h-2 rounded-full" style="background:${STAGE_COLORS[s.id]}"></span>
      ${s.label}
      <span class="tabular-nums font-semibold text-[#111113] dark:text-[#F4F4F5]">${stageCounts[s.id]}</span>
    </span>
  `).join('');
}

// Priority: soonest calendar session, then already-started lessons, then the oldest backlog item
export function getNextUp() {
  const open = getScopedLessons()
    .filter(l => l.stage < DONE_STAGE && (ui.view !== 'scheduled' || l.scheduled))
    .sort((a, b) => a.date.localeCompare(b.date));
  const scheduled = open.filter(l => l.scheduled).sort((a, b) => a.scheduled.localeCompare(b.scheduled));
  if (scheduled.length) return { lesson: scheduled[0], reason: `In calendario ${formatScheduled(scheduled[0].scheduled)}` };
  const started = open.filter(l => l.stage > 0);
  if (started.length) return { lesson: started[0], reason: `Già iniziata · ${STAGES[started[0].stage].label}` };
  if (open.length) return { lesson: open[0], reason: `La più vecchia · ${daysAgoLabel(open[0].date)}` };
  return null;
}

export function daysAgoLabel(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((today - new Date(y, m - 1, d)) / 86400000);
  if (diff < 0) return `tra ${-diff} gg`;
  if (diff === 0) return 'oggi';
  if (diff === 1) return 'ieri';
  return `${diff} giorni fa`;
}

export function renderNextUp() {
  const sec = document.getElementById('nextUpSection');
  const next = ui.filter === 'done' ? null : getNextUp();
  if (!next) {
    sec.classList.add('hidden');
    sec.innerHTML = '';
    return;
  }
  sec.classList.remove('hidden');
  const l = next.lesson;
  const c = getCourse(l.courseId);
  const effMin = effMinutes(l.duration || c.defaultDuration);
  const nextStage = STAGES[l.stage + 1];

  const actionLabels = ['', 'Segna iniziata', 'Segna completata'];
  const btnBase = 'inline-flex items-center justify-center gap-1.5 h-9 px-3.5 rounded-lg text-[13px] font-medium transition';

  sec.innerHTML = `
    <div class="bg-white dark:bg-cardDark border border-black/[0.08] dark:border-white/[0.08] rounded-2xl shadow-card p-5">
      <div class="flex items-center justify-between gap-3">
        <span class="text-[12px] font-medium text-[#71717A] dark:text-[#8E8E93]">Prossima da recuperare</span>
        <span class="text-[11.5px] tabular-nums text-[#8E8E93] truncate">${escapeHtml(next.reason)}</span>
      </div>
      <div class="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div onclick="openDrawer('${l.id}')" role="button" tabindex="0" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openDrawer('${l.id}');}"
          class="flex items-center gap-4 min-w-0 cursor-pointer rounded-xl -m-1.5 p-1.5 hover:bg-porcelain/70 dark:hover:bg-cardDarkHover transition">
          <div class="w-12 h-12 rounded-xl flex flex-col items-center justify-center shrink-0" style="background:${c.tint}; color:${c.color}">
            <span class="text-[17px] leading-none font-semibold tabular-nums">${l.date.slice(8)}</span>
            <span class="mt-0.5 text-[10px] leading-none font-semibold uppercase">${formatDateReadable(l.date).slice(7)}</span>
          </div>
          <div class="min-w-0">
            <div class="text-[16px] font-semibold tracking-tight truncate">${c.fullName}</div>
            <div class="mt-0.5 text-[12.5px] text-[#71717A] dark:text-[#8E8E93] tabular-nums truncate">
              ${escapeHtml(l.type)} · ${formatDateReadable(l.date)} · <span class="text-[#111113] dark:text-[#F4F4F5] font-medium">${formatHours(effMin)}</span> a ${state.speed}x${l.topic ? ` · ${escapeHtml(l.topic)}` : ''}
            </div>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          ${normalizeUrl(l.url) ? `
            <a href="${escapeHtml(normalizeUrl(l.url))}" target="_blank" rel="noopener"
              class="${btnBase} flex-1 sm:flex-none border border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-cardDarkHover">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"/></svg>
              Guarda
            </a>` : `
            <button onclick="openDrawer('${l.id}')"
              class="${btnBase} flex-1 sm:flex-none border border-black/[0.1] dark:border-white/[0.1] hover:bg-black/[0.03] dark:hover:bg-cardDarkHover">
              Apri
            </button>`}
          <button onclick="cycleStage(event, '${l.id}')"
            class="${btnBase} whitespace-nowrap flex-1 sm:flex-none bg-[#111113] dark:bg-[#F4F4F5] text-white dark:text-[#0B0B0E] hover:opacity-90">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>
            ${actionLabels[nextStage.id]}
          </button>
        </div>
      </div>
    </div>
  `;
}

export function renderCourseOverview() {
  const sec = document.getElementById('courseOverviewSection');
  if (ui.view !== 'all') {
    sec.classList.add('hidden');
    return;
  }
  sec.classList.remove('hidden');

  document.getElementById('courseOverviewGrid').innerHTML = COURSES.map(c => {
    const all = state.lessons.filter(l => l.courseId === c.id);
    const open = all.filter(l => l.stage < DONE_STAGE);
    const done = all.filter(l => l.stage === DONE_STAGE);
    const adjMins = open.reduce((s, l) => s + effMinutes(l.duration || c.defaultDuration), 0);
    // Stage-weighted, same metric as the overall bar
    const pct = all.length === 0 ? 0 : Math.round(all.reduce((s, l) => s + l.stage / DONE_STAGE, 0) / all.length * 100);

    return `
      <button onclick="setView('${c.id}')"
        class="text-left bg-white dark:bg-cardDark border border-black/[0.08] dark:border-white/[0.08] hover:border-black/[0.18] dark:hover:border-white/[0.18] hover:shadow-float rounded-xl p-4 shadow-card transition flex flex-col justify-start">
        <div class="flex items-center gap-2 min-w-0">
          <span class="w-2 h-2 rounded-full shrink-0" style="background:${c.color}"></span>
          <span class="text-[13px] font-semibold truncate">${c.name}</span>
        </div>
        <div class="mt-3 text-[20px] leading-7 font-semibold tabular-nums tracking-tight">
          ${open.length ? formatHours(adjMins) : 'In pari'}
        </div>
        <div class="text-[11.5px] tabular-nums text-[#8E8E93] truncate">
          ${open.length} da recuperare · ${done.length} fatte
        </div>
        <div class="mt-3 flex items-center gap-2">
          <div class="flex-1 h-1 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
            <div class="h-full rounded-full transition-all duration-300" style="width:${pct}%; background:${c.color}"></div>
          </div>
          <span class="text-[11px] tabular-nums text-[#8E8E93] w-8 text-right">${pct}%</span>
        </div>
      </button>
    `;
  }).join('');
}

export function renderFilterTabs() {
  const scope = getScopedLessons().filter(l => ui.view !== 'scheduled' || l.scheduled);
  const labels = { open: 'Da recuperare', all: 'Tutte', done: 'Completate' };
  const counts = {
    open: scope.filter(l => l.stage < DONE_STAGE).length,
    all: scope.length,
    done: scope.filter(l => l.stage === DONE_STAGE).length
  };
  document.querySelectorAll('#stageFilter button').forEach(btn => {
    const f = btn.dataset.filter;
    const active = f === ui.filter;
    btn.className = active
      ? 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold bg-white dark:bg-cardDark text-[#111113] dark:text-white shadow-sm transition'
      : 'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-medium text-[#71717A] dark:text-[#8E8E93] hover:text-[#111113] dark:hover:text-white transition';
    btn.innerHTML = `${labels[f]}<span class="text-[10.5px] tabular-nums opacity-60">${counts[f]}</span>`;
  });
}

export function weekStartIso(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  return toIsoDate(dt);
}

export function weekLabel(startIso) {
  const thisWeek = weekStartIso(toIsoDate(new Date()));
  const diffWeeks = Math.round((parseIsoLocal(startIso) - parseIsoLocal(thisWeek)) / (7 * 86400000));
  if (diffWeeks === 0) return 'Questa settimana';
  if (diffWeeks === -1) return 'Settimana scorsa';
  if (diffWeeks === 1) return 'Prossima settimana';
  return `Settimana del ${formatDateReadable(startIso).slice(4)}`;
}

export function renderLessonList() {
  const container = document.getElementById('lessonList');
  const items = getFilteredLessons();

  if (items.length === 0) {
    const caughtUp = !ui.search && ui.filter === 'open';
    container.innerHTML = `
      <div class="bg-white dark:bg-cardDark border border-dashed border-black/[0.12] dark:border-white/[0.12] rounded-2xl px-6 py-12 text-center">
        <div class="mx-auto w-10 h-10 rounded-full flex items-center justify-center ${caughtUp ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-black/[0.04] dark:bg-white/[0.06] text-[#8E8E93]'}">
          ${caughtUp
            ? '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5"/></svg>'
            : '<svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"/></svg>'}
        </div>
        <div class="mt-3 text-[14px] font-semibold">${caughtUp ? 'Sei in pari' : 'Nessuna lezione trovata'}</div>
        <div class="mt-1 text-[12.5px] text-[#71717A] dark:text-[#8E8E93]">
          ${caughtUp ? 'Niente da recuperare in questa vista.' : ui.search ? `Nessun risultato per “${escapeHtml(ui.search)}”.` : 'Prova a cambiare filtro.'}
        </div>
      </div>
    `;
    return;
  }

  const groups = [];
  items.forEach(l => {
    const wk = weekStartIso(l.date);
    let g = groups[groups.length - 1];
    if (!g || g.week !== wk) groups.push(g = { week: wk, lessons: [] });
    g.lessons.push(l);
  });

  container.innerHTML = `
    <div class="bg-white dark:bg-cardDark border border-black/[0.08] dark:border-white/[0.08] rounded-2xl shadow-card overflow-hidden">
      ${groups.map(g => {
        const openMins = g.lessons
          .filter(l => l.stage < DONE_STAGE)
          .reduce((s, l) => s + effMinutes(l.duration || getCourse(l.courseId).defaultDuration), 0);
        return `
          <div class="px-4 sm:px-5 py-2 flex items-center justify-between gap-3 bg-porcelain/70 dark:bg-white/[0.025] border-y border-black/[0.06] dark:border-white/[0.06] first:border-t-0">
            <h3 class="text-[11.5px] font-semibold text-[#52525B] dark:text-[#A1A1AA]">${weekLabel(g.week)}</h3>
            <span class="text-[11.5px] tabular-nums text-[#8E8E93]">
              ${g.lessons.length} ${g.lessons.length === 1 ? 'lezione' : 'lezioni'}${openMins ? ` · ${formatHours(openMins)}` : ''}
            </span>
          </div>
          <div class="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
            ${g.lessons.map(lessonRowHtml).join('')}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

export function lessonRowHtml(l) {
    const c = getCourse(l.courseId);
    const baseMin = l.duration || c.defaultDuration;
    const effMin = effMinutes(baseMin);
    const isDone = l.stage === DONE_STAGE;

    const [weekday, , month] = formatDateReadable(l.date).split(' ');

    return `
      <div onclick="openDrawer('${l.id}')"
        class="group px-3 sm:px-5 py-2.5 flex items-center gap-3 sm:gap-4 cursor-pointer hover:bg-porcelain/60 dark:hover:bg-cardDarkHover transition">

        <button onclick="cycleStage(event, '${l.id}')" title="${STAGES[l.stage].label} — ${l.stage >= DONE_STAGE ? 'clicca per modificare' : 'clicca per avanzare'}"
          class="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-black/[0.05] dark:hover:bg-white/[0.07] shrink-0 transition">
          ${stageRingSVG(l.stage)}
        </button>

        <!-- Date column -->
        <div class="w-[52px] shrink-0 tabular-nums ${isDone ? 'opacity-50' : ''}">
          <div class="text-[13px] font-semibold leading-tight">${l.date.slice(8)} ${month}</div>
          <div class="text-[11.5px] leading-tight text-[#8E8E93] capitalize">${weekday}</div>
        </div>

        <!-- Course column (desktop) -->
        <div class="hidden sm:flex items-center gap-2 w-[96px] shrink-0 ${isDone ? 'opacity-50' : ''}">
          <span class="w-2 h-2 rounded-full shrink-0" style="background:${c.color}"></span>
          <span class="text-[12.5px] font-semibold truncate">${c.name}</span>
        </div>

        <!-- Type, topic, calendar slot -->
        <div class="min-w-0 flex-1 ${isDone ? 'opacity-50' : ''}">
          <div class="flex items-center gap-2 min-w-0">
            <span class="sm:hidden w-2 h-2 rounded-full shrink-0" style="background:${c.color}"></span>
            <span class="sm:hidden text-[12.5px] font-semibold shrink-0">${c.name}</span>
            <span class="text-[13px] text-[#52525B] dark:text-[#A1A1AA] shrink-0 ${isDone ? 'line-through' : ''}">${escapeHtml(l.type)}</span>
            ${l.topic ? `<span class="hidden sm:inline text-[13px] text-[#8E8E93] truncate">— ${escapeHtml(l.topic)}</span>` : ''}
          </div>
          ${l.scheduled ? `
            <div class="mt-0.5 inline-flex items-center gap-1 text-[11.5px] tabular-nums font-medium text-emerald-700 dark:text-emerald-400">
              <svg class="w-3 h-3" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              ${formatScheduled(l.scheduled)}
            </div>` : ''}
        </div>

        <!-- Right: Effective Duration + Quick Actions -->
        <div class="flex items-center gap-1 sm:gap-3 shrink-0">
          <span class="text-[12.5px] font-medium tabular-nums text-[#52525B] dark:text-[#A1A1AA] w-[52px] text-right ${isDone ? 'opacity-50' : ''}" title="${formatHours(baseMin)} a velocità normale">${formatHours(effMin)}</span>

          <div class="flex items-center gap-0.5 lg:opacity-40 lg:group-hover:opacity-100 transition">
            ${normalizeUrl(l.url) ? `
              <a href="${escapeHtml(normalizeUrl(l.url))}" target="_blank" rel="noopener" onclick="event.stopPropagation()" title="Apri registrazione" aria-label="Apri registrazione"
                class="w-8 h-8 rounded-lg flex items-center justify-center text-[#71717A] hover:text-[#111113] dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z"/>
                </svg>
              </a>` : ''}

            <button onclick="openCalModal(event, '${l.id}')" title="Pianifica su Google Calendar" aria-label="Pianifica su Google Calendar"
              class="w-8 h-8 rounded-lg flex items-center justify-center text-[#71717A] hover:text-[#111113] dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="1.75" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
}
