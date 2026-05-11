#!/usr/bin/env node
/**
 * Generate low-poly OBJ + MTL files for Tiger I and T-34 tanks.
 * Dimensions based on real-world proportions scaled to game units.
 */
const fs = require('fs');
const path = require('path');

function box(cx, cy, cz, w, h, d) {
  const hw = w / 2, hh = h / 2, hd = d / 2;
  return {
    verts: [
      [cx - hw, cy - hh, cz + hd], [cx + hw, cy - hh, cz + hd],
      [cx + hw, cy + hh, cz + hd], [cx - hw, cy + hh, cz + hd],
      [cx - hw, cy - hh, cz - hd], [cx + hw, cy - hh, cz - hd],
      [cx + hw, cy + hh, cz - hd], [cx - hw, cy + hh, cz - hd],
    ],
    faces: [
      [0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[4,5,1,0],[3,2,6,7]
    ],
    normals: [
      [0,0,1],[0,0,-1],[-1,0,0],[1,0,0],[0,-1,0],[0,1,0]
    ]
  };
}

function trapezoid(cx, cy, cz, wBot, wTop, h, d, slopeZ = 0) {
  const hwb = wBot / 2, hwt = wTop / 2, hh = h / 2, hd = d / 2;
  return {
    verts: [
      [cx - hwb, cy - hh, cz + hd], [cx + hwb, cy - hh, cz + hd],
      [cx + hwt, cy + hh, cz + hd + slopeZ], [cx - hwt, cy + hh, cz + hd + slopeZ],
      [cx - hwb, cy - hh, cz - hd], [cx + hwb, cy - hh, cz - hd],
      [cx + hwt, cy + hh, cz - hd - slopeZ], [cx - hwt, cy + hh, cz - hd - slopeZ],
    ],
    faces: [
      [0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[4,5,1,0],[3,2,6,7]
    ],
    normals: [
      [0,0,1],[0,0,-1],[-1,0.3,0],[1,0.3,0],[0,-1,0],[0,1,0]
    ]
  };
}

function cylinder(cx, cy, cz, radius, length, axis, segments = 8) {
  const verts = [];
  const faces = [];
  const normals = [];
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const na = ((i + 1) / segments) * Math.PI * 2;
    const c1 = Math.cos(a), s1 = Math.sin(a);
    const c2 = Math.cos(na), s2 = Math.sin(na);
    const hl = length / 2;
    let v;
    if (axis === 'z') {
      v = [
        [cx + c1*radius, cy + s1*radius, cz - hl],
        [cx + c2*radius, cy + s2*radius, cz - hl],
        [cx + c2*radius, cy + s2*radius, cz + hl],
        [cx + c1*radius, cy + s1*radius, cz + hl],
      ];
      normals.push([(c1+c2)/2, (s1+s2)/2, 0]);
    } else if (axis === 'x') {
      v = [
        [cx - hl, cy + c1*radius, cz + s1*radius],
        [cx - hl, cy + c2*radius, cz + s2*radius],
        [cx + hl, cy + c2*radius, cz + s2*radius],
        [cx + hl, cy + c1*radius, cz + s1*radius],
      ];
      normals.push([0, (c1+c2)/2, (s1+s2)/2]);
    }
    const base = verts.length;
    verts.push(...v);
    faces.push([base, base+1, base+2, base+3]);
  }
  return { verts, faces, normals };
}

class ObjBuilder {
  constructor() {
    this.vertices = [];
    this.normals = [];
    this.groups = [];
    this.currentGroup = null;
  }

  startGroup(name, material) {
    this.currentGroup = { name, material, faces: [] };
    this.groups.push(this.currentGroup);
  }

  addShape(shape) {
    const vOff = this.vertices.length;
    const nOff = this.normals.length;
    for (const v of shape.verts) this.vertices.push(v);
    for (const n of shape.normals) this.normals.push(n);
    for (let fi = 0; fi < shape.faces.length; fi++) {
      const f = shape.faces[fi];
      const ni = Math.min(fi, shape.normals.length - 1);
      this.currentGroup.faces.push(f.map(vi => [vi + vOff + 1, ni + nOff + 1]));
    }
  }

  toOBJ(mtlFile) {
    let out = `# Auto-generated tank model\nmtllib ${mtlFile}\n\n`;
    for (const v of this.vertices) out += `v ${v[0].toFixed(4)} ${v[1].toFixed(4)} ${v[2].toFixed(4)}\n`;
    out += '\n';
    for (const n of this.normals) out += `vn ${n[0].toFixed(4)} ${n[1].toFixed(4)} ${n[2].toFixed(4)}\n`;
    out += '\n';
    for (const g of this.groups) {
      out += `g ${g.name}\nusemtl ${g.material}\n`;
      for (const f of g.faces) {
        out += 'f ' + f.map(([vi, ni]) => `${vi}//${ni}`).join(' ') + '\n';
      }
      out += '\n';
    }
    return out;
  }
}

function generateTiger1() {
  const obj = new ObjBuilder();

  // Hull lower - flat box shape (Tiger I is famously boxy)
  obj.startGroup('hull_lower', 'hull_dunkelgelb');
  obj.addShape(box(0, 0.45, 0, 3.56, 0.6, 6.3));

  // Hull upper with slight slope
  obj.startGroup('hull_upper', 'hull_dunkelgelb');
  obj.addShape(trapezoid(0, 0.95, 0, 3.4, 3.2, 0.4, 5.8, 0));

  // Front glacis plate (angled)
  obj.startGroup('glacis', 'hull_dunkelgelb');
  obj.addShape(trapezoid(0, 0.75, 3.3, 3.3, 3.0, 0.5, 0.6, 0.15));

  // Rear plate
  obj.startGroup('rear', 'hull_dark');
  obj.addShape(box(0, 0.7, -3.3, 3.2, 0.7, 0.3));

  // Engine deck
  obj.startGroup('engine_deck', 'hull_dark');
  obj.addShape(box(0, 1.15, -1.8, 3.0, 0.1, 2.4));

  // Engine grilles (left & right)
  obj.startGroup('grille_left', 'hull_dark');
  obj.addShape(box(-1.0, 1.2, -1.8, 0.8, 0.05, 1.6));
  obj.startGroup('grille_right', 'hull_dark');
  obj.addShape(box(1.0, 1.2, -1.8, 0.8, 0.05, 1.6));

  // Turret - large rectangular box (Tiger I iconic shape)
  obj.startGroup('turret_base', 'turret_dunkelgelb');
  obj.addShape(box(0, 1.55, 0.3, 2.0, 0.55, 2.4));

  // Turret top
  obj.startGroup('turret_top', 'turret_dunkelgelb');
  obj.addShape(box(0, 2.0, 0.3, 1.8, 0.15, 2.2));

  // Turret rear bustle
  obj.startGroup('turret_rear', 'hull_dark');
  obj.addShape(box(0, 1.6, -1.0, 1.6, 0.4, 0.5));

  // Gun mantlet
  obj.startGroup('mantlet', 'hull_dark');
  obj.addShape(box(0, 1.55, 1.55, 0.9, 0.5, 0.3));

  // 88mm barrel
  obj.startGroup('barrel', 'barrel_metal');
  obj.addShape(cylinder(0, 1.55, 3.8, 0.09, 4.2, 'z', 8));

  // Muzzle brake
  obj.startGroup('muzzle', 'barrel_metal');
  obj.addShape(cylinder(0, 1.55, 6.1, 0.13, 0.25, 'z', 8));

  // Tracks - left
  obj.startGroup('track_left', 'track_metal');
  obj.addShape(box(-2.05, 0.35, 0, 0.52, 0.7, 6.5));

  // Tracks - right
  obj.startGroup('track_right', 'track_metal');
  obj.addShape(box(2.05, 0.35, 0, 0.52, 0.7, 6.5));

  // Road wheels (8 per side, interleaved pattern)
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 8; i++) {
      const zp = -2.8 + i * 0.8;
      const name = `wheel_${side > 0 ? 'r' : 'l'}_${i}`;
      obj.startGroup(name, 'track_metal');
      obj.addShape(cylinder(side * 2.05, 0.35, zp, 0.32, 0.45, 'x', 10));
    }
  }

  // Sprocket wheels (front)
  obj.startGroup('sprocket_left', 'track_metal');
  obj.addShape(cylinder(-2.05, 0.5, 3.2, 0.28, 0.45, 'x', 10));
  obj.startGroup('sprocket_right', 'track_metal');
  obj.addShape(cylinder(2.05, 0.5, 3.2, 0.28, 0.45, 'x', 10));

  // Idler wheels (rear)
  obj.startGroup('idler_left', 'track_metal');
  obj.addShape(cylinder(-2.05, 0.5, -3.2, 0.26, 0.45, 'x', 10));
  obj.startGroup('idler_right', 'track_metal');
  obj.addShape(cylinder(2.05, 0.5, -3.2, 0.26, 0.45, 'x', 10));

  // Cupola (commander's)
  obj.startGroup('cupola', 'hull_dunkelgelb');
  obj.addShape(cylinder(-0.4, 2.2, 0.0, 0.25, 0.2, 'z', 8));

  // Fenders
  obj.startGroup('fender_left', 'hull_dark');
  obj.addShape(box(-2.0, 0.85, 0, 0.7, 0.05, 6.0));
  obj.startGroup('fender_right', 'hull_dark');
  obj.addShape(box(2.0, 0.85, 0, 0.7, 0.05, 6.0));

  // Exhaust pipes
  obj.startGroup('exhaust_l', 'hull_dark');
  obj.addShape(cylinder(-1.2, 1.15, -3.3, 0.08, 0.6, 'z', 6));
  obj.startGroup('exhaust_r', 'hull_dark');
  obj.addShape(cylinder(1.2, 1.15, -3.3, 0.08, 0.6, 'z', 6));

  // Antenna
  obj.startGroup('antenna', 'barrel_metal');
  obj.addShape(cylinder(-0.8, 2.0, -0.5, 0.015, 1.2, 'z', 4));

  const mtl = `# Tiger I materials
newmtl hull_dunkelgelb
Ka 0.15 0.14 0.08
Kd 0.55 0.50 0.30
Ks 0.15 0.15 0.10
Ns 25.0
d 1.0

newmtl turret_dunkelgelb
Ka 0.14 0.13 0.08
Kd 0.50 0.46 0.28
Ks 0.12 0.12 0.08
Ns 30.0
d 1.0

newmtl hull_dark
Ka 0.08 0.07 0.05
Kd 0.25 0.23 0.15
Ks 0.10 0.10 0.08
Ns 20.0
d 1.0

newmtl barrel_metal
Ka 0.05 0.05 0.04
Kd 0.18 0.18 0.15
Ks 0.30 0.30 0.25
Ns 50.0
d 1.0

newmtl track_metal
Ka 0.04 0.04 0.03
Kd 0.12 0.12 0.10
Ks 0.20 0.20 0.18
Ns 40.0
d 1.0
`;

  return { obj: obj.toOBJ('tiger1.mtl'), mtl };
}

function generateT34() {
  const obj = new ObjBuilder();

  // Hull lower body
  obj.startGroup('hull_lower', 'hull_green');
  obj.addShape(box(0, 0.4, 0, 3.0, 0.5, 5.9));

  // Hull upper - sloped armor (trapezoid, T-34's signature feature)
  obj.startGroup('hull_upper', 'hull_green');
  obj.addShape(trapezoid(0, 0.85, 0.2, 3.0, 2.6, 0.4, 5.2, 0.3));

  // Front glacis - heavily sloped (60° famous slope)
  obj.startGroup('glacis', 'hull_green');
  obj.addShape(trapezoid(0, 0.7, 3.2, 2.8, 2.2, 0.6, 0.8, 0.4));

  // Driver's hatch (left front)
  obj.startGroup('driver_hatch', 'hull_dark_green');
  obj.addShape(box(-0.55, 1.05, 2.6, 0.5, 0.08, 0.5));

  // Machine gun ball mount (right front)
  obj.startGroup('mg_mount', 'hull_dark_green');
  obj.addShape(cylinder(0.55, 0.95, 3.0, 0.1, 0.15, 'z', 8));

  // Rear plate
  obj.startGroup('rear', 'hull_dark_green');
  obj.addShape(box(0, 0.65, -3.1, 2.8, 0.6, 0.25));

  // Engine deck
  obj.startGroup('engine_deck', 'hull_dark_green');
  obj.addShape(box(0, 1.05, -1.5, 2.5, 0.08, 2.8));

  // Engine grilles
  obj.startGroup('grille', 'hull_dark_green');
  obj.addShape(box(0, 1.08, -2.2, 2.0, 0.04, 0.8));

  // Turret - hexagonal shape (T-34 1943 "nut" turret)
  // Approximate with a wider front, narrower rear trapezoid
  obj.startGroup('turret_base', 'turret_green');
  obj.addShape(trapezoid(0, 1.4, 0.5, 1.7, 1.3, 0.5, 1.8, 0.2));

  // Turret top
  obj.startGroup('turret_top', 'turret_green');
  obj.addShape(box(0, 1.75, 0.5, 1.4, 0.1, 1.6));

  // Turret rear overhang
  obj.startGroup('turret_rear', 'hull_dark_green');
  obj.addShape(box(0, 1.45, -0.5, 1.1, 0.35, 0.4));

  // Gun mantlet (rounded, approximated)
  obj.startGroup('mantlet', 'hull_dark_green');
  obj.addShape(cylinder(0, 1.4, 1.45, 0.28, 0.3, 'z', 10));

  // 76mm barrel
  obj.startGroup('barrel', 'barrel_metal');
  obj.addShape(cylinder(0, 1.4, 3.5, 0.065, 3.8, 'z', 8));

  // Muzzle brake (T-34 didn't have one typically, but add a simple cap)
  obj.startGroup('muzzle', 'barrel_metal');
  obj.addShape(cylinder(0, 1.4, 5.5, 0.08, 0.15, 'z', 8));

  // Tracks - left
  obj.startGroup('track_left', 'track_metal');
  obj.addShape(box(-1.75, 0.3, 0, 0.45, 0.6, 6.2));

  // Tracks - right
  obj.startGroup('track_right', 'track_metal');
  obj.addShape(box(1.75, 0.3, 0, 0.45, 0.6, 6.2));

  // Road wheels - 5 large Christie-style per side
  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 5; i++) {
      const zp = -2.2 + i * 1.1;
      const name = `wheel_${side > 0 ? 'r' : 'l'}_${i}`;
      obj.startGroup(name, 'track_metal');
      obj.addShape(cylinder(side * 1.75, 0.32, zp, 0.38, 0.4, 'x', 12));
    }
  }

  // Sprocket (front, smaller)
  obj.startGroup('sprocket_left', 'track_metal');
  obj.addShape(cylinder(-1.75, 0.45, 3.0, 0.22, 0.4, 'x', 10));
  obj.startGroup('sprocket_right', 'track_metal');
  obj.addShape(cylinder(1.75, 0.45, 3.0, 0.22, 0.4, 'x', 10));

  // Idler (rear)
  obj.startGroup('idler_left', 'track_metal');
  obj.addShape(cylinder(-1.75, 0.45, -3.0, 0.24, 0.4, 'x', 10));
  obj.startGroup('idler_right', 'track_metal');
  obj.addShape(cylinder(1.75, 0.45, -3.0, 0.24, 0.4, 'x', 10));

  // Cupola
  obj.startGroup('cupola', 'turret_green');
  obj.addShape(cylinder(0.0, 1.9, 0.2, 0.2, 0.18, 'z', 8));

  // Fuel tanks on hull sides (external, T-34 signature)
  obj.startGroup('fuel_left', 'hull_dark_green');
  obj.addShape(cylinder(-1.6, 0.75, -1.5, 0.18, 1.2, 'z', 8));
  obj.startGroup('fuel_right', 'hull_dark_green');
  obj.addShape(cylinder(1.6, 0.75, -1.5, 0.18, 1.2, 'z', 8));

  // Fenders
  obj.startGroup('fender_left', 'hull_dark_green');
  obj.addShape(box(-1.7, 0.75, 0.2, 0.6, 0.04, 5.5));
  obj.startGroup('fender_right', 'hull_dark_green');
  obj.addShape(box(1.7, 0.75, 0.2, 0.6, 0.04, 5.5));

  // Exhaust pipes (rear, left side)
  obj.startGroup('exhaust', 'hull_dark_green');
  obj.addShape(cylinder(-1.0, 0.8, -3.2, 0.07, 0.5, 'z', 6));
  obj.addShape(cylinder(-0.7, 0.8, -3.2, 0.07, 0.5, 'z', 6));

  // Antenna
  obj.startGroup('antenna', 'barrel_metal');
  obj.addShape(cylinder(-0.6, 1.8, -0.2, 0.012, 1.4, 'z', 4));

  // Tow hooks (front)
  obj.startGroup('tow_hooks', 'barrel_metal');
  obj.addShape(box(-1.0, 0.35, 3.5, 0.15, 0.1, 0.15));
  obj.addShape(box(1.0, 0.35, 3.5, 0.15, 0.1, 0.15));

  const mtl = `# T-34 materials
newmtl hull_green
Ka 0.08 0.12 0.06
Kd 0.22 0.32 0.15
Ks 0.10 0.10 0.08
Ns 20.0
d 1.0

newmtl turret_green
Ka 0.07 0.11 0.05
Kd 0.20 0.30 0.14
Ks 0.08 0.08 0.06
Ns 25.0
d 1.0

newmtl hull_dark_green
Ka 0.05 0.08 0.04
Kd 0.15 0.22 0.10
Ks 0.08 0.08 0.06
Ns 18.0
d 1.0

newmtl barrel_metal
Ka 0.05 0.05 0.04
Kd 0.18 0.18 0.15
Ks 0.30 0.30 0.25
Ns 50.0
d 1.0

newmtl track_metal
Ka 0.04 0.04 0.03
Kd 0.12 0.12 0.10
Ks 0.20 0.20 0.18
Ns 40.0
d 1.0
`;

  return { obj: obj.toOBJ('t34.mtl'), mtl };
}

// Write Tiger I
const tiger1 = generateTiger1();
const tiger1Dir = path.join(__dirname, '..', 'public', 'models', 'tiger1');
fs.mkdirSync(tiger1Dir, { recursive: true });
fs.writeFileSync(path.join(tiger1Dir, 'tiger1.obj'), tiger1.obj);
fs.writeFileSync(path.join(tiger1Dir, 'tiger1.mtl'), tiger1.mtl);
console.log(`Tiger I: ${tiger1.obj.split('\n').length} lines, written to ${tiger1Dir}`);

// Write T-34
const t34 = generateT34();
const t34Dir = path.join(__dirname, '..', 'public', 'models', 't34');
fs.mkdirSync(t34Dir, { recursive: true });
fs.writeFileSync(path.join(t34Dir, 't34.obj'), t34.obj);
fs.writeFileSync(path.join(t34Dir, 't34.mtl'), t34.mtl);
console.log(`T-34: ${t34.obj.split('\n').length} lines, written to ${t34Dir}`);
