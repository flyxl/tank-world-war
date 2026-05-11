#!/usr/bin/env node
/**
 * Generate low-poly OBJ + MTL files for Tiger I and T-34 tanks.
 * Proportions based on real-world measurements:
 *   Tiger I: hull 6.9m L × 3.71m W × 3.0m H total, 57t
 *   T-34/76: hull 5.92m L × 3.0m W × 2.4m H total, 26.5t
 * Scaled so ~1 unit = 1 meter.
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
    faces: [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[4,5,1,0],[3,2,6,7]],
    normals: [[0,0,1],[0,0,-1],[-1,0,0],[1,0,0],[0,-1,0],[0,1,0]]
  };
}

function wedge(x0, y0, z0, x1, y1, z1, x2, y2, z2, x3, y3, z3, x4, y4, z4, x5, y5, z5) {
  return {
    verts: [
      [x0,y0,z0],[x1,y1,z1],[x2,y2,z2],[x3,y3,z3],[x4,y4,z4],[x5,y5,z5]
    ],
    faces: [[0,1,2],[3,5,4],[0,3,4,1],[1,4,5,2],[2,5,3,0]],
    normals: [[0,0,1],[0,0,-1],[0,-1,0],[1,0.3,0],[-1,0.3,0]]
  };
}

function cylinder(cx, cy, cz, radius, length, axis, segments) {
  segments = segments || 10;
  const verts = [], faces = [], normals = [];
  const hl = length / 2;
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    const na = ((i + 1) / segments) * Math.PI * 2;
    const c1 = Math.cos(a), s1 = Math.sin(a);
    const c2 = Math.cos(na), s2 = Math.sin(na);
    let v;
    if (axis === 'z') {
      v = [
        [cx+c1*radius, cy+s1*radius, cz-hl],
        [cx+c2*radius, cy+s2*radius, cz-hl],
        [cx+c2*radius, cy+s2*radius, cz+hl],
        [cx+c1*radius, cy+s1*radius, cz+hl],
      ];
      normals.push([(c1+c2)/2, (s1+s2)/2, 0]);
    } else {
      v = [
        [cx-hl, cy+c1*radius, cz+s1*radius],
        [cx-hl, cy+c2*radius, cz+s2*radius],
        [cx+hl, cy+c2*radius, cz+s2*radius],
        [cx+hl, cy+c1*radius, cz+s1*radius],
      ];
      normals.push([0, (c1+c2)/2, (s1+s2)/2]);
    }
    const base = verts.length;
    verts.push(...v);
    faces.push([base, base+1, base+2, base+3]);
  }
  return { verts, faces, normals };
}

function trapezoidBox(cx, cy, cz, wBot, wTop, dBot, dTop, h) {
  const hwb = wBot/2, hwt = wTop/2, hdb = dBot/2, hdt = dTop/2, hh = h/2;
  return {
    verts: [
      [cx-hwb, cy-hh, cz+hdb], [cx+hwb, cy-hh, cz+hdb],
      [cx+hwt, cy+hh, cz+hdt], [cx-hwt, cy+hh, cz+hdt],
      [cx-hwb, cy-hh, cz-hdb], [cx+hwb, cy-hh, cz-hdb],
      [cx+hwt, cy+hh, cz-hdt], [cx-hwt, cy+hh, cz-hdt],
    ],
    faces: [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[4,5,1,0],[3,2,6,7]],
    normals: [[0,0,1],[0,0,-1],[-1,0,0],[1,0,0],[0,-1,0],[0,1,0]]
  };
}

class ObjBuilder {
  constructor() { this.vertices = []; this.normals = []; this.groups = []; this.currentGroup = null; }
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
      for (const f of g.faces) out += 'f ' + f.map(([vi, ni]) => `${vi}//${ni}`).join(' ') + '\n';
      out += '\n';
    }
    return out;
  }
}

// ─────────────────────── TIGER I ───────────────────────
function generateTiger1() {
  const obj = new ObjBuilder();
  // Real proportions: hull 6.9L x 3.71W, height ~3.0m total
  // Ground clearance ~0.47m, track 0.725m wide, 8 interleaved road wheels
  const gc = 0.47;  // ground clearance
  const hullH = 0.95; // hull box height
  const hullW = 3.20; // inner hull width (without sponsons)
  const sponW = 3.71; // width with sponsons
  const hullL = 6.30; // hull length (slightly less than 6.9 for visual)
  const trackW = 0.72;

  // Hull lower box
  obj.startGroup('hull_lower', 'hull_dunkelgelb');
  obj.addShape(box(0, gc + hullH/2, 0, hullW, hullH, hullL));

  // Sponsons (side overhang shelves characteristic of Tiger)
  obj.startGroup('sponson_left', 'hull_dunkelgelb');
  obj.addShape(box(-(hullW/2 + (sponW-hullW)/4), gc + hullH*0.7, 0,
    (sponW-hullW)/2, hullH*0.4, hullL*0.92));
  obj.startGroup('sponson_right', 'hull_dunkelgelb');
  obj.addShape(box((hullW/2 + (sponW-hullW)/4), gc + hullH*0.7, 0,
    (sponW-hullW)/2, hullH*0.4, hullL*0.92));

  // Upper hull deck
  obj.startGroup('hull_deck', 'hull_dunkelgelb');
  obj.addShape(box(0, gc + hullH + 0.06, 0.3, sponW*0.85, 0.12, hullL*0.6));

  // Front glacis (slightly angled, Tiger's front is 100mm near-vertical 80°)
  obj.startGroup('glacis', 'hull_dunkelgelb');
  obj.addShape(trapezoidBox(0, gc + hullH*0.55, hullL/2 + 0.15,
    hullW, hullW*0.95, 0.5, 0.3, hullH*0.9));

  // Lower front plate (angled)
  obj.startGroup('lower_glacis', 'hull_dark');
  obj.addShape(trapezoidBox(0, gc*0.8, hullL/2 + 0.3,
    hullW*0.95, hullW*0.85, 0.25, 0.15, gc*1.1));

  // Rear plate (thick vertical)
  obj.startGroup('rear_plate', 'hull_dark');
  obj.addShape(box(0, gc + hullH*0.5, -hullL/2 - 0.12, hullW, hullH, 0.2));

  // Engine deck with grilles
  obj.startGroup('engine_deck', 'hull_dark');
  obj.addShape(box(0, gc + hullH + 0.04, -1.6, sponW*0.82, 0.06, 2.6));
  // Left grille
  obj.startGroup('grille_l', 'hull_dark');
  obj.addShape(box(-0.85, gc + hullH + 0.08, -1.6, 0.7, 0.03, 1.8));
  // Right grille
  obj.startGroup('grille_r', 'hull_dark');
  obj.addShape(box(0.85, gc + hullH + 0.08, -1.6, 0.7, 0.03, 1.8));

  // ─── TURRET ─── (turret ring 1.83m, turret is boxy)
  const tBase = gc + hullH + 0.12;
  const tW = 2.05;
  const tH = 0.58;
  const tD = 2.30;

  obj.startGroup('turret_base', 'turret_dunkelgelb');
  obj.addShape(trapezoidBox(0, tBase + tH/2, 0.35, tW, tW*0.92, tD, tD*0.9, tH));

  // Turret roof
  obj.startGroup('turret_roof', 'turret_dunkelgelb');
  obj.addShape(box(0, tBase + tH + 0.04, 0.35, tW*0.88, 0.08, tD*0.88));

  // Turret rear bustle (ammo storage)
  obj.startGroup('turret_rear', 'hull_dark');
  obj.addShape(box(0, tBase + tH*0.5, -0.95, tW*0.7, tH*0.7, 0.55));

  // Mantlet (curved front, approximated as thick box)
  obj.startGroup('mantlet', 'hull_dark');
  obj.addShape(trapezoidBox(0, tBase + tH*0.5, 1.55, 1.1, 0.95, 0.35, 0.25, tH*0.85));

  // 88mm L/56 barrel (5.28m long, 88mm bore → ~120mm outer)
  const barrelLen = 4.8;
  obj.startGroup('barrel', 'barrel_metal');
  obj.addShape(cylinder(0, tBase + tH*0.5, 1.55 + barrelLen/2, 0.06, barrelLen, 'z', 10));

  // Muzzle brake (Tiger I had a distinctive dual-baffle brake)
  obj.startGroup('muzzle_brake', 'barrel_metal');
  obj.addShape(cylinder(0, tBase + tH*0.5, 1.55 + barrelLen + 0.1, 0.10, 0.22, 'z', 10));

  // Coaxial MG port (right of mantlet)
  obj.startGroup('mg_port', 'barrel_metal');
  obj.addShape(cylinder(0.35, tBase + tH*0.35, 1.6, 0.03, 0.15, 'z', 6));

  // Commander's cupola (offset left-rear)
  obj.startGroup('cupola', 'turret_dunkelgelb');
  obj.addShape(cylinder(-0.45, tBase + tH + 0.15, 0.0, 0.25, 0.22, 'z', 12));
  // Cupola hatch
  obj.startGroup('cupola_hatch', 'hull_dark');
  obj.addShape(cylinder(-0.45, tBase + tH + 0.28, 0.0, 0.18, 0.04, 'z', 10));

  // Loader's hatch
  obj.startGroup('loader_hatch', 'hull_dark');
  obj.addShape(cylinder(0.4, tBase + tH + 0.1, 0.15, 0.22, 0.04, 'z', 8));

  // ─── TRACKS ─── (725mm wide, interleaved road wheels)
  const trackH = gc * 2 + 0.15;
  for (let side = -1; side <= 1; side += 2) {
    const tx = side * (sponW/2 + trackW/2);
    const prefix = side < 0 ? 'l' : 'r';

    // Track body
    obj.startGroup(`track_${prefix}`, 'track_metal');
    obj.addShape(box(tx, gc + trackH*0.3, 0, trackW, trackH*0.85, hullL*1.02));

    // Track top guard/fender
    obj.startGroup(`fender_${prefix}`, 'hull_dunkelgelb');
    obj.addShape(box(tx, gc + trackH*0.75, 0, trackW + 0.08, 0.05, hullL*0.95));

    // 8 interleaved road wheels per side (Tiger I signature)
    for (let i = 0; i < 8; i++) {
      const zp = -2.6 + i * 0.72;
      obj.startGroup(`wheel_${prefix}_${i}`, 'track_metal');
      obj.addShape(cylinder(tx, gc + 0.38, zp, 0.40, trackW*0.65, 'x', 12));
      // Inner hub
      obj.startGroup(`hub_${prefix}_${i}`, 'hull_dark');
      obj.addShape(cylinder(tx, gc + 0.38, zp, 0.15, trackW*0.7, 'x', 8));
    }

    // Drive sprocket (front, smaller, higher)
    obj.startGroup(`sprocket_${prefix}`, 'track_metal');
    obj.addShape(cylinder(tx, gc + 0.55, hullL*0.48, 0.28, trackW*0.6, 'x', 10));

    // Idler wheel (rear, adjustable)
    obj.startGroup(`idler_${prefix}`, 'track_metal');
    obj.addShape(cylinder(tx, gc + 0.55, -hullL*0.48, 0.30, trackW*0.6, 'x', 10));

    // 3 return rollers
    for (let r = 0; r < 3; r++) {
      const rz = -1.2 + r * 1.2;
      obj.startGroup(`return_${prefix}_${r}`, 'track_metal');
      obj.addShape(cylinder(tx, gc + trackH*0.78, rz, 0.12, trackW*0.5, 'x', 8));
    }
  }

  // Exhaust pipes (dual, rear)
  obj.startGroup('exhaust_l', 'hull_dark');
  obj.addShape(cylinder(-0.8, gc + hullH + 0.12, -hullL/2 - 0.25, 0.08, 0.5, 'z', 6));
  obj.startGroup('exhaust_r', 'hull_dark');
  obj.addShape(cylinder(0.8, gc + hullH + 0.12, -hullL/2 - 0.25, 0.08, 0.5, 'z', 6));

  // Towing shackles
  obj.startGroup('tow_l', 'barrel_metal');
  obj.addShape(box(-1.2, gc + 0.3, hullL/2 + 0.2, 0.15, 0.12, 0.12));
  obj.startGroup('tow_r', 'barrel_metal');
  obj.addShape(box(1.2, gc + 0.3, hullL/2 + 0.2, 0.15, 0.12, 0.12));

  // Antenna
  obj.startGroup('antenna', 'barrel_metal');
  obj.addShape(cylinder(-0.7, tBase + tH + 0.7, -0.6, 0.015, 1.2, 'z', 4));

  // Tool boxes (hull sides - Tiger I had Feifel air filters and spare track links)
  obj.startGroup('toolbox_l', 'hull_dark');
  obj.addShape(box(-sponW/2 - 0.08, gc + hullH*0.55, 1.5, 0.12, 0.25, 0.8));
  obj.startGroup('toolbox_r', 'hull_dark');
  obj.addShape(box(sponW/2 + 0.08, gc + hullH*0.55, 1.5, 0.12, 0.25, 0.8));

  const mtl = `# Tiger I - Dunkelgelb (RAL 7028) camo
newmtl hull_dunkelgelb
Ka 0.12 0.11 0.06
Kd 0.50 0.45 0.25
Ks 0.12 0.12 0.08
Ns 25.0
d 1.0

newmtl turret_dunkelgelb
Ka 0.11 0.10 0.06
Kd 0.46 0.42 0.24
Ks 0.10 0.10 0.07
Ns 28.0
d 1.0

newmtl hull_dark
Ka 0.06 0.06 0.04
Kd 0.22 0.20 0.12
Ks 0.08 0.08 0.06
Ns 20.0
d 1.0

newmtl barrel_metal
Ka 0.04 0.04 0.04
Kd 0.16 0.16 0.14
Ks 0.25 0.25 0.22
Ns 50.0
d 1.0

newmtl track_metal
Ka 0.03 0.03 0.03
Kd 0.10 0.10 0.09
Ks 0.18 0.18 0.16
Ns 40.0
d 1.0
`;

  return { obj: obj.toOBJ('tiger1.mtl'), mtl };
}

// ─────────────────────── T-34/76 ───────────────────────
function generateT34() {
  const obj = new ObjBuilder();
  // Real proportions: hull 5.92L x 3.0W, height 2.4m total
  // Ground clearance 0.40m, Christie suspension, 5 large road wheels
  const gc = 0.40;
  const hullH = 0.75;
  const hullW = 2.60;  // inner hull
  const totalW = 3.00;
  const hullL = 5.50;
  const trackW = 0.50;

  // Hull lower box
  obj.startGroup('hull_lower', 'hull_green');
  obj.addShape(box(0, gc + hullH/2, 0, hullW, hullH, hullL));

  // Upper hull with angled sides (T-34's sloped side armor)
  obj.startGroup('hull_upper', 'hull_green');
  obj.addShape(trapezoidBox(0, gc + hullH + 0.18, 0.2,
    hullW, hullW*0.85, hullL*0.75, hullL*0.70, 0.36));

  // Front glacis (famous 60° slope - THE defining feature)
  // This is a thick slab angled at 60° from vertical
  const glacisH = hullH * 1.2;
  const glacisD = 0.9;
  obj.startGroup('glacis_upper', 'hull_green');
  obj.addShape({
    verts: [
      [-hullW/2, gc + 0.1, hullL/2 + glacisD],
      [hullW/2, gc + 0.1, hullL/2 + glacisD],
      [hullW*0.42, gc + hullH + 0.36, hullL/2 - 0.1],
      [-hullW*0.42, gc + hullH + 0.36, hullL/2 - 0.1],
      [-hullW/2, gc + 0.1, hullL/2 + glacisD - 0.06],
      [hullW/2, gc + 0.1, hullL/2 + glacisD - 0.06],
      [hullW*0.42, gc + hullH + 0.36, hullL/2 - 0.16],
      [-hullW*0.42, gc + hullH + 0.36, hullL/2 - 0.16],
    ],
    faces: [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[4,5,1,0],[3,2,6,7]],
    normals: [[0,0.5,0.866],[0,0.5,-0.866],[-0.3,0.5,0.866],[0.3,0.5,0.866],[0,-1,0],[0,1,0]]
  });

  // Lower front plate (angled under glacis)
  obj.startGroup('lower_glacis', 'hull_green');
  obj.addShape(trapezoidBox(0, gc*0.6, hullL/2 + 0.5,
    hullW*0.9, hullW*0.7, 0.3, 0.15, gc));

  // Driver's hatch (left)
  obj.startGroup('driver_hatch', 'hull_dark_green');
  obj.addShape(box(-0.55, gc + hullH + 0.38, hullL/2 - 0.3, 0.5, 0.06, 0.5));

  // Hull MG ball mount (right front)
  obj.startGroup('mg_ball', 'hull_dark_green');
  obj.addShape(cylinder(0.55, gc + hullH*0.6, hullL/2 + 0.5, 0.1, 0.15, 'z', 8));

  // Rear plate
  obj.startGroup('rear_plate', 'hull_dark_green');
  obj.addShape(box(0, gc + hullH*0.55, -hullL/2 - 0.1, hullW, hullH*0.9, 0.18));

  // Engine deck
  obj.startGroup('engine_deck', 'hull_dark_green');
  obj.addShape(box(0, gc + hullH + 0.02, -1.2, hullW*0.88, 0.06, 2.5));

  // Engine grilles (circular openings at rear)
  obj.startGroup('grille_l', 'hull_dark_green');
  obj.addShape(box(-0.5, gc + hullH + 0.06, -2.0, 0.6, 0.03, 0.7));
  obj.startGroup('grille_r', 'hull_dark_green');
  obj.addShape(box(0.5, gc + hullH + 0.06, -2.0, 0.6, 0.03, 0.7));

  // ─── TURRET ─── (hexagonal "nut" turret, distinctive T-34 1943)
  // Turret ring ~1420mm, turret is small and cramped
  const tBase = gc + hullH + 0.36;
  const tW = 1.50;
  const tH = 0.48;
  const tD = 1.70;

  // Main turret body (wider at front, narrower at rear = hexagonal)
  obj.startGroup('turret_base', 'turret_green');
  obj.addShape(trapezoidBox(0, tBase + tH/2, 0.45, tW, tW*0.78, tD, tD*0.7, tH));

  // Turret cheeks (angled side plates - hexagonal shape)
  obj.startGroup('turret_cheek_l', 'turret_green');
  obj.addShape({
    verts: [
      [-tW/2, tBase, 0.45 + tD*0.3],
      [-tW*0.55, tBase, 0.45 + tD/2 + 0.1],
      [-tW*0.55*0.78/1, tBase + tH, 0.45 + tD*0.7/2 + 0.1],
      [-tW*0.78/2, tBase + tH, 0.45 + tD*0.7*0.3],
      [-tW/2, tBase, 0.45 + tD*0.3 - 0.08],
      [-tW*0.55, tBase, 0.45 + tD/2 + 0.02],
      [-tW*0.55*0.78, tBase + tH, 0.45 + tD*0.7/2 + 0.02],
      [-tW*0.78/2, tBase + tH, 0.45 + tD*0.7*0.3 - 0.08],
    ],
    faces: [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[4,5,1,0],[3,2,6,7]],
    normals: [[-0.5,0,0.866],[-0.5,0,-0.866],[-1,0,0],[0,0,1],[0,-1,0],[0,1,0]]
  });

  // Turret roof
  obj.startGroup('turret_roof', 'turret_green');
  obj.addShape(box(0, tBase + tH + 0.03, 0.45, tW*0.72, 0.06, tD*0.65));

  // Turret rear overhang
  obj.startGroup('turret_rear_ext', 'hull_dark_green');
  obj.addShape(box(0, tBase + tH*0.5, -0.35, tW*0.55, tH*0.65, 0.4));

  // Mantlet (rounded cylindrical front - pig snout style)
  obj.startGroup('mantlet', 'hull_dark_green');
  obj.addShape(cylinder(0, tBase + tH*0.5, 0.45 + tD/2 + 0.1, 0.32, 0.28, 'z', 12));

  // 76mm F-34 barrel
  const barrelLen = 3.2;
  obj.startGroup('barrel', 'barrel_metal');
  obj.addShape(cylinder(0, tBase + tH*0.5, 0.45 + tD/2 + 0.1 + barrelLen/2, 0.05, barrelLen, 'z', 8));

  // Muzzle
  obj.startGroup('muzzle', 'barrel_metal');
  obj.addShape(cylinder(0, tBase + tH*0.5, 0.45 + tD/2 + 0.1 + barrelLen + 0.05, 0.065, 0.12, 'z', 8));

  // Commander's cupola (center-rear of turret)
  obj.startGroup('cupola', 'turret_green');
  obj.addShape(cylinder(0.0, tBase + tH + 0.12, 0.3, 0.22, 0.18, 'z', 10));

  // Periscope
  obj.startGroup('periscope', 'hull_dark_green');
  obj.addShape(box(0.0, tBase + tH + 0.24, 0.4, 0.08, 0.06, 0.08));

  // ─── TRACKS ─── (500mm wide, Christie suspension - 5 large road wheels)
  const trackH = gc * 1.8;
  for (let side = -1; side <= 1; side += 2) {
    const tx = side * (totalW/2);
    const prefix = side < 0 ? 'l' : 'r';

    // Track body
    obj.startGroup(`track_${prefix}`, 'track_metal');
    obj.addShape(box(tx, gc + trackH*0.25, 0, trackW, trackH*0.8, hullL*1.0));

    // Fender (wide, flat - T-34 signature)
    obj.startGroup(`fender_${prefix}`, 'hull_dark_green');
    obj.addShape(box(tx + side*0.05, gc + hullH*0.85, 0.3, trackW + 0.2, 0.04, hullL*0.85));

    // 5 large Christie road wheels (bigger diameter, wider spacing)
    for (let i = 0; i < 5; i++) {
      const zp = -1.9 + i * 0.98;
      obj.startGroup(`wheel_${prefix}_${i}`, 'track_metal');
      obj.addShape(cylinder(tx, gc + 0.40, zp, 0.42, trackW*0.7, 'x', 14));
      // Rubber rim
      obj.startGroup(`rim_${prefix}_${i}`, 'hull_dark_green');
      obj.addShape(cylinder(tx, gc + 0.40, zp, 0.35, trackW*0.75, 'x', 12));
      // Central hub
      obj.startGroup(`hub_${prefix}_${i}`, 'hull_dark_green');
      obj.addShape(cylinder(tx, gc + 0.40, zp, 0.12, trackW*0.8, 'x', 8));
    }

    // Drive sprocket (front-mounted in T-34, rear drive)
    obj.startGroup(`sprocket_${prefix}`, 'track_metal');
    obj.addShape(cylinder(tx, gc + 0.50, -hullL*0.46, 0.22, trackW*0.6, 'x', 10));

    // Idler wheel (front)
    obj.startGroup(`idler_${prefix}`, 'track_metal');
    obj.addShape(cylinder(tx, gc + 0.50, hullL*0.46, 0.24, trackW*0.6, 'x', 10));
  }

  // External fuel tanks (cylindrical, rear hull sides - iconic T-34 feature)
  obj.startGroup('fuel_l', 'hull_dark_green');
  obj.addShape(cylinder(-totalW/2 + 0.05, gc + hullH*0.55, -1.8, 0.18, 1.2, 'z', 8));
  obj.startGroup('fuel_r', 'hull_dark_green');
  obj.addShape(cylinder(totalW/2 - 0.05, gc + hullH*0.55, -1.8, 0.18, 1.2, 'z', 8));

  // Exhaust pipes (V-shaped at rear, left side typical)
  obj.startGroup('exhaust_l', 'hull_dark_green');
  obj.addShape(cylinder(-0.6, gc + hullH + 0.1, -hullL/2 - 0.2, 0.07, 0.4, 'z', 6));
  obj.startGroup('exhaust_r', 'hull_dark_green');
  obj.addShape(cylinder(-0.3, gc + hullH + 0.1, -hullL/2 - 0.2, 0.07, 0.4, 'z', 6));

  // Tow hooks
  obj.startGroup('tow_hook_l', 'barrel_metal');
  obj.addShape(box(-0.8, gc + 0.25, hullL/2 + 0.55, 0.12, 0.08, 0.12));
  obj.startGroup('tow_hook_r', 'barrel_metal');
  obj.addShape(box(0.8, gc + 0.25, hullL/2 + 0.55, 0.12, 0.08, 0.12));

  // Antenna (whip antenna, left rear turret)
  obj.startGroup('antenna', 'barrel_metal');
  obj.addShape(cylinder(-0.5, tBase + tH + 0.6, -0.1, 0.012, 1.3, 'z', 4));

  // Spare track links on glacis
  obj.startGroup('spare_track_1', 'track_metal');
  obj.addShape(box(0.3, gc + hullH*0.85, hullL/2 + 0.2, 0.25, 0.06, 0.12));
  obj.startGroup('spare_track_2', 'track_metal');
  obj.addShape(box(-0.3, gc + hullH*0.85, hullL/2 + 0.2, 0.25, 0.06, 0.12));

  // Log (for self-recovery, mounted on engine deck - common T-34 field modification)
  obj.startGroup('log', 'hull_dark_green');
  obj.addShape(cylinder(0, gc + hullH + 0.14, -0.5, 0.08, 2.0, 'x', 6));

  const mtl = `# T-34 - Soviet standard 4BO green
newmtl hull_green
Ka 0.06 0.09 0.04
Kd 0.18 0.28 0.12
Ks 0.08 0.08 0.06
Ns 20.0
d 1.0

newmtl turret_green
Ka 0.05 0.08 0.04
Kd 0.16 0.26 0.11
Ks 0.06 0.06 0.05
Ns 25.0
d 1.0

newmtl hull_dark_green
Ka 0.04 0.06 0.03
Kd 0.12 0.18 0.08
Ks 0.06 0.06 0.04
Ns 18.0
d 1.0

newmtl barrel_metal
Ka 0.04 0.04 0.04
Kd 0.16 0.16 0.14
Ks 0.25 0.25 0.22
Ns 50.0
d 1.0

newmtl track_metal
Ka 0.03 0.03 0.03
Kd 0.10 0.10 0.09
Ks 0.18 0.18 0.16
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
