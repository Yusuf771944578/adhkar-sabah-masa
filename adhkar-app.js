/* منطق صفحات الأقسام - حصني */
const SEC = (window.SECTIONS && window.SECTIONS[window.SECTION_KEY]) || window.SECTIONS.morning;
const TAB = SEC.key;
const LIST = SEC.list;
let progress = {};
try { progress = JSON.parse(localStorage.getItem('adhkari-progress') || '{}'); } catch (e) { progress = {}; }

function remaining(item) {
  const done = progress[TAB + '-' + item.id] || 0;
  return Math.max(0, item.count - done);
}
function save() { localStorage.setItem('adhkari-progress', JSON.stringify(progress)); }

function countLabel(n) {
  if (n === 1) return 'مرة واحدة';
  if (n === 2) return 'مرتان';
  if (n <= 10) return n + ' مرات';
  return n + ' مرة';
}

function tap(id) {
  const item = LIST.find((x) => x.id === id);
  if (!item) return;
  const k = TAB + '-' + id;
  const done = progress[k] || 0;
  if (done < item.count) {
    progress[k] = done + 1;
    if (vibOn && navigator.vibrate) navigator.vibrate(15);
    if (soundOn) { blip(); if (done + 1 === item.count) chime(); }
  }
  save(); render(false);
}
function resetOne(id) {
  delete progress[TAB + '-' + id];
  save(); render(false);
}
function resetAll() {
  if (!confirm('هل تريد تصفير تقدم ' + SEC.title + '؟')) return;
  Object.keys(progress).filter((k) => k.indexOf(TAB + '-') === 0).forEach((k) => delete progress[k]);
  save(); render();
}

function render() {
  const wrap = document.getElementById('cards');
  wrap.innerHTML = '';
  let doneCount = 0;
  LIST.forEach((item, i) => {
    const rem = remaining(item);
    const done = item.count - rem;
    if (rem === 0) doneCount++;
    const card = document.createElement('div');
    card.className = 'card' + (rem === 0 ? ' done' : '') + ((item.quran || item.count === 1) ? ' full' : '');
    const badge = item.count > 1
      ? '<span class="count-badge">يُقال ' + countLabel(item.count) + ' • المتبقي ' + rem + '</span>'
      : '<span class="count-badge">مرة واحدة</span>';
    let counterHtml = '';
    if (item.count > 1) {
      if (rem > 0) {
        counterHtml = '<div class="counter-row">'
          + '<button class="sebha-btn" onclick="tap(\'' + item.id + '\')" aria-label="اضغط للتسبيح"><span class="remain">' + rem + '</span></button>'
          + '<button class="reset-btn" onclick="resetOne(\'' + item.id + '\')">↺</button></div>'
          + '<div style="font-size:.82em;color:var(--muted);margin-top:.3rem">تم: ' + done + ' / ' + item.count + ' — اضغط الرقم مع كل مرة</div>';
      } else {
        counterHtml = '<div class="counter-row"><span class="done-label">✓ تم بحمد الله (' + item.count + '/' + item.count + ')</span>'
          + '<button class="reset-btn" onclick="resetOne(\'' + item.id + '\')">إعادة ↺</button></div>';
      }
    } else {
      if (rem > 0) {
        counterHtml = '<div class="counter-row"><button class="sebha-btn single-btn" onclick="tap(\'' + item.id + '\')">✓ تم الذكر</button></div>';
      } else {
        counterHtml = '<div class="counter-row"><span class="done-label">✓ تم بحمد الله</span>'
          + '<button class="reset-btn" onclick="resetOne(\'' + item.id + '\')">إعادة ↺</button></div>';
      }
    }
    card.innerHTML = '<div class="card-top"><div class="num">' + (i + 1) + '</div>'
      + '<span class="dhikr-title">' + item.title + '</span><span style="flex:1"></span>' + badge + '</div>'
      + '<div class="dhikr-text ' + (item.quran ? 'quran' : '') + '">' + item.text + '</div>'
      + '<div class="meta"><div class="virtue" onclick="this.classList.toggle(\'open\')">'
      + '<div>💎 <b>الفضل:</b> ' + item.virtue + '</div>'
      + '<div class="fulltext">📜 <b>الحديث كاملًا:</b> ' + ((window.FULL && window.FULL[item.id]) || item.virtue) + '</div>'
      + '<span class="more-hint">▾ اضغط لعرض الحديث كاملًا</span></div>'
      + '<div class="source">📖 <b>المصدر:</b> <strong>' + item.source + '</strong></div></div>'
      + counterHtml;
    wrap.appendChild(card);
  });
  const pct = LIST.length ? Math.round(doneCount / LIST.length * 100) : 0;
  document.getElementById('progText').textContent = doneCount + ' / ' + LIST.length + ' مكتمل';
  document.getElementById('progPct').textContent = pct + '%';
  document.getElementById('barFill').style.width = pct + '%';
  if (pct === 100) document.getElementById('progText').textContent += ' — تقبّل الله منك 🎉';
  if (doneCount === LIST.length && LIST.length > 0) recordDay(TAB);
  renderStreak();
}

/* الصوت والاهتزاز */
let soundOn = localStorage.getItem('adhkari-sound') !== '0';
let vibOn = localStorage.getItem('adhkari-vib') !== '0';
let AC = null;
function tone(f, delay, dur, vol) {
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    if (AC.state === 'suspended') AC.resume();
    const t = AC.currentTime + delay;
    const o = AC.createOscillator(), g = AC.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol || 0.08, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(AC.destination);
    o.start(t); o.stop(t + dur + 0.05);
  } catch (e) {}
}
function blip() { tone(660, 0, 0.12); }
function chime() { tone(523, 0, 0.2); tone(659, 0.12, 0.2); tone(784, 0.24, 0.35); }
function toggleSound() { soundOn = !soundOn; localStorage.setItem('adhkari-sound', soundOn ? '1' : '0'); syncSettingsUI(); }
function toggleVib() { vibOn = !vibOn; localStorage.setItem('adhkari-vib', vibOn ? '1' : '0'); syncSettingsUI(); }
function syncSettingsUI() {
  const s = document.getElementById('soundBtn'), v = document.getElementById('vibBtn');
  if (s) s.textContent = soundOn ? '🔊 الصوت' : '🔇 كتم';
  if (v) v.textContent = vibOn ? '📳 الاهتزاز' : '🚫 بدون اهتزاز';
}

/* سجل الإنجاز */
function todayStr(d) {
  d = d || new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function getDays() { try { return JSON.parse(localStorage.getItem('adhkari-days') || '{}'); } catch (e) { return {}; } }
function recordDay(tab) {
  const days = getDays(), t = todayStr();
  days[t] = days[t] || [];
  if (!days[t].includes(tab)) { days[t].push(tab); localStorage.setItem('adhkari-days', JSON.stringify(days)); }
}
function calcStreak(days) {
  let s = 0; const d = new Date();
  if (!days[todayStr(d)]) d.setDate(d.getDate() - 1);
  while (days[todayStr(d)]) { s++; d.setDate(d.getDate() - 1); }
  return s;
}
function renderStreak() {
  const el = document.getElementById('streak');
  if (!el) return;
  const days = getDays(), keys = Object.keys(days), streak = calcStreak(days);
  let dots = '';
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const on = !!days[todayStr(d)];
    dots += '<span class="day-dot' + (on ? ' on' : '') + (i === 0 ? ' today' : '') + '" title="' + todayStr(d) + '">' + (on ? '✓' : d.getDate()) + '</span>';
  }
  el.innerHTML = '🔥 سلسلة الإنجاز: <b>' + streak + ' يوم</b> • مجموع الأيام: <b>' + keys.length + '</b> ' + dots + '<span>أكمل أذكار أي قسم يوميًا لتكبر سلسلتك 🏆</span>';
}

/* الثيم والخط */
function toggleTheme() {
  const h = document.documentElement;
  const next = h.dataset.theme === 'light' ? 'dark' : 'light';
  h.dataset.theme = next;
  localStorage.setItem('adhkari-theme', next);
  document.getElementById('themeBtn').textContent = next === 'light' ? '🌙 ليلي' : '☀️ نهاري';
}
function changeFont(d) {
  let s = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--font-scale')) || 1;
  s = Math.min(1.4, Math.max(0.85, +(s + d).toFixed(2)));
  document.documentElement.style.setProperty('--font-scale', s);
  localStorage.setItem('adhkari-font', s);
  document.getElementById('fontPct').textContent = Math.round(s * 100) + '%';
}
function resetFont() {
  document.documentElement.style.setProperty('--font-scale', 1);
  localStorage.setItem('adhkari-font', 1);
  document.getElementById('fontPct').textContent = '100%';
}

/* تهيئة */
(function () {
  document.getElementById('secTitle').textContent = SEC.emoji + ' ' + SEC.title;
  document.getElementById('timeInfo').textContent = SEC.info;
  document.title = SEC.title + ' | حصني';
  const th = localStorage.getItem('adhkari-theme');
  if (th) {
    document.documentElement.dataset.theme = th;
    document.getElementById('themeBtn').textContent = th === 'light' ? '🌙 ليلي' : '☀️ نهاري';
  }
  const f = parseFloat(localStorage.getItem('adhkari-font') || '1');
  if (f !== 1) document.documentElement.style.setProperty('--font-scale', f);
  document.getElementById('fontPct').textContent = Math.round((f || 1) * 100) + '%';
  syncSettingsUI();
  try {
    const h = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
    const m = new Intl.DateTimeFormat('ar', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
    document.getElementById('hijri').textContent = m + ' • ' + h;
  } catch (e) {}
  render();
})();
