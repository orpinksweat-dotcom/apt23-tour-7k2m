// Editable furniture items: types, footprints, default layout (the proposed design).
import * as THREE from 'three';
import { M } from './materials.js';

const PI = Math.PI, E = PI / 2, N = PI, W_ = -PI / 2, S_ = 0;

// ---- extra pieces built on the Builder ----
function planter(b, len) {
  const g = b.g(0, 0, 0); b.box(g, len, 0.42, 0.46, M.woodF, 0, 0, 0); b.box(g, len - 0.06, 0.02, 0.4, M.soil, 0, 0.42, 0);
  const n = Math.max(3, Math.round(len / 0.3));
  for (let i = 0; i < n; i++) { const x = -len / 2 + len / n * (i + .5), h = 0.5 + ((i * 37) % 5) * 0.07; b.sph(g, 0.2 + (i % 3) * 0.03, i % 2 ? M.leaf : M.leaf2, x, 0.42 + h * 0.6, ((i * 13) % 3 - 1) * 0.05, 1, 0.95, 1); }
  for (let i = 0; i < 2; i++) { const o = new THREE.Mesh(new THREE.ConeGeometry(0.1, 1.0 + i * 0.25, 7), M.leaf2); o.position.set(-len * 0.25 + i * len * 0.5, 0.42 + 0.55 + i * 0.12, 0); g.add(o); }
  return g;
}
function sunLounger(b) {
  const g = b.g(0, 0, 0); b.box(g, 0.62, 0.1, 1.95, M.woodF, 0, 0.2, 0); b.box(g, 0.6, 0.1, 1.2, M.sofa, 0, 0.32, 0.35);
  const back = b.box(g, 0.6, 0.1, 0.8, M.sofa, 0, 0.62, -0.78); back.rotation.x = 0.7;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(g, 0.05, 0.2, 0.05, M.metal, sx * 0.26, 0, sz * 0.9);
  return g;
}
function kidsTable(b) {
  const g = b.g(0, 0, 0); b.box(g, 0.75, 0.04, 0.75, M.toyA, 0, 0.5, 0); for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(g, 0.05, 0.5, 0.05, M.woodL, sx * 0.32, 0, sz * 0.32);
  for (const [x, z, ry, m] of [[-0.6, 0, E, M.toyB], [0.6, 0, -E, M.toyC]]) { const c = b.g(x, 0, ry, g); c.position.set(x, 0, z); b.box(c, 0.3, 0.03, 0.3, m, 0, 0.28, 0); b.box(c, 0.3, 0.28, 0.03, m, 0, 0.3, -0.14); for (const sx of [-1, 1]) for (const sz of [-1, 1]) b.box(c, 0.03, 0.28, 0.03, M.woodL, sx * 0.12, 0, sz * 0.12); }
  return g;
}
function playHouse(b) {
  const g = b.g(0, 0, 0); b.box(g, 1.1, 0.95, 1.0, M.woodL, 0, 0, 0); b.box(g, 0.34, 0.6, 0.02, M.dark, 0, 0, 0.51); b.box(g, 0.3, 0.3, 0.02, M.glass, 0.34, 0.45, 0.51);
  for (const s of [-1, 1]) { const r = b.box(g, 0.75, 0.05, 1.12, M.toyC, s * 0.3, 0.95, 0); r.position.y = 1.12; r.rotation.z = -s * 0.75; }
  return g;
}
function kidsMat(b, w, d) { const g = b.g(0, 0, 0); const cols = [M.toyA, M.toyB, M.toyC, M.toyB]; const n = 2; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) b.box(g, w / n - 0.02, 0.025, d / n - 0.02, cols[(i + j) % 4], -w / 2 + w / n * (i + .5), 0.001, -d / 2 + d / n * (j + .5)); return g; }

// ---- type table ----
// x,y of an item = builder anchor. fp(p) -> [w, d, cz] footprint (local), cz = centre offset along local +z.
export const TYPES = {
  sofa: { label: 'ספה', cat: 'ישיבה', def: { w: 2.6, d: 0.95, seats: 3 }, fp: p => [p.w, p.d + 0.05, 0], make: (b, it, p) => b.sofa(0, 0, 0, p.w, p.d, p.seats), variants: [{ w: 2.0, seats: 2 }, { w: 2.6, seats: 3 }, { w: 3.2, seats: 4 }] },
  armchair: { label: 'כורסה', cat: 'ישיבה', def: {}, fp: () => [0.9, 0.9, 0], make: (b) => b.armchair(0, 0, 0) },
  coffeeTable: { label: 'שולחן קפה', cat: 'ישיבה', def: { w: 1.2, d: 0.7, round: null }, fp: p => [p.round ? p.w : p.w, p.round ? p.w : p.d, 0], make: (b, it, p) => { const r = p.round === null ? b.S.rugRound : p.round; const g = b.coffeeTable(0, 0, r ? Math.min(p.w, 1.0) : p.w, p.d, r); return g; }, variants: [{ round: false, w: 1.2, d: 0.7 }, { round: true, w: 0.95, d: 0.95 }, { round: false, w: 1.5, d: 0.8 }] },
  sideTable: { label: 'שולחן צד', cat: 'ישיבה', def: {}, fp: () => [0.55, 0.55, 0], make: (b) => b.sideTable(0, 0, 0.26) },
  floorLamp: { label: 'מנורת רצפה', cat: 'ישיבה', def: {}, fp: () => [0.35, 0.35, 0], make: (b) => b.floorLamp(0, 0, false) },
  tvUnit: { label: 'מזנון וטלוויזיה', cat: 'ישיבה', def: { w: 2.0 }, fp: p => [p.w, 0.46, 0], make: (b, it, p) => b.tvUnit(0, 0, 0, p.w), variants: [{ w: 1.4 }, { w: 2.0 }, { w: 2.6 }] },
  console: { label: 'קונסולה', cat: 'ישיבה', def: { w: 1.0 }, fp: p => [p.w, 0.34, 0], make: (b, it, p) => b.console(0, 0, 0, p.w), variants: [{ w: 0.8 }, { w: 1.0 }, { w: 1.4 }] },
  diningTable: { label: 'שולחן אוכל', cat: 'אוכל', def: { w: 2.3, d: 0.98, nSide: 3, ends: false, ext: 0, wOpen: 2.3, nOpen: 3 }, ext: true,
    fp: p => { const w = p.ext ? p.wOpen : p.w; return [w + (p.ends ? 0.6 : 0.1), p.d + 0.55, 0]; },
    make: (b, it, p) => b.diningTable(0, 0, 0, p.ext ? p.wOpen : p.w, p.d, p.ext ? p.nOpen : p.nSide, p.ends), variants: [{ w: 1.6, nSide: 2, wOpen: 1.6, nOpen: 2 }, { w: 2.3, nSide: 3, wOpen: 2.3, nOpen: 3 }, { w: 2.8, nSide: 4, wOpen: 2.8, nOpen: 4 }] },
  desk: { label: 'שולחן עבודה', cat: 'אוכל', def: { w: 1.2, d: 0.6 }, fp: p => [p.w, p.d + 0.63, 0.315], make: (b, it, p) => b.desk(0, 0, 0, p.w, p.d) },
  bed: { label: 'מיטה', cat: 'שינה', def: { w: 1.8, l: 2.05 }, fp: p => [p.w + 0.2, p.l + 0.1, 0], make: (b, it, p) => b.bed(0, 0, 0, p.w, p.l), variants: [{ w: 1.4, l: 2.0 }, { w: 1.6, l: 2.05 }, { w: 1.8, l: 2.05 }, { w: 2.0, l: 2.1 }] },
  nightstand: { label: 'שידת לילה', cat: 'שינה', def: {}, fp: () => [0.46, 0.42, 0], make: (b) => b.nightstand(0, 0, 0) },
  wardrobe: { label: 'ארון בגדים', cat: 'שינה', def: { w: 1.2, h: 2.4, d: 0.6 }, fp: p => [p.w, p.d + 0.05, 0], make: (b, it, p) => b.wardrobe(0, 0, 0, p.w, p.h, p.d), variants: [{ w: 0.9 }, { w: 1.2 }, { w: 1.6 }, { w: 2.2 }] },
  baseRun: { label: 'ארונות מטבח תחתונים', cat: 'מטבח', def: { len: 1.2, depth: 0.62, parts: [] }, fp: p => [p.len, p.depth, p.depth / 2], noRot: false,
    make: (b, it, p) => { const g = b.baseRun(0, 0, 0, p.len, p.depth); for (const [k, lx] of p.parts || []) { if (k === 'sink') b.sink(g, lx); if (k === 'hob') b.hob(g, lx); if (k === 'grill') { b.box(g, 0.9, 0.3, 0.5, M.metal, lx, 0.9, 0.33); b.box(g, 0.92, 0.07, 0.5, M.black, lx, 1.2, 0.33); b.cyl(g, 0.03, 0.3, M.metal, lx + 0.5, 0.9, 0.5, 8); } } return g; },
    variants: [{ len: 0.6 }, { len: 0.9 }, { len: 1.2 }, { len: 1.8 }, { len: 2.4 }] },
  upperRun: { label: 'ארונות עליונים', cat: 'מטבח', def: { len: 1.2 }, noBlock: true, fp: p => [p.len, 0.34, 0.17], make: (b, it, p) => b.upperRun(0, 0, 0, p.len, 0.34), variants: [{ len: 0.6 }, { len: 1.2 }, { len: 1.9 }] },
  tall: { label: 'ארון גבוה', cat: 'מטבח', def: { len: 1.2 }, fp: p => [p.len, 0.62, 0.31], make: (b, it, p) => b.tall(0, 0, 0, p.len), variants: [{ len: 0.6 }, { len: 1.2 }, { len: 1.8 }] },
  fridge: { label: 'מקרר', cat: 'מטבח', def: { w: 0.9 }, fp: p => [p.w, 0.68, 0.34], make: (b, it, p) => b.fridge(0, 0, 0, p.w) },
  island: { label: 'אי מטבח', cat: 'מטבח', def: { len: 3.0, depth: 1.0 }, fp: p => [p.len, p.depth + 0.6, 0.3], make: (b, it, p) => b.island(0, 0, 0, p.len, p.depth), variants: [{ len: 2.0 }, { len: 3.0 }, { len: 3.4 }] },
  hood: { label: 'קולט אדים', cat: 'מטבח', def: { w: 0.9 }, noBlock: true, fp: p => [p.w, 0.5, 0.25], make: (b, it, p) => b.hood(0, 0, 0, p.w) },
  plant: { label: 'עציץ', cat: 'צמחים', def: { h: 1.3, kind: 0 }, fp: p => [0.5, 0.5, 0], make: (b, it, p) => b.plant(0, 0, p.h, p.kind), variants: [{ h: 0.9, kind: 0 }, { h: 1.3, kind: 1 }, { h: 1.7, kind: 0 }, { h: 1.2, kind: 1 }] },
  planter: { label: 'עציצית ארוכה', cat: 'צמחים', def: { len: 1.3 }, fp: p => [p.len, 0.46, 0], make: (b, it, p) => planter(b, p.len), variants: [{ len: 0.9 }, { len: 1.3 }, { len: 1.8 }] },
  rug: { label: 'שטיח', cat: 'שטיחים ותאורה', def: { w: 2.4, d: 1.8, round: false }, noBlock: true, fp: p => [p.w, p.d, 0], make: (b, it, p) => b.rug(0, 0, p.w, p.d, p.round, 0), variants: [{ w: 2.4, d: 1.8, round: false }, { w: 2.0, d: 2.0, round: true }, { w: 3.2, d: 2.4, round: false }] },
  pendant: { label: 'תליון תאורה', cat: 'שטיחים ותאורה', def: { z: 1.7 }, noBlock: true, fp: () => [0.4, 0.4, 0], make: (b, it, p) => b.pendant(0, 0, p.z, b.S.pendant) },
  sunLounger: { label: 'מיטת שיזוף', cat: 'מרפסת', def: {}, fp: () => [0.7, 2.0, 0], make: (b) => sunLounger(b) },
  kidsTable: { label: 'שולחן ילדים', cat: 'מרפסת', def: {}, fp: () => [1.7, 0.8, 0], make: (b) => kidsTable(b) },
  playHouse: { label: 'בית משחק', cat: 'מרפסת', def: {}, fp: () => [1.15, 1.1, 0], make: (b) => playHouse(b) },
  kidsMat: { label: 'מזרן משחק', cat: 'מרפסת', def: { w: 2.3, d: 2.3 }, noBlock: true, fp: p => [p.w, p.d, 0], make: (b, it, p) => kidsMat(b, p.w, p.d), variants: [{ w: 1.6, d: 1.6 }, { w: 2.3, d: 2.3 }, { w: 3, d: 2.4 }] },
  closet: { label: 'מחסן / ארון מרפסת', cat: 'מרפסת', def: { w: 1.4, h: 2.1, d: 0.62 }, fp: p => [p.w, p.d + 0.05, 0], make: (b, it, p) => b.wardrobe(0, 0, 0, p.w, p.h, p.d), variants: [{ w: 1.0 }, { w: 1.4 }, { w: 2.0 }] }
};
export const ICONS = { sofa: '🛋️', armchair: '💺', coffeeTable: '☕', sideTable: '🪑', floorLamp: '💡', tvUnit: '📺', console: '🗄️', diningTable: '🍽️', desk: '💻', bed: '🛏️', nightstand: '🕯️', wardrobe: '🚪', baseRun: '🍳', upperRun: '🗄️', tall: '🚪', fridge: '🧊', island: '🍴', hood: '♨️', plant: '🪴', planter: '🌿', rug: '🟫', pendant: '🔆', sunLounger: '🏖️', kidsTable: '🧸', playHouse: '🏠', kidsMat: '🟦', closet: '📦' };
export const CATS = ['ישיבה', 'אוכל', 'שינה', 'מטבח', 'צמחים', 'שטיחים ותאורה', 'מרפסת'];

// footprint helpers
export function fwd(r) { return [Math.sin(r), -Math.cos(r)]; }
export function footprint(it) {
  const T = TYPES[it.t], [w, d, cz] = T.fp(it.p), f = fwd(it.r), cx = it.x + f[0] * cz, cy = it.y + f[1] * cz;
  const c = Math.abs(Math.cos(it.r)), s = Math.abs(Math.sin(it.r)), hx = c * w / 2 + s * d / 2, hy = s * w / 2 + c * d / 2;
  return { w, d, cz, c: [cx, cy], aabb: [cx - hx, cy - hy, cx + hx, cy + hy], noBlock: !!T.noBlock };
}

// ---- default layout = my proposed design ----
let _id = 0; const mk = (t, x, y, r, p = {}) => ({ id: 'i' + (++_id), t, x, y, r, p: { ...TYPES[t].def, ...p } });
export function defaultItems() {
  _id = 0; const I = [];
  const a = (...x) => I.push(mk(...x));
  // living: calm and open, wide walking space
  a('rug', 2.6, 5.3, S_, { w: 2.6, d: 2.2, round: null });
  a('sofa', 2.6, 4.55, N, { w: 2.6, d: 0.95, seats: 3 });
  a('coffeeTable', 2.6, 5.75, S_, { w: 1.1, d: 0.6, round: null });
  a('tvUnit', 3.0, 7.04, S_, { w: 1.8 });
  a('plant', 0.5, 7.0, S_, { h: 1.5, kind: 0 });
  // entrance
  a('console', 5.5, 5.75, W_, { w: 1.0 });
  // dining (indoor): table for six, room around it
  a('diningTable', 1.5, 1.9, E, { w: 1.9, d: 0.95, nSide: 2, ends: true, wOpen: 1.9, nOpen: 2 });
  a('pendant', 1.5, 1.9, E, { z: 1.65 });
  // kitchen: hob next to the windows, sink under the window, island pulled east to leave a wide aisle
  a('baseRun', 3.3, 0.22, N, { len: 2.0 });
  a('baseRun', 4.9, 0.22, N, { len: 1.2 });
  a('baseRun', 6.135, 0.34, N, { len: 1.27, parts: [['hob', 0]] });
  a('baseRun', 7.36, 0.22, N, { len: 1.18, parts: [['sink', 0]] });
  a('hood', 6.135, 0.34, N, { w: 0.9 }); a('upperRun', 3.3, 0.22, N, { len: 1.9 });
  a('island', 4.6, 2.3, N, { len: 3.0, depth: 0.95 });
  for (const x of [4.0, 5.2]) a('pendant', x, 2.3, S_, { z: 1.7 });
  a('fridge', 8.93, 0.9, W_, { w: 0.9 }); a('tall', 8.93, 2.0, W_, { len: 1.4 });
  // master bedroom
  a('rug', 14.1, 5.9, S_, { w: 2.6, d: 2.0, round: null }); a('bed', 14.1, 6.18, S_, { w: 1.8, l: 2.05 });
  a('nightstand', 12.95, 7.08, S_); a('nightstand', 15.2, 7.08, S_); a('wardrobe', 12.05, 7.04, S_, { w: 1.2 });
  a('wardrobe', 15.15, 3.98, W_, { w: 1.0, d: 0.5 });
  // bedroom 3
  a('rug', 13.9, 1.7, S_, { w: 2.2, d: 2.0, round: null }); a('bed', 13.8, 1.95, E, { w: 1.5, l: 2.0 });
  a('nightstand', 12.95, 1.0, E); a('nightstand', 12.95, 2.9, E); a('wardrobe', 14.6, 3.07, S_, { w: 1.6 });
  // mamad bedroom
  a('bed', 11.35, 1.72, W_, { w: 1.6, l: 2.05 }); a('nightstand', 12.2, 0.75, W_); a('nightstand', 12.2, 2.7, W_); a('wardrobe', 9.45, 1.9, E, { w: 2.0 });
  a('rug', 11.0, 1.7, S_, { w: 2.2, d: 1.8, round: false });
  // terrace: dining for 6 (opens to 8), loungers, kids corner vs adults corner, outdoor kitchen, storage
  a('diningTable', -2.1, 6.0, E, { w: 1.8, d: 0.95, nSide: 2, ends: true, ext: 0, wOpen: 2.6, nOpen: 3 });
  a('pendant', -2.1, 5.6, S_, { z: 1.75 }); a('pendant', -2.1, 6.4, S_, { z: 1.75 });
  a('sunLounger', -3.0, 1.9, N); a('sunLounger', -1.8, 1.9, N);
  a('kidsMat', -2.7, 10.0, S_, { w: 2.3, d: 2.3 }); a('kidsTable', -2.7, 9.6, S_); a('playHouse', -3.0, 11.0, S_);
  a('sofa', 0.45, 9.8, W_, { w: 2.4, d: 0.95, seats: 3 }); a('coffeeTable', -0.6, 9.8, S_, { w: 0.9, d: 0.9, round: true });
  a('armchair', -0.7, 8.55, N);
  a('baseRun', 2.087, 10.55, W_, { len: 2.0, parts: [['grill', -0.45], ['sink', 0.55]] });
  a('closet', 1.76, 8.65, W_, { w: 1.4, h: 2.1, d: 0.62 });
  for (const y of [1.6, 3.3, 5.0, 6.7, 8.4, 10.1]) a('planter', -3.9, y, E, { len: 1.3 });
  for (const x of [-1.3, 0.4]) a('planter', x, 11.5, S_, { len: x < 0 ? 1.3 : 1.1 });
  for (const x of [-3.3, -1.9]) a('planter', x, 0.4, S_, { len: 1.2 });
  return I;
}
export function nextId(items) { let m = 0; for (const i of items) m = Math.max(m, +i.id.slice(1) || 0); return 'i' + (m + 1); }
