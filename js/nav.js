// Collision grid, path finding, first-person controller and guided tour.
import * as THREE from 'three';

const CELL = 0.1, R = 0.26; // metres; camera radius
export class Grid {
  constructor(walkRects, solids, blocks) {
    this.x0 = -4.8; this.y0 = -0.5; this.nx = Math.ceil((16.5 + 4.8) / CELL); this.ny = Math.ceil((12.6 + 0.5) / CELL);
    this.free = new Uint8Array(this.nx * this.ny);
    const inR = (x, y, r) => x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];
    const tw = walkRects[1], tn = walkRects[2];
    const shrink = (r, s) => [r[0] + (s.w ? R : 0), r[1] + (s.s ? R : 0), r[2] - (s.e ? R : 0), r[3] - (s.n ? R : 0)];
    const zones = [walkRects[0], shrink(tw, { w: 1, s: 1 }), shrink(tn, { w: 1, n: 1 })];
    const hard = solids.map(s => [s[0] - R, s[1] - R, s[2] + R, s[3] + R]);
    const soft = blocks.map(s => [s[0] - R + 0.06, s[1] - R + 0.06, s[2] + R - 0.06, s[3] + R - 0.06]);
    for (let j = 0; j < this.ny; j++) for (let i = 0; i < this.nx; i++) {
      const x = this.x0 + (i + .5) * CELL, y = this.y0 + (j + .5) * CELL; let ok = zones.some(z => inR(x, y, z));
      if (ok) ok = !hard.some(z => x > z[0] && x < z[2] && y > z[1] && y < z[3]) && !soft.some(z => x > z[0] && x < z[2] && y > z[1] && y < z[3]);
      this.free[j * this.nx + i] = ok ? 1 : 0;
    }
    // doors/glass doors are carved out of "solids" simply because they are not in it.
  }
  idx(x, y) { const i = Math.floor((x - this.x0) / CELL), j = Math.floor((y - this.y0) / CELL); return (i < 0 || j < 0 || i >= this.nx || j >= this.ny) ? -1 : j * this.nx + i; }
  ok(x, y) { const k = this.idx(x, y); return k >= 0 && this.free[k] === 1; }
  nearest(x, y) { if (this.ok(x, y)) return [x, y]; for (let r = 1; r < 40; r++) for (let a = 0; a < 16; a++) { const px = x + Math.cos(a / 16 * 6.283) * r * CELL, py = y + Math.sin(a / 16 * 6.283) * r * CELL; if (this.ok(px, py)) return [px, py]; } return [x, y]; }
  los(a, b) { const d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.ceil(d / 0.05); for (let i = 0; i <= n; i++) { const t = i / n; if (!this.ok(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)) return false; } return true; }
  path(from, to) {
    const s = this.idx(...this.nearest(...from)), g = this.idx(...this.nearest(...to)); if (s < 0 || g < 0) return [to];
    const nx = this.nx, cost = new Float32Array(this.free.length).fill(1e9), prev = new Int32Array(this.free.length).fill(-1), open = [[0, s]]; cost[s] = 0;
    const gx = g % nx, gy = (g / nx) | 0; const h = k => Math.hypot((k % nx) - gx, ((k / nx) | 0) - gy);
    const heap = open; const push = (it) => { heap.push(it); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break;[heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
    const pop = () => { const t = heap[0], l = heap.pop(); if (heap.length) { heap[0] = l; let i = 0; for (; ;) { let a = 2 * i + 1, b = a + 1, m = i; if (a < heap.length && heap[a][0] < heap[m][0]) m = a; if (b < heap.length && heap[b][0] < heap[m][0]) m = b; if (m === i) break;[heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return t; };
    while (heap.length) {
      const [, k] = pop(); if (k === g) break; const kx = k % nx, ky = (k / nx) | 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue; const ax = kx + dx, ay = ky + dy; if (ax < 0 || ay < 0 || ax >= nx || ay >= this.ny) continue; const q = ay * nx + ax; if (!this.free[q]) continue;
        if (dx && dy && (!this.free[ky * nx + ax] || !this.free[ay * nx + kx])) continue;
        const c = cost[k] + (dx && dy ? 1.414 : 1); if (c < cost[q]) { cost[q] = c; prev[q] = k; push([c + h(q), q]); }
      }
    }
    if (prev[g] < 0 && g !== s) return [to];
    const pts = []; for (let k = g; k !== -1; k = prev[k]) pts.push([this.x0 + ((k % nx) + .5) * CELL, this.y0 + (((k / nx) | 0) + .5) * CELL]); pts.reverse();
    // string-pull smoothing
    const out = [pts[0]]; let a = 0; while (a < pts.length - 1) { let b = pts.length - 1; while (b > a + 1 && !this.los(pts[a], pts[b])) b--; out.push(pts[b]); a = b; }
    out[out.length - 1] = to.slice ? [...this.nearest(...to)] : to; return out;
  }
}

export class FP {
  constructor(camera, grid) {
    this.cam = camera; this.grid = grid; this.x = 5.1; this.y = 6.9; this.yaw = Math.PI; this.pitch = 0; this.eye = 1.6; this.speed = 1.5;
    this.vx = 0; this.vy = 0; this.joy = [0, 0]; this.keys = {}; this.look = [0, 0]; this.target = null; this.tYaw = null; this.auto = false;
    this.ty = this.yaw; this.tp = 0; this.lookGain = 1;
  }
  setPos(x, y) { [this.x, this.y] = this.grid.nearest(x, y); }
  lookAt(px, py, pitch = -0.04) { const dx = px - this.x, dy = py - this.y; this.ty = Math.atan2(-dx, dy); this.tp = pitch; }
  place(x, y, lx, ly) { this.setPos(x, y); this.lookAt(lx, ly); this.yaw = this.ty; this.pitch = this.tp; this.path = null; }
  goto(x, y, lx, ly, pitch) {
    this.path = this.grid.path([this.x, this.y], [x, y]); this.path.shift(); this.final = lx !== undefined ? [lx, ly] : null; this.fpitch = pitch === undefined ? -0.04 : pitch; this.auto = true;
  }
  cancel() { this.path = null; this.final = null; this.auto = false; }
  rotate(dx, dy) { this.ty -= dx * 0.0042 * this.lookGain; this.tp = Math.max(-1.25, Math.min(1.25, this.tp - dy * 0.0042 * this.lookGain)); this.yaw = this.ty; this.pitch = this.tp; }
  update(dt) {
    dt = Math.min(dt, 0.05);
    let ix = this.joy[0], iy = this.joy[1];
    const k = this.keys; ix += (k.d || k.ArrowRight ? 1 : 0) - (k.a || k.ArrowLeft ? 1 : 0); iy += (k.w || k.ArrowUp ? 1 : 0) - (k.s || k.ArrowDown ? 1 : 0);
    const m = Math.hypot(ix, iy); if (m > 1) { ix /= m; iy /= m; }
    const manual = m > 0.05; if (manual && this.auto) this.cancel();
    const s = Math.sin(this.yaw), c = Math.cos(this.yaw); let wx = 0, wy = 0;
    if (this.path && this.path.length) {
      const t = this.path[0], dx = t[0] - this.x, dy = t[1] - this.y, d = Math.hypot(dx, dy);
      if (d < 0.12) { this.path.shift(); if (!this.path.length) { this.path = null; this.auto = false; if (this.final) this.lookAt(this.final[0], this.final[1], this.fpitch); } }
      else { wx = dx / d * Math.min(1, d * 3 + 0.25); wy = dy / d * Math.min(1, d * 3 + 0.25); if (!this.final || this.path.length > 1) { this.ty = Math.atan2(-dx, dy); this.tp += (-0.05 - this.tp) * Math.min(1, dt * 3); } else { this.lookAt(...this.final); } }
    } else { wx = (-s * iy + c * ix); wy = (c * iy + s * ix); }
    const sp = this.speed * (this.path ? 1.0 : 1.0), a = 1 - Math.exp(-dt * 7);
    this.vx += (wx * sp - this.vx) * a; this.vy += (wy * sp - this.vy) * a;
    const nx = this.x + this.vx * dt, ny = this.y + this.vy * dt, g = this.grid;
    if (g.ok(nx, ny)) { this.x = nx; this.y = ny; } else if (g.ok(nx, this.y)) { this.x = nx; this.vy *= 0.2; } else if (g.ok(this.x, ny)) { this.y = ny; this.vx *= 0.2; } else { this.vx = this.vy = 0; }
    // smooth look
    let dyw = this.ty - this.yaw; dyw = Math.atan2(Math.sin(dyw), Math.cos(dyw));
    const la = 1 - Math.exp(-dt * (this.auto || this.path ? 4.5 : 14)); this.yaw += dyw * la; this.pitch += (this.tp - this.pitch) * la;
    this.apply();
  }
  apply() { const c = this.cam; c.position.set(this.x, this.eye, -this.y); c.rotation.order = 'YXZ'; c.rotation.set(this.pitch, this.yaw, 0); }
}

// guided tour: list of stops [{room, label, text, dwell}]
export class Tour {
  constructor(fp, rooms) { this.fp = fp; this.rooms = rooms; this.active = false; this.paused = false; this.i = -1; this.t = 0; this.state = 'idle'; this.onStop = null; this.onEnd = null; }
  start(stops, totalSeconds = 85) {
    this.stops = stops; this.active = true; this.paused = false; this.fp.cancel(); this.i = -1;
    // estimate path length to scale speed
    let from = [this.fp.x, this.fp.y], L = 0; for (const s of stops) { const r = this.rooms[s.room]; const p = this.fp.grid.path(from, r.pos); for (let k = 1; k < p.length; k++) L += Math.hypot(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]); from = r.pos; }
    const dwell = stops.reduce((a, s) => a + (s.dwell || 3), 0); const travelT = Math.max(20, totalSeconds - dwell); this.fp.speed = Math.max(1.0, Math.min(2.4, L / travelT)); this.userSpeed = this.fp.speed;
    this.next();
  }
  go(i) { this.i = i - 1; this.next(); }
  next() {
    this.i++; if (this.i >= this.stops.length) { this.stop(true); return; }
    const s = this.stops[this.i], r = this.rooms[s.room]; this.state = 'travel'; this.dwellLeft = s.dwell || 3;
    if (this.i === 0) { this.fp.place(...r.pos, ...r.look); this.state = 'dwell'; this.fp.cancel(); this.fp.lookAt(...r.look); } else this.fp.goto(r.pos[0], r.pos[1], r.look[0], r.look[1]);
    this.onStop && this.onStop(s, this.i, this.stops.length);
  }
  prev() { this.go(Math.max(0, this.i - 1)); }
  stop(done = false) { this.active = false; this.state = 'idle'; this.fp.cancel(); this.onEnd && this.onEnd(done); }
  toggle() { this.paused = !this.paused; if (this.paused) { this.fp.joyLock = true; } return this.paused; }
  update(dt) {
    if (!this.active || this.paused) return false;
    if (this.state === 'travel') {
      if (!this.fp.path) this.state = 'dwell';
      else { const d = Math.hypot(this.fp.x - (this.lx ?? 1e9), this.fp.y - (this.ly ?? 1e9)); if (d < 0.02) this.stuck = (this.stuck || 0) + dt; else this.stuck = 0; this.lx = this.fp.x; this.ly = this.fp.y;
        if (this.stuck > 1.5) { const r = this.rooms[this.stops[this.i].room]; this.fp.cancel(); this.fp.place(...r.pos, ...r.look); this.stuck = 0; this.state = 'dwell'; } }
    }
    else if (this.state === 'dwell') { this.dwellLeft -= dt; if (this.dwellLeft <= 0) this.next(); }
    return true;
  }
}
