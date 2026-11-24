// Builds the apartment: architecture (from the drawing), furniture (per style), sky, sun and lights.
import * as THREE from 'three';
import { mergeGeometries } from '../vendor/BufferGeometryUtils.js';
import { RectAreaLightUniformsLib } from '../vendor/RectAreaLightUniformsLib.js';
import { PLAN } from './plan.js';
import { M, initMaterials, finishMaterials, applyStyle, worldUV, STYLES } from './materials.js';
import { Builder } from './furniture.js';
import { TYPES, footprint, defaultItems } from './items.js';
let initialItems = defaultItems; export function setInitialItems(f) { initialItems = f; }

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
  { id: 'terrace', name: 'מרפסת הגג',        pos: [-0.9, 5.9],  look: [-2.6, 4.2], area: null,                note: 'שולחן ל-6 שנפתח ל-8, בצל פרגולה' },
  { id: 'outkitchen', name: 'מטבח חוץ',      pos: [0.5, 8.7],   look: [1.9, 10.7], area: null,                note: 'המחשה טעונת אישור · גז, ניקוז והיתרים' },
  { id: 'kids',    name: 'פינת ילדים',       pos: [-0.9, 8.9],  look: [-3.2, 10.4],area: null,                note: 'מזרן משחק, בית ושולחן ילדים, בשדה ראייה של המבוגרים' },
  { id: 'adults',  name: 'פינת מבוגרים',     pos: [-3.0, 8.6],  look: [0.3, 9.9],  area: null,                note: 'ישיבה מול פינת הילדים, בלי להיות צמודים' },
  { id: 'storage', name: 'מחסן מרפסת',       pos: [0.9, 8.5],   look: [2.0, 8.7],  area: null,                note: 'לכיסאות, צעצועים וציוד בית בימי גשם' }
];

export function createWorld(scene, renderer, mobile) {
  initMaterials(); finishMaterials();
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
      byMat.get(o.material).push(g.index ? g.toNonIndexed() : g);
    });
    const out = new THREE.Group();
    for (const [mat, list] of byMat) {
      const mg = mergeGeometries(list, false); if (!mg) continue; mg.computeBoundingSphere();
      const mesh = new THREE.Mesh(mg, mat); const ns = mat === M.glass || mat === M.light || mat === M.curtain || mat === M.change || mat === M.leaf || mat === M.leaf2;
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
    if (w.kind === 'wall') abox(arch, x0 - 0.012, y0 - 0.012, x1 + 0.012, y1 + 0.012, 0, 0.09, M.white);
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
  { const pos = [], col = [], idx = [], T = 0.55, Y = 0.009, a0 = 0.42; let vi = 0;
    const q = (ax, ay, bx, by, cx, cy, dx, dy) => { for (const [x, y, al] of [[ax, ay, a0], [bx, by, a0], [cx, cy, 0], [dx, dy, 0]]) { pos.push(x, Y, -y); col.push(0, 0, 0, al); } idx.push(vi, vi + 1, vi + 2, vi + 1, vi + 3, vi + 2); vi += 4; };
    for (const w of A.walls) { if (w.change === 'removed' || w.kind === 'parapet') continue; const [x0, y0, x1, y1] = w.r;
      q(x0, y0, x1, y0, x0, y0 - T, x1, y0 - T); q(x0, y1, x1, y1, x0, y1 + T, x1, y1 + T); q(x0, y0, x0, y1, x0 - T, y0, x0 - T, y1); q(x1, y0, x1, y1, x1 + T, y0, x1 + T, y1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 4)); g.setIndex(idx);
    const ao = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2, fog: false })); ao.renderOrder = 2; root.add(ao); W.aoMesh = ao; }
  const archM = merge(arch), archLowM = merge(archLow), ceilM = merge(ceilG), changeM = merge(changeG, false, false);
  root.add(archM, archLowM, ceilM, changeM); archLowM.visible = false; changeM.visible = false;
  W.archM = archM; W.archLowM = archLowM; W.ceilM = ceilM; W.changeM = changeM;
  W.solids = solids;

  // change markers (niche, outdoor kitchen, enlarged kitchen) shown in "changes" mode
  { const g = new THREE.Group(); const z = (r, c = H) => abox(g, r[0], r[1], r[2], r[3], 0.0, 0.05, M.change);
    z(A.rooms.niche[0]); z([5.9, 0.22, 8.93, 3.3]); z([1.2, 8.0, 2.09, 11.7]); const mm = merge(g, false, false); changeM.add(...mm.children); }

  // ---------- sky, sun, lights ----------
  const SKY_VS = 'varying vec3 vP; void main(){ vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }';
  const SKY_FS = `uniform vec3 top,hor,bot,sunDir,sunCol; uniform float cloud; varying vec3 vP;
    float h21(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
    float vn(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h21(i),h21(i+vec2(1.,0.)),f.x),mix(h21(i+vec2(0.,1.)),h21(i+vec2(1.,1.)),f.x),f.y); }
    float fbm(vec2 p){ float a=.5,s=0.; for(int i=0;i<5;i++){ s+=a*vn(p); p=p*2.03+17.1; a*=.5; } return s; }
    void main(){ vec3 d=normalize(vP); float h=d.y; vec3 c = h>0. ? mix(hor,top,pow(h,.5)) : mix(hor,bot,pow(-h,.4));
      float s=max(dot(d,sunDir),0.); c += sunCol*(pow(s,700.)*4.+pow(s,18.)*.32+pow(s,3.)*.07);
      if(h>0.01){ vec2 uv=d.xz/(h+.22)*1.25; float n=fbm(uv*1.5+vec2(3.,1.)); float cl=smoothstep(.46,.86,n)*cloud*smoothstep(.01,.2,h);
        float L=clamp(dot(hor,vec3(.33))*1.9,.06,1.); vec3 cc=mix(hor,vec3(1.),.7)*L*(.7+.3*pow(s,1.5)); c=mix(c,cc+sunCol*.12*pow(s,2.)*L,cl*.9); }
      gl_FragColor=vec4(c,1.);
      #include <colorspace_fragment>
    }`;
  const mkSky = () => new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false, vertexShader: SKY_VS, fragmentShader: SKY_FS,
    uniforms: { top: { value: new THREE.Color('#6aa5e6') }, hor: { value: new THREE.Color('#dce9f4') }, bot: { value: new THREE.Color('#cfd8de') }, sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunCol: { value: new THREE.Color('#fff') }, cloud: { value: 0.5 } } });
  const skyMat = mkSky();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(500, 32, 16), skyMat); sky.renderOrder = -10; scene.add(sky); W.sky = sky;
  const ground = new THREE.Mesh(new THREE.CircleGeometry(900, 32), new THREE.MeshBasicMaterial({ color: '#cfd8de' })); ground.rotation.x = -Math.PI / 2; ground.position.y = -26; scene.add(ground);
  scene.fog = new THREE.Fog('#dce9f4', 60, 380);
  const pmrem = new THREE.PMREMGenerator(renderer); let envRT = null; const envScene = new THREE.Scene(); const envMat = mkSky(); envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), envMat));
  const sunDirOf = (el, az) => { const e = el * Math.PI / 180, z = az * Math.PI / 180; return new THREE.Vector3(Math.sin(z) * Math.cos(e), Math.sin(e), -Math.cos(z) * Math.cos(e)); };
  function updateEnv(t) { const U = envMat.uniforms; U.top.value.set(t.top); U.hor.value.set(t.hor); U.bot.value.set(t.hor).multiplyScalar(0.85); U.sunDir.value.copy(sunDirOf(t.el, t.az)); U.sunCol.value.set(t.sun); U.cloud.value = t.cloud;
    const rt = pmrem.fromScene(envScene, 0, 0.1, 200); if (envRT) envRT.dispose(); envRT = rt; scene.environment = rt.texture; }
  const sun = new THREE.DirectionalLight('#fff', 3); sun.castShadow = true;
  const sm = mobile ? 1536 : 2560; sun.shadow.mapSize.set(sm, sm); const sc = sun.shadow.camera; sc.left = -12; sc.right = 12; sc.top = 12; sc.bottom = -12; sc.near = 1; sc.far = 80;
  sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.03; sun.shadow.radius = 4; sun.target.position.set(6, 0, -6); scene.add(sun, sun.target);
  const hemi = new THREE.HemisphereLight('#fff3e3', '#d8c3a5', 0.5); scene.add(hemi);
  const fill = new THREE.AmbientLight('#fff0dd', 0.0); scene.add(fill);
  W.sun = sun; W.hemi = hemi;
  RectAreaLightUniformsLib.init(); W.rectLights = [];
  { const wins = [A.glassdoors[0], A.glassdoors[1], A.windows[8], A.windows[0], A.windows[1], A.windows[2], A.windows[5], A.windows[6], A.windows[4], A.windows[7]].slice(0, mobile ? 5 : 10);
    for (const r of wins) { const [x0, y0, x1, y1] = r, alongX = (x1 - x0) > (y1 - y0), len = alongX ? x1 - x0 : y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const full = x1 < 0.3 || A.glassdoors.includes(r), sill = full ? 0.05 : 0.9, head = full ? 2.4 : 2.1; const dx = alongX ? 0 : Math.sign(7.8 - cx), dy = alongX ? Math.sign(3.78 - cy) : 0;
      const rl = new THREE.RectAreaLight('#fff', 1, len * 0.95, (head - sill) * 0.9); rl.userData.base = 1; rl.position.set(cx - dx * 0.12, (sill + head) / 2, -(cy - dy * 0.12)); rl.lookAt(rl.position.x + dx, rl.position.y, rl.position.z - dy); scene.add(rl); W.rectLights.push(rl); } }
  const TIMES = {
    morning: { label: 'בוקר',   el: 24, az: 100, sun: '#ffd7a3', si: 2.6, top: '#7fa9d8', hor: '#f1d9c0', hemi: 0.16, env: 0.45, exp: 0.9, lamps: 0.0, amb: 0.12, cloud: 0.45, win: 2.6, winC: '#ffe5c4' },
    noon:    { label: 'צהריים', el: 64, az: 200, sun: '#fff6e8', si: 3.0, top: '#5b95d6', hor: '#d9e7f3', hemi: 0.18, env: 0.42, exp: 0.86, lamps: 0.0, amb: 0.16, cloud: 0.55, win: 3.2, winC: '#fff0da' },
    sunset:  { label: 'שקיעה',  el: 7,  az: 262, sun: '#ff9650', si: 2.4, top: '#3c5a8a', hor: '#ffb27c', hemi: 0.1, env: 0.4,  exp: 1.0, lamps: 0.5, amb: 0.1, cloud: 0.5, win: 1.8, winC: '#ffad72' },
    night:   { label: 'לילה',   el: 38, az: 60,  sun: '#9db2e6', si: 0.25, top: '#050914', hor: '#18223d', hemi: 0.05, env: 0.22, exp: 1.1, lamps: 1.0, amb: 0.08, cloud: 0.3, win: 0.1, winC: '#6a7fb8' }
  };
  W.TIMES = TIMES;
  const cur = { si: 3, hemi: .5, env: .5, exp: 1, lamps: 0, amb: 0, cloud: .5, win: 3, el: 60, az: 200, sun: new THREE.Color(), top: new THREE.Color(), hor: new THREE.Color(), winC: new THREE.Color() };
  let tgt = null; W.lampLevel = 0;
  W.setTime = (k, instant = false) => { W.time = k; const t = TIMES[k]; tgt = { ...t, sunC: new THREE.Color(t.sun), topC: new THREE.Color(t.top), horC: new THREE.Color(t.hor), winCC: new THREE.Color(t.winC) }; updateEnv(t); if (instant) tick(10); };
  function tick(dt) {
    if (!tgt) return; const k = Math.min(1, dt * 3.2), L = (a, b) => a + (b - a) * k;
    cur.si = L(cur.si, tgt.si); cur.hemi = L(cur.hemi, tgt.hemi); cur.env = L(cur.env, tgt.env); cur.exp = L(cur.exp, tgt.exp); cur.lamps = L(cur.lamps, tgt.lamps); cur.amb = L(cur.amb, tgt.amb);
    cur.cloud = L(cur.cloud, tgt.cloud); cur.win = L(cur.win, tgt.win); cur.winC.lerp(tgt.winCC, k); cur.el = L(cur.el, tgt.el); cur.az = L(cur.az, tgt.az); cur.sun.lerp(tgt.sunC, k); cur.top.lerp(tgt.topC, k); cur.hor.lerp(tgt.horC, k);
    const el = cur.el * Math.PI / 180, az = cur.az * Math.PI / 180; // az: 0=N, 90=E, 180=S, 270=W (plan)
    const d = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
    sun.position.copy(sun.target.position).addScaledVector(d, 40); sun.color.copy(cur.sun); sun.intensity = cur.si;
    hemi.intensity = cur.hemi; fill.intensity = cur.amb; renderer.toneMappingExposure = cur.exp; scene.environmentIntensity = cur.env;
    skyMat.uniforms.top.value.copy(cur.top); skyMat.uniforms.hor.value.copy(cur.hor); skyMat.uniforms.bot.value.copy(cur.hor).multiplyScalar(0.9); skyMat.uniforms.sunDir.value.copy(d); skyMat.uniforms.sunCol.value.copy(cur.sun); skyMat.uniforms.cloud.value = cur.cloud;
    for (const l of W.rectLights) { l.intensity = l.userData.base * cur.win; l.color.copy(cur.winC); }
    scene.fog.color.copy(cur.hor); ground.material.color.copy(cur.hor).multiplyScalar(0.92);
    W.lampLevel = cur.lamps; M.light.emissiveIntensity = cur.lamps * 2.2 + 0.0; M.shade.emissiveIntensity = cur.lamps * 0.9;
    M.light.color.set('#fff'); lampLights.forEach(l => { l.intensity = l.userData.base * cur.lamps; });
  }
  W.update = tick;

  // ---------- furniture / style ----------
  let furnM = null, nicheBarM = null, nicheStoreM = null; const lampLights = [];
  const furnGroup = new THREE.Group(); root.add(furnGroup); W.furnGroup = furnGroup;

  function staticLayout(S, key) {
    const b = new Builder(S); const bar = b.niche.bar, store = b.niche.store;
    // soft furnishings that stay fixed to the architecture
    b.curtain(0.2, 5.9, 'E', 1.9, 2.45, 0.05); b.curtain(1.05, 0.22, 'N', 1.1, 2.4, 0.05);
    b.mirror(b.root, 5.69, 1.15, -5.75, 0.7, 1.0, -Math.PI / 2);
    b.art(b.root, 3.2, 1.55, -(7.26 - 0.02), 0.9, 0.7, 0); b.art(b.root, 2.3, 1.55, -(7.26 - 0.02), 0.6, 0.8, 0);
    b.art(b.root, 14.1, 1.35, -(7.337 - 0.07), 1.3, 0.6, 0); b.art(b.root, 9.7, 1.45, -(4.49 - 0.03), 0.9, 0.6, 0);
    b.curtain(14.0, 7.337, 'S', 1.2, 2.45, 0.05); b.curtain(15.43, 5.96, 'W', 1.2, 2.45, 0.05);
    b.curtain(15.43, 1.55, 'W', 1.2, 2.45, 0.05); b.curtain(14.3, 0.22, 'N', 1.2, 2.45, 0.05);
    // ---- niche (bar / storage) ----
    { const nb = new Builder(S); nb.baseRun(6.93, 5.9, 'W', 1.7, 0.55); nb.upperRun(6.93, 5.9, 'W', 1.7, 0.3, 0.7, 1.5);
      nb.box(nb.root, 0.3, 0.4, 0.4, M.metal, 6.65, 0.9, -5.9); nb.cyl(nb.root, 0.05, 0.12, M.ceramic, 6.65, 0.9, -5.4, 12); nb.cyl(nb.root, 0.05, 0.12, M.ceramic, 6.65, 0.9, -5.3, 12);
      for (let i = 0; i < 6; i++) nb.cyl(nb.root, 0.025, 0.18, M.glass, 6.78, 1.55, -(5.2 + i * 0.25), 8);
      nb.box(nb.root, 0.3, 0.6, 0.5, M.glass, 6.7, 0.14, -5.0); nb.box(nb.root, 0.02, 1.9, 1.2, M.woodL, 5.82, 0.0, -5.6);
      nb.block(6.38, 4.9, 6.93, 6.75); bar.add(nb.root); b.blocks.push(...nb.blocks);
      const ns = new Builder(S); ns.tall(6.93, 5.85, 'W', 1.85, 0.55); ns.box(ns.root, 0.02, 1.9, 1.0, M.woodL, 5.82, 0.0, -5.6); ns.block(6.38, 4.9, 6.93, 6.77); store.add(ns.root); }
    // ---- general bath: shower, toilet, washer + dryer, vanity ----
    b.shower(7.55, 6.27, 'S'); b.toilet(8.75, 6.58, 'S'); b.vanity(7.03, 5.2, 'E', 0.9, 1);
    for (const [y, dr] of [[4.95, true], [5.55, false]]) {
      const g = b.g(9.0, y, 'W'); b.box(g, 0.6, 0.85, 0.6, M.white, 0, 0, 0); b.box(g, 0.6, 0.03, 0.6, M.white, 0, 0.85, 0);
      const d = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 24), dr ? M.dark : M.glass); d.rotation.x = Math.PI / 2; d.position.set(0, 0.45, 0.3); g.add(d);
      b.box(g, 0.5, 0.05, 0.02, M.metal, 0, 0.74, 0.3); b.block(...b.rect(9.0, y, 'W', 0.3, 0.3));
    }
    b.box(b.root, 0.62, 0.04, 0.5, M.woodL, 9.0, 1.7, -5.25); b.box(b.root, 0.3, 0.12, 0.25, M.bedAcc, 9.0, 1.74, -5.15);
    // ---- master bath ----
    b.shower(9.95, 6.25, 'S', 1.0, 1.0); b.toilet(9.52, 5.35, 'E'); b.vanity(10.15, 4.58, 'N', 1.4, 2);
    // ---- pergolas with climbing greenery ----
    const perg = (x0, x1, y0, y1, slats) => {
      const pg = b.g(0, 0, 'S'); const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      for (const x of [x0, x1]) for (const y of [y0, y1]) { b.box(pg, 0.14, 2.5, 0.14, M.woodF, x, 0, -y); b.block(x - 0.12, y - 0.12, x + 0.12, y + 0.12); }
      for (let i = 0; i <= slats; i++) b.box(pg, x1 - x0 + 0.3, 0.06, 0.07, M.woodF, cx, 2.5, -(y0 + (y1 - y0) * i / slats));
      for (const y of [y0, y1]) b.box(pg, x1 - x0 + 0.3, 0.12, 0.1, M.woodF, cx, 2.44, -y);
      for (const x of [x0, x1]) b.box(pg, 0.1, 0.12, y1 - y0 + 0.3, M.woodF, x, 2.44, -cy);
      for (let i = 0; i < 9; i++) b.bush(pg, x0 + (x1 - x0) * ((i * 0.37 + 0.1) % 1), 2.52, -(y0 + (y1 - y0) * ((i * 0.61 + 0.05) % 1)), 0.32, 0.12, 22, i + 5);
    };
    perg(-3.35, -0.55, 4.2, 7.6, 11); perg(-1.4, 1.15, 8.5, 11.3, 9);
    // ---- lamps: night lights ----
    b.light(-1.95, 5.9, 2.35, 0.8, 7, '#ffd9a0'); b.light(-0.1, 9.9, 2.3, 0.7, 7, '#ffd9a0'); b.light(-3.0, 10.0, 2.3, 0.4, 6, '#ffd9a0');
    const LAMPS = [[2.6, 4.9, 2.4, 1.4], [1.2, 6.4, 2.4, 0.8], [4.5, 1.9, 2.4, 1.2], [7.4, 1.9, 2.4, 1.2], [1.4, 2.0, 2.4, 0.9], [9.7, 3.95, 2.4, 0.8], [6.35, 5.6, 2.4, 0.45], [14.0, 5.6, 2.4, 0.9], [14.0, 1.6, 2.4, 0.8], [10.9, 1.7, 2.4, 0.8], [8.2, 5.6, 2.4, 0.5], [10.4, 5.6, 2.4, 0.5]];
    LAMPS.forEach(([x, y, z, i]) => b.light(x, y, z, i, 8, S.glow));
    const dl = (x0, y0, x1, y1, nx, ny) => { for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) b.fix(b.root, x0 + (x1 - x0) * (i + .5) / nx, H - 0.02, -(y0 + (y1 - y0) * (j + .5) / ny)); };
    dl(0.4, 3.6, 4.5, 7.3, 3, 3); dl(0.4, 0.4, 2.1, 3.3, 2, 3); dl(2.3, 0.4, 8.8, 3.2, 6, 3); dl(5.8, 3.5, 13.8, 4.4, 8, 1); dl(5.9, 4.7, 6.85, 6.7, 1, 3); dl(7.1, 4.7, 9.2, 6.7, 2, 2); dl(9.5, 4.7, 11.2, 6.7, 2, 2);
    dl(11.6, 4.7, 15.3, 7.2, 3, 3); dl(12.8, 0.4, 15.3, 3.2, 2, 3); dl(9.3, 0.5, 12.4, 3.0, 3, 2); dl(4.7, 5.0, 5.6, 7.3, 1, 2);
    return b;
  }

  // ---------- editable items ----------
  W.items = []; const itemsRoot = new THREE.Group(); root.add(itemsRoot); W.itemsRoot = itemsRoot; let staticBlocks = [];
  const place = (wrap, it) => { wrap.position.set(it.x, 0, -it.y); wrap.rotation.y = it.r; };
  const contactMat = (() => { const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d'); g.filter = 'blur(14px)'; g.fillStyle = 'rgba(0,0,0,.85)'; g.fillRect(30, 30, 68, 68); const t = new THREE.CanvasTexture(c);
    return new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0.55, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3, fog: false }); })();
  function buildItem(it) {
    const b = new Builder(STYLES[W.style]); TYPES[it.t].make(b, it, it.p);
    const m = merge(b.root); const wrap = new THREE.Group(); wrap.add(m); wrap.userData.itemId = it.id;
    const f = footprint(it); if (!f.noBlock) { const sh = new THREE.Mesh(new THREE.PlaneGeometry(f.w + 0.4, f.d + 0.4), contactMat); sh.rotation.x = -Math.PI / 2; sh.position.set(0, 0.011, f.cz); sh.renderOrder = 3; wrap.add(sh); }
    place(wrap, it); return wrap;
  }
  const objs = new Map();
  const disposeObj = (o) => { itemsRoot.remove(o); o.traverse(x => x.geometry && x.geometry.dispose()); };
  W.placeItem = (it) => { const o = objs.get(it.id); if (o) place(o, it); };
  W.rebuildItem = (it) => { const o = objs.get(it.id); if (o) disposeObj(o); const n = buildItem(it); objs.set(it.id, n); itemsRoot.add(n); return n; };
  W.removeItem = (id) => { const o = objs.get(id); if (o) { disposeObj(o); objs.delete(id); } };
  W.setItems = (list) => { for (const id of [...objs.keys()]) W.removeItem(id); W.items = list; for (const it of list) { const n = buildItem(it); objs.set(it.id, n); itemsRoot.add(n); } W.refreshBlocks(); };
  W.itemObj = (id) => objs.get(id);
  W.refreshBlocks = () => { W.blocks = staticBlocks.concat(W.items.map(footprint).filter(f => !f.noBlock).map(f => f.aabb)); };

  W.setStyle = (key) => {
    W.style = key; const S = applyStyle(key);
    if (furnM) { furnM.traverse(o => o.geometry && o.geometry.dispose()); furnGroup.remove(furnM); }
    lampLights.splice(0).forEach(l => { furnGroup.remove(l); l.dispose && l.dispose(); });
    const b = staticLayout(S, key);
    furnM = merge(b.root); furnGroup.add(furnM);
    nicheBarM = merge(b.niche.bar); nicheStoreM = merge(b.niche.store); furnM.add(nicheBarM, nicheStoreM);
    nicheBarM.visible = W.niche === 'bar'; nicheStoreM.visible = W.niche === 'store';
    staticBlocks = b.blocks;
    const maxL = mobile ? 8 : 12; b.lights.slice(0, maxL).forEach(l => { const pl = new THREE.PointLight(l.color || S.glow, 0, l.dist, 2); pl.position.set(l.x, l.y, l.z); pl.userData.base = l.intensity * 5.5; furnGroup.add(pl); lampLights.push(pl); });
    if (!W.itemsInit) { W.itemsInit = true; W.setItems(initialItems()); } else W.setItems(W.items);
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
