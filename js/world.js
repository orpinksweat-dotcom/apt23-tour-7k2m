// Builds the apartment: architecture (from the drawing), furniture (per style), sky, sun and lights.
import * as THREE from 'three';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';
import { PLAN } from './plan.js';
import { M, initMaterials, applyStyle, worldUV, STYLES } from './materials.js';
import { Builder } from './furniture.js';

const H = 2.6;                      // ceiling height (ASSUMPTION: not written in the drawing)
const SILL = 0.9, HEAD = 2.1;       // window sill / head (assumption), doors 2.1 (assumption)
const UVSIZE = new Map();

export const ROOMS = [
  { id: 'lobby',   name: 'מבואת כניסה',     pos: [5.12, 6.95], look: [5.0, 3.6],  area: null,                note: 'כניסה לדירה' },
  { id: 'living',  name: 'סלון',             pos: [0.95, 6.95], look: [3.6, 4.2],  area: PLAN.areas.living,   note: 'פתוח למרפסת דרך דלתות זכוכית' },
  { id: 'dining',  name: 'פינת אוכל',        pos: [1.4, 3.3],   look: [1.4, 0.9],  area: PLAN.areas.dining },
  { id: 'kitchen', name: 'מטבח אירוח מורחב', pos: [8.1, 2.8],   look: [4.2, 1.6],  area: PLAN.areas.kitchen,  note: 'כולל שטח חדר השינה לשעבר · שינוי מוצע, טעון בדיקה' },
  { id: 'niche',   name: 'נישת אירוח',       pos: [6.37, 4.15], look: [6.37, 6.7], area: PLAN.areas.niche,    note: 'שירותי האורחים לשעבר · בר וקפה / אחסון · טעון בדיקה' },
  { id: 'hall',    name: 'פרוזדור',          pos: [6.1, 3.95],  look: [12.0, 3.95],area: null },
  { id: 'bath',    name: 'חדר רחצה כללי',    pos: [8.32, 4.8],  look: [8.1, 6.6],  area: PLAN.areas.bath },
  { id: 'master',  name: 'חדר שינה הורים',   pos: [12.0, 5.2],  look: [14.3, 6.8], area: PLAN.areas.master },
  { id: 'masterbath', name: 'חדר רחצה הורים',pos: [10.95, 6.3], look: [9.7, 5.4],  area: PLAN.areas.masterbath },
  { id: 'bed3',    name: 'חדר שינה',         pos: [13.25, 3.2], look: [14.2, 1.4], area: PLAN.areas.bed3 },
  { id: 'mamad',   name: 'ממ״ד · חדר שינה',  pos: [10.3, 2.95], look: [11.6, 1.4], area: PLAN.areas.mamad },
  { id: 'terrace', name: 'מרפסת הגג',        pos: [-1.0, 5.8],  look: [-2.6, 2.4], area: null,                note: 'פינת אוכל מוצלת בפרגולה' },
  { id: 'outkitchen', name: 'מטבח חוץ',      pos: [-0.2, 8.45], look: [1.8, 10.2], area: null,                note: 'המחשה טעונת אישור · גז, ניקוז והיתרים' },
  { id: 'lounge',  name: 'פינת רביצה',       pos: [-0.3, 8.5],  look: [-3.0, 10.6],area: null }
];

export function createWorld(scene, renderer, mobile) {
  initMaterials();
  const W = { style: 'C', time: 'noon', blocks: [], walls: [], walkRects: [], niche: 'bar', mobile };
  const root = new THREE.Group(); scene.add(root);
  const P = (x, y, z = 0) => new THREE.Vector3(x, z, -y);

  // ---------- helpers ----------
  const tmp = new THREE.Group();
  function abox(g, x0, y0, x1, y1, z0, z1, mat) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, z1 - z0, y1 - y0), mat);
    m.position.set((x0 + x1) / 2, (z0 + z1) / 2, -(y0 + y1) / 2); g.add(m); return m;
  }
  function merge(group, castShadow = true, receive = true) {
    group.updateMatrixWorld(true);
    const byMat = new Map();
    group.traverse(o => {
      if (!o.isMesh) return;
      const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      const sz = UVSIZE.get(o.material);
      if (sz) worldUV(g, new THREE.Object3D(), sz);
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      if (!byMat.has(o.material)) byMat.set(o.material, []);
      byMat.get(o.material).push(g);
    });
    const out = new THREE.Group();
    for (const [mat, list] of byMat) {
      const mg = mergeGeometries(list, false); if (!mg) continue; mg.computeBoundingSphere();
      const mesh = new THREE.Mesh(mg, mat); const ns = mat === M.glass || mat === M.light || mat === M.curtain || mat === M.change;
      mesh.castShadow = castShadow && !ns; mesh.receiveShadow = receive && mat !== M.glass; out.add(mesh);
      list.forEach(g => g.dispose());
    }
    return out;
  }
  UVSIZE.set(M.wall, 1.6); UVSIZE.set(M.ceiling, 1.6); UVSIZE.set(M.floorPub, 1.6); UVSIZE.set(M.floorWood, 1.2);
  UVSIZE.set(M.tile, 0.8); UVSIZE.set(M.wallWet, 1.2); UVSIZE.set(M.deck, 1.0); UVSIZE.set(M.cab, 1.0);
  UVSIZE.set(M.counter, 1.6); UVSIZE.set(M.woodF, 0.8); UVSIZE.set(M.woodL, 0.8); UVSIZE.set(M.sofa, 0.3); UVSIZE.set(M.rug, 0.5);

  // ---------- architecture ----------
  const arch = new THREE.Group(), archLow = new THREE.Group(), ceilG = new THREE.Group(), changeG = new THREE.Group();
  const A = PLAN;
  const solids = []; // collision rects
  for (const w of A.walls) {
    const [x0, y0, x1, y1] = w.r;
    if (w.change === 'removed') { // ghost of the removed partition (shown only in "changes" mode)
      abox(changeG, x0, y0, x1, y1, 0, H, M.change); continue;
    }
    const top = w.kind === 'parapet' ? 1.1 : H;
    abox(arch, x0, y0, x1, y1, 0, top, M.wall);
    abox(archLow, x0, y0, x1, y1, 0, w.kind === 'parapet' ? 1.1 : 1.0, M.wall);
    if (w.kind === 'parapet') abox(arch, x0 - 0.02, y0 - 0.02, x1 + 0.02, y1 + 0.02, 1.1, 1.14, M.counter);
    solids.push([x0, y0, x1, y1]); W.walls.push([x0, y0, x1, y1]);
  }
  // openings
  function opening(r, sill, head, glass, frameCol, mullions = 0) {
    const [x0, y0, x1, y1] = r; const alongX = (x1 - x0) > (y1 - y0);
    if (sill > 0.001) { abox(arch, x0, y0, x1, y1, 0, sill, M.wall); abox(archLow, x0, y0, x1, y1, 0, Math.min(sill, 1.0), M.wall); }
    if (head < H) abox(arch, x0, y0, x1, y1, head, H, M.wall);
    const t = Math.min(x1 - x0, y1 - y0), fw = 0.05, fm = frameCol;
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    if (glass) {
      if (alongX) abox(arch, x0, cy - 0.006, x1, cy + 0.006, sill, head, M.glass); else abox(arch, cx - 0.006, y0, cx + 0.006, y1, sill, head, M.glass);
      if (alongX) { abox(arch, x0, cy - t * .3, x1, cy + t * .3, sill, sill + fw, fm); abox(arch, x0, cy - t * .3, x1, cy + t * .3, head - fw, head, fm); abox(arch, x0, cy - t * .3, x0 + fw, cy + t * .3, sill, head, fm); abox(arch, x1 - fw, cy - t * .3, x1, cy + t * .3, sill, head, fm); }
      else { abox(arch, cx - t * .3, y0, cx + t * .3, y1, sill, sill + fw, fm); abox(arch, cx - t * .3, y0, cx + t * .3, y1, head - fw, head, fm); abox(arch, cx - t * .3, y0, cx + t * .3, y0 + fw, sill, head, fm); abox(arch, cx - t * .3, y1 - fw, cx + t * .3, y1, sill, head, fm); }
      const len = alongX ? x1 - x0 : y1 - y0; const n = mullions || Math.max(0, Math.round(len / 1.0) - 1);
      for (let i = 1; i <= n; i++) { const f = i / (n + 1); if (alongX) { const x = x0 + len * f; abox(arch, x - 0.02, cy - t * .3, x + 0.02, cy + t * .3, sill, head, fm); } else { const y = y0 + len * f; abox(arch, cx - t * .3, y - 0.02, cx + t * .3, y + 0.02, sill, head, fm); } }
    }
  }
  A.windows.forEach(r => { const full = r[0] < 0.3 && r[2] < 0.3; opening(r, full ? 0.02 : SILL, full ? 2.45 : HEAD, true, M.frame); solids.push(r); W.walls.push(r); });
  A.glassdoors.forEach(r => opening(r, 0.0, 2.4, true, M.frame, 3));
  A.doors.forEach(d => {
    const [x0, y0, x1, y1] = d.r; abox(arch, x0, y0, x1, y1, HEAD, H, M.wall);
    const alongX = (x1 - x0) > (y1 - y0), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, t = Math.min(x1 - x0, y1 - y0) + 0.03;
    if (alongX) { abox(arch, x0, cy - t / 2, x0 + 0.04, cy + t / 2, 0, HEAD, M.white); abox(arch, x1 - 0.04, cy - t / 2, x1, cy + t / 2, 0, HEAD, M.white); abox(arch, x0, cy - t / 2, x1, cy + t / 2, HEAD - 0.04, HEAD, M.white); }
    else { abox(arch, cx - t / 2, y0, cx + t / 2, y0 + 0.04, 0, HEAD, M.white); abox(arch, cx - t / 2, y1 - 0.04, cx + t / 2, y1, 0, HEAD, M.white); abox(arch, cx - t / 2, y0, cx + t / 2, y1, HEAD - 0.04, HEAD, M.white); }
  });
  // entrance door leaf (opened into the lobby)
  { const d = A.doors.find(x => x.id === 'entrance').r; const w = d[2] - d[0] - 0.06;
    abox(arch, d[2] - 0.075, d[1] - w + 0.0, d[2] - 0.03, d[1] + 0.05, 0, HEAD - 0.05, M.woodF);
    abox(arch, d[2] - 0.09, d[1] - w + 0.1, d[2] - 0.075, d[1] - w + 0.7, 0.95, 1.0, M.brass); }
  // floors
  const apt = [0, 0, 15.66, 7.56];
  abox(arch, apt[0], apt[1], apt[2], apt[3], -0.3, 0, M.floorPub);
  const wood = ['master', 'bed3', 'mamad'], tiles = ['bath', 'masterbath'];
  for (const [n, list] of Object.entries(A.rooms)) {
    list.forEach(r => {
      if (wood.includes(n)) abox(arch, r[0] - 0.12, r[1] - 0.12, r[2] + 0.12, r[3] + 0.12, 0, 0.006, M.floorWood);
      if (tiles.includes(n)) abox(arch, r[0] - 0.12, r[1] - 0.12, r[2] + 0.12, r[3] + 0.12, 0, 0.006, M.tile);
    });
  }
  // wet-room wall tiles (3 sides; the door side stays plaster)
  const clad = (r, skip) => { const t = 0.012, h = 2.4, [x0, y0, x1, y1] = r;
    if (skip !== 'W') abox(arch, x0, y0, x0 + t, y1, 0, h, M.wallWet); if (skip !== 'E') abox(arch, x1 - t, y0, x1, y1, 0, h, M.wallWet);
    if (skip !== 'N') abox(arch, x0, y1 - t, x1, y1, 0, h, M.wallWet); if (skip !== 'S') abox(arch, x0, y0, x1, y0 + t, 0, h, M.wallWet); };
  clad(A.rooms.bath[0], 'S'); clad(A.rooms.masterbath[0], 'E');
  // terrace deck
  const tw = A.rooms.terrace_w[0], tn = A.rooms.terrace_n[0];
  abox(arch, tw[0], tw[1], 0.1, tw[3], -0.2, 0, M.deck); abox(arch, tn[0], 7.46, tn[2], tn[3], -0.2, 0, M.deck);
  // ceilings + roof slab (hidden in top view)
  abox(ceilG, 0, 0, 15.66, 7.56, H, H + 0.25, M.ceiling);
  // glass railings
  function rail(x0, y0, x1, y1) { const al = Math.abs(x1 - x0) > Math.abs(y1 - y0); const g = new THREE.Group();
    abox(g, Math.min(x0, x1) - (al ? 0 : 0.01), Math.min(y0, y1) - (al ? 0.01 : 0), Math.max(x0, x1) + (al ? 0 : 0.01), Math.max(y0, y1) + (al ? 0.01 : 0), 0.1, 1.1, M.glass);
    abox(g, Math.min(x0, x1) - .03, Math.min(y0, y1) - .03, Math.max(x0, x1) + .03, Math.max(y0, y1) + .03, 1.1, 1.14, M.metal);
    abox(g, Math.min(x0, x1) - .03, Math.min(y0, y1) - .03, Math.max(x0, x1) + .03, Math.max(y0, y1) + .03, 0.0, 0.1, M.metal); arch.add(g); }
  const tx0 = tw[0], ty1 = tn[3];
  rail(tx0, 0, tx0, ty1); rail(tx0, 0, 0.1, 0); rail(tx0, ty1, -1.88, ty1);
  W.walkRects.push([0.0, 0.0, 15.66, 7.56], [tw[0], tw[1], 0.1, tw[3]], [tn[0], 7.46, tn[2], tn[3]]);
  W.apt = apt; W.terrace = [tw, tn];
  const archM = merge(arch), archLowM = merge(archLow), ceilM = merge(ceilG), changeM = merge(changeG, false, false);
  root.add(archM, archLowM, ceilM, changeM); archLowM.visible = false; changeM.visible = false;
  W.archM = archM; W.archLowM = archLowM; W.ceilM = ceilM; W.changeM = changeM;
  W.solids = solids;

  // change markers (niche, outdoor kitchen, enlarged kitchen) shown in "changes" mode
  { const g = new THREE.Group(); const z = (r, c = H) => abox(g, r[0], r[1], r[2], r[3], 0.0, 0.05, M.change);
    z(A.rooms.niche[0]); z([5.9, 0.22, 8.93, 3.3]); z([1.2, 8.0, 2.09, 11.7]); const mm = merge(g, false, false); changeM.add(...mm.children); }

  // ---------- sky, sun, lights ----------
  const skyMat = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: new THREE.Color('#6aa5e6') }, hor: { value: new THREE.Color('#dce9f4') }, bot: { value: new THREE.Color('#cfd8de') } },
    vertexShader: 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top,hor,bot; varying vec3 vP; void main(){ float h=normalize(vP).y; vec3 c = h>0. ? mix(hor,top,pow(h,.55)) : mix(hor,bot,pow(-h,.4)); gl_FragColor=vec4(c,1.); }' });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 24, 16), skyMat); sky.renderOrder = -10; scene.add(sky); W.sky = sky;
  const ground = new THREE.Mesh(new THREE.CircleGeometry(900, 32), new THREE.MeshBasicMaterial({ color: '#cfd8de' })); ground.rotation.x = -Math.PI / 2; ground.position.y = -26; scene.add(ground);
  scene.fog = new THREE.Fog('#dce9f4', 60, 380);
  const pmrem = new THREE.PMREMGenerator(renderer); scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const sun = new THREE.DirectionalLight('#fff', 3); sun.castShadow = true;
  const sm = mobile ? 1536 : 2560; sun.shadow.mapSize.set(sm, sm); const sc = sun.shadow.camera; sc.left = -12; sc.right = 12; sc.top = 12; sc.bottom = -12; sc.near = 1; sc.far = 80;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 4; sun.target.position.set(6, 0, -6); scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#cfe0ff', '#bfb2a0', 0.5); scene.add(hemi);
  const fill = new THREE.AmbientLight('#fff4e6', 0.0); scene.add(fill);
  W.sun = sun; W.hemi = hemi;
  const TIMES = {
    morning: { label: 'בוקר',   el: 24, az: 100, sun: '#ffd7a3', si: 2.4, top: '#8db7e8', hor: '#f4dcc3', hemi: 0.3, env: 0.32, exp: 0.9, lamps: 0.0, amb: 0.05 },
    noon:    { label: 'צהריים', el: 64, az: 200, sun: '#fff6e8', si: 2.8, top: '#5f9de0', hor: '#dbe9f5', hemi: 0.38, env: 0.4,  exp: 0.82, lamps: 0.0, amb: 0.04 },
    sunset:  { label: 'שקיעה',  el: 7,  az: 262, sun: '#ff9650', si: 2.2, top: '#40608f', hor: '#ffb27c', hemi: 0.22, env: 0.24, exp: 0.95, lamps: 0.5, amb: 0.06 },
    night:   { label: 'לילה',   el: 38, az: 60,  sun: '#9db2e6', si: 0.25, top: '#050914', hor: '#18223d', hemi: 0.08, env: 0.07,  exp: 1.05, lamps: 1.0, amb: 0.07 }
  };
  W.TIMES = TIMES;
  const cur = { si: 3, hemi: .5, env: .5, exp: 1, lamps: 0, amb: 0, el: 60, az: 200, sun: new THREE.Color(), top: new THREE.Color(), hor: new THREE.Color() };
  let tgt = null; W.lampLevel = 0;
  W.setTime = (k, instant = false) => { W.time = k; const t = TIMES[k]; tgt = { ...t, sunC: new THREE.Color(t.sun), topC: new THREE.Color(t.top), horC: new THREE.Color(t.hor) }; if (instant) tick(10); };
  function tick(dt) {
    if (!tgt) return; const k = Math.min(1, dt * 3.2), L = (a, b) => a + (b - a) * k;
    cur.si = L(cur.si, tgt.si); cur.hemi = L(cur.hemi, tgt.hemi); cur.env = L(cur.env, tgt.env); cur.exp = L(cur.exp, tgt.exp); cur.lamps = L(cur.lamps, tgt.lamps); cur.amb = L(cur.amb, tgt.amb);
    cur.el = L(cur.el, tgt.el); cur.az = L(cur.az, tgt.az); cur.sun.lerp(tgt.sunC, k); cur.top.lerp(tgt.topC, k); cur.hor.lerp(tgt.horC, k);
    const el = cur.el * Math.PI / 180, az = cur.az * Math.PI / 180; // az: 0=N, 90=E, 180=S, 270=W (plan)
    const d = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
    sun.position.copy(sun.target.position).addScaledVector(d, 40); sun.color.copy(cur.sun); sun.intensity = cur.si;
    hemi.intensity = cur.hemi; fill.intensity = cur.amb; renderer.toneMappingExposure = cur.exp; scene.environmentIntensity = cur.env;
    skyMat.uniforms.top.value.copy(cur.top); skyMat.uniforms.hor.value.copy(cur.hor); skyMat.uniforms.bot.value.copy(cur.hor).multiplyScalar(0.9);
    scene.fog.color.copy(cur.hor); ground.material.color.copy(cur.hor).multiplyScalar(0.92);
    W.lampLevel = cur.lamps; M.light.emissiveIntensity = cur.lamps * 2.2 + 0.0; M.shade.emissiveIntensity = cur.lamps * 0.9;
    M.light.color.set('#fff'); lampLights.forEach(l => { l.intensity = l.userData.base * cur.lamps; });
  }
  W.update = tick;

  // ---------- furniture / style ----------
  let furnM = null, nicheBarM = null, nicheStoreM = null; const lampLights = [];
  const furnGroup = new THREE.Group(); root.add(furnGroup); W.furnGroup = furnGroup;

  function layout(S, key) {
    const b = new Builder(S); const R = A.rooms; const bar = b.niche.bar, store = b.niche.store;
    const dec = key === 'A' ? 0.6 : 1.0;
    // ---- living ----
    b.rug(2.7, 5.2, 3.3, 2.5, S.rugRound);
    b.sofa(2.6, 4.45, 'N', 2.8, 0.98, 3);
    b.coffeeTable(2.65, 5.45, S.rugRound ? 0.95 : 1.25, S.rugRound ? 0.95 : 0.7, S.rugRound);
    b.armchair(4.15, 5.55, 'W'); b.sideTable(4.15, 6.2, 0.26);
    b.tvUnit(3.2, 7.04, 'S', 2.1);
    b.floorLamp(0.7, 3.85); b.floorLamp(4.35, 4.55, false);
    b.plant(0.5, 7.0, 1.6 * S.plant ** .3, key === 'A' ? 1 : 0); b.plant(4.4, 7.0, 1.2);
    if (S.plant > 1.2) b.plant(0.5, 4.2, 1.1); b.plant(2.15, 7.0, 0.9 * S.plant, 1);
    b.art(b.root, 3.2, 1.55, -(7.26 - 0.02), 0.9, 0.7, 0, M.bedAcc); b.art(b.root, 2.3, 1.55, -(7.26 - 0.02), 0.6, 0.8, 0, M.cushion);
    b.curtain(0.2, 5.9, 'E', 1.9, 2.45, 0.05); // sheer next to the glass door
    // ---- lobby ----
    b.console(5.5, 5.75, 'W', 1.0); b.mirror(b.root, 5.69, 1.15, -5.75, 0.7, 1.0, -Math.PI / 2);
    // ---- dining ----
    const dt = b.diningTable(1.4, 1.9, 'E', 2.3, 0.98, 3, false);
    const pd = b.pendant(1.4, 1.9, 1.65, S.pendant); pd.rotation.y = Math.PI / 2; if (S.pendant === 'globe') { b.pendant(1.4, 1.35, 1.65, 'globe'); b.pendant(1.4, 2.45, 1.65, 'globe'); }
    b.rug(1.4, 1.9, 2.4, 3.0, S.rugRound && false);
    b.plant(0.5, 3.15, 1.5, 1); b.curtain(1.05, 0.22, 'N', 1.1, 2.4, 0.05);
    // ---- kitchen (enlarged) ----
    const kr = b.baseRun(5.25, 0.22, 'N', 5.9); b.sink(kr, 4.9 - 5.25); b.block(2.3, 0.22, 8.2, 0.86);
    b.upperRun(3.3, 0.22, 'N', 1.9, 0.34); b.upperRun(6.25, 0.22, 'N', 1.1, 0.34); b.upperRun(8.45 - 0.15, 0.22, 'N', 0.0001, 0.34);
    const hr = b.baseRun(7.1, 3.30, 'S', 1.8); b.hob(hr, 0); b.hood(7.1, 3.30, 'S', 0.9); b.block(6.2, 2.7, 8.0, 3.32); b.upperRun(6.4, 3.30, 'S', 0.5, 0.34); b.upperRun(7.8, 3.30, 'S', 0.5, 0.34);
    b.island(4.5, 2.4, 'N', 3.0, 1.0);
    for (let i = 0; i < 3; i++) b.pendant(3.5 + i * 1.0, 2.4, 1.7, S.pendant === 'bar' ? 'bar' : S.pendant);
    b.fridge(8.93 - 0.0, 0.85, 'W', 0.9); b.block(8.25, 0.4, 8.93, 1.3);
    b.tall(8.93, 2.0, 'W', 1.4); b.block(8.3, 1.3, 8.93, 2.7);
    b.plant(2.45, 0.55, 1.0, 1);
    b.rug(7.0, 1.9, 2.0, 1.2, false);
    // ---- niche (bar / storage) ----
    { const nb = new Builder(S); nb.baseRun(6.93, 5.9, 'W', 1.7, 0.55); nb.upperRun(6.93, 5.9, 'W', 1.7, 0.3, 0.7, 1.5);
      // appliances on bar counter
      nb.box(nb.root, 0.3, 0.4, 0.4, M.metal, 6.65, 0.9, -5.9); nb.cyl(nb.root, 0.05, 0.12, M.ceramic, 6.65, 0.9, -5.4, 12); nb.cyl(nb.root, 0.05, 0.12, M.ceramic, 6.65, 0.9, -5.3, 12);
      for (let i = 0; i < 6; i++) nb.cyl(nb.root, 0.025, 0.18, M.glass, 6.78, 1.55, -(5.2 + i * 0.25), 8);
      nb.box(nb.root, 0.3, 0.6, 0.5, M.glass, 6.7, 0.14, -5.0); // wine fridge glass
      nb.box(nb.root, 0.02, 1.9, 1.2, M.woodL, 5.82, 0.0, -5.6); // slat panel on west wall
      nb.block(6.38, 4.9, 6.93, 6.75); bar.add(nb.root); b.blocks.push(...nb.blocks);
      const ns = new Builder(S); ns.tall(6.93, 5.85, 'W', 1.85, 0.55); for (let i = 0; i < 3; i++) ns.box(ns.root, 0.4, 0.3, 0.35, M.bedAcc, 6.2, 0.0 + 0.0, -(6.3 - i * 0.0)).visible = false;
      ns.box(ns.root, 0.02, 1.9, 1.0, M.woodL, 5.82, 0.0, -5.6); ns.block(6.38, 4.9, 6.93, 6.77); store.add(ns.root); }
    // ---- general bath ----
    b.shower(7.55, 6.27, 'S'); b.toilet(8.75, 6.58, 'S'); b.vanity(9.31, 5.2, 'W', 0.9, 1); b.box(b.root, 0.5, 0.02, 0.3, M.bedAcc, 7.45, 1.2, -4.75);
    // ---- master bath ----
    b.shower(9.95, 6.25, 'S', 1.0, 1.0); b.toilet(9.52, 5.35, 'E'); b.vanity(10.15, 4.58, 'N', 1.4, 2);
    // ---- master bedroom ----
    b.rug(14.1, 5.9, 3.1, 2.7, S.rugRound);
    b.bed(14.1, 6.18, 'S', 1.8, 2.05); b.nightstand(12.95, 7.08, 'S'); b.nightstand(15.2, 7.08, 'S');
    b.wardrobe(12.05, 7.04, 'S', 1.2); b.tvUnit(13.2, 4.8, 'N', 1.4);
    b.art(b.root, 14.1, 1.35, -(7.337 - 0.07), 1.3, 0.6, 0, M.bedAcc);
    b.wardrobe(15.15, 3.98, 'W', 1.0, 2.4, 0.5); b.wardrobe(14.4, 3.74, 'N', 1.3, 2.4, 0.5); b.plant(15.1, 4.8, 1.2);
    b.curtain(14.0, 7.337, 'S', 1.2, 2.45, 0.05); b.curtain(15.43, 5.96, 'W', 1.2, 2.45, 0.05);
    // ---- bedroom 3 ----
    b.rug(13.9, 1.7, 2.6, 2.6, S.rugRound);
    b.bed(13.8, 1.95, 'E', 1.5, 2.0); b.nightstand(12.95, 1.0, 'E'); b.nightstand(12.95, 2.9, 'E');
    b.wardrobe(14.6, 3.07, 'S', 1.6); b.desk(14.3, 0.55, 'N', 1.1, 0.55); b.curtain(15.43, 1.55, 'W', 1.2, 2.45, 0.05); b.curtain(14.3, 0.22, 'N', 1.2, 2.45, 0.05);
    b.plant(15.1, 0.5, 1.2);
    // ---- mamad bedroom ----
    b.bed(11.35, 1.72, 'W', 1.6, 2.05); b.nightstand(12.2, 0.75, 'W'); b.nightstand(12.2, 2.7, 'W'); b.wardrobe(9.45, 1.9, 'E', 2.2); b.armchair(10.0, 0.75, 'E'); b.rug(11.0, 1.7, 2.6, 2.4, false);
    b.plant(9.5, 0.55, 1.0);
    // ---- hall ----
    b.rug(9.7, 3.95, 5.0, 0.85, false);
    b.art(b.root, 9.7, 1.45, -(4.49 - 0.03), 0.9, 0.6, 0);
    // ---- terrace ----
    const tk = b.diningTable(-2.0, 2.7, 'E', 2.8, 1.0, 4, true);
    // pergola over dining
    const pg = b.g(0, 0, 'S'); const px = [-3.6, -0.5], py = [0.9, 4.5];
    for (const x of px) for (const y of py) b.box(pg, 0.14, 2.5, 0.14, M.woodF, x, 0, -y);
    for (let i = 0; i <= 12; i++) b.box(pg, 3.4, 0.06, 0.07, M.woodF, -2.05, 2.5, -(0.9 + i * 0.3));
    for (const y of py) b.box(pg, 3.4, 0.12, 0.1, M.woodF, -2.05, 2.44, -y); b.box(pg, 0.1, 0.12, 3.8, M.woodF, -3.6, 2.44, -2.7); b.box(pg, 0.1, 0.12, 3.8, M.woodF, -0.5, 2.44, -2.7);
    b.light(-2.05, 2.7, 2.35, 0.8, 7, '#ffd9a0');
    for (let i = 0; i < 3; i++) b.pendant(-2.0, 1.6 + i * 1.1, 1.75, 'globe');
    b.plant(-3.8, 0.5, 1.5, 1); b.plant(-3.8, 5.2, 1.7, 0); b.plant(-3.8, 7.2, 1.4, 1); b.plant(-0.35, 0.4, 1.2, 0);
    // lounge (north block)
    b.rug(-2.6, 10.0, 3.2, 2.6, true);
    b.sofa(-3.35, 10.0, 'E', 2.8, 0.95, 3); b.sofa(-2.3, 11.2, 'S', 1.8, 0.9, 2); b.coffeeTable(-2.2, 10.0, 1.0, 1.0, true); b.armchair(-1.0, 10.0, 'W'); b.sideTable(-1.0, 10.8, 0.25);
    b.armchair(-1.0, 9.2, 'W');
    const pg2 = b.g(0, 0, 'S'); for (const x of [-3.9, -0.7]) for (const y of [8.3, 11.5]) b.box(pg2, 0.14, 2.5, 0.14, M.woodF, x, 0, -y);
    for (let i = 0; i <= 10; i++) b.box(pg2, 3.4, 0.06, 0.07, M.woodF, -2.3, 2.5, -(8.3 + i * 0.32));
    b.light(-2.3, 9.9, 2.35, 0.6, 7, '#ffd9a0');
    b.plant(-3.9, 8.0, 1.8, 0); b.plant(-1.2, 11.5, 1.6, 1); b.plant(0.7, 8.0, 1.3, 0); b.plant(-3.9, 11.4, 1.4, 1);
    // outdoor kitchen against the east wall (x = 2.09)
    const ok = b.baseRun(2.087, 9.75, 'W', 2.9, 0.62); b.block(1.46, 8.3, 2.09, 11.2);
    b.box(b.root, 0.9, 0.12, 0.55, M.metal, 1.78, 0.9, -9.75); b.box(b.root, 0.9, 0.35, 0.5, M.metal, 1.78, 0.98, -9.75); // built-in grill
    b.box(b.root, 0.92, 0.08, 0.5, M.black, 1.78, 1.33, -9.75).rotation.z = 0;
    b.cyl(b.root, 0.03, 0.4, M.metal, 1.45, 0.98, -9.75, 8);
    b.box(b.root, 0.6, 0.02, 0.4, M.metal, 1.76, 0.9, -10.6); b.cyl(b.root, 0.012, 0.28, M.metal, 1.5, 0.9, -10.6, 8); // sink
    b.upperRun(2.087, 10.5, 'W', 1.4, 0.34, 0.75, 1.55);
    b.fridge(2.087, 8.75, 'W', 0.6);
    b.island(0.25, 9.75, 'W', 1.8, 0.7); b.pendant(0.25, 9.35, 1.8, 'globe'); b.pendant(0.25, 10.15, 1.8, 'globe');
    b.light(1.3, 9.75, 2.3, 0.5, 6, '#ffd9a0');
    // night lamps: pick ~10 points
    const LAMPS = [[2.6, 4.9, 2.4, 1.4], [1.2, 6.4, 2.4, 0.8], [4.5, 1.9, 2.4, 1.2], [7.4, 1.9, 2.4, 1.2], [1.4, 2.0, 2.4, 0.9], [9.7, 3.95, 2.4, 0.8], [6.35, 5.6, 2.4, 0.45], [14.0, 5.6, 2.4, 0.9], [14.0, 1.6, 2.4, 0.8], [10.9, 1.7, 2.4, 0.8], [8.2, 5.6, 2.4, 0.5], [10.4, 5.6, 2.4, 0.5]];
    LAMPS.forEach(([x, y, z, i]) => b.light(x, y, z, i, 8, S.glow));
    // recessed downlights (emissive discs) per room
    const dl = (x0, y0, x1, y1, nx, ny) => { for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) b.fix(b.root, x0 + (x1 - x0) * (i + .5) / nx, H - 0.02, -(y0 + (y1 - y0) * (j + .5) / ny)); };
    dl(0.4, 3.6, 4.5, 7.3, 4, 4); dl(0.4, 0.4, 2.1, 3.3, 2, 3); dl(2.3, 0.4, 8.8, 3.2, 6, 3); dl(5.8, 3.5, 13.8, 4.4, 8, 1); dl(5.9, 4.7, 6.85, 6.7, 1, 3); dl(7.1, 4.7, 9.2, 6.7, 2, 2); dl(9.5, 4.7, 11.2, 6.7, 2, 2);
    dl(11.6, 4.7, 15.3, 7.2, 3, 3); dl(12.8, 0.4, 15.3, 3.2, 2, 3); dl(9.3, 0.5, 12.4, 3.0, 3, 2); dl(4.7, 5.0, 5.6, 7.3, 1, 2);
    return b;
  }

  W.setStyle = (key) => {
    W.style = key; const S = applyStyle(key);
    if (furnM) { furnM.traverse(o => o.geometry && o.geometry.dispose()); furnGroup.remove(furnM); }
    lampLights.splice(0).forEach(l => { furnGroup.remove(l); l.dispose && l.dispose(); });
    const b = layout(S, key);
    // root of builder holds raw meshes; merge them
    furnM = merge(b.root); furnGroup.add(furnM);
    nicheBarM = merge(b.niche.bar); nicheStoreM = merge(b.niche.store); furnM.add(nicheBarM, nicheStoreM);
    nicheBarM.visible = W.niche === 'bar'; nicheStoreM.visible = W.niche === 'store';
    W.blocks = b.blocks;
    const maxL = mobile ? 8 : 12; b.lights.slice(0, maxL).forEach(l => { const pl = new THREE.PointLight(l.color || S.glow, 0, l.dist, 2); pl.position.set(l.x, l.y, l.z); pl.userData.base = l.intensity * 5.5; furnGroup.add(pl); lampLights.push(pl); });
    scene.background = null; tick(0.0001); W.onStyle && W.onStyle(key);
  };
  W.setNiche = (mode) => { W.niche = mode; if (nicheBarM) { nicheBarM.visible = mode === 'bar'; nicheStoreM.visible = mode === 'store'; } };
  W.setLayer = (name, on) => {
    if (name === 'ceiling') W.ceilM.visible = on;
    if (name === 'walls') { W.archM.visible = on; W.archLowM.visible = !on; }
    if (name === 'furniture') W.furnGroup.visible = on;
    if (name === 'changes') W.changeM.visible = on;
  };
  W.setStyle('C'); W.setTime('noon', true);
  return W;
}
