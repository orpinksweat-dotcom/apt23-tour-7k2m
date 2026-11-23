// Materials + procedural PBR textures + the three design palettes (A / B / C).
import * as THREE from 'three';

export const STYLES = {
  A: {
    key: 'A', name: 'מודרני יוקרתי', sub: 'אבן בהירה · קווים נקיים',
    wall: '#ece9e3', ceiling: '#f4f2ee', floorPub: '#cdc9c0', floorWood: '#b9a58e', tile: '#d6d3cd', wallWet: '#c9c6bf',
    cab: '#c8c2b7', cabTall: '#9d978d', counter: '#ecebe7', metal: '#26282b', accent: '#2f3236',
    sofa: '#d2cec6', cushion: '#6f737a', rug: '#cfcac1', curtain: '#f1efea', woodF: '#5b4636', woodL: '#a9906f',
    bed: '#e9e6e0', bedAcc: '#6b6f76', deck: '#a89f92', plant: 1.0, lampK: 3600, glow: '#ffe8cf',
    pendant: 'bar', rugRound: false, brass: '#8d8a84'
  },
  B: {
    key: 'B', name: 'יוקרה חמימה', sub: 'אלון · טרוורטין · בדים',
    wall: '#efe6d7', ceiling: '#f7f1e6', floorPub: '#cbbd9f', floorWood: '#c19a6b', tile: '#e4d9c3', wallWet: '#dccfb6',
    cab: '#b98d5c', cabTall: '#d8c7aa', counter: '#e6dcc8', metal: '#7a5a34', accent: '#b98d5c',
    sofa: '#e6dccb', cushion: '#a68a6a', rug: '#d6c7ad', curtain: '#efe3cf', woodF: '#9b6f43', woodL: '#c9a173',
    bed: '#f1e9db', bedAcc: '#b59a78', deck: '#b98f62', plant: 1.8, lampK: 2500, glow: '#ffd9a8',
    pendant: 'dome', rugRound: true, brass: '#b8925a'
  },
  C: {
    key: 'C', name: 'Warm Modern Luxury', sub: 'ההמלצה שלי · יוקרה ופרקטיות',
    wall: '#ebe4d9', ceiling: '#f5f1ea', floorPub: '#bfb4a2', floorWood: '#b48d62', tile: '#dcd3c4', wallWet: '#d3c9b8',
    cab: '#c0a47c', cabTall: '#c8c0b2', counter: '#efebe3', metal: '#2d2a27', accent: '#a9824f',
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
function std(color, o = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, ...o }); }

export function initMaterials() {
  M.wall = std('#fff'); M.ceiling = std('#fff', { roughness: 0.95 });
  M.floorPub = std('#fff', { roughness: 0.38 }); M.floorWood = std('#fff', { roughness: 0.55 });
  M.tile = std('#fff', { roughness: 0.3 }); M.wallWet = std('#fff', { roughness: 0.35 });
  M.deck = std('#fff', { roughness: 0.75 });
  M.cab = std('#fff', { roughness: 0.55 }); M.cabTall = std('#fff', { roughness: 0.55 });
  M.counter = std('#fff', { roughness: 0.22, metalness: 0.02 });
  M.metal = std('#222', { roughness: 0.35, metalness: 0.85 }); M.brass = std('#b08d57', { roughness: 0.3, metalness: 0.9 });
  M.sofa = std('#fff', { roughness: 0.95 }); M.cushion = std('#fff', { roughness: 0.95 });
  M.rug = std('#fff', { roughness: 1 }); M.curtain = std('#fff', { roughness: 1, side: THREE.DoubleSide, transparent: true, opacity: 0.92 });
  M.woodF = std('#fff', { roughness: 0.5 }); M.woodL = std('#fff', { roughness: 0.55 });
  M.bed = std('#fff', { roughness: 0.95 }); M.bedAcc = std('#fff', { roughness: 0.95 });
  M.white = std('#f4f3f0', { roughness: 0.4 }); M.ceramic = std('#fbfbfa', { roughness: 0.12 });
  M.black = std('#16171a', { roughness: 0.5 }); M.dark = std('#2b2b2e', { roughness: 0.6 });
  M.leaf = std('#4f7a45', { roughness: 0.8 }); M.leaf2 = std('#3d6b3c', { roughness: 0.8 }); M.pot = std('#cfc4b3', { roughness: 0.9 });
  M.soil = std('#3a2c20', { roughness: 1 });
  M.glass = new THREE.MeshPhysicalMaterial({ color: '#cfe6ee', roughness: 0.03, metalness: 0, transparent: true, opacity: 0.16, envMapIntensity: 1.4, side: THREE.DoubleSide, depthWrite: false });
  M.mirror = new THREE.MeshStandardMaterial({ color: '#dfe6ea', roughness: 0.02, metalness: 1 });
  M.frame = std('#2a2c2f', { roughness: 0.45, metalness: 0.6 });
  M.light = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#ffe2b8', emissiveIntensity: 0, roughness: 0.6 });
  M.art = std('#fff', { roughness: 0.9 }); M.screen = std('#0a0b0d', { roughness: 0.15, metalness: 0.4 });
  M.water = std('#8fc3d6', { roughness: 0.05, metalness: 0, transparent: true, opacity: 0.8 });
  M.change = new THREE.MeshBasicMaterial({ color: '#ff8a3d', transparent: true, opacity: 0.55, depthWrite: false });
  M.flame = new THREE.MeshBasicMaterial({ color: '#ff9a3c' });
  M.shade = std('#f2e6d0', { roughness: 0.9, side: THREE.DoubleSide, emissive: '#ffcf93', emissiveIntensity: 0 });
}

export const emissives = []; // materials whose emissive follows night

export function applyStyle(key) {
  const S = STYLES[key];
  const set = (m, t, c) => { m.map = t; m.color.set(c ? c : '#ffffff'); m.needsUpdate = true; };
  Object.values(tex).forEach(t => t.dispose && t.dispose());
  tex.plaster = genPlaster(S.wall); tex.ceil = genPlaster(S.ceiling); tex.wallWet = genTile(S.wallWet);
  tex.stone = genStone(S.floorPub, key === 'B' ? 1.2 : key === 'A' ? 0.35 : 0.7);
  tex.wood = genWood(S.floorWood, key === 'A' ? .26 : .18); tex.tile = genStone(S.tile, 0.2);
  tex.deck = genDeck(S.deck); tex.cabw = genWood(S.cab, 0.3); tex.counter = genStone(S.counter, key === 'B' ? 0.9 : 0.4);
  tex.fab = genFabric(S.sofa); tex.rug = genFabric(S.rug); tex.woodF = genWood(S.woodF, .3); tex.woodL = genWood(S.woodL, .3);
  set(M.wall, tex.plaster); set(M.ceiling, tex.ceil); set(M.wallWet, tex.wallWet);
  set(M.floorPub, tex.stone); set(M.floorWood, tex.wood); set(M.tile, tex.tile);
  set(M.deck, tex.deck); set(M.counter, tex.counter);
  tex.art = genArt(shade(S.wall, -0.04), S.accent, S.cushion); M.art.map = tex.art; M.art.needsUpdate = true;
  // cabinets: oak for B, mix in C, matte stone-grey in A
  if (key === 'A') set(M.cab, null, S.cab); else set(M.cab, tex.cabw);
  M.cabTall.map = null; M.cabTall.color.set(S.cabTall); M.cabTall.needsUpdate = true;
  M.metal.color.set(S.metal); M.brass.color.set(S.brass);
  set(M.sofa, tex.fab, S.sofa); M.sofa.color.set('#ffffff'); tex.fab.needsUpdate = true;
  M.cushion.color.set(S.cushion); M.rug.color.set(S.rug); M.rug.map = tex.rug; M.rug.needsUpdate = true;
  M.curtain.color.set(S.curtain);
  M.woodF.map = tex.woodF; M.woodF.color.set('#ffffff'); M.woodL.map = tex.woodL; M.woodL.color.set('#ffffff');
  M.bed.color.set(S.bed); M.bedAcc.color.set(S.bedAcc);
  M.woodF.needsUpdate = M.woodL.needsUpdate = true;
  // tile scale handled via UV scale in world.js (uv in metres / size)
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
