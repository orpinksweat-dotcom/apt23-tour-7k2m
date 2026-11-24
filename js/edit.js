// Design mode: select / drag / rotate / swap / add / delete items, with undo, redo and "back to original".
import * as THREE from 'three';
import { TYPES, footprint, defaultItems, nextId } from './items.js';

const KEY = 'apt23.items.v3', REV = 3, snap = v => Math.round(v / 0.05) * 0.05;

export function createEditor(ctx) {
  const { W, scene, app, floorPoint, centerPoint, onChange, onSelect, toast } = ctx;
  const ray = new THREE.Raycaster();
  const ed = { on: false, sel: null, hist: [], hi: -1 };
  // ---- highlight ----
  const hl = new THREE.Group(); hl.visible = false; scene.add(hl);
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ color: '#f0d9ad', transparent: true, opacity: 0.28, depthTest: false, depthWrite: false }));
  plane.rotation.x = -Math.PI / 2; plane.renderOrder = 20;
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(1, 1)), new THREE.LineBasicMaterial({ color: '#f0d9ad', depthTest: false })); edge.rotation.x = -Math.PI / 2; edge.renderOrder = 21;
  const inner = new THREE.Group(); inner.add(plane, edge); hl.add(inner);
  function showHL() {
    const it = ed.sel && W.items.find(i => i.id === ed.sel); if (!it) { hl.visible = false; return; }
    const f = footprint(it); hl.visible = true; hl.position.set(it.x, 0.04, -it.y); hl.rotation.y = it.r; inner.position.set(0, 0, -f.cz); plane.scale.set(f.w + 0.06, f.d + 0.06, 1); edge.scale.copy(plane.scale);
  }
  const zones = () => [W.walkRects[0], W.walkRects[1], W.walkRects[2]];
  const inZ = (x, y) => zones().some(z => x >= z[0] - 0.03 && x <= z[2] + 0.03 && y >= z[1] - 0.03 && y <= z[3] + 0.03);
  function valid(it) {
    const f = footprint(it), a = f.aabb;
    if (![[a[0], a[1]], [a[0], a[3]], [a[2], a[1]], [a[2], a[3]], f.c].every(p => inZ(p[0], p[1]))) return false;
    if (f.noBlock) return true;
    const s = 0.05; return !W.solids.some(r => a[0] + s < r[2] && a[2] - s > r[0] && a[1] + s < r[3] && a[3] - s > r[1]);
  }
  // ---- history / persistence ----
  const clone = () => JSON.parse(JSON.stringify(W.items));
  function save() { try { localStorage.setItem(KEY, JSON.stringify({ rev: REV, items: W.items })); } catch { } }
  function commit(initial) {
    ed.hist = ed.hist.slice(0, ed.hi + 1); ed.hist.push(JSON.stringify(W.items)); if (ed.hist.length > 80) ed.hist.shift(); ed.hi = ed.hist.length - 1;
    W.refreshBlocks(); if (!initial) save(); onChange && onChange(); ui();
  }
  function restore(i) { ed.hi = i; W.setItems(JSON.parse(ed.hist[i])); if (!W.items.find(x => x.id === ed.sel)) ed.sel = null; save(); onChange && onChange(); showHL(); ui(); }
  function ui() { onSelect && onSelect(ed); }
  ed.load = () => { try { const j = JSON.parse(localStorage.getItem(KEY) || 'null'); if (j && j.rev === REV && Array.isArray(j.items) && j.items.length) return j.items; } catch { } return defaultItems(); };
  ed.canUndo = () => ed.hi > 0; ed.canRedo = () => ed.hi < ed.hist.length - 1;
  ed.undo = () => { if (ed.canUndo()) restore(ed.hi - 1); }; ed.redo = () => { if (ed.canRedo()) restore(ed.hi + 1); };
  ed.reset = () => { ed.sel = null; W.setItems(defaultItems()); commit(); showHL(); toast('חזרנו לעיצוב המקורי המוצע'); };
  ed.clearAll = () => { ed.sel = null; W.setItems([]); commit(); showHL(); toast('הדירה ריקה. אפשר להוסיף פריטים מהקטלוג'); };
  ed.selected = () => ed.sel && W.items.find(i => i.id === ed.sel);
  ed.select = (id) => { ed.sel = id; showHL(); ui(); };
  ed.enter = () => { ed.on = true; hl.visible = !!ed.sel; ui(); };
  ed.exit = () => { ed.on = false; ed.sel = null; hl.visible = false; ui(); };
  const findSpot = (it) => { if (valid(it)) return true; const x0 = it.x, y0 = it.y; for (let r = 0.3; r <= 3.2; r += 0.3) for (let k = 0; k < 16; k++) { it.x = snap(x0 + Math.cos(k / 16 * 6.283) * r); it.y = snap(y0 + Math.sin(k / 16 * 6.283) * r); if (valid(it)) return true; } it.x = x0; it.y = y0; return false; };
  ed.add = (t, from) => {
    const T = TYPES[t]; const c = centerPoint(); const it = { id: nextId(W.items), t, x: snap(c[0]), y: snap(c[1]), r: from ? from.r : 0, p: JSON.parse(JSON.stringify(from ? from.p : T.def)), v: from ? from.v : 0 };
    if (from) { it.x = snap(from.x + 0.5); it.y = snap(from.y - 0.5); }
    if (!findSpot(it)) { toast('אין מקום פנוי כאן. הזיזו את המבט'); return; }
    W.items.push(it); W.rebuildItem(it); ed.sel = it.id; commit(); showHL(); toast(T.label + ' נוסף. גררו כדי להזיז');
  };
  ed.dup = () => { const it = ed.selected(); if (it) ed.add(it.t, it); };
  ed.del = () => { const it = ed.selected(); if (!it) return; W.removeItem(it.id); W.items = W.items.filter(i => i !== it); ed.sel = null; commit(); showHL(); };
  ed.rot = (deg) => {
    const it = ed.selected(); if (!it) return; const T = TYPES[it.t], f = footprint(it); const cx = f.c[0], cy = f.c[1];
    const old = it.r; it.r = old + deg * Math.PI / 180; const nf = [Math.sin(it.r), -Math.cos(it.r)]; it.x = snap(cx - nf[0] * f.cz); it.y = snap(cy - nf[1] * f.cz);
    if (!valid(it)) { const ox = it.x, oy = it.y; if (!findSpot(it)) { it.r = old; it.x = f.c[0] - Math.sin(old) * f.cz; it.y = f.c[1] + Math.cos(old) * f.cz; toast('אין מקום לסובב כאן'); return; } }
    W.placeItem(it); commit(); showHL();
  };
  ed.swap = () => {
    const it = ed.selected(); if (!it) return; const T = TYPES[it.t]; if (!T.variants) { toast('לפריט הזה אין גרסאות אחרות'); return; }
    const old = JSON.stringify(it.p), ov = it.v; it.v = ((it.v || 0) + 1) % T.variants.length; it.p = { ...it.p, ...T.variants[it.v] };
    if (!valid(it) && !findSpot(it)) { it.p = JSON.parse(old); it.v = ov; toast('הגרסה הבאה לא נכנסת כאן'); return; }
    W.rebuildItem(it); W.placeItem(it); commit(); showHL();
  };
  ed.setColor = (col) => { const it = ed.selected(); if (!it) return; if (col) it.p.col = col; else delete it.p.col; W.rebuildItem(it); W.placeItem(it); commit(); showHL(); };
  ed.ext = () => { const it = ed.selected(); if (!it || !TYPES[it.t].ext) return; const old = it.p.ext; it.p.ext = it.p.ext ? 0 : 1; if (!valid(it) && !findSpot(it)) { it.p.ext = old; toast('אין מקום לפתוח את השולחן כאן'); return; } W.rebuildItem(it); W.placeItem(it); commit(); showHL(); toast(it.p.ext ? 'השולחן נפתח' : 'השולחן נסגר'); };
  ed.history = () => ({ undo: ed.canUndo(), redo: ed.canRedo() });

  // ---- selection by tap, movement only through the gold handle (never fights camera gestures) ----
  const grab = document.getElementById('grab');
  const pick = (cx, cy) => {
    const v = new THREE.Vector2(cx / innerWidth * 2 - 1, -(cy / innerHeight) * 2 + 1); ray.setFromCamera(v, ctx.camera());
    const hits = ray.intersectObjects(W.itemsRoot.children, true); let flat = null;
    for (const h of hits) { let o = h.object; while (o && !o.userData.itemId) o = o.parent; if (!o) continue; const it = W.items.find(i => i.id === o.userData.itemId); if (!it) continue; if (footprint(it).noBlock) { flat = flat || it.id; continue; } return it.id; }
    return flat;
  };
  ed.tap = (cx, cy) => { if (!ed.on) return false; const id = pick(cx, cy); if (id) { ed.sel = id; showHL(); ui(); return true; } if (ed.sel) { ed.sel = null; showHL(); ui(); } return false; };
  let drag = null;
  grab.addEventListener('pointerdown', e => {
    const it = ed.selected(); if (!it) return; const p = floorPoint(e.clientX, e.clientY); if (!p) return;
    drag = { it, off: [it.x - p.x, it.y - p.y], moved: false, sx: e.clientX, sy: e.clientY }; try { grab.setPointerCapture(e.pointerId); } catch { } grab.classList.add('drag'); e.preventDefault(); e.stopPropagation();
  });
  grab.addEventListener('pointermove', e => {
    if (!drag) return; const p = floorPoint(e.clientX, e.clientY); if (!p) return; const it = drag.it;
    if (!drag.moved && Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 3) return; drag.moved = true;
    const nx = snap(p.x + drag.off[0]), ny = snap(p.y + drag.off[1]); const ox = it.x, oy = it.y;
    it.x = nx; it.y = ny; if (!valid(it)) { it.x = nx; it.y = oy; if (!valid(it)) { it.x = ox; it.y = ny; if (!valid(it)) { it.x = ox; it.y = oy; } } }
    W.placeItem(it); showHL();
  });
  const end = () => { if (!drag) return; const d = drag; drag = null; grab.classList.remove('drag'); if (d.moved) commit(); };
  grab.addEventListener('pointerup', end); grab.addEventListener('pointercancel', end);
  const pv = new THREE.Vector3();
  ed.updateHandle = () => {
    const it = ed.on && ed.selected(); if (!it) { grab.classList.remove('on'); return; }
    const f = footprint(it); pv.set(f.c[0], 0.9, -f.c[1]).project(ctx.camera());
    if (pv.z > 1 || pv.z < -1) { grab.classList.remove('on'); return; }
    const x = Math.max(34, Math.min(innerWidth - 34, (pv.x + 1) / 2 * innerWidth)), y = Math.max(110, Math.min(innerHeight - 150, (1 - pv.y) / 2 * innerHeight));
    grab.style.transform = `translate(${x}px,${y}px)`; grab.classList.add('on');
  };
  ed.isValid = valid; ed.refreshHL = showHL;
  ed.init = () => { W.setItems(ed.load()); ed.hist = []; ed.hi = -1; commit(true); };
  return ed;
}
