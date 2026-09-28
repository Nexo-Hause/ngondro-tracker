import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://clksteocpzsydpozasrl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsa3N0ZW9jcHpzeWRwb3phc3JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNTEzMDksImV4cCI6MjA4NzcyNzMwOX0.JLFkzLONVKlKEZmWjhShk_-32shPXpXULRGAlGEgGP0';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let SESSIONS = [];        // lo que se ve: remoto + lo que está en cola
let REMOTE = [];          // lo que ya está en la base
let PENDING = [];         // guardado en el celular, aún sin subir

/* ---------- Guardado local (funciona sin señal) ----------
   Lo que capturas se escribe primero en el celular y se sube en cuanto hay red.
   Así una sesión nunca se pierde por estar en un sótano sin señal. */
const PENDING_KEY = 'ngondro_pending';
const CACHE_KEY = 'ngondro_cache';

const readLS = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch (e) { return def; } };
const writeLS = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

function mergeSessions() {
  SESSIONS = PENDING.map(p => ({ ...p.row, id: p.localId, _pending: true }))
    .concat(REMOTE)
    .sort((a, b) => a.practice_date < b.practice_date ? 1 : a.practice_date > b.practice_date ? -1 : 0);
  const n = PENDING.length;
  const b = $('#syncMsg');
  if (b) {
    b.textContent = n ? `${n} ${n === 1 ? 'sesión guardada en el celular, pendiente de subir' : 'sesiones guardadas en el celular, pendientes de subir'} · toca para reintentar` : '';
    b.classList.toggle('hidden', n === 0);
  }
}

function queueSession(row) {
  PENDING.push({ localId: 'local-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), row });
  writeLS(PENDING_KEY, PENDING);
  mergeSessions();
}

/* Sube la cola una por una. Si una falla se queda para el siguiente intento. */
let flushing = false;
async function flushPending() {
  if (flushing || !PENDING.length || !currentUser) return;
  flushing = true;
  const quedan = [];
  for (const p of PENDING) {
    const { error } = await supabase.from('ngondro_sessions').insert(p.row);
    if (error) quedan.push(p);
  }
  PENDING = quedan;
  writeLS(PENDING_KEY, PENDING);
  flushing = false;
  await loadSessions();
  renderAll();
}
let currentUser = null;
let calMonth = (() => { const d = new Date(); d.setDate(1); return d; })();

const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

/* ---------- Fecha LOCAL (no UTC) ----------
   toISOString() devuelve UTC: después de las 18:00 en CDMX ya marcaba el día siguiente. */
const pad2 = n => String(n).padStart(2, '0');
const localDateStr = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
let lastRegDate = null;  // conserva la fecha que eligió, no la pisa con "hoy" tras guardar

/* ---------- Auth ---------- */

async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) onSignedIn(session.user);
  else showLogin();

  supabase.auth.onAuthStateChange((_event, session) => {
    // Supabase dispara esto también al refrescar el token (cada hora y al volver del
    // segundo plano). Re-dibujar ahí borraba el conteo de mantras y el estado del timer.
    const uid = session?.user?.id || null;
    if (uid === (currentUser?.id || null)) return;
    if (session) onSignedIn(session.user);
    else showLogin();
  });

  $('#loginForm').addEventListener('submit', async e => {
    e.preventDefault();
    const email = $('#loginEmail').value.trim();
    if (!email) return;
    $('#loginMsg').textContent = 'Enviando enlace...';
    const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: location.href } });
    $('#loginMsg').textContent = error ? ('Error: ' + error.message) : 'Revisa tu correo y abre el enlace desde este celular.';
  });

  $('#logoutBtn').addEventListener('click', () => supabase.auth.signOut());
}

function showLogin() {
  currentUser = null;
  $('#loginScreen').classList.remove('hidden');
  $('#app').classList.add('hidden');
}

async function onSignedIn(user) {
  currentUser = user;
  $('#loginScreen').classList.add('hidden');
  $('#app').classList.remove('hidden');
  PENDING = readLS(PENDING_KEY, []);
  REMOTE = readLS(CACHE_KEY, []);
  mergeSessions();
  renderAll();                      // pinta de inmediato con la copia local
  await loadSessions();
  renderAll();
  flushPending();                   // sube lo que quedó pendiente de la vez pasada
}

/* ---------- Data ---------- */

async function loadSessions() {
  const { data, error } = await supabase
    .from('ngondro_sessions')
    .select('*')
    .order('practice_date', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) {
    console.error(error);
    // Antes esto dejaba la app en blanco sin decir nada: se veía igual que "se perdieron los datos".
    showNetMsg('Sin conexión con la base. Estás viendo la última copia guardada en tu celular.');
    if (!REMOTE.length) REMOTE = readLS(CACHE_KEY, []);
    mergeSessions();
    return;                       // conserva lo último bueno en vez de vaciar la lista
  }
  hideNetMsg();
  REMOTE = data;
  writeLS(CACHE_KEY, data);       // copia local: la app sigue mostrando tu avance sin señal
  mergeSessions();
}

function showNetMsg(txt) { const b = $('#netMsg'); if (b) { b.textContent = txt; b.classList.remove('hidden'); } }
function hideNetMsg() { const b = $('#netMsg'); if (b) b.classList.add('hidden'); }

function computeHoursByCat() {
  const map = {};
  for (const c of CATEGORIES) map[c.id] = 0;
  for (const s of SESSIONS) map[s.category_id] = (map[s.category_id] || 0) + s.minutes / 60;
  return map;
}

function computeTotals() {
  const totalHours = SESSIONS.reduce((a, s) => a + s.minutes / 60, 0);
  const totalProstrations = SESSIONS.reduce((a, s) => a + (s.prostrations || 0), 0);
  const byDay = {};
  for (const s of SESSIONS) byDay[s.practice_date] = (byDay[s.practice_date] || 0) + s.minutes;
  const retreatDays = new Set(SESSIONS.filter(s => s.retreat && byDay[s.practice_date] >= RETREAT_MIN_MIN).map(s => s.practice_date)).size;
  return { totalHours, totalProstrations, retreatDays, byDay };
}

function getFocusInfo(hoursByCat) {
  const seis = CATEGORIES.filter(c => c.group === 'seis').sort((a, b) => a.order - b.order);
  const bodhi = CATEGORIES.filter(c => c.group === 'bodhi').sort((a, b) => a.order - b.order);
  const n1 = CATEGORIES.find(c => c.id === 'n1');
  const n2 = CATEGORIES.find(c => c.id === 'n2');
  const seisCurrent = seis.find(c => (hoursByCat[c.id] || 0) < c.target);
  const bodhiCurrent = bodhi.find(c => (hoursByCat[c.id] || 0) < c.target);
  if (seisCurrent) return { phase: 'fase1', focusCat: seisCurrent, companion: n1 };
  if ((hoursByCat['n1'] || 0) < n1.target) return { phase: 'fase1', focusCat: n1, companion: null };
  if (bodhiCurrent) return { phase: 'fase2', focusCat: bodhiCurrent, companion: n2 };
  if ((hoursByCat['n2'] || 0) < n2.target) return { phase: 'fase2', focusCat: n2, companion: null };
  return { phase: 'completo', focusCat: null, companion: null };
}

const fmt = h => (Math.round(h * 10) / 10).toString().replace('.', ',');
const fmtHM = h => { const m = Math.round(h * 60); return m < 60 ? m + ' min' : fmt(h) + ' h'; };
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pct = (h, t) => Math.min(100, Math.round((h / t) * 100));

/* ---------- Render: Resumen ---------- */

function renderResumen() {
  const hoursByCat = computeHoursByCat();
  const { totalHours, totalProstrations, retreatDays } = computeTotals();
  const focus = getFocusInfo(hoursByCat);
  const totalTarget = CATEGORIES.reduce((a, c) => a + c.target, 0);

  const seisH = CATEGORIES.filter(c => c.group === 'seis').reduce((a, c) => a + (hoursByCat[c.id] || 0), 0);
  const bodhiH = CATEGORIES.filter(c => c.group === 'bodhi').reduce((a, c) => a + (hoursByCat[c.id] || 0), 0);
  const n1H = hoursByCat['n1'] || 0, n2H = hoursByCat['n2'] || 0;

  let focusHtml;
  if (focus.phase === 'completo') {
    focusHtml = `<div class="focusCard done">¡Completaste el Nivel 1 de Ngöndro! 🙏</div>`;
  } else {
    focusHtml = `
      <div class="focusCard">
        <div class="focusPhase">${focus.phase === 'fase1' ? 'Fase 1' : 'Fase 2'} · foco sugerido</div>
        <div class="focusName">${focus.focusCat.name}</div>
        <div class="miniBar"><div class="miniBarFill" style="width:${pct(hoursByCat[focus.focusCat.id] || 0, focus.focusCat.target)}%"></div></div>
        <div class="focusSub">${fmt(hoursByCat[focus.focusCat.id] || 0)} / ${focus.focusCat.target} h${focus.companion ? ' · en paralelo: ' + focus.companion.name : ''}</div>
        <button class="btnGhost" data-goto="${focus.focusCat.id}">Ir a practicar →</button>
      </div>`;
  }

  $('#resumenView').innerHTML = `
    <div class="hero" style="background-image:linear-gradient(180deg, rgba(26,15,31,0.15), rgba(26,15,31,0.95)), url('images/dorje-drolo.jpg')">
      <div class="heroTitle">Ngöndro · Dorje Drolo</div>
      <div class="heroSub">Nivel 1 — seguimiento de práctica</div>
    </div>
    ${focusHtml}
    <div class="statGrid">
      <div class="statCard"><div class="statNum">${fmtHM(totalHours)}</div><div class="statLbl">horas totales</div><div class="statSub">de ${totalTarget} h</div></div>
      <div class="statCard"><div class="statNum">${totalProstrations.toLocaleString()}</div><div class="statLbl">postraciones</div><div class="statSub">de 27,777–111,111</div></div>
      <div class="statCard"><div class="statNum">${retreatDays}</div><div class="statLbl">días de retiro</div><div class="statSub">de 4 (≥6h/día)</div></div>
    </div>
    <div class="phaseCard">
      <div class="phaseTitle">Fase 1 · Seis Pensamientos + Quietud/Movimiento</div>
      <div class="miniBar"><div class="miniBarFill" style="width:${pct(seisH, 51)}%"></div></div>
      <div class="phaseSub">${fmt(seisH)} / 51 h</div>
      <div class="miniBar"><div class="miniBarFill alt" style="width:${pct(n1H, 25)}%"></div></div>
      <div class="phaseSub">Naturaleza de la mente 1: ${fmt(n1H)} / 25 h</div>
    </div>
    <div class="phaseCard">
      <div class="phaseTitle">Fase 2 · Bodhichitta + Todos los Fenómenos</div>
      <div class="miniBar"><div class="miniBarFill" style="width:${pct(bodhiH, 50)}%"></div></div>
      <div class="phaseSub">${fmt(bodhiH)} / 50 h</div>
      <div class="miniBar"><div class="miniBarFill alt" style="width:${pct(n2H, 25)}%"></div></div>
      <div class="phaseSub">Naturaleza de la mente 2: ${fmt(n2H)} / 25 h</div>
    </div>
    <div class="teacherRow">
      <img src="images/maestro-1.jpg"><img src="images/maestro-2.jpg"><img src="images/maestro-3.jpg">
    </div>
    <div class="teacherCaption">Yongey Mingyur Rinpoché — Tergar</div>
  `;

  $('#resumenView [data-goto]')?.addEventListener('click', e => {
    goToPracticar(e.target.getAttribute('data-goto'));
  });
}

/* ---------- Render: Practicar ---------- */

function accordionItem(cat, hoursByCat, isFocus) {
  const h = hoursByCat[cat.id] || 0;
  const etapasHtml = cat.etapas.map(e => `<div class="etapa"><div class="etapaName">${e.name}</div><div class="etapaText">${e.text}</div></div>`).join('');
  const rotateNote = cat.rotate
    ? `<div class="rotateNote">Puedes alternar libremente entre estas etapas dentro de "${cat.name}".</div>`
    : `<div class="rotateNote">Practica estas etapas en el orden dado, una por varias sesiones antes de pasar a la siguiente.</div>`;
  return `
    <details class="acc" id="cat-${cat.id}" ${isFocus ? 'open' : ''}>
      <summary>
        <span class="accOrder">${cat.order}</span>
        <span class="accName">${cat.name}</span>
        ${isFocus ? '<span class="badge">sugerido</span>' : ''}
      </summary>
      <div class="accBody">
        <div class="miniBar"><div class="miniBarFill" style="width:${pct(h, cat.target)}%"></div></div>
        <div class="phaseSub">${fmt(h)} / ${cat.target} h</div>
        ${rotateNote}
        ${etapasHtml}
      </div>
    </details>`;
}

function renderPracticar() {
  const hoursByCat = computeHoursByCat();
  const focus = getFocusInfo(hoursByCat);
  const seis = CATEGORIES.filter(c => c.group === 'seis').sort((a, b) => a.order - b.order);
  const bodhi = CATEGORIES.filter(c => c.group === 'bodhi').sort((a, b) => a.order - b.order);
  const n1 = CATEGORIES.find(c => c.id === 'n1');
  const n2 = CATEGORIES.find(c => c.id === 'n2');

  const mantraLines = MANTRA_REFUGIO.lines.map(l => `<div class="mantraLine"><div class="mantraBo">${l.bo}</div><div class="mantraEs">${l.en}</div></div>`).join('');
  const refugioEtapas = REFUGIO.etapas.map(e => `<div class="etapa"><div class="etapaName">${e.name}</div><div class="etapaText">${e.text}</div></div>`).join('');

  $('#practicarView').innerHTML = `
    <div class="timerWidget">
      <div class="timerHead">
        <span>Timer de sesión</span>
        <input id="timerTotal" type="number" min="10" max="600" value="90" step="5"> min
      </div>
      <div id="retChips" class="chips"></div>
      <div id="retPlan" class="retPlan"></div>
      <div id="timerSegments"></div>
      <div id="timerStatus" class="timerStatus"></div>
      <div class="timerControls">
        <button id="timerStart" class="btnGhost">▶ Iniciar</button>
        <button id="timerPause" class="btnGhost">⏸ Pausar</button>
        <button id="timerReset" class="btnGhost">⟲ Reiniciar</button>
      </div>
    </div>

    <details class="acc">
      <summary><span class="accName">Apertura de la sesión</span></summary>
      <div class="accBody">
        <div class="etapa"><div class="etapaText">Comienza con los cantos de apertura y la liturgia de ngöndro. Establece tu motivación antes de entrar a la contemplación.</div></div>
      </div>
    </details>

    <div class="sectionLabel">Los Seis Pensamientos</div>
    ${seis.map(c => accordionItem(c, hoursByCat, focus.focusCat?.id === c.id)).join('')}

    <div class="sectionLabel">Refugio y Postraciones</div>
    <details class="acc" id="cat-refugio">
      <summary><span class="accName">Árbol de Refugio</span></summary>
      <div class="accBody">
        <img class="refugeImg" src="images/refugio-arbol.jpg">
        <div class="etapaText">Padmasambhava (Guru Rinpoché) al centro; alrededor, budas, el Dharma, la Sangha y los maestros del linaje; Dorje Drolo y los yidams debajo; los protectores más abajo. Todo el campo de méritos que tomas como refugio.</div>
        ${refugioEtapas}
      </div>
    </details>
    <details class="acc" open>
      <summary><span class="accName">${MANTRA_REFUGIO.title}</span></summary>
      <div class="accBody">
        <div class="mantraPlayer">
          <audio id="mantraAudio" src="audio/postraciones.m4a" preload="none"></audio>
          <div class="mantraControls">
            <button id="mantraPlay" class="btnGhost">▶ Reproducir en ciclo</button>
            <span id="mantraCount" class="mantraCount">0 repeticiones</span>
            <button id="mantraReset" class="btnGhost btnMini">⟲ 0</button>
          </div>
          <div class="mantraTarget">Meta: <input id="mantraTarget" type="number" min="1" value="20" style="width:56px"> repeticiones (se detiene solo al llegar)</div>
          ${mantraLines}
        </div>
      </div>
    </details>

    <div class="sectionLabel">Bodhichitta</div>
    ${bodhi.map(c => accordionItem(c, hoursByCat, focus.focusCat?.id === c.id)).join('')}

    <div class="sectionLabel">Naturaleza de la Mente</div>
    ${accordionItem(n1, hoursByCat, focus.companion?.id === 'n1')}
    ${accordionItem(n2, hoursByCat, focus.companion?.id === 'n2')}

    <details class="acc">
      <summary><span class="accName">Dedicación y cierre</span></summary>
      <div class="accBody">
        <div class="etapa"><div class="etapaText">Dedica el mérito de tu sesión al beneficio de todos los seres. Cierra con los cantos de dedicación de la liturgia.</div></div>
      </div>
    </details>
  `;

  renderTimerSegments();
  initMantraPlayer();
}

function goToPracticar(catId) {
  setTab('practicar');
  requestAnimationFrame(() => {
    const el = document.getElementById('cat-' + catId);
    if (el) { el.open = true; el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
}

/* ---------- Timer ---------- */

/* ---------- Preajustes de retiro ----------
   Los horarios de retiro viven aquí, donde se usan: eligiendo "Retiro 8 h" el timer
   se reconfigura al largo de UNA de las 5 sesiones del día y te muestra el plan. */
let retreatIdx = null;      // null = sesión normal
let retreatSession = 0;

const retreatPerSession = r => Math.round(r.hours * 60 / r.sessions);

function retreatChipsHTML() {
  const chip = (label, active, val) => `<button type="button" class="chip${active ? ' chipOn' : ''}" data-ret="${val}">${label}</button>`;
  return chip('Sesión normal', retreatIdx === null, 'none') +
    RETREAT_SCHEDULES.map((r, i) => chip('Retiro ' + r.hours + ' h', retreatIdx === i, i)).join('');
}

function retreatPlanHTML() {
  if (retreatIdx === null) return '';
  const r = RETREAT_SCHEDULES[retreatIdx];
  const per = retreatPerSession(r);
  const items = Array.from({ length: r.sessions }, (_, i) =>
    `<button type="button" class="retSes${i === retreatSession ? ' retSesOn' : ''}" data-ses="${i}">
       <span>Sesión ${i + 1} de ${r.sessions}</span><span>${per} min</span>
     </button>`).join('');
  return `<div class="retNote">${r.note}</div>${items}
    <div class="fieldHint">Cada una de las ${r.sessions} sesiones lleva el mismo reparto de etapas que una sesión normal, en ${per} min. Toca una para poner el timer en esa sesión.</div>`;
}

function applyRetreat() {
  const total = retreatIdx === null ? 90 : retreatPerSession(RETREAT_SCHEDULES[retreatIdx]);
  const inp = $('#timerTotal');
  if (inp) inp.value = total;
  const chips = $('#retChips'); if (chips) chips.innerHTML = retreatChipsHTML();
  const plan = $('#retPlan'); if (plan) plan.innerHTML = retreatPlanHTML();
  wireRetreat();
  resetTimer();
}

function wireRetreat() {
  document.querySelectorAll('#retChips .chip').forEach(b => b.addEventListener('click', () => {
    const v = b.dataset.ret;
    retreatIdx = v === 'none' ? null : Number(v);
    retreatSession = 0;
    applyRetreat();
  }));
  document.querySelectorAll('#retPlan .retSes').forEach(b => b.addEventListener('click', () => {
    retreatSession = Number(b.dataset.ses);
    applyRetreat();
  }));
}

/* El timer se ancla a la hora del reloj, no a cuántas veces corrió setInterval.
   Antes, al bloquear el celular el navegador congelaba el intervalo y la sesión
   se quedaba corta o detenida. Ahora el tiempo transcurrido se calcula siempre
   como (ahora - anclaje) y el intervalo solo sirve para repintar. */
let timerState = { running: false, segIndex: 0, remaining: 0, interval: null, segments: [], elapsed: 0, anchor: 0, done: false };

function computeSegments(totalMinutes) {
  return SESSION_TEMPLATE.map(s => ({ ...s, seconds: Math.max(1, Math.round(s.pct * totalMinutes * 60)) }));
}

function totalSeconds() { return timerState.segments.reduce((a, s) => a + s.seconds, 0); }

function elapsedSeconds() {
  return timerState.running
    ? timerState.elapsed + Math.floor((Date.now() - timerState.anchor) / 1000)
    : timerState.elapsed;
}

/* Del tiempo transcurrido deduce en qué segmento vamos y cuánto le queda. */
function syncFromElapsed() {
  const el = Math.min(elapsedSeconds(), totalSeconds());
  let acc = 0, i = 0;
  for (; i < timerState.segments.length; i++) {
    const seg = timerState.segments[i];
    if (el < acc + seg.seconds) { timerState.segIndex = i; timerState.remaining = acc + seg.seconds - el; return; }
    acc += seg.seconds;
  }
  timerState.segIndex = timerState.segments.length - 1;
  timerState.remaining = 0;
  timerState.done = true;
}

function renderTimerSegments() {
  if (retreatIdx !== null) $('#timerTotal').value = retreatPerSession(RETREAT_SCHEDULES[retreatIdx]);
  $('#retChips').innerHTML = retreatChipsHTML();
  $('#retPlan').innerHTML = retreatPlanHTML();
  wireRetreat();
  const total = Number($('#timerTotal')?.value || 90);
  if (!timerState.running) timerState.segments = computeSegments(total);
  syncFromElapsed();
  drawSegments();
  $('#timerTotal').addEventListener('change', () => { resetTimer(); });
  $('#timerStart').addEventListener('click', startTimer);
  $('#timerPause').addEventListener('click', pauseTimer);
  $('#timerReset').addEventListener('click', resetTimer);
}

function drawSegments() {
  const box = $('#timerSegments');
  if (!box) return;
  box.innerHTML = timerState.segments.map((s, i) => {
    const active = i === timerState.segIndex && timerState.running;
    const mins = Math.round(s.seconds / 60);
    const remainMins = (i === timerState.segIndex && (timerState.running || timerState.elapsed > 0))
      ? Math.ceil(timerState.remaining / 60) : mins;
    const done = timerState.done || i < timerState.segIndex;
    return `<div class="seg ${active ? 'segActive' : ''} ${done ? 'segDone' : ''}">
      <span>${s.name}</span><span>${remainMins} min</span>
    </div>`;
  }).join('');
  const st = $('#timerStatus');
  if (st) {
    const el = Math.min(elapsedSeconds(), totalSeconds());
    st.textContent = timerState.done
      ? 'Sesión completa · ' + Math.round(totalSeconds() / 60) + ' min'
      : `${Math.floor(el / 60)}:${String(el % 60).padStart(2, '0')} de ${Math.round(totalSeconds() / 60)} min`;
  }
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    osc.frequency.value = 528;
    osc.connect(ctx.destination);
    osc.start();
    setTimeout(() => osc.stop(), 300);
  } catch (e) {}
  if (navigator.vibrate) navigator.vibrate(200);
}

function startTimer() {
  if (timerState.running) return;
  if (timerState.done) resetTimer();          // ▶ tras terminar reiniciaba mal y reventaba
  timerState.running = true;
  timerState.anchor = Date.now();
  let lastSeg = timerState.segIndex;
  clearInterval(timerState.interval);
  timerState.interval = setInterval(() => {
    syncFromElapsed();
    if (timerState.done) {
      pauseTimer();
      beep();
      drawSegments();
      return;
    }
    if (timerState.segIndex !== lastSeg) { lastSeg = timerState.segIndex; beep(); }
    drawSegments();
  }, 1000);
  drawSegments();
}

function pauseTimer() {
  if (timerState.running) timerState.elapsed = elapsedSeconds();
  timerState.running = false;
  clearInterval(timerState.interval);
  timerState.interval = null;
  drawSegments();
}

function resetTimer() {
  clearInterval(timerState.interval);
  timerState = { running: false, segIndex: 0, remaining: 0, interval: null, elapsed: 0, anchor: 0, done: false,
                 segments: computeSegments(Number($('#timerTotal')?.value || 90)) };
  syncFromElapsed();
  drawSegments();
}

/* ---------- Mantra player ---------- */

let mantraCount = 0;

function initMantraPlayer() {
  const audio = $('#mantraAudio');
  const btn = $('#mantraPlay');
  const countEl = $('#mantraCount');
  // No se reinicia en cero: cualquier re-dibujo de la vista te borraba el conteo.
  countEl.textContent = mantraCount + ' repeticiones';
  const play = () => audio.play().catch(() => { countEl.textContent = mantraCount + ' repeticiones · toca ▶ otra vez'; });
  audio.addEventListener('ended', () => {
    mantraCount++;
    countEl.textContent = mantraCount + ' repeticiones';
    const target = Number($('#mantraTarget').value || 20);
    if (mantraCount < target) play();
    else { btn.textContent = '▶ Reproducir en ciclo'; }
  });
  btn.addEventListener('click', () => {
    if (audio.paused) { play(); btn.textContent = '⏸ Detener ciclo'; }
    else { audio.pause(); btn.textContent = '▶ Reproducir en ciclo'; }
  });
  $('#mantraReset')?.addEventListener('click', () => {
    mantraCount = 0;
    countEl.textContent = '0 repeticiones';
  });
}

/* ---------- Render: Registrar ---------- */

function renderRegistrar() {
  const groups = { seis: [], bodhi: [], mente: [] };
  for (const c of CATEGORIES.slice().sort((a, b) => a.order - b.order)) groups[c.group].push(c);
  const opt = c => `<option value="${c.id}">${c.order}. ${c.name}</option>`;

  $('#registrarView').innerHTML = `
    <form id="regForm" class="regForm">
      <label>Fecha<input type="date" id="regDate" required></label>
      <label>Categoría
        <select id="regCat" required>
          <optgroup label="${GROUP_LABEL.seis}">${groups.seis.map(opt).join('')}</optgroup>
          <optgroup label="${GROUP_LABEL.mente}">${groups.mente.map(opt).join('')}</optgroup>
          <optgroup label="${GROUP_LABEL.bodhi}">${groups.bodhi.map(opt).join('')}</optgroup>
        </select>
      </label>
      <label>Minutos<input type="number" id="regMin" min="1" required></label>
      <label>Postraciones<input type="number" id="regProst" min="0" value="0"></label>
      <label class="checkRow"><input type="checkbox" id="regRetreat"> Fue día de retiro</label>
      <div class="fieldHint">Solo cuenta como día de retiro si ese día suma 6 h o más entre todas tus sesiones.</div>
      <label>Notas<textarea id="regNotes" rows="2"></textarea></label>
      <button class="btnPrimary" type="submit">Guardar sesión</button>
      <div id="regMsg" class="regMsg"></div>
    </form>
    <div class="sectionLabel">Últimas sesiones</div>
    <div id="regList"></div>
  `;
  $('#regDate').value = lastRegDate || localDateStr();
  // Con un retiro activo en Practicar, el formulario llega prellenado (se puede cambiar).
  if (retreatIdx !== null) {
    $('#regMin').value = retreatPerSession(RETREAT_SCHEDULES[retreatIdx]);
    $('#regRetreat').checked = true;
  }
  $('#regForm').addEventListener('submit', onSaveSession);
  renderRegList();
}

function renderRegList() {
  const list = SESSIONS.slice(0, 20);
  $('#regList').innerHTML = list.map(s => {
    const cat = CATEGORIES.find(c => c.id === s.category_id);
    return `<div class="regRow">
      <div>
        <div><b>${s.practice_date}</b> · ${cat ? cat.name : s.category_id} · ${s.minutes} min${s.prostrations ? ' · ' + s.prostrations + ' postr.' : ''}${s.retreat ? ' · retiro' : ''}${s._pending ? ' <span class="pendTag">⏳ por subir</span>' : ''}</div>
        ${s.notes ? `<div class="regNote">${esc(s.notes)}</div>` : ''}
      </div>
      <button class="btnDelete" data-id="${s.id}">✕</button>
    </div>`;
  }).join('') || '<div class="empty">Aún no hay sesiones registradas.</div>';

  // Delegación en el contenedor: el botón es chico y antes cualquier fallo era mudo.
  // Se engancha una sola vez: renderRegList corre en cada re-dibujo y los apilaba.
  if ($('#regList').dataset.wired) return;
  $('#regList').dataset.wired = '1';
  $('#regList').addEventListener('click', async ev => {
    const btn = ev.target.closest('.btnDelete');
    if (!btn || btn.disabled) return;
    const id = btn.getAttribute('data-id');
    btn.disabled = true;
    btn.textContent = '…';
    if (id.startsWith('local-')) {          // aún no sube: se saca de la cola y ya
      PENDING = PENDING.filter(p => p.localId !== id);
      writeLS(PENDING_KEY, PENDING);
      mergeSessions();
      renderAll();
      const ml = $('#regMsg'); ml.className = 'regMsg ok'; ml.textContent = '✓ Sesión borrada';
      return;
    }
    // .select() devuelve las filas borradas: si vuelve vacío, NO se borró (aunque no haya error).
    const { data, error } = await supabase.from('ngondro_sessions').delete().eq('id', id).select();
    const m = $('#regMsg');
    if (error || !data || !data.length) {
      btn.disabled = false;
      btn.textContent = '✕';
      m.className = 'regMsg err';
      m.textContent = 'No se pudo borrar: ' + (error ? error.message : 'la base no devolvió la sesión');
      return;
    }
    await loadSessions();
    renderAll();
    const m2 = $('#regMsg');
    m2.className = 'regMsg ok';
    m2.textContent = '✓ Sesión borrada';
  });
}

async function onSaveSession(e) {
  e.preventDefault();
  const btn = e.target.querySelector('button[type=submit]');
  if (btn.disabled) return;                       // evita guardar dos veces del mismo toque
  btn.disabled = true; btn.textContent = 'Guardando...';
  const row = {
    practice_date: $('#regDate').value,
    category_id: $('#regCat').value,
    minutes: Number($('#regMin').value),
    prostrations: Number($('#regProst').value || 0),
    retreat: $('#regRetreat').checked,
    notes: $('#regNotes').value || null
  };
  const { error } = await supabase.from('ngondro_sessions').insert(row);
  if (error) {
    // No se pierde: se queda en el celular y se sube sola al volver la señal.
    queueSession(row);
    lastRegDate = row.practice_date;
    renderAll();
    btn.disabled = false; btn.textContent = 'Guardar sesión';
    const m = $('#regMsg'); m.className = 'regMsg ok';
    m.textContent = `✓ Guardada en tu celular · ${row.practice_date} · ${row.minutes} min · se sube sola al haber señal`;
    return;
  }
  lastRegDate = row.practice_date;
  await loadSessions();
  renderAll();                                    // vuelve a dibujar el form vacío
  const m = $('#regMsg'); m.className = 'regMsg ok';
  const cat = CATEGORIES.find(c => c.id === row.category_id);
  m.textContent = `✓ Guardada · ${row.practice_date} · ${cat ? cat.name : row.category_id} · ${row.minutes} min`;
}

/* ---------- Render: Calendario ---------- */

function renderCalendario() {
  drawCalendar();   // los botones ← → se enlazan dentro de drawCalendar (#calPrevIn / #calNextIn)
}

function drawCalendar() {
  const { byDay } = computeTotals();
  const y = calMonth.getFullYear(), m = calMonth.getMonth();
  const first = new Date(y, m, 1);
  const startOffset = (first.getDay() + 6) % 7; // lunes=0
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

  let cells = '';
  for (let i = 0; i < startOffset; i++) cells += '<div class="calCell empty"></div>';
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const mins = byDay[dateStr] || 0;
    let lvl = '';
    if (mins > 0) lvl = mins >= 90 ? 'l3' : (mins >= 30 ? 'l2' : 'l1');
    const isToday = dateStr === localDateStr() ? ' today' : '';
    cells += `<div class="calCell ${lvl}${isToday}" data-date="${dateStr}">${d}</div>`;
  }

  $('#calGrid').innerHTML = `
    <div class="calHead">
      <button id="calPrevIn" class="btnGhost">←</button>
      <span>${monthNames[m]} ${y}</span>
      <button id="calNextIn" class="btnGhost">→</button>
    </div>
    <div class="calWeek"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
    <div class="calGridInner">${cells}</div>
  `;
  // Siempre desde el día 1: setMonth sobre un 31 saltaba de marzo a mayo.
  $('#calPrevIn').addEventListener('click', () => { calMonth = new Date(y, m - 1, 1); $('#calDetail').innerHTML = ''; drawCalendar(); });
  $('#calNextIn').addEventListener('click', () => { calMonth = new Date(y, m + 1, 1); $('#calDetail').innerHTML = ''; drawCalendar(); });
  $$('.calCell[data-date]').forEach(c => c.addEventListener('click', () => showDayDetail(c.getAttribute('data-date'))));
}

function showDayDetail(dateStr) {
  const rows = SESSIONS.filter(s => s.practice_date === dateStr);
  const box = $('#calDetail');
  if (!rows.length) { box.innerHTML = `<div class="empty">Sin sesiones el ${dateStr}.</div>`; return; }
  box.innerHTML = `<div class="sectionLabel">${dateStr}</div>` + rows.map(s => {
    const cat = CATEGORIES.find(c => c.id === s.category_id);
    return `<div class="regRow"><div>
      <div>${cat ? cat.name : s.category_id} · ${s.minutes} min${s.prostrations ? ' · ' + s.prostrations + ' postr.' : ''}${s.retreat ? ' · retiro' : ''}</div>
      ${s.notes ? `<div class="regNote">${esc(s.notes)}</div>` : ''}
    </div></div>`;
  }).join('');
}

/* ---------- Tabs ---------- */

function setTab(name) {
  $$('.tabBtn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  $$('.tabView').forEach(v => v.classList.toggle('active', v.id === name + 'View'));
  if (name === 'registrar') syncRegRetreat();
}

/* Al entrar a Registrar con un retiro activo, prellena minutos y la casilla.
   Solo si no has escrito nada: nunca pisa lo que tú capturaste. */
function syncRegRetreat() {
  if (retreatIdx === null || !$('#regMin')) return;
  if ($('#regMin').value) return;
  $('#regMin').value = retreatPerSession(RETREAT_SCHEDULES[retreatIdx]);
  $('#regRetreat').checked = true;
}

function initTabs() {
  $$('.tabBtn').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));
}

function renderAll() {
  // Si el timer está corriendo, no se re-dibuja Practicar: lo mataría a media sesión.
  const views = timerState.running
    ? [renderResumen, renderRegistrar, renderCalendario]
    : [renderResumen, renderPracticar, renderRegistrar, renderCalendario];
  for (const fn of views) {
    try { fn(); } catch (err) { console.error('Falló el render de', fn.name, err); }
  }
}

initTabs();
initAuth();

// Reintentar la subida al volver la señal, al volver a la app, y a mano tocando el aviso.
window.addEventListener('online', flushPending);
document.addEventListener('visibilitychange', () => { if (!document.hidden) flushPending(); });
$('#syncMsg')?.addEventListener('click', flushPending);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
