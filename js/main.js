import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { PLAN } from './plan.js';
import { createWorld, ROOMS } from './world.js';
import { STYLES } from './materials.js';
import { Grid, FP, Tour } from './nav.js';
import { createEditor } from './edit.js';
import { TYPES, CATS, ICONS } from './items.js';

const $ = id => document.getElementById(id);
const mobile = /iPhone|iPad|Android|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && innerWidth < 900);
const canvas = $('c');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance', preserveDrawingBuffer: false });
  if (!renderer.getContext()) throw new Error('no gl');
} catch (e) { $('load').classList.add('off'); $('fail').classList.add('on'); $('retry').onclick = () => location.reload(); throw e; }
canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); $('fail').classList.add('on'); $('retry').onclick = () => location.reload(); });
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.outputColorSpace = THREE.SRGBColorSpace;
let pr = Math.min(devicePixelRatio || 1, mobile ? 1.75 : 2); renderer.setPixelRatio(pr);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 900);
const W = createWorld(scene, renderer, mobile);
const ROOMMAP = Object.fromEntries(ROOMS.map(r => [r.id, r]));
const grid = new Grid(W.walkRects, W.solids, W.blocks);
const fp = new FP(camera, grid);
const tour = new Tour(fp, ROOMMAP);
const orbit = new OrbitControls(camera, canvas); orbit.enabled = false; orbit.enableDamping = true; orbit.dampingFactor = 0.08;
orbit.maxPolarAngle = Math.PI * 0.49; orbit.minDistance = 4; orbit.maxDistance = 60; orbit.screenSpacePanning = false; orbit.rotateSpeed = 0.7;

const S = { cat: CATS[0], mode: 'intro', style: 'C', time: 'noon', layers: { ceiling: true, walls: true, furniture: true, changes: false }, panel: null, flying: null, auto: true };
let aspect = 1;
function resize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); aspect = w / h; camera.aspect = aspect;
  camera.fov = aspect < 0.8 ? 80 : aspect < 1.2 ? 74 : 68; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 250)); resize();

// ---------- helpers ----------
const toast = (t, ms = 1900) => { const e = $('toast'); e.textContent = t; e.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => e.classList.remove('on'), ms); };
const TOP = () => { const d = aspect < 0.8 ? 30 : aspect < 1.2 ? 25 : 19; return { pos: new THREE.Vector3(6, d * 0.9, 5.2 + d * 0.28), tgt: new THREE.Vector3(5.4, 0, -5.2) }; };
function applyCeiling() { W.setLayer('ceiling', S.layers.ceiling && S.mode !== 'top' && S.mode !== 'intro'); }
function fly(toPos, toTgt, dur = 1.1, done) {
  const p0 = camera.position.clone(), q0 = camera.quaternion.clone();
  const m = new THREE.Matrix4().lookAt(toPos, toTgt, new THREE.Vector3(0, 1, 0)); const q1 = new THREE.Quaternion().setFromRotationMatrix(m);
  S.flying = { t: 0, dur, p0, q0, p1: toPos.clone(), q1, done };
}
function stepFly(dt) {
  const f = S.flying; if (!f) return false; f.t += dt / f.dur; const k = Math.min(1, f.t), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
  camera.position.lerpVectors(f.p0, f.p1, e); camera.quaternion.slerpQuaternions(f.q0, f.q1, e);
  if (k >= 1) { const d = f.done; S.flying = null; d && d(); } return true;
}
function roomAt(x, y) {
  const inR = (r) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];
  const R = PLAN.rooms;
  if (inR(R.terrace_w[0]) && y < 7.5) return 'terrace';
  if (inR([R.terrace_n[0][0], 7.4, R.terrace_n[0][2], R.terrace_n[0][3]])) return x > 0.3 ? (y < 9.4 ? 'storage' : 'outkitchen') : (x < -2.0 ? 'kids' : 'adults');
  for (const id of ['niche', 'bath', 'masterbath', 'master', 'bed3', 'mamad', 'kitchen', 'dining', 'hall', 'lobby', 'living']) { if (R[id] && R[id].some(inR)) return id; }
  if (x < 6 && y > 3) return 'living'; return null;
}
let lastRoom = null; let lblT = 0;
function showRoomLabel(id) {
  if (id === lastRoom) return; lastRoom = id; const r = ROOMMAP[id]; const el = $('roomlbl');
  if (!r || S.mode === 'tour') { el.classList.remove('on'); return; }
  $('rlN').textContent = r.name; $('rlS').textContent = r.area ? `שטח משוער ≈ ${Math.round(r.area)} מ״ר` : (r.note || '');
  el.classList.add('on'); clearTimeout(lblT); lblT = setTimeout(() => el.classList.remove('on'), 3200);
}

// ---------- modes ----------
function setMode(m, opts = {}) {
  const prev = S.mode; S.mode = m;
  $('mWalk').classList.toggle('on', m === 'walk'); $('mTop').classList.toggle('on', m === 'top'); $('mTour').classList.toggle('on', m === 'tour');
  document.body.classList.toggle('nojoy', m !== 'walk' && m !== 'tour');
  applyCeiling();
  if (m === 'top') {
    orbit.enabled = false; tour.active && tour.stop(); const T = TOP();
    fly(T.pos, T.tgt, prev === 'intro' ? 0.01 : 1.2, () => { orbit.target.copy(T.tgt); orbit.enabled = true; orbit.update(); });
    $('roomlbl').classList.remove('on'); toast('הקישו על חדר כדי להיכנס אליו');
  } else if (m === 'walk') {
    orbit.enabled = false;
    if (prev === 'top' || prev === 'intro') { const r = opts.room ? ROOMMAP[opts.room] : ROOMMAP.lobby; enterAt(r); }
  }
}
function enterAt(r, instantLook = false) {
  fp.cancel(); const wasTop = S.mode === 'top';
  fp.setPos(...r.pos); fp.lookAt(...r.look);
  const cp = new THREE.Vector3(fp.x, fp.eye, -fp.y), look = new THREE.Vector3(r.look[0], fp.eye - 0.1, -r.look[1]);
  fly(cp, look, 1.2, () => { fp.yaw = fp.ty; fp.pitch = fp.tp; fp.apply(); });
}
function goRoom(id) {
  const r = ROOMMAP[id]; if (!r) return; closePanel();
  if (S.mode === 'top') { S.mode = 'walk'; setModeUI('walk'); applyCeiling(); orbit.enabled = false; enterAt(r); return; }
  if (S.mode === 'tour') tour.stop();
  const d = Math.hypot(fp.x - r.pos[0], fp.y - r.pos[1]);
  if (d > 14) { enterAt(r); } else fp.goto(r.pos[0], r.pos[1], r.look[0], r.look[1]);
  showRoomLabel(id);
}
function setModeUI(m) { S.mode = m; if (m === 'tour') editExit(); document.body.classList.toggle('touring', m === 'tour'); $('mWalk').classList.toggle('on', m === 'walk'); $('mTop').classList.toggle('on', m === 'top'); $('mTour').classList.toggle('on', m === 'tour'); document.body.classList.toggle('nojoy', m === 'top'); }

// ---------- tour ----------
const STOPS_LONG = [
  ['lobby', 'מבואת כניסה', 'הכניסה לדירה, פתוחה וכמעט ריקה', 2.5], ['living', 'סלון', 'מרווח, פתוח לאור וליציאה למרפסת', 3], ['dining', 'פינת אוכל', 'שולחן לשמונה סועדים', 2.2],
  ['kitchen', 'מטבח אירוח מורחב', 'כיריים ליד החלונות, אי עבודה, כולל שטח חדר השינה לשעבר · טעון בדיקה', 4], ['terrace', 'מרפסת הגג', 'שולחן ל-6 שנפתח ל-8, בצל פרגולה', 3], ['outkitchen', 'מטבח חוץ', 'גריל מובנה · המחשה טעונת אישור', 2.6],
  ['kids', 'פינת ילדים', 'מזרן משחק ובית קטן, בשדה ראייה של המבוגרים', 2.4], ['adults', 'פינת מבוגרים', 'ישיבה מול הילדים, בלי להיות צמודים', 2.2], ['storage', 'מחסן מרפסת', 'לכיסאות, צעצועים וציוד בית בימי גשם', 2],
  ['niche', 'נישת אירוח', 'במקום שירותי האורחים · בר וקפה או אחסון', 2.6], ['master', 'חדר הורים', 'חדר שינה ראשי עם פינת ארונות', 2.4], ['bed3', 'חדר שינה', 'חדר שינה שני', 1.8], ['mamad', 'ממ״ד · חדר שינה', 'חדר שינה שלישי, הממ״ד', 1.8]];
const byId = id => STOPS_LONG.find(x => x[0] === id);
const STOPS_SHORT = ['lobby', 'living', 'kitchen', 'outkitchen', 'kids', 'niche', 'master'].map(byId);
function startTour(short = false) {
  closePanel(); if (S.mode === 'top') { S.mode = 'walk'; orbit.enabled = false; }
  setModeUI('tour'); applyCeiling(); document.body.classList.remove('nojoy');
  const stops = (short ? STOPS_SHORT : STOPS_LONG).map(s => ({ room: s[0], label: s[1], text: s[2], dwell: s[3] }));
  fp.eye = 1.6; fp.cancel(); const r0 = ROOMMAP[stops[0].room]; fp.place(...r0.pos, ...r0.look); fp.apply();
  S.flying = null; tour.start(stops, short ? 45 : 86);
  $('tourbar').classList.add('on'); setPauseIcon(false);
}
tour.onStop = (s, i, n) => { $('tbT').textContent = s.label; $('tbP').textContent = s.text; $('tbProg').style.width = ((i + 1) / n * 100) + '%'; };
tour.onEnd = (done) => {
  $('tourbar').classList.remove('on'); fp.speed = +($('spd')?.value || 1.5);
  if (done) { setMode('top'); toast('סיום הסיור · מבט־על. אפשר לחזור לסיור עצמי בכל רגע'); } else { setModeUI('walk'); applyCeiling(); toast('סיור עצמי'); }
};
function setPauseIcon(paused) { $('tbIc').innerHTML = paused ? '<path d="M8 5l11 7-11 7z"/>' : '<path d="M8 5v14M16 5v14"/>'; }
$('tbPause').onclick = () => { setPauseIcon(tour.toggle()); };
$('tbNext').onclick = () => tour.next(); $('tbPrev').onclick = () => tour.prev(); $('tbEnd').onclick = () => tour.stop(false);

// ---------- style / time ----------
function setStyle(k, quiet) { S.style = k; W.setStyle(k); rebuildGrid(); ed.refreshHL(); document.querySelectorAll('[data-style]').forEach(e => e.classList.toggle('on', e.dataset.style === k)); if (!quiet) toast(STYLES[k].name); updateHash(); }
function setTime(k, quiet) { S.time = k; W.setTime(k); document.querySelectorAll('[data-time]').forEach(e => e.classList.toggle('on', e.dataset.time === k)); if (!quiet) toast(W.TIMES[k].label + (' · הדגמת אור')); updateHash(); }
function rebuildGrid() { const g = new Grid(W.walkRects, W.solids, W.blocks); fp.grid = g; }

// ---------- panels ----------
const sheet = $('sheet');
const PANELS = {
  rooms: () => `<h4>חדרים</h4><div class="grid g2">${ROOMS.map(r => `<button class="chip" data-room="${r.id}">${r.name}<small>${r.area ? 'שטח משוער ≈ ' + Math.round(r.area) + ' מ״ר' : (r.note ? r.note.split('·')[0] : 'שטח משוער')}</small></button>`).join('')}</div><div class="note">השטחים נמדדו מתוך השרטוט ומסומנים כמשוערים. הקשו על חדר כדי ללכת אליו.</div>`,
  style: () => `<h4>סגנון עיצוב</h4><div class="grid g3">${Object.values(STYLES).sort((x, y) => x.key.localeCompare(y.key)).map(s => `<button class="style-card ${S.style === s.key ? 'on' : ''}" data-style="${s.key}"><div class="sw" style="background:linear-gradient(135deg,${s.floorPub} 0 34%,${s.cab} 34% 62%,${s.sofa} 62% 82%,${s.accent} 82%)"></div><b>${s.key} · ${s.name}</b><small>${s.sub}</small></button>`).join('')}</div><div class="note">אותה דירה ואותה נקודת מצלמה. משתנים החומרים, הריהוט והאווירה. סגנון C הוא ברירת המחדל.</div>`,
  time: () => `<h4>שעה ביום</h4><div class="grid g4">${Object.entries(W.TIMES).map(([k, t]) => `<button class="chip ${S.time === k ? 'on' : ''}" data-time="${k}" style="text-align:center">${t.label}</button>`).join('')}</div><div class="note">הדגמת אור: כיוון השמש נלקח מחץ הצפון בשרטוט ואינו מדידה. בלילה נדלקים אורות הפנים.</div>`,
  tour: () => `<h4>סיור מודרך</h4><div class="grid g2"><button class="btn pri" data-act="tourLong">סיור מלא · 90 שנ׳</button><button class="btn" data-act="tourShort">סיור קצר · 45 שנ׳</button></div><div class="note">הסיור עובר מהכניסה דרך הסלון והמטבח, מרפסת הגג ומטבח החוץ, הנישה והחדרים, ומסתיים במבט־על. אפשר לעצור, לדלג ולחזור לסיור עצמי בכל רגע.</div>`,
  edit: () => `<h4>עיצוב</h4>
    <div class="grid g4 mini"><button class="chip" data-ed="undo">↶ בטל</button><button class="chip" data-ed="redo">↷ שוב</button><button class="chip" data-ed="reset">מקור</button><button class="chip" data-ed="clear">מאפס</button></div>
    <div class="tabs">${CATS.map(c => `<button class="tab ${S.cat === c ? 'on' : ''}" data-cat="${c}">${c}</button>`).join('')}</div>
    <div class="grid g3">${Object.entries(TYPES).filter(([k, t]) => t.cat === S.cat).map(([k, t]) => `<button class="card" data-add="${k}"><i>${ICONS[k] || '▫️'}</i><span>${t.label}</span></button>`).join('')}</div>
    <div class="note">הקישו על פריט בדירה כדי לבחור אותו, וגררו את הידית הזהובה כדי להזיז. הסתכלות והליכה ממשיכות לעבוד כרגיל. "מקור" מחזירה את העיצוב שהצעתי, "מאפס" מרוקנת את הדירה.</div>`,
  more: () => `<h4>עוד</h4>
    <div class="row2"><span>נישת אירוח</span><div class="grid g2" style="width:220px"><button class="chip ${W.niche === 'bar' ? 'on' : ''}" data-niche="bar" style="text-align:center">בר וקפה</button><button class="chip ${W.niche === 'store' ? 'on' : ''}" data-niche="store" style="text-align:center">אחסון וסדר</button></div></div>
    <h5>שכבות</h5>
    ${[['ceiling', 'תקרה'], ['walls', 'קירות מלאים (כבוי = חתך)'], ['furniture', 'ריהוט וארונות'], ['changes', 'סימון שינויים מוצעים']].map(([k, l]) => `<div class="row2"><span>${l}</span><button class="sw-t ${S.layers[k] ? 'on' : ''}" data-layer="${k}" aria-label="${l}"></button></div>`).join('')}
    <h5>שליטה</h5>
    <div class="row2"><span>גובה עיניים</span><input type="range" id="eye" min="1.1" max="1.95" step="0.05" value="${fp.eye}"></div>
    <div class="row2"><span>מהירות הליכה</span><input type="range" id="spd" min="0.8" max="3" step="0.1" value="${fp.speed}"></div>
    <div class="row2"><span>רגישות סיבוב</span><input type="range" id="sens" min="0.5" max="2" step="0.1" value="${fp.lookGain}"></div>
    <div class="grid g2" style="margin-top:8px"><button class="btn" data-act="compare">מקור מול מוצע</button><button class="btn" data-act="shot">צילום מסך</button><button class="btn" data-act="fav">שמור נקודת מבט</button><button class="btn" data-act="share">שתף קישור</button></div>
    <div id="favs" class="grid g3" style="margin-top:8px">${favs().map((f, i) => `<button class="chip" data-fav="${i}" style="text-align:center">★ ${i + 1}</button>`).join('')}</div>
    <div class="note">הדמיה להמחשה בלבד. מידות הדירה נלקחו מהשרטוט, וגובה התקרה (2.60 מ׳), גובה אדני החלונות והריהוט הם הנחות. השינויים בתכנון טעונים אישור אדריכל וקונסטרוקטור, בדיקת אינסטלציה והיתרים.</div>`
};
function favs() { try { return JSON.parse(localStorage.getItem('apt23favs') || '[]'); } catch { return []; } }
function openPanel(p) {
  if (S.panel === p) return closePanel(); S.panel = p; sheet.innerHTML = PANELS[p](); sheet.classList.add('on'); sheet.scrollTop = 0;
  document.querySelectorAll('#dock button').forEach(b => b.classList.toggle('on', b.dataset.p === p));
  $('roomlbl').classList.remove('on');
}
function closePanel() { S.panel = null; sheet.classList.remove('on'); document.querySelectorAll('#dock button').forEach(b => b.classList.remove('on')); }
document.querySelectorAll('#dock button').forEach(b => b.onclick = () => { if (b.dataset.p === 'edit' && S.panel !== 'edit') enterEdit(); openPanel(b.dataset.p); });
function enterEdit() { if (tour.active) tour.stop(false); ed.enter(); $('editbar').classList.add('on'); if (!S.editHint) { S.editHint = 1; toast('הקישו על פריט כדי לבחור, וגררו את הידית הזהובה כדי להזיז', 4500); } }
function editExit() { if (!ed.on) return; ed.exit(); $('editbar').classList.remove('on'); $('selbar').classList.remove('on'); }
function updateEditUI(e) {
  $('selbar').classList.toggle('on', e.on && !!e.sel); const it = e.selected();
  $('sbExt').style.display = it && TYPES[it.t].ext ? '' : 'none'; $('sbSwap').style.display = it && TYPES[it.t].variants ? '' : 'none';
  $('ebUndo').disabled = !e.canUndo(); $('ebRedo').disabled = !e.canRedo(); $('sbName').textContent = it ? TYPES[it.t].label : '';
}
$('ebUndo').onclick = () => ed.undo(); $('ebRedo').onclick = () => ed.redo(); $('ebOrig').onclick = () => { if (confirm('לחזור לעיצוב המקורי שהצעתי? השינויים שלך יימחקו (אפשר לבטל).')) ed.reset(); };
$('ebAdd').onclick = () => openPanel('edit'); $('ebDone').onclick = () => { editExit(); closePanel(); toast('העיצוב נשמר'); };
$('sbL').onclick = () => ed.rot(-90); $('sbR').onclick = () => ed.rot(90); $('sbL15').onclick = () => ed.rot(-15); $('sbR15').onclick = () => ed.rot(15);
$('sbSwap').onclick = () => ed.swap(); $('sbDup').onclick = () => ed.dup(); $('sbDel').onclick = () => ed.del(); $('sbExt').onclick = () => ed.ext();
sheet.addEventListener('click', e => {
  const t = e.target.closest('button'); if (!t) return;
  if (t.dataset.room) goRoom(t.dataset.room);
  else if (t.dataset.style) { setStyle(t.dataset.style); sheet.innerHTML = PANELS.style(); }
  else if (t.dataset.time) { setTime(t.dataset.time); sheet.innerHTML = PANELS.time(); }
  else if (t.dataset.niche) { W.setNiche(t.dataset.niche); sheet.innerHTML = PANELS.more(); toast(t.dataset.niche === 'bar' ? 'נישה: בר וקפה' : 'נישה: אחסון וסדר'); }
  else if (t.dataset.layer) { const k = t.dataset.layer; S.layers[k] = !S.layers[k]; if (k === 'ceiling') applyCeiling(); else W.setLayer(k, S.layers[k]); t.classList.toggle('on', S.layers[k]); }
  else if (t.dataset.fav) { const f = favs()[+t.dataset.fav]; if (f) { fp.cancel(); fp.x = f[0]; fp.y = f[1]; fp.ty = fp.yaw = f[2]; fp.tp = fp.pitch = f[3]; if (S.mode === 'top') { setMode('walk', { room: 'lobby' }); } toast('נקודת מבט ' + (+t.dataset.fav + 1)); } }
  else if (t.dataset.ed) { const a = t.dataset.ed; if (a === 'clear' && !confirm('לרוקן את כל הפריטים ולהתחיל מאפס?')) return; ({ undo: ed.undo, redo: ed.redo, reset: ed.reset, clear: ed.clearAll })[a](); }
  else if (t.dataset.cat) { S.cat = t.dataset.cat; sheet.innerHTML = PANELS.edit(); }
  else if (t.dataset.add) { ed.add(t.dataset.add); closePanel(); }
  else if (t.dataset.act) act(t.dataset.act);
});
sheet.addEventListener('input', e => { if (e.target.id === 'eye') fp.eye = +e.target.value; if (e.target.id === 'spd') fp.speed = +e.target.value; if (e.target.id === 'sens') fp.lookGain = +e.target.value; });
function act(a) {
  if (a === 'tourLong') startTour(false); if (a === 'tourShort') startTour(true);
  if (a === 'compare') { closePanel(); showCompare(); }
  if (a === 'shot') { renderer.render(scene, camera); canvas.toBlob(async b => { const f = new File([b], 'apartment-23.png', { type: 'image/png' }); try { if (navigator.canShare && navigator.canShare({ files: [f] })) { await navigator.share({ files: [f] }); return; } } catch { } const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'apartment-23.png'; a.click(); toast('התמונה נשמרה'); }); }
  if (a === 'fav') { const l = favs(); l.push([fp.x, fp.y, fp.yaw, fp.pitch]); localStorage.setItem('apt23favs', JSON.stringify(l.slice(-6))); sheet.innerHTML = PANELS.more(); toast('נקודת המבט נשמרה'); }
  if (a === 'share') shareLink();
}
async function shareLink() { updateHash(); const url = location.href; try { if (navigator.share) { await navigator.share({ title: 'דירה 23 · סיור תלת־ממדי', url }); return; } await navigator.clipboard.writeText(url); toast('הקישור הועתק'); } catch { toast('אפשר להעתיק את הקישור מסרגל הכתובת'); } }
function updateHash() { try { history.replaceState(null, '', `#s=${S.style}&t=${S.time}&p=${[fp.x, fp.y, fp.yaw, fp.pitch].map(v => v.toFixed(2)).join(',')}`); } catch { } }
$('bShare').onclick = shareLink;
$('bFull').onclick = () => { const d = document.documentElement; if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document); else if (d.requestFullscreen) d.requestFullscreen().catch(() => toast('באייפון: שתף ← הוסף למסך הבית למסך מלא')); else toast('באייפון: שתף ← הוסף למסך הבית למסך מלא'); };
$('qEntry').onclick = () => { if (S.mode === 'tour') tour.stop(false); setModeUI('walk'); orbit.enabled = false; applyCeiling(); enterAt(ROOMMAP.lobby); };
$('qTop').onclick = () => setMode('top');
$('qReset').onclick = () => { fp.pitch = fp.tp = 0; fp.eye = 1.6; toast('זווית אופסה'); };
$('mWalk').onclick = () => { if (S.mode === 'top') setMode('walk', { room: 'lobby' }); else if (S.mode === 'tour') tour.stop(false); };
$('mTop').onclick = () => setMode('top'); $('mTour').onclick = () => openPanel('tour');

// ---------- compare (clean schematic) ----------
let cmpMode = 'new';
function showCompare() { $('cmp').classList.add('on'); drawCompare(); }
$('cmX').onclick = () => $('cmp').classList.remove('on');
$('cmO').onclick = () => { cmpMode = 'new'; drawCompare(); }; $('cmS').onclick = () => { cmpMode = 'old'; drawCompare(); };
function drawCompare() {
  $('cmO').classList.toggle('on', cmpMode === 'new'); $('cmS').classList.toggle('on', cmpMode === 'old');
  const c = $('cmC'), g = c.getContext('2d'); const w = c.width, h = c.height; g.clearRect(0, 0, w, h); g.fillStyle = '#12100e'; g.fillRect(0, 0, w, h);
  const x0 = -4.4, x1 = 16.2, y0 = -0.4, y1 = 12.3, s = Math.min(w / (x1 - x0), h / (y1 - y0)); const ox = (w - s * (x1 - x0)) / 2, oy = (h - s * (y1 - y0)) / 2;
  const X = x => ox + (x - x0) * s, Y = y => oy + (y1 - y) * s;
  const rect = (r, fill, a = 1) => { g.globalAlpha = a; g.fillStyle = fill; g.fillRect(X(r[0]), Y(r[3]), (r[2] - r[0]) * s, (r[3] - r[1]) * s); g.globalAlpha = 1; };
  const R = PLAN.rooms;
  // floors
  [['terrace_w', '#2a2620'], ['terrace_n', '#2a2620']].forEach(([k, c]) => R[k].forEach(r => rect(r, c)));
  rect([0, 0, 15.66, 7.56], '#1e1b18');
  const lab = (t, x, y, col = '#c9c1b4', sz = 15) => { g.fillStyle = col; g.font = `500 ${Math.round(sz * 2.3)}px Heebo,sans-serif`; g.textAlign = 'center'; g.fillText(t, X(x), Y(y)); };
  if (cmpMode === 'new') {
    rect(R.niche[0], '#dcb97e', .45); R.kitchen.forEach(r => rect(r, '#dcb97e', .16)); rect([6.13, 0.34, 8.93, 3.3], '#ff8a3d', .28); rect([-1.2, 8.0, 2.08, 11.7], '#7fd1b9', .3); rect([-3.9, 0.9, -0.3, 4.6], '#7fd1b9', .16);
  } else {
    rect([6.13, 0.34, 8.93, 3.3], '#6f8fb5', .35); rect(R.niche[0], '#6f8fb5', .35);
  }
  g.fillStyle = '#e9e2d6';
  PLAN.walls.forEach(w => { if (w.change === 'removed') return; const r = w.r; g.fillRect(X(r[0]), Y(r[3]), (r[2] - r[0]) * s, (r[3] - r[1]) * s); });
  PLAN.windows.forEach(r => { g.fillStyle = '#7ec2d6'; g.fillRect(X(r[0]), Y(r[3]), Math.max(2, (r[2] - r[0]) * s), Math.max(2, (r[3] - r[1]) * s)); });
  if (cmpMode === 'old') { const r = PLAN.walls.find(w => w.change === 'removed').r; g.fillStyle = '#e9e2d6'; g.fillRect(X(r[0]), Y(r[3]), (r[2] - r[0]) * s, (r[3] - r[1]) * s); lab('חדר שינה', 7.55, 1.9, '#9fb9d8'); lab('ש. אורחים', 6.37, 5.5, '#9fb9d8', 12); lab('מטבח', 4.2, 1.6); lab('סלון', 2.4, 5.2); }
  else { const r = PLAN.walls.find(w => w.change === 'removed').r; g.setLineDash([6, 5]); g.strokeStyle = '#ff8a3d'; g.lineWidth = 2.5; g.strokeRect(X(r[0]), Y(r[3]), (r[2] - r[0]) * s, (r[3] - r[1]) * s); g.setLineDash([]); lab('מטבח אירוח מורחב', 5.6, 1.7, '#f0d9ad', 17); lab('נישה', 6.37, 5.5, '#f0d9ad', 14); lab('מטבח חוץ', 0.3, 9.8, '#9fe6d0', 15); lab('סלון', 2.4, 5.2); }
  lab('חדר הורים', 13.5, 5.8); lab('חדר שינה', 14.0, 1.7); lab('ממ״ד', 10.8, 1.7); lab('רחצה', 8.2, 5.6, '#c9c1b4', 12); lab('רחצה הורים', 10.35, 5.6, '#c9c1b4', 12); lab('מרפסת גג', -2.0, 6.2, '#8d857a');
  $('cmL').innerHTML = cmpMode === 'new' ? '<span><i style="background:#ff8a3d"></i>קיר שהוסר · טעון אישור</span><span><i style="background:#dcb97e"></i>נישה / מטבח מוגדל</span><span><i style="background:#7fd1b9"></i>מטבח חוץ והצללה · המחשה</span>' : '<span><i style="background:#6f8fb5"></i>חדר שינה וש. אורחים במקור</span><span><i style="background:#7ec2d6"></i>חלונות</span>';
}

// ---------- input ----------
const joy = $('joy'), stick = joy.querySelector('i'); let joyId = null, lookId = null, lastP = null, tap = null;
function joyMove(e) { const r = joy.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2; let dx = e.clientX - cx, dy = e.clientY - cy; const R = r.width / 2 - 8, m = Math.hypot(dx, dy); if (m > R) { dx = dx / m * R; dy = dy / m * R; } stick.style.transform = `translate(${dx}px,${dy}px)`; fp.joy = [dx / R, -dy / R]; }
joy.addEventListener('pointerdown', e => { if (S.mode === 'tour' && !tour.paused) { tour.stop(false); } joyId = e.pointerId; joy.setPointerCapture(e.pointerId); joyMove(e); e.stopPropagation(); });
joy.addEventListener('pointermove', e => { if (e.pointerId === joyId) joyMove(e); });
const joyEnd = e => { if (e.pointerId === joyId) { joyId = null; fp.joy = [0, 0]; stick.style.transform = ''; } }; joy.addEventListener('pointerup', joyEnd); joy.addEventListener('pointercancel', joyEnd);
canvas.addEventListener('pointerdown', e => {
  if (!$('intro').classList.contains('off')) return; closePanel();
  if (S.mode === 'top') { tap = { x: e.clientX, y: e.clientY, t: performance.now() }; return; }
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  if (S.mode === 'tour' && !tour.paused) tour.stop(false);
  lookId = e.pointerId; lastP = [e.clientX, e.clientY]; tap = { x: e.clientX, y: e.clientY, t: performance.now() }; canvas.setPointerCapture(e.pointerId);
  document.body.classList.toggle('pointer', e.pointerType === 'mouse');
});
canvas.addEventListener('pointermove', e => { if (e.pointerId !== lookId || S.mode === 'top') return; fp.rotate(e.clientX - lastP[0], e.clientY - lastP[1]); lastP = [e.clientX, e.clientY]; });
const ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
function floorPoint(cx, cy) { const v = new THREE.Vector2(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(v, camera); const p = new THREE.Vector3(); return ray.ray.intersectPlane(plane, p) ? p : null; }
const marker = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.22, 32), new THREE.MeshBasicMaterial({ color: '#f0d9ad', transparent: true, opacity: 0, depthTest: false })); marker.rotation.x = -Math.PI / 2; marker.renderOrder = 30; scene.add(marker); let markT = 0;
function showMarker(x, y) { marker.position.set(x, 0.05, -y); markT = 1.2; }
const ed = createEditor({ W, scene, app: $('app'), orbit, camera: () => camera, floorPoint: (cx, cy) => floorPoint(cx, cy), centerPoint: () => { if (S.mode === 'top') return [orbit.target.x, -orbit.target.z]; const p = floorPoint(innerWidth / 2, innerHeight * 0.62); if (p && Math.hypot(p.x - fp.x, -p.z - fp.y) < 5.5) return [p.x, -p.z]; return [fp.x - Math.sin(fp.yaw) * 2.5, fp.y + Math.cos(fp.yaw) * 2.5]; }, isTop: () => S.mode === 'top', onChange: () => { rebuildGrid(); }, onSelect: updateEditUI, toast });
canvas.addEventListener('pointerup', e => {
  const wasLook = e.pointerId === lookId; if (wasLook) lookId = null;
  if (!tap) return; const dt = performance.now() - tap.t, dd = Math.hypot(e.clientX - tap.x, e.clientY - tap.y); const t0 = tap; tap = null;
  if (dd > 9 || dt > 450) return; if (ed.on && ed.tap(e.clientX, e.clientY)) return; const p = floorPoint(e.clientX, e.clientY); if (!p) return; const x = p.x, y = -p.z;
  if (S.mode === 'top') { if (ed.on) return; const id = roomAt(x, y); if (id) { S.mode = 'walk'; setModeUI('walk'); applyCeiling(); orbit.enabled = false; enterAt(ROOMMAP[id]); showRoomLabel(id); } return; }
  if (grid.ok(x, y) || grid.nearest(x, y)) { const d = Math.hypot(x - fp.x, y - fp.y); if (d < 22) { const g = grid.nearest(x, y); fp.goto(...g); showMarker(g[0], g[1]); } }
});
addEventListener('keydown', e => { fp.keys[e.key] = true; fp.keys[e.key.toLowerCase()] = true; if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault(); if (S.mode === 'tour' && 'wasdWASD'.includes(e.key) && e.key.length === 1) tour.stop(false); if (e.key === 'Escape') closePanel(); });
addEventListener('keyup', e => { fp.keys[e.key] = false; fp.keys[e.key.toLowerCase()] = false; });
canvas.addEventListener('wheel', e => { if (S.mode !== 'top') { fp.eye = Math.max(1.1, Math.min(1.95, fp.eye - e.deltaY * 0.0005)); } }, { passive: true });
document.addEventListener('gesturestart', e => e.preventDefault());

// ---------- minimap ----------
const mc = $('miniC'), mg = mc.getContext('2d'); let mT = 0;
function drawMini() {
  const w = mc.width, h = mc.height; mg.clearRect(0, 0, w, h); const x0 = -4.4, x1 = 16.0, y0 = -0.2, y1 = 12.1, s = Math.min(w / (x1 - x0), h / (y1 - y0)); const ox = (w - s * (x1 - x0)) / 2, oy = (h - s * (y1 - y0)) / 2;
  const X = x => ox + (x - x0) * s, Y = y => oy + (y1 - y) * s;
  mg.fillStyle = 'rgba(255,255,255,.05)'; mg.fillRect(X(0), Y(7.56), 15.66 * s, 7.56 * s); PLAN.rooms.terrace_w.concat(PLAN.rooms.terrace_n).forEach(r => mg.fillRect(X(r[0]), Y(r[3]), (r[2] - r[0]) * s, (r[3] - r[1]) * s));
  mg.fillStyle = 'rgba(240,230,215,.78)'; PLAN.walls.forEach(wl => { if (wl.change === 'removed') return; const r = wl.r; mg.fillRect(X(r[0]), Y(r[3]), Math.max(1.4, (r[2] - r[0]) * s), Math.max(1.4, (r[3] - r[1]) * s)); });
  const cx = S.mode === 'top' ? orbit.target.x : fp.x, cy = S.mode === 'top' ? -orbit.target.z : fp.y;
  const dir = new THREE.Vector3(); camera.getWorldDirection(dir); const ang = Math.atan2(dir.x, -dir.z); // plan heading: x east, y north
  mg.save(); mg.translate(X(S.mode === 'top' ? camera.position.x : fp.x), Y(S.mode === 'top' ? -camera.position.z : fp.y)); mg.rotate(ang);
  const grad = mg.createRadialGradient(0, 0, 0, 0, 0, 34); grad.addColorStop(0, 'rgba(240,217,173,.7)'); grad.addColorStop(1, 'rgba(240,217,173,0)');
  mg.fillStyle = grad; mg.beginPath(); mg.moveTo(0, 0); mg.arc(0, 0, 34, -Math.PI / 2 - .5, -Math.PI / 2 + .5); mg.closePath(); mg.fill();
  mg.fillStyle = '#f0d9ad'; mg.beginPath(); mg.arc(0, 0, 5, 0, 7); mg.fill(); mg.restore();
}

// ---------- loop ----------
const clock = new THREE.Clock(); let acc = 0, frames = 0, slow = 0, introT = 0;
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1); W.update(dt);
  if (S.mode === 'intro') { introT += dt * 0.12; const T = TOP(); const k = aspect < 1 ? 1.45 : 1, r = 21 * k; camera.position.set(6 + Math.sin(introT) * r, 15 * k, -5 + Math.cos(introT) * r * 0.9 + 4); camera.lookAt(5.5, 0, -5); camera.setViewOffset(innerWidth, innerHeight, 0, innerHeight * (aspect < 1 ? 0.2 : 0.12), innerWidth, innerHeight); }
  else if (!stepFly(dt)) {
    if (S.mode === 'top') { orbit.update(); }
    else { if (!(S.mode === 'tour' && tour.paused)) { tour.update(dt); fp.update(dt); } else fp.apply(); }
  }
  if (S.mode !== 'top' && S.mode !== 'intro') { if ((acc += dt) > 0.25) { acc = 0; showRoomLabel(roomAt(fp.x, fp.y)); updateHashSoft(); } }
  if (markT > 0) { markT -= dt; const k = Math.max(0, markT / 1.2); marker.material.opacity = k * 0.9; marker.scale.setScalar(1 + (1 - k) * 1.2); }
  if (ed.on) ed.updateHandle();
  mT += dt; if (mT > 0.08) { mT = 0; drawMini(); }
  renderer.render(scene, camera);
  // adaptive quality
  frames++; slow += dt; if (slow > 2.5) { const fps = frames / slow; if (fps < 28 && pr > 1.0) { pr = Math.max(1.0, pr - 0.2); renderer.setPixelRatio(pr); resize(); } frames = 0; slow = 0; }
  requestAnimationFrame(frame);
}
let hT = 0; function updateHashSoft() { if ((hT += 0.25) > 3) { hT = 0; updateHash(); } }

// ---------- start ----------
const leaveIntro = () => { camera.clearViewOffset(); $('intro').classList.add('off'); $('hud').classList.add('on'); };
$('goWalk').onclick = () => { camera.clearViewOffset(); $('intro').classList.add('off'); $('hud').classList.add('on'); S.mode = 'walk'; setModeUI('walk'); applyCeiling(); enterAt(ROOMMAP.lobby); setTimeout(() => toast('גררו להסתכלות · ג׳ויסטיק להליכה'), 1400); };
$('goTour').onclick = () => { camera.clearViewOffset(); $('intro').classList.add('off'); $('hud').classList.add('on'); startTour(false); };
$('goTop').onclick = () => { camera.clearViewOffset(); $('intro').classList.add('off'); $('hud').classList.add('on'); const prev = S.mode; S.mode = 'walk'; setMode('top'); };
// restore shared state
(function fromHash() { const h = new URLSearchParams(location.hash.slice(1)); const s = h.get('s'), t = h.get('t'), p = h.get('p'); if (s && STYLES[s]) setStyle(s, true); else setStyle('C', true); if (t && W.TIMES[t]) setTime(t, true); else setTime('noon', true); if (p) { const a = p.split(',').map(Number); if (a.length === 4 && a.every(isFinite)) { fp.setPos(a[0], a[1]); fp.ty = fp.yaw = a[2]; fp.tp = fp.pitch = a[3]; } } })();
ed.init(); rebuildGrid(); applyCeiling(); W.setLayer('ceiling', false);
window.__apt = { ed, S, fp, W, camera, scene, tour, grid, setMode, goRoom, startTour, renderer, ROOMS };
requestAnimationFrame(() => { $('load').classList.add('off'); $('intro').classList.remove('off'); frame(); });
