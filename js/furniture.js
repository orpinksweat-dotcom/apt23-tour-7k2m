// Procedural furniture. Coordinates are plan metres (x east, y north). Local front = +z (faces plan-south).
import * as THREE from 'three';
import { M } from './materials.js';

const FACE = { S: 0, E: Math.PI / 2, N: Math.PI, W: -Math.PI / 2 };

export class Builder {
  constructor(S) { this.S = S; this.root = new THREE.Group(); this.blocks = []; this.lights = []; this.niche = { bar: new THREE.Group(), store: new THREE.Group() }; }
  // generic primitives -------------------------------------------------
  g(x, y, face = 'S', parent) { const g = new THREE.Group(); g.position.set(x, 0, -y); g.rotation.y = typeof face === 'number' ? face : FACE[face]; (parent || this.root).add(g); return g; }
  box(p, w, h, d, m, x, y, z, ry = 0) { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y + h / 2, z); o.rotation.y = ry; p.add(o); return o; }
  cyl(p, rt, h, m, x, y, z, seg = 20, rb) { const o = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb ?? rt, h, seg), m); o.position.set(x, y + h / 2, z); p.add(o); return o; }
  sph(p, r, m, x, y, z, sx = 1, sy = 1, sz = 1) { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); p.add(o); return o; }
  block(x0, y0, x1, y1) { this.blocks.push([Math.min(x0, x1), Math.min(y0, y1), Math.max(x0, x1), Math.max(y0, y1)]); }
  light(x, y, z, intensity, dist = 7, color) { this.lights.push({ x, y: z, z: -y, intensity, dist, color }); }
  fix(p, x, y, z, r = 0.07) { this.cyl(p, r, 0.015, M.light, x, y, z, 14); } // recessed downlight (emissive)

  // pieces ---------------------------------------------------------------
  sofa(x, y, face, w = 2.6, d = 0.95, seats = 3) {
    const g = this.g(x, y, face); const h = 0.42;
    this.box(g, w, 0.12, d, M.woodF, 0, 0.06, 0); this.box(g, w - 0.08, h - 0.12, d - 0.1, M.sofa, 0, 0.18, 0.02);
    this.box(g, w, 0.46, 0.22, M.sofa, 0, 0.42, -d / 2 + 0.11); // back
    this.box(g, 0.2, 0.3, d - 0.05, M.sofa, -w / 2 + 0.1, 0.4, 0.0); this.box(g, 0.2, 0.3, d - 0.05, M.sofa, w / 2 - 0.1, 0.4, 0.0);
    const sw = (w - 0.4) / seats; for (let i = 0; i < seats; i++) { this.box(g, sw - 0.03, 0.14, d - 0.3, M.sofa, -w / 2 + 0.2 + sw * (i + .5), 0.5, 0.1); }
    for (let i = 0; i < 2; i++) { const c = this.box(g, 0.42, 0.4, 0.14, M.cushion, (i ? 1 : -1) * (w / 2 - 0.55), 0.62, -d / 2 + 0.34); c.rotation.x = -0.25; }
    const hw = w / 2, hd = d / 2; this.block(...this.rect(x, y, face, hw, hd + 0.05));
    return g;
  }
  rect(x, y, face, hw, hd) { const sw = (face === 'E' || face === 'W'); const a = sw ? hd : hw, b = sw ? hw : hd; return [x - a, y - b, x + a, y + b]; }
  armchair(x, y, face) {
    const g = this.g(x, y, face); this.box(g, 0.82, 0.14, 0.8, M.woodF, 0, 0.14, 0);
    this.box(g, 0.76, 0.2, 0.7, M.sofa, 0, 0.28, 0.03); this.box(g, 0.82, 0.42, 0.16, M.sofa, 0, 0.5, -0.32);
    this.box(g, 0.14, 0.28, 0.7, M.sofa, -0.34, 0.46, 0.02); this.box(g, 0.14, 0.28, 0.7, M.sofa, 0.34, 0.46, 0.02);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.cyl(g, 0.025, 0.14, M.woodF, sx * 0.36, 0, sz * 0.34, 8);
    this.block(...this.rect(x, y, face, 0.45, 0.45)); return g;
  }
  coffeeTable(x, y, w = 1.2, d = 0.7, round = false) {
    const g = this.g(x, y, 'S');
    if (round) { this.cyl(g, w / 2, 0.04, M.woodL, 0, 0.37, 0, 40); this.cyl(g, 0.07, 0.37, M.metal, 0, 0, 0, 12); this.cyl(g, w / 3, 0.02, M.brass, 0, 0.02, 0, 32); }
    else { this.box(g, w, 0.04, d, M.counter, 0, 0.36, 0); this.box(g, w - 0.1, 0.34, d - 0.1, M.woodF, 0, 0.02, 0); this.box(g, w + 0.0, 0.015, d + 0.0, M.metal, 0, 0.35, 0); }
    // decor
    this.cyl(g, 0.07, 0.1, M.ceramic, 0.12, 0.4, 0.05, 16); this.box(g, 0.28, 0.03, 0.2, M.bedAcc, -0.22, 0.4, -0.02);
    this.block(x - w / 2, y - d / 2, x + w / 2, y + d / 2); return g;
  }
  sideTable(x, y, r = 0.25) { const g = this.g(x, y, 'S'); this.cyl(g, r, 0.03, M.woodL, 0, 0.5, 0, 24); this.cyl(g, 0.03, 0.5, M.metal, 0, 0, 0, 8); this.cyl(g, r * .6, 0.02, M.metal, 0, 0, 0, 16); return g; }
  floorLamp(x, y, light = true) {
    const g = this.g(x, y, 'S'); this.cyl(g, 0.13, 0.025, M.metal, 0, 0, 0, 16); this.cyl(g, 0.012, 1.45, M.metal, 0, 0.02, 0, 8);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.22, 0.28, 20, 1, true), M.shade); sh.position.set(0, 1.55, 0); g.add(sh);
    if (light) this.light(x, y, 1.5, 0.9, 5); return g;
  }
  rug(x, y, w, d, round = false, face = 'S') { const g = this.g(x, y, face); if (round) this.cyl(g, w / 2, 0.012, M.rug, 0, 0.001, 0, 48); else this.box(g, w, 0.012, d, M.rug, 0, 0.001, 0); return g; }
  plant(x, y, h = 1.3, kind = 0) {
    const g = this.g(x, y, 'S'); const pr = 0.17 + h * 0.04;
    this.cyl(g, pr, 0.4 + h * 0.05, M.pot, 0, 0, 0, 18, pr * 0.8); this.cyl(g, pr * .9, 0.02, M.soil, 0, 0.4 + h * 0.05 - 0.01, 0, 14);
    const y0 = 0.42 + h * 0.05, n = 6 + Math.floor(h * 4);
    for (let i = 0; i < n; i++) {
      const a = i * 2.4, t = i / n, r = 0.08 + t * 0.28 * (h / 1.3), yy = y0 + 0.15 + t * (h - 0.5);
      const m = i % 2 ? M.leaf : M.leaf2;
      if (kind === 1) { const o = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.55 + t * 0.2, 6), m); o.position.set(Math.cos(a) * r, yy, Math.sin(a) * r); o.rotation.set(Math.sin(a) * .5, 0, -Math.cos(a) * .5); g.add(o); }
      else this.sph(g, 0.15 + (1 - t) * 0.07, m, Math.cos(a) * r, yy, Math.sin(a) * r, 1, 0.8, 1);
    }
    this.block(x - pr, y - pr, x + pr, y + pr); return g;
  }
  art(parent, x, y, z, w, h, ry = 0, m0) { const m = M.art; const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); this.box(g, w + 0.04, h + 0.04, 0.03, M.frame, 0, 0, 0).position.y = h / 2; this.box(g, w, h, 0.035, m, 0, 0, 0.003).position.y = h / 2; return g; }
  curtain(cx, cy, face, width, h = 2.5, thick = 0.1) { // face = direction the curtain looks into room
    const g = this.g(cx, cy, face); this.cyl(g, 0.012, width + 0.6, M.metal, 0, h + 0.05, 0, 8).rotation.z = Math.PI / 2;
    for (const s of [-1, 1]) for (let k = 0; k < 4; k++) { this.box(g, 0.1, h, 0.04, M.curtain, s * (width / 2 + 0.12 + k * 0.1), 0.02, thick + (k % 2) * 0.04); }
    return g;
  }
  pendant(x, y, z, kind) {
    const g = this.g(x, y, 'S'); const top = 2.6;
    if (kind === 'bar') { this.box(g, 1.4, 0.04, 0.05, M.light, 0, z - 0.02, 0); this.cyl(g, 0.004, top - z, M.black, -0.6, z, 0, 4); this.cyl(g, 0.004, top - z, M.black, 0.6, z, 0, 4); }
    else if (kind === 'dome') { const o = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.shade); o.position.set(0, z, 0); g.add(o); this.cyl(g, 0.004, top - z, M.black, 0, z, 0, 4); }
    else { this.sph(g, 0.17, M.light, 0, z, 0); this.cyl(g, 0.004, top - z, M.black, 0, z, 0, 4); this.cyl(g, 0.2, 0.01, M.brass, 0, z + 0.13, 0, 24); }
    return g;
  }
  chair(p, x, z, ry, m = M.woodF) {
    const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; p.add(g);
    this.box(g, 0.44, 0.04, 0.44, m, 0, 0.44, 0); this.box(g, 0.44, 0.5, 0.04, m, 0, 0.48, -0.2);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) this.box(g, 0.035, 0.44, 0.035, M.metal, sx * 0.19, 0, sz * 0.19);
    this.box(g, 0.4, 0.03, 0.4, M.sofa, 0, 0.48, 0.0); return g;
  }
  diningTable(x, y, face, w, d, nSide, endChairs, pk) {
    const g = this.g(x, y, face);
    this.box(g, w, 0.05, d, M.woodF, 0, 0.72, 0); this.box(g, w - 0.5, 0.05, d - 0.3, M.woodF, 0, 0.67, 0);
    for (const sx of [-1, 1]) { this.box(g, 0.06, 0.7, d - 0.2, M.metal, sx * (w / 2 - 0.35), 0, 0); }
    const sp = (w - 0.3) / nSide;
    for (let i = 0; i < nSide; i++) { const cx = -w / 2 + 0.15 + sp * (i + .5); this.chair(g, cx, d / 2 + 0.22, Math.PI); this.chair(g, cx, -d / 2 - 0.22, 0); }
    if (endChairs) { this.chair(g, w / 2 + 0.25, 0, -Math.PI / 2); this.chair(g, -w / 2 - 0.25, 0, Math.PI / 2); }
    // table setting
    this.box(g, w - 0.5, 0.01, 0.3, M.bedAcc, 0, 0.745, 0);
    for (let i = 0; i < 3; i++) this.cyl(g, 0.06, 0.2 + i * .02, M.ceramic, -0.5 + i * 0.5, 0.745, 0, 12);
    const al = (face === 'E' || face === 'W'); const hw = al ? d / 2 + 0.3 : w / 2 + 0.1, hd = al ? w / 2 + 0.1 : d / 2 + 0.3;
    this.block(x - hw, y - hd, x + hw, y + hd); return g;
  }
  bed(x, y, face, w = 1.8, l = 2.05, S) {
    const g = this.g(x, y, face); // headboard at local -z
    this.box(g, w + 0.1, 0.28, l, M.woodF, 0, 0.0, 0); this.box(g, w, 0.24, l - 0.1, M.bed, 0, 0.28, 0.02);
    this.box(g, w + 0.2, 1.05, 0.12, M.bedAcc, 0, 0.0, -l / 2 - 0.02); this.box(g, w + 0.2, 0.06, 0.14, M.woodF, 0, 1.05, -l / 2 - 0.02);
    for (const s of [-1, 1]) { this.box(g, w * 0.4, 0.14, 0.4, M.bed, s * w * 0.25, 0.52, -l / 2 + 0.38).rotation.x = -0.18; this.box(g, w * 0.34, 0.12, 0.3, M.cushion, s * w * 0.25, 0.62, -l / 2 + 0.6).rotation.x = -0.18; }
    this.box(g, w, 0.03, l * 0.45, M.bedAcc, 0, 0.52, l * 0.22); // throw
    this.block(...this.rect(x, y, face, w / 2 + 0.1, l / 2 + 0.1)); return g;
  }
  nightstand(x, y, face) {
    const g = this.g(x, y, face); this.box(g, 0.45, 0.45, 0.4, M.woodL, 0, 0.1, 0); this.box(g, 0.4, 0.1, 0.01, M.metal, 0, 0.3, 0.205);
    this.cyl(g, 0.05, 0.02, M.brass, 0, 0.55, 0, 12); this.cyl(g, 0.012, 0.22, M.brass, 0, 0.57, 0, 6);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.14, 14, 1, true), M.shade); sh.position.set(0, 0.88, 0); g.add(sh);
    this.block(...this.rect(x, y, face, 0.24, 0.22)); return g;
  }
  wardrobe(x, y, face, w, h = 2.4, d = 0.6) { // front at +z
    const g = this.g(x, y, face); this.box(g, w, h, d, M.cabTall, 0, 0, 0);
    const n = Math.max(2, Math.round(w / 0.55)); for (let i = 1; i < n; i++) this.box(g, 0.006, h - 0.1, 0.01, M.dark, -w / 2 + w / n * i, 0.05, d / 2 + 0.002);
    for (let i = 0; i < n; i += 2) { const cx = -w / 2 + w / n * (i + 1); this.box(g, 0.012, 0.5, 0.02, M.brass, cx - 0.04, 1.0, d / 2 + 0.01); this.box(g, 0.012, 0.5, 0.02, M.brass, cx + 0.04, 1.0, d / 2 + 0.01); }
    this.block(...this.rect(x, y, face, w / 2, d / 2 + 0.05)); return g;
  }
  desk(x, y, face, w = 1.2, d = 0.6) {
    const g = this.g(x, y, face); this.box(g, w, 0.04, d, M.woodL, 0, 0.72, 0); this.box(g, 0.04, 0.72, d - 0.05, M.metal, -w / 2 + 0.04, 0, 0); this.box(g, 0.04, 0.72, d - 0.05, M.metal, w / 2 - 0.04, 0, 0);
    this.box(g, 0.32, 0.02, 0.22, M.dark, 0.1, 0.76, -0.05); this.box(g, 0.3, 0.2, 0.01, M.screen, 0.1, 0.8, -0.18);
    this.chair(g, 0, d / 2 + 0.38, Math.PI);
    this.block(...this.rect(x, y, face, w / 2 + 0.05, d / 2 + 0.35)); return g;
  }
  tvUnit(x, y, face, w = 2.0) {
    const g = this.g(x, y, face); this.box(g, w, 0.45, 0.42, M.cabTall, 0, 0.12, 0); this.box(g, w, 0.04, 0.44, M.woodL, 0, 0.57, 0);
    for (let i = 1; i < 4; i++) this.box(g, 0.006, 0.38, 0.01, M.dark, -w / 2 + w / 4 * i, 0.15, 0.215);
    this.cyl(g, 0.012, 0.0, M.metal, 0, 0, 0, 4);
    this.box(g, 1.25, 0.72, 0.04, M.screen, 0, 0.95, -0.15); this.box(g, 0.3, 0.02, 0.15, M.dark, 0, 0.61, -0.1);
    this.block(...this.rect(x, y, face, w / 2, 0.25)); return g;
  }
  console(x, y, face, w = 1.0) { const g = this.g(x, y, face); this.box(g, w, 0.04, 0.32, M.woodL, 0, 0.78, 0); this.box(g, 0.03, 0.78, 0.3, M.metal, -w / 2 + 0.04, 0, 0); this.box(g, 0.03, 0.78, 0.3, M.metal, w / 2 - 0.04, 0, 0); this.cyl(g, 0.07, 0.18, M.ceramic, w * .25, 0.8, 0, 14); this.block(...this.rect(x, y, face, w / 2, 0.18)); return g; }
  mirror(parent, x, y, z, w, h, ry = 0) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; parent.add(g); this.box(g, w + 0.04, h + 0.04, 0.02, M.frame, 0, 0, 0).position.y = h / 2; this.box(g, w, h, 0.025, M.mirror, 0, 0, 0.003).position.y = h / 2; return g; }

  // kitchen -----------------------------------------------------------------
  baseRun(x, y, face, len, depth = 0.62, opts = {}) { // local x along run, front = +z. (x,y) = centre of the run's back line
    const g = this.g(x, y, face); const zc = depth / 2;
    this.box(g, len, 0.12, depth - 0.04, M.dark, 0, 0, zc - 0.02); this.box(g, len, 0.74, depth, M.cab, 0, 0.12, zc);
    this.box(g, len + 0.02, 0.04, depth + 0.03, M.counter, 0, 0.86, zc + 0.01);
    const n = Math.max(1, Math.round(len / 0.6));
    for (let i = 1; i < n; i++) this.box(g, 0.008, 0.7, 0.01, M.dark, -len / 2 + len / n * i, 0.14, depth + 0.002);
    for (let i = 0; i < n; i++) this.box(g, 0.16, 0.012, 0.02, M.brass, -len / 2 + len / n * (i + .5), 0.78, depth + 0.012);
    const sw = (face === 'E' || face === 'W'); const a = sw ? depth : len / 2, b = sw ? len / 2 : depth;
    return g;
  }
  upperRun(x, y, face, len, depth = 0.34, h = 0.75, z0 = 1.45) { const g = this.g(x, y, face); this.box(g, len, h, depth, M.cabTall, 0, z0, depth / 2); const n = Math.max(1, Math.round(len / 0.6)); for (let i = 1; i < n; i++) this.box(g, 0.008, h - 0.06, 0.01, M.dark, -len / 2 + len / n * i, z0 + 0.03, depth + 0.002); return g; }
  sink(g, lx, lz = 0.33) { this.box(g, 0.6, 0.02, 0.42, M.metal, lx, 0.865, lz); this.box(g, 0.56, 0.005, 0.38, M.dark, lx, 0.877, lz); this.cyl(g, 0.012, 0.28, M.metal, lx, 0.87, lz - 0.2, 8); this.box(g, 0.012, 0.012, 0.18, M.metal, lx, 1.14, lz - 0.12); }
  hob(g, lx, lz = 0.33) { this.box(g, 0.6, 0.012, 0.5, M.black, lx, 0.9, lz); for (const [a, b] of [[-.15, -.12], [.15, -.12], [-.15, .12], [.15, .12]]) this.cyl(g, 0.07, 0.004, M.metal, lx + a, 0.912, lz + b, 18); }
  hood(x, y, face, w = 0.9) { const g = this.g(x, y, face); this.box(g, w, 0.1, 0.5, M.metal, 0, 1.55, 0.25); this.box(g, 0.32, 0.9, 0.3, M.metal, 0, 1.65, 0.15); return g; }
  tall(x, y, face, len, depth = 0.62) { const g = this.g(x, y, face); this.box(g, len, 2.3, depth, M.cabTall, 0, 0, depth / 2); const n = Math.max(1, Math.round(len / 0.6)); for (let i = 1; i < n; i++) this.box(g, 0.008, 2.2, 0.01, M.dark, -len / 2 + len / n * i, 0.05, depth + 0.002); for (let i = 0; i < n; i++) this.box(g, 0.012, 0.6, 0.02, M.brass, -len / 2 + len / n * (i + .5) + 0.2 * (len / n) * .8, 1.0, depth + 0.012); return g; }
  fridge(x, y, face, w = 0.9) { const g = this.g(x, y, face); this.box(g, w, 2.05, 0.68, M.metal, 0, 0, 0.34); this.box(g, 0.008, 1.9, 0.01, M.dark, 0, 0.08, 0.685); this.box(g, 0.02, 0.8, 0.03, M.brass, -0.05, 0.9, 0.7); this.box(g, 0.02, 0.8, 0.03, M.brass, 0.05, 0.9, 0.7); return g; }
  island(x, y, face, len, depth = 1.0) {
    const g = this.g(x, y, face);
    this.box(g, len - 0.04, 0.12, depth - 0.06, M.dark, 0, 0, 0); this.box(g, len, 0.74, depth - 0.3, M.cab, 0, 0.12, -0.15);
    this.box(g, len + 0.04, 0.05, depth + 0.02, M.counter, 0, 0.86, 0); // top
    this.box(g, 0.05, 0.86, depth + 0.02, M.counter, -len / 2 - 0.0, 0, 0); this.box(g, 0.05, 0.86, depth + 0.02, M.counter, len / 2, 0, 0);
    const n = Math.round(len / 0.6); for (let i = 1; i < n; i++) this.box(g, 0.008, 0.7, 0.01, M.dark, -len / 2 + len / n * i, 0.14, -0.15 + (depth - 0.3) / 2 + 0.002);
    // stools on +z side (local front); pendants above
    const ns = Math.max(3, Math.floor(len / 0.75));
    for (let i = 0; i < ns; i++) { const sx = -len / 2 + len / ns * (i + .5); this.cyl(g, 0.19, 0.05, M.sofa, sx, 0.68, depth / 2 + 0.38, 18); this.cyl(g, 0.02, 0.68, M.metal, sx, 0, depth / 2 + 0.38, 8); this.cyl(g, 0.15, 0.015, M.metal, sx, 0.0, depth / 2 + 0.38, 16); }
    this.box(g, 0.34, 0.02, 0.24, M.woodL, -len * 0.25, 0.915, -0.1); this.cyl(g, 0.12, 0.08, M.ceramic, len * 0.25, 0.91, -0.1, 16); // board + bowl
    const al = (face === 'E' || face === 'W'), sd = (face === 'N' || face === 'E') ? 1 : -1; const lx = al ? depth / 2 : len / 2, ly = al ? len / 2 : depth / 2;
    const bx0 = x - lx - 0.05 - (face === 'W' ? 0.5 : 0), bx1 = x + lx + 0.05 + (face === 'E' ? 0.5 : 0), by0 = y - ly - 0.05 - (face === 'S' ? 0.5 : 0), by1 = y + ly + 0.05 + (face === 'N' ? 0.5 : 0);
    this.block(bx0, by0, bx1, by1); return g;
  }
  // bathrooms --------------------------------------------------------------
  toilet(x, y, face) { const g = this.g(x, y, face); this.box(g, 0.38, 0.4, 0.2, M.ceramic, 0, 0.0, -0.2); this.box(g, 0.36, 0.22, 0.5, M.ceramic, 0, 0.18, 0.02); this.cyl(g, 0.03, 0.01, M.metal, 0, 0.62, -0.2, 8); this.block(...this.rect(x, y, face, 0.25, 0.32)); return g; }
  vanity(x, y, face, w = 0.9, basins = 1) {
    const g = this.g(x, y, face); this.box(g, w, 0.5, 0.48, M.cabTall, 0, 0.25, 0.24); this.box(g, w + 0.02, 0.04, 0.5, M.counter, 0, 0.75, 0.24);
    for (let i = 0; i < basins; i++) { const bx = (basins === 1 ? 0 : (i ? 1 : -1) * w / 4); this.box(g, 0.4, 0.03, 0.3, M.ceramic, bx, 0.78, 0.26); this.cyl(g, 0.012, 0.18, M.metal, bx, 0.78, 0.07, 8); }
    this.mirror(g, 0, 1.1, 0.012, w * 0.9, 0.9); this.block(...this.rect(x, y, face, w / 2, 0.3)); return g;
  }
  shower(x, y, face, w = 0.95, d = 0.95) {
    const g = this.g(x, y, face); this.box(g, w, 0.03, d, M.tile, 0, 0, 0); this.box(g, 0.01, 2.0, d, M.glass, w / 2 - 0.01, 0.0, 0); this.box(g, w, 2.0, 0.01, M.glass, 0, 0.0, d / 2 - 0.01);
    this.box(g, 0.025, 2.0, 0.025, M.metal, w / 2 - 0.01, 0, d / 2 - 0.01); this.cyl(g, 0.012, 0.3, M.metal, -w / 2 + 0.08, 1.9, -d / 2 + 0.06, 8); this.cyl(g, 0.1, 0.012, M.metal, -w / 2 + 0.08, 2.19, -d / 2 + 0.2, 16);
    this.block(...this.rect(x, y, face, w / 2, d / 2)); return g;
  }
}
