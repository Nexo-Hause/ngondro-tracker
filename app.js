import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = 'https://clksteocpzsydpozasrl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNsa3N0ZW9jcHpzeWRwb3phc3JsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIxNTEzMDksImV4cCI6MjA4NzcyNzMwOX0.JLFkzLONVKlKEZmWjhShk_-32shPXpXULRGAlGEgGP0';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let SESSIONS = [];
let currentUser = null;
let calMonth = new Date();

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
  await loadSessions();
  renderAll();
}

/* ---------- Data ---------- */

async function loadSessions() {
  const { data, error } = await supabase
    .from('ngondro_sessions')
    .select('*')
    .order('practice_date', { ascending: false });
  if (error) { console.error(error); SESSIONS = []; return; }
  SESSIONS = data;
}

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
  const seisCurrent = seis.find(c => (hoursByCat[c.id] || 0) < c.target);
  const bodhiCurrent = bodhi.find(c => (hoursByCat[c.id] || 0) < c.target);
  if (seisCurrent) return { phase: 'fase1', focusCat: seisCurrent, companion: CATEGORIES.find(c => c.id === 'n1') };
  if (bodhiCurrent) return { phase: 'fase2', focusCat: bodhiCurrent, companion: CATEGORIES.find(c => c.id === 'n2') };
  return { phase: 'completo', focusCat: null, companion: null };
}

const fmt = h => (Math.round(h * 10) / 10).toString().replace('.', ',');
const fmtHM = h => { const m = Math.round(h * 60); return m < 60 ? m + ' min' : fmt(h) + ' h'; };
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
        <div class="focusSub">${fmt(hoursByCat[focus.focusCat.id] || 0)} / ${focus.focusCat.target} h · en paralelo: ${focus.companion.name}</div>
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

  const mantraLines = MANTRA_REFUGIO.lines.map(l => `<div class="mantraLine"><div class="mantraBo">${l.bo}</div><div class="mantraEs">${l.es}</div></div>`).join('');
  const refugioEtapas = REFUGIO.etapas.map(e => `<div class="etapa"><div class="etapaName">${e.name}</div><div class="etapaText">${e.text}</div></div>`).join('');

  $('#practicarView').innerHTML = `
    <div class="timerWidget">
      <div class="timerHead">
        <span>Timer de sesión</span>
        <input id="timerTotal" type="number" min="10" max="600" value="90" step="5"> min
      </div>
      <div id="timerSegments"></div>
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

let timerState = { running: false, segIndex: 0, remaining: 0, interval: null, segments: [] };

function computeSegments(totalMinutes) {
  return SESSION_TEMPLATE.map(s => ({ ...s, seconds: Math.max(1, Math.round(s.pct * totalMinutes * 60)) }));
}

function renderTimerSegments() {
  const total = Number($('#timerTotal')?.value || 90);
  timerState.segments = computeSegments(total);
  drawSegments();
  $('#timerTotal').addEventListener('change', () => {
    resetTimer();
  });
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
    const remainMins = i === timerState.segIndex ? Math.ceil(timerState.remaining / 60) : mins;
    return `<div class="seg ${active ? 'segActive' : ''} ${i < timerState.segIndex ? 'segDone' : ''}">
      <span>${s.name}</span><span>${remainMins} min</span>
    </div>`;
  }).join('');
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
  if (timerState.remaining <= 0) timerState.remaining = timerState.segments[timerState.segIndex].seconds;
  timerState.running = true;
  timerState.interval = setInterval(() => {
    timerState.remaining--;
    if (timerState.remaining <= 0) {
      timerState.segIndex++;
      if (timerState.segIndex >= timerState.segments.length) {
        clearInterval(timerState.interval);
        timerState.running = false;
        beep();
        drawSegments();
        return;
      }
      timerState.remaining = timerState.segments[timerState.segIndex].seconds;
      beep();
    }
    drawSegments();
  }, 1000);
  drawSegments();
}

function pauseTimer() {
  timerState.running = false;
  clearInterval(timerState.interval);
  drawSegments();
}

function resetTimer() {
  clearInterval(timerState.interval);
  timerState = { running: false, segIndex: 0, remaining: 0, interval: null, segments: computeSegments(Number($('#timerTotal')?.value || 90)) };
  drawSegments();
}

/* ---------- Mantra player ---------- */

let mantraCount = 0;

function initMantraPlayer() {
  const audio = $('#mantraAudio');
  const btn = $('#mantraPlay');
  const countEl = $('#mantraCount');
  mantraCount = 0;
  audio.addEventListener('ended', () => {
    mantraCount++;
    countEl.textContent = mantraCount + ' repeticiones';
    const target = Number($('#mantraTarget').value || 20);
    if (mantraCount < target) audio.play();
    else { btn.textContent = '▶ Reproducir en ciclo'; }
  });
  btn.addEventListener('click', () => {
    if (audio.paused) { audio.play(); btn.textContent = '⏸ Detener ciclo'; }
    else { audio.pause(); btn.textContent = '▶ Reproducir en ciclo'; }
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
      <label>Notas<textarea id="regNotes" rows="2"></textarea></label>
      <button class="btnPrimary" type="submit">Guardar sesión</button>
      <div id="regMsg" class="regMsg"></div>
    </form>
    <div class="sectionLabel">Últimas sesiones</div>
    <div id="regList"></div>
  `;
  $('#regDate').value = lastRegDate || localDateStr();
  $('#regForm').addEventListener('submit', onSaveSession);
  renderRegList();
}

function renderRegList() {
  const list = SESSIONS.slice(0, 20);
  $('#regList').innerHTML = list.map(s => {
    const cat = CATEGORIES.find(c => c.id === s.category_id);
    return `<div class="regRow">
      <div><b>${s.practice_date}</b> · ${cat ? cat.name : s.category_id} · ${s.minutes} min${s.prostrations ? ' · ' + s.prostrations + ' postr.' : ''}${s.retreat ? ' · retiro' : ''}</div>
      <button class="btnDelete" data-id="${s.id}">✕</button>
    </div>`;
  }).join('') || '<div class="empty">Aún no hay sesiones registradas.</div>';

  // Delegación en el contenedor: el botón es chico y antes cualquier fallo era mudo.
  $('#regList').addEventListener('click', async ev => {
    const btn = ev.target.closest('.btnDelete');
    if (!btn || btn.disabled) return;
    const id = btn.getAttribute('data-id');
    btn.disabled = true;
    btn.textContent = '…';
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
    btn.disabled = false; btn.textContent = 'Guardar sesión';
    const m = $('#regMsg'); m.className = 'regMsg err';
    m.textContent = 'No se guardó: ' + error.message;
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
  $('#calPrevIn').addEventListener('click', () => { calMonth.setMonth(calMonth.getMonth() - 1); drawCalendar(); });
  $('#calNextIn').addEventListener('click', () => { calMonth.setMonth(calMonth.getMonth() + 1); drawCalendar(); });
  $$('.calCell[data-date]').forEach(c => c.addEventListener('click', () => showDayDetail(c.getAttribute('data-date'))));
}

function showDayDetail(dateStr) {
  const rows = SESSIONS.filter(s => s.practice_date === dateStr);
  const box = $('#calDetail');
  if (!rows.length) { box.innerHTML = `<div class="empty">Sin sesiones el ${dateStr}.</div>`; return; }
  box.innerHTML = `<div class="sectionLabel">${dateStr}</div>` + rows.map(s => {
    const cat = CATEGORIES.find(c => c.id === s.category_id);
    return `<div class="regRow"><div>${cat ? cat.name : s.category_id} · ${s.minutes} min${s.prostrations ? ' · ' + s.prostrations + ' postr.' : ''}</div></div>`;
  }).join('');
}

/* ---------- Tabs ---------- */

function setTab(name) {
  $$('.tabBtn').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
  $$('.tabView').forEach(v => v.classList.toggle('active', v.id === name + 'View'));
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

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}
