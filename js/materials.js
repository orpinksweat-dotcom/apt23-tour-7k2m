// Materials + procedural PBR textures + the three design palettes (A / B / C).
import * as THREE from 'three';

export const STYLES = {
  A: {
    key: 'A', name: 'מודרני יוקרתי', sub: 'אבן בהירה · קווים נקיים',
    wall: '#ece9e3', ceiling: '#f4f2ee', floorPub: '#cdc9c0', floorWood: '#b9a58e', tile: '#d6d3cd', wallWet: '#c9c6bf',
    cab: '#c8c2b7', cabTall: '#9d978d', counter: '#ecebe7', metal: '#26282b', accent: '#2f3236', cabPaint: true, veins: 0.35,
    sofa: '#d2cec6', cushion: '#6f737a', rug: '#cfcac1', curtain: '#f1efea', woodF: '#5b4636', woodL: '#a9906f',
    bed: '#e9e6e0', bedAcc: '#6b6f76', deck: '#a89f92', plant: 1.0, lampK: 3600, glow: '#ffe8cf',
    pendant: 'bar', rugRound: false, brass: '#8d8a84'
  },
  B: {
    key: 'B', name: 'יוקרה חמימה', sub: 'אלון · טרוורטין · בדים',
    wall: '#efe6d7', ceiling: '#f7f1e6', floorPub: '#cbbd9f', floorWood: '#c19a6b', tile: '#e4d9c3', wallWet: '#dccfb6',
    cab: '#b98d5c', cabTall: '#d8c7aa', counter: '#e6dcc8', metal: '#7a5a34', accent: '#b98d5c', veins: 1.2,
    sofa: '#e6dccb', cushion: '#a68a6a', rug: '#d6c7ad', curtain: '#efe3cf', woodF: '#9b6f43', woodL: '#c9a173',
    bed: '#f1e9db', bedAcc: '#b59a78', deck: '#b98f62', plant: 1.8, lampK: 2500, glow: '#ffd9a8',
    pendant: 'dome', rugRound: true, brass: '#b8925a'
  },
  D: {
    key: 'D', name: 'יפני־סקנדי חם', sub: 'אלון בהיר · קווים שקטים',
    wall: '#efe9df', ceiling: '#f7f3ec', floorPub: '#cbbfab', floorWood: '#c9a97c', tile: '#ddd3c1', wallWet: '#d6cab6',
    cab: '#d2bd9b', cabTall: '#e3dccf', counter: '#efeae0', metal: '#2b2926', accent: '#3a3733',
    sofa: '#d8cfc0', cushion: '#8a7a66', rug: '#d7ccb9', curtain: '#f3eee4', woodF: '#8b6b4a', woodL: '#cfb089',
    bed: '#f1ece2', bedAcc: '#8a7a66', deck: '#b59a76', plant: 1.2, lampK: 2800, glow: '#ffe0b8', veins: 0.5,
    pendant: 'dome', rugRound: true, brass: '#9a8c78'
  },
  E: {
    key: 'E', name: 'ים־תיכוני מעודן', sub: 'חימר · זית · שמנת',
    wall: '#f1e4d3', ceiling: '#f8efe2', floorPub: '#cdb297', floorWood: '#b9875a', tile: '#e6d0b8', wallWet: '#e0c9ae',
    cab: '#8a9a78', cabTall: '#e6d8c2', counter: '#f0e6d4', metal: '#3a2f26', accent: '#b0623f', cabPaint: true,
    sofa: '#e5d3b8', cushion: '#b0623f', rug: '#d9bf9f', curtain: '#f4e9d6', woodF: '#8a5a36', woodL: '#c08e58',
    bed: '#f2e8d8', bedAcc: '#b0623f', deck: '#b88a5e', plant: 1.6, lampK: 2500, glow: '#ffd2a0', veins: 0.9,
    pendant: 'dome', rugRound: false, brass: '#b8863f'
  },
  F: {
    key: 'F', name: 'מרווה ואלון', sub: 'ירוק עדין · עץ · שמנת',
    wall: '#eceae0', ceiling: '#f6f5ee', floorPub: '#c9c3b2', floorWood: '#bf9a6a', tile: '#d8d6c8', wallWet: '#cfcdbe',
    cab: '#a9b59a', cabTall: '#dcd9cb', counter: '#efede4', metal: '#2c2e2b', accent: '#7d8b6e', cabPaint: true,
    sofa: '#d9d6c6', cushion: '#7d8b6e', rug: '#d2cdb8', curtain: '#f2f0e6', woodF: '#7b5a3a', woodL: '#c4a074',
    bed: '#f0eee4', bedAcc: '#7d8b6e', deck: '#a99070', plant: 1.5, lampK: 2900, glow: '#ffe2b8', veins: 0.4,
    pendant: 'globe', rugRound: true, brass: '#a98f5a'
  },
  C: {
    key: 'C', name: 'Warm Modern Luxury', sub: 'ההמלצה שלי · יוקרה ופרקטיות',
    wall: '#ebe4d9', ceiling: '#f5f1ea', floorPub: '#bfb4a2', floorWood: '#b48d62', tile: '#dcd3c4', wallWet: '#d3c9b8',
    cab: '#c0a47c', cabTall: '#c8c0b2', counter: '#efebe3', metal: '#2d2a27', accent: '#a9824f', veins: 0.7,
    sofa: '#d3c6b0', cushion: '#7c6a54', rug: '#cfc3ad', curtain: '#f2ece1', woodF: '#6d4b30', woodL: '#b99468',
    bed: '#efe9de', bedAcc: '#8a735a', deck: '#a7835a', plant: 1.4, lampK: 3000, glow: '#ffdcb0',
    pendant: 'globe', rugRound: false, brass: '#b08d57'
  }
};

function rnd(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function canvas(n) { const c = document.createElement('canvas'); c.width = c.height = n; return c; }
function shade(hex, f) { const c = new THREE.Color(hex); c.offsetHSL(0, 0, f); return '#' + c.getHexString(); }

function texFrom(c, srgb = true) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// each generator draws on a canvas; texture covers `size` metres
export function genPlaster(color) {
  const n = 256, c = canvas(n), g = c.getContext('2d'); g.fillStyle = color; g.fillRect(0, 0, n, n);
  const r = rnd(7); const id = g.getImageData(0, 0, n, n);
  for (let i = 0; i < id.data.length; i += 4) { const v = (r() - .5) * 7; id.data[i] += v; id.data[i + 1] += v; id.data[i + 2] += v; }
  g.putImageData(id, 0, 0); return texFrom(c);
}
export function genStone(color, veins = 0.5, tilePx = 256) {
  const n = 512, c = canvas(n), g = c.getContext('2d'); g.fillStyle = color; g.fillRect(0, 0, n, n);
  const r = rnd(11);
  for (let i = 0; i < 1400; i++) { g.fillStyle = `rgba(${r() > .5 ? 255 : 90},${r() > .5 ? 250 : 85},${r() > .5 ? 240 : 80},${0.025 + r() * 0.035})`; g.fillRect(r() * n, r() * n, 2 + r() * 10, 1 + r() * 5); }
  g.lineWidth = 1;
  for (let i = 0; i < 26 * veins; i++) {
    g.strokeStyle = `rgba(70,60,50,${0.05 + r() * 0.08})`; g.beginPath(); let x = r() * n, y = r() * n; g.moveTo(x, y);
    for (let k = 0; k < 7; k++) { x += (r() - .35) * 70; y += (r() - .5) * 40; g.lineTo(x, y); } g.stroke();
  }
  g.strokeStyle = 'rgba(60,55,50,0.22)'; g.lineWidth = 2; // tile joints: texture = 2x2 tiles
  g.strokeRect(0, 0, n, n); g.beginPath(); g.moveTo(n / 2, 0); g.lineTo(n / 2, n); g.moveTo(0, n / 2); g.lineTo(n, n / 2); g.stroke();
  return texFrom(c);
}
export function genWood(color, plank = 0.2) {
  const n = 512, c = canvas(n), g = c.getContext('2d'); const r = rnd(23);
  const pw = n * plank * 2.5 > 40 ? Math.round(n * plank * 2.5) : 64; // plank width px
  for (let x = 0; x < n; x += pw) {
    g.fillStyle = shade(color, (r() - .5) * 0.05); g.fillRect(x, 0, pw, n);
    for (let i = 0; i < 38; i++) { g.strokeStyle = `rgba(40,25,10,${0.03 + r() * 0.07})`; g.lineWidth = 0.6 + r() * 1.2; g.beginPath(); const gx = x + r() * pw; g.moveTo(gx, 0); g.bezierCurveTo(gx + (r() - .5) * 10, n * .3, gx + (r() - .5) * 10, n * .6, gx + (r() - .5) * 8, n); g.stroke(); }
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(x, 0, 1.5, n);
  }
  return texFrom(c);
}
export function genTile(color) {
  const n = 256, c = canvas(n), g = c.getContext('2d'); g.fillStyle = color; g.fillRect(0, 0, n, n); const r = rnd(5);
  const t = n / 4;
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { g.fillStyle = shade(color, (r() - .5) * 0.04); g.fillRect(i * t + 1.5, j * t + 1.5, t - 3, t - 3); }
  return texFrom(c);
}
export function genArt(c1, c2, c3) {
  const n = 256, c = canvas(n), g = c.getContext('2d'); g.fillStyle = c1; g.fillRect(0, 0, n, n);
  g.fillStyle = c2; g.beginPath(); g.arc(n * .62, n * .42, n * .3, 0, 7); g.fill();
  g.fillStyle = c3; g.beginPath(); g.arc(n * .3, n * .72, n * .22, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, n * .86, n, n * .02);
  return texFrom(c);
}
export function genLeaf() {
  const w = 128, h = 192, c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  g.beginPath(); g.moveTo(w / 2, 4); g.bezierCurveTo(w * 0.98, h * 0.22, w * 0.92, h * 0.7, w / 2, h - 4); g.bezierCurveTo(w * 0.08, h * 0.7, w * 0.02, h * 0.22, w / 2, 4); g.closePath();
  const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#b9c9b0'); g.fillStyle = gr; g.fill();
  g.strokeStyle = 'rgba(70,90,60,.55)'; g.lineWidth = 3; g.beginPath(); g.moveTo(w / 2, 6); g.lineTo(w / 2, h - 6); g.stroke(); g.lineWidth = 1.2;
  for (let i = 1; i < 9; i++) { const y = i * h / 9.5; g.beginPath(); g.moveTo(w / 2, y + 8); g.lineTo(w * 0.12, y - 14); g.moveTo(w / 2, y + 8); g.lineTo(w * 0.88, y - 14); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export function genFabric(color) {
  const n = 128, c = canvas(n), g = c.getContext('2d'); g.fillStyle = color; g.fillRect(0, 0, n, n);
  for (let i = 0; i < n; i += 2) { g.fillStyle = 'rgba(0,0,0,0.05)'; g.fillRect(i, 0, 1, n); g.fillRect(0, i, n, 1); }
  return texFrom(c);
}
export function genDeck(color) {
  const n = 512, c = canvas(n), g = c.getContext('2d'); const r = rnd(31); const pw = 64;
  for (let x = 0; x < n; x += pw) { g.fillStyle = shade(color, (r() - .5) * 0.06); g.fillRect(x, 0, pw, n); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x, 0, 2, n); for (let i = 0; i < 20; i++) { g.strokeStyle = 'rgba(30,20,10,0.06)'; g.beginPath(); const gx = x + r() * pw; g.moveTo(gx, 0); g.lineTo(gx + (r() - .5) * 6, n); g.stroke(); } }
  return texFrom(c);
}

// ---- shared material set ----
export const M = {};
const tex = {};
function phys(color, o = {}) { return new THREE.MeshPhysicalMaterial({ color, roughness: 0.8, metalness: 0, ...o }); }
function std(color, o = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...o }); }

export function initMaterials() {
  M.wall = std('#fff'); M.ceiling = std('#fff', { roughness: 0.95 });
  M.floorPub = phys('#fff', { roughness: 0.38 }); M.floorWood = phys('#fff', { roughness: 0.55 });
  M.tile = phys('#fff', { roughness: 0.3 }); M.wallWet = std('#fff', { roughness: 0.35 });
  M.deck = std('#fff', { roughness: 0.75 });
  M.cab = std('#fff', { roughness: 0.55 }); M.cabTall = std('#fff', { roughness: 0.55 });
  M.counter = phys('#fff', { roughness: 0.22, metalness: 0.02 });
  M.metal = std('#222', { roughness: 0.35, metalness: 0.85 }); M.brass = std('#b08d57', { roughness: 0.3, metalness: 0.9 });
  M.sofa = phys('#fff', { roughness: 0.95 }); M.cushion = phys('#fff', { roughness: 0.95 });
  M.rug = std('#fff', { roughness: 1 }); M.curtain = std('#fff', { roughness: 1, side: THREE.DoubleSide, transparent: true, opacity: 0.92 });
  M.woodF = std('#fff', { roughness: 0.5 }); M.woodL = std('#fff', { roughness: 0.55 });
  M.bed = phys('#fff', { roughness: 0.95 }); M.bedAcc = phys('#fff', { roughness: 0.95 });
  M.white = std('#f4f3f0', { roughness: 0.4 }); M.ceramic = std('#fbfbfa', { roughness: 0.12 });
  M.black = std('#16171a', { roughness: 0.5 }); M.dark = std('#2b2b2e', { roughness: 0.6 });
  const leafTex = genLeaf(); M.leaf = std('#6a9a58', { map: leafTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.55 }); M.leaf2 = std('#4a7d41', { map: leafTex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.55 }); M.pot = std('#cfc4b3', { roughness: 0.9 });
  M.soil = std('#3a2c20', { roughness: 1 });
  M.glass = new THREE.MeshPhysicalMaterial({ color: '#cfe6ee', roughness: 0.03, metalness: 0, transparent: true, opacity: 0.16, envMapIntensity: 1.4, side: THREE.DoubleSide, depthWrite: false });
  M.mirror = new THREE.MeshStandardMaterial({ color: '#dfe6ea', roughness: 0.02, metalness: 1 });
  M.frame = std('#2a2c2f', { roughness: 0.45, metalness: 0.6 });
  M.light = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#ffe2b8', emissiveIntensity: 0, roughness: 0.6 });
  M.toyA = std('#e8b64d', { roughness: 0.7 }); M.toyB = std('#6fb3a2', { roughness: 0.7 }); M.toyC = std('#d9826b', { roughness: 0.7 }); M.art = std('#fff', { roughness: 0.9 }); M.screen = std('#0a0b0d', { roughness: 0.15, metalness: 0.4 });
  M.water = std('#8fc3d6', { roughness: 0.05, metalness: 0, transparent: true, opacity: 0.8 });
  M.change = new THREE.MeshBasicMaterial({ color: '#ff8a3d', transparent: true, opacity: 0.55, depthWrite: false });
  M.flame = new THREE.MeshBasicMaterial({ color: '#ff9a3c' });
  M.shade = std('#f2e6d0', { roughness: 0.9, side: THREE.DoubleSide, emissive: '#ffcf93', emissiveIntensity: 0 });
}

export function finishMaterials() {
  const FLAT = new THREE.DataTexture(new Uint8Array([128, 128, 255, 255]), 1, 1); FLAT.needsUpdate = true;
  for (const k of ['floorWood', 'floorPub', 'tile', 'wall', 'ceiling', 'deck', 'sofa', 'cushion', 'bed', 'bedAcc', 'rug', 'woodF', 'woodL', 'cab']) { M[k].normalMap = FLAT; M[k].normalScale.set(0.5, 0.5); }
  for (const k of ['bed', 'bedAcc', 'cushion']) { }
  M.floorPub.clearcoat = 0.12; M.floorPub.clearcoatRoughness = 0.25; M.tile.clearcoat = 0.25; M.tile.clearcoatRoughness = 0.15;
  M.floorWood.clearcoat = 0.18; M.floorWood.clearcoatRoughness = 0.35; M.counter.clearcoat = 0.7; M.counter.clearcoatRoughness = 0.12;
  for (const k of ['sofa', 'cushion', 'bed', 'bedAcc']) { M[k].sheen = 0.9; M[k].sheenRoughness = 0.55; M[k].sheenColor = new THREE.Color('#ffffff'); }
}
export const emissives = []; // materials whose emissive follows night

export function applyStyle(key) {
  const S = STYLES[key];
  const set = (m, t, c) => { m.map = t; m.color.set(c ? c : '#ffffff'); m.needsUpdate = true; };
  Object.values(tex).forEach(t => t.dispose && t.dispose());
  tex.plaster = genPlaster(S.wall); tex.ceil = genPlaster(S.ceiling); tex.wallWet = genTile(S.wallWet);
  tex.stone = genStone(S.floorPub, S.veins ?? 0.6);
  tex.wood = genWood(S.floorWood, key === 'A' || key === 'D' ? .26 : .18); tex.tile = genStone(S.tile, 0.2);
  tex.deck = genDeck(S.deck); tex.cabw = genWood(S.cab, 0.3); tex.counter = genStone(S.counter, (S.veins ?? 0.6) * 0.7);
  tex.fab = genFabric(S.sofa); tex.rug = genFabric(S.rug); tex.woodF = genWood(S.woodF, .3); tex.woodL = genWood(S.woodL, .3);
  set(M.wall, tex.plaster); set(M.ceiling, tex.ceil); set(M.wallWet, tex.wallWet);
  set(M.floorPub, tex.stone); set(M.floorWood, tex.wood); set(M.tile, tex.tile);
  set(M.deck, tex.deck); set(M.counter, tex.counter);
  tex.art = genArt(shade(S.wall, -0.04), S.accent, S.cushion); M.art.map = tex.art; M.art.needsUpdate = true;
  // cabinets: oak for B, mix in C, matte stone-grey in A
  if (S.cabPaint) set(M.cab, null, S.cab); else set(M.cab, tex.cabw);
  M.cabTall.map = null; M.cabTall.color.set(S.cabTall); M.cabTall.needsUpdate = true;
  M.metal.color.set(S.metal); M.brass.color.set(S.brass);
  set(M.sofa, tex.fab, S.sofa); M.sofa.color.set('#ffffff'); tex.fab.needsUpdate = true;
  M.cushion.color.set(S.cushion); M.cushion.map = tex.rug; M.rug.color.set(S.rug); M.rug.map = tex.rug; M.rug.needsUpdate = true;
  M.curtain.color.set(S.curtain);
  M.woodF.map = tex.woodF; M.woodF.color.set('#ffffff'); M.woodL.map = tex.woodL; M.woodL.color.set('#ffffff');
  M.bed.color.set(S.bed); M.bedAcc.color.set(S.bedAcc);
  M.woodF.needsUpdate = M.woodL.needsUpdate = true;
  const bump = (m, t, v) => { m.bumpMap = t; m.bumpScale = v; };
  bump(M.floorWood, tex.wood, 0.9); bump(M.floorPub, tex.stone, 0.7); bump(M.tile, tex.tile, 0.5); bump(M.wall, tex.plaster, 0.35); bump(M.ceiling, tex.ceil, 0.25);
  bump(M.deck, tex.deck, 1.1); bump(M.counter, tex.counter, 0.2); bump(M.sofa, tex.fab, 1.2); bump(M.woodF, tex.woodF, 0.8); bump(M.woodL, tex.woodL, 0.8); bump(M.rug, tex.rug, 1.4);
  bump(M.cab, tex.cabw, S.cabPaint ? 0 : 0.7);
  applyPhotos(S);
  return S;
}

// world-space UV for any geometry (so textures keep real-world scale)
export function worldUV(geom, mesh, size = 1.2) {
  mesh.updateMatrixWorld(true);
  const p = geom.attributes.position, nrm = geom.attributes.normal, uv = geom.attributes.uv || new THREE.BufferAttribute(new Float32Array(p.count * 2), 2);
  const v = new THREE.Vector3(), n = new THREE.Vector3(); const nm = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i).applyMatrix4(mesh.matrixWorld); n.fromBufferAttribute(nrm, i).applyMatrix3(nm).normalize();
    let a, b;
    if (Math.abs(n.y) > .5) { a = v.x; b = v.z; } else if (Math.abs(n.x) > .5) { a = v.z; b = v.y; } else { a = v.x; b = v.y; }
    uv.setXY(i, a / size, b / size);
  }
  geom.setAttribute('uv', uv); uv.needsUpdate = true;
}


// ---- photographic CC0 textures (Poly Haven), loaded in the background; procedural ones stay as fallback ----
let PHOTO = false; try { PHOTO = localStorage.getItem('apt23.photo') === '1'; } catch { }
export const isPhoto = () => PHOTO;
export function setPhoto(v) { PHOTO = v; try { localStorage.setItem('apt23.photo', v ? '1' : '0'); } catch { } }
const TEXLOADER = new THREE.TextureLoader(); const TCACHE = new Map(), RCACHE = new Map(); let CUR = null, PT = 0;
function photo(name, srgb) {
  if (!TCACHE.has(name)) { const e = { ready: false, t: null }; e.t = TEXLOADER.load('tex/' + name, () => { e.ready = true; clearTimeout(PT); PT = setTimeout(() => CUR && applyPhotos(CUR), 400); }, undefined, () => { });
    e.t.wrapS = e.t.wrapT = THREE.RepeatWrapping; e.t.anisotropy = 8; if (srgb) e.t.colorSpace = THREE.SRGBColorSpace; TCACHE.set(name, e); }
  return TCACHE.get(name);
}
function tiled(name, srgb, rep) {
  const e = photo(name, srgb); if (!e.ready) return null; const k = name + '@' + rep;
  if (!RCACHE.has(k)) { const t = e.t.clone(); t.needsUpdate = true; t.repeat.set(rep, rep); RCACHE.set(k, t); } return RCACHE.get(k);
}
function tintOf(hex, k, gain) { const c = new THREE.Color(hex); c.lerp(new THREE.Color('#ffffff'), 1 - k); c.multiplyScalar(gain); return c; }
function usePhoto(m, base, procSize, photoSize, o = {}) {
  const rep = procSize / photoSize;
  const d = o.color ? tiled(base + '_diff.jpg', true, rep) : null, n = tiled(base + '_nor.jpg', false, rep);
  if (d) { m.map = d; m.color.copy(tintOf(o.color, o.k ?? 0.6, o.gain ?? 1.1)); }
  if (n) { m.normalMap = n; m.normalScale.set(o.ns ?? 0.8, o.ns ?? 0.8); m.bumpScale = 0; }
}
export function applyPhotos(S) {
  CUR = S; if (!PHOTO) return;
  usePhoto(M.floorWood, 'floorWood', 1.2, 1.9, { color: S.floorWood, k: 0.55, gain: 1.3 });
  usePhoto(M.floorPub, 'stone', 1.6, 2.0, { color: S.floorPub, k: 0.5, gain: 1.25, ns: 0.6 });
  usePhoto(M.tile, 'stone', 0.8, 1.4, { color: S.tile, k: 0.45, gain: 1.3, ns: 0.6 });
  usePhoto(M.woodL, 'woodL', 0.8, 1.0, { color: S.woodL, k: 0.6, gain: 1.1 });
  usePhoto(M.woodF, 'woodL', 0.8, 1.0, { color: S.woodF, k: 0.85, gain: 1.0 });
  if (!S.cabPaint) usePhoto(M.cab, 'woodL', 1.0, 1.0, { color: S.cab, k: 0.55, gain: 1.15 });
  usePhoto(M.deck, 'deck', 1.0, 1.4, { color: S.deck, k: 0.6, gain: 1.25 });
  usePhoto(M.sofa, 'fabric', 0.3, 0.4, { color: S.sofa, k: 0.7, gain: 1.8, ns: 1.0 });
  usePhoto(M.cushion, 'fabric', 0.3, 0.4, { color: S.cushion, k: 0.85, gain: 1.7, ns: 1.0 });
  usePhoto(M.rug, 'fabric', 0.5, 0.5, { color: S.rug, k: 0.7, gain: 1.8, ns: 1.2 });
  usePhoto(M.bed, 'fabric', 0.3, 0.4, { ns: 0.9 }); usePhoto(M.bedAcc, 'fabric', 0.3, 0.4, { ns: 0.9 });
  usePhoto(M.wall, 'wall', 1.6, 1.5, { ns: 0.35 }); usePhoto(M.ceiling, 'wall', 1.6, 1.5, { ns: 0.25 });
}
