#!/usr/bin/env node
/**
 * Generate improved low-poly OBJ + MTL files for Tiger I and T-34 tanks.
 * Features: individual track links, detailed wheels with spokes, proper hull shaping.
 */
const fs = require('fs');
const path = require('path');

function box(cx, cy, cz, w, h, d) {
  const hw = w/2, hh = h/2, hd = d/2;
  return {
    verts: [
      [cx-hw,cy-hh,cz+hd],[cx+hw,cy-hh,cz+hd],
      [cx+hw,cy+hh,cz+hd],[cx-hw,cy+hh,cz+hd],
      [cx-hw,cy-hh,cz-hd],[cx+hw,cy-hh,cz-hd],
      [cx+hw,cy+hh,cz-hd],[cx-hw,cy+hh,cz-hd],
    ],
    faces: [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[4,5,1,0],[3,2,6,7]],
    normals: [[0,0,1],[0,0,-1],[-1,0,0],[1,0,0],[0,-1,0],[0,1,0]]
  };
}

function trapezoidBox(cx, cy, cz, wBot, wTop, dBot, dTop, h) {
  const hwb=wBot/2, hwt=wTop/2, hdb=dBot/2, hdt=dTop/2, hh=h/2;
  return {
    verts: [
      [cx-hwb,cy-hh,cz+hdb],[cx+hwb,cy-hh,cz+hdb],
      [cx+hwt,cy+hh,cz+hdt],[cx-hwt,cy+hh,cz+hdt],
      [cx-hwb,cy-hh,cz-hdb],[cx+hwb,cy-hh,cz-hdb],
      [cx+hwt,cy+hh,cz-hdt],[cx-hwt,cy+hh,cz-hdt],
    ],
    faces: [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[4,5,1,0],[3,2,6,7]],
    normals: [[0,0,1],[0,0,-1],[-1,0,0],[1,0,0],[0,-1,0],[0,1,0]]
  };
}

function cylinder(cx, cy, cz, radius, length, axis, segments) {
  segments = segments || 12;
  const verts = [], faces = [], normals = [];
  const hl = length/2;
  // Side faces
  for (let i = 0; i < segments; i++) {
    const a = (i/segments)*Math.PI*2;
    const na = ((i+1)/segments)*Math.PI*2;
    const c1=Math.cos(a), s1=Math.sin(a);
    const c2=Math.cos(na), s2=Math.sin(na);
    let v;
    if (axis === 'z') {
      v = [[cx+c1*radius,cy+s1*radius,cz-hl],[cx+c2*radius,cy+s2*radius,cz-hl],
           [cx+c2*radius,cy+s2*radius,cz+hl],[cx+c1*radius,cy+s1*radius,cz+hl]];
      normals.push([(c1+c2)/2,(s1+s2)/2,0]);
    } else {
      v = [[cx-hl,cy+c1*radius,cz+s1*radius],[cx-hl,cy+c2*radius,cz+s2*radius],
           [cx+hl,cy+c2*radius,cz+s2*radius],[cx+hl,cy+c1*radius,cz+s1*radius]];
      normals.push([0,(c1+c2)/2,(s1+s2)/2]);
    }
    const base = verts.length;
    verts.push(...v);
    faces.push([base,base+1,base+2,base+3]);
  }
  // End caps
  const capVerts1 = [], capVerts2 = [];
  for (let i = 0; i < segments; i++) {
    const a = (i/segments)*Math.PI*2;
    const c1=Math.cos(a), s1=Math.sin(a);
    if (axis === 'z') {
      capVerts1.push([cx+c1*radius,cy+s1*radius,cz-hl]);
      capVerts2.push([cx+c1*radius,cy+s1*radius,cz+hl]);
    } else {
      capVerts1.push([cx-hl,cy+c1*radius,cz+s1*radius]);
      capVerts2.push([cx+hl,cy+c1*radius,cz+s1*radius]);
    }
  }
  const b1 = verts.length;
  verts.push(...capVerts1);
  const n1 = normals.length;
  if (axis === 'z') normals.push([0,0,-1]); else normals.push([-1,0,0]);
  for (let i = 1; i < segments-1; i++) faces.push([b1,b1+i,b1+i+1]);

  const b2 = verts.length;
  verts.push(...capVerts2);
  const n2 = normals.length;
  if (axis === 'z') normals.push([0,0,1]); else normals.push([1,0,0]);
  for (let i = 1; i < segments-1; i++) faces.push([b2,b2+i+1,b2+i]);

  return { verts, faces, normals };
}

/**
 * Generate track links along a path around the wheel set.
 * Path: bottom straight → front sprocket arc → top straight → rear idler arc
 */
function generateTrackLinks(cx, bottomY, frontZ, rearZ, sprocketY, sprocketR, idlerY, idlerR, topY, trackWidth, linkH, linkD, linkCount) {
  const shapes = [];

  // Calculate path points
  const pathPoints = [];

  // Bottom straight: rear to front at ground level
  const bottomLen = frontZ - rearZ;
  const bottomSegments = Math.round(linkCount * 0.35);
  for (let i = 0; i <= bottomSegments; i++) {
    const t = i / bottomSegments;
    pathPoints.push({ y: bottomY, z: rearZ + t * bottomLen, ny: -1, nz: 0 });
  }

  // Front sprocket arc (bottom to top)
  const arcSegments = Math.round(linkCount * 0.15);
  for (let i = 1; i <= arcSegments; i++) {
    const t = i / arcSegments;
    const angle = -Math.PI/2 + t * Math.PI;
    pathPoints.push({
      y: sprocketY + Math.sin(angle) * sprocketR,
      z: frontZ + Math.cos(angle) * sprocketR * 0.4,
      ny: Math.sin(angle), nz: Math.cos(angle)
    });
  }

  // Top straight: front to rear at top height
  const topLen = frontZ - rearZ;
  const topSegments = Math.round(linkCount * 0.35);
  for (let i = 1; i <= topSegments; i++) {
    const t = i / topSegments;
    pathPoints.push({ y: topY, z: frontZ - t * topLen, ny: 1, nz: 0 });
  }

  // Rear idler arc (top to bottom)
  for (let i = 1; i < arcSegments; i++) {
    const t = i / arcSegments;
    const angle = Math.PI/2 + t * Math.PI;
    pathPoints.push({
      y: idlerY + Math.sin(angle) * idlerR,
      z: rearZ + Math.cos(angle) * idlerR * 0.4,
      ny: Math.sin(angle), nz: Math.cos(angle)
    });
  }

  // Generate link boxes along path
  for (let i = 0; i < pathPoints.length - 1; i++) {
    const p = pathPoints[i];
    const pn = pathPoints[i + 1];
    const midY = (p.y + pn.y) / 2;
    const midZ = (p.z + pn.z) / 2;
    const segLen = Math.sqrt((pn.y - p.y)**2 + (pn.z - p.z)**2);
    shapes.push(box(cx, midY, midZ, trackWidth, linkH, Math.max(segLen * 0.95, linkD)));
  }

  return shapes;
}

class ObjBuilder {
  constructor() { this.vertices=[]; this.normals=[]; this.groups=[]; this.currentGroup=null; }
  startGroup(name,material) {
    this.currentGroup = { name, material, faces:[] };
    this.groups.push(this.currentGroup);
  }
  addShape(shape) {
    const vOff=this.vertices.length, nOff=this.normals.length;
    for (const v of shape.verts) this.vertices.push(v);
    for (const n of shape.normals) this.normals.push(n);
    for (let fi=0; fi<shape.faces.length; fi++) {
      const f=shape.faces[fi];
      const ni=Math.min(fi, shape.normals.length-1);
      this.currentGroup.faces.push(f.map(vi=>[vi+vOff+1, ni+nOff+1]));
    }
  }
  toOBJ(mtlFile) {
    let out=`# Auto-generated tank model\nmtllib ${mtlFile}\n\n`;
    for (const v of this.vertices) out+=`v ${v[0].toFixed(4)} ${v[1].toFixed(4)} ${v[2].toFixed(4)}\n`;
    out+='\n';
    for (const n of this.normals) out+=`vn ${n[0].toFixed(4)} ${n[1].toFixed(4)} ${n[2].toFixed(4)}\n`;
    out+='\n';
    for (const g of this.groups) {
      out+=`g ${g.name}\nusemtl ${g.material}\n`;
      for (const f of g.faces) out+='f '+f.map(([vi,ni])=>`${vi}//${ni}`).join(' ')+'\n';
      out+='\n';
    }
    return out;
  }
}

// ─────────────── TIGER I ───────────────
function generateTiger1() {
  const obj = new ObjBuilder();
  const gc=0.47, hullH=0.95, hullW=3.20, sponW=3.71, hullL=6.30, trackW=0.72;

  // Hull
  obj.startGroup('hull_lower','hull_dunkelgelb');
  obj.addShape(box(0,gc+hullH/2,0,hullW,hullH,hullL));

  obj.startGroup('sponson_l','hull_dunkelgelb');
  obj.addShape(box(-(hullW/2+(sponW-hullW)/4),gc+hullH*0.7,0,(sponW-hullW)/2,hullH*0.4,hullL*0.92));
  obj.startGroup('sponson_r','hull_dunkelgelb');
  obj.addShape(box((hullW/2+(sponW-hullW)/4),gc+hullH*0.7,0,(sponW-hullW)/2,hullH*0.4,hullL*0.92));

  obj.startGroup('hull_deck','hull_dunkelgelb');
  obj.addShape(box(0,gc+hullH+0.06,0.3,sponW*0.85,0.12,hullL*0.6));

  obj.startGroup('glacis','hull_dunkelgelb');
  obj.addShape(trapezoidBox(0,gc+hullH*0.55,hullL/2+0.15,hullW,hullW*0.95,0.5,0.3,hullH*0.9));

  obj.startGroup('lower_glacis','hull_dark');
  obj.addShape(trapezoidBox(0,gc*0.8,hullL/2+0.3,hullW*0.95,hullW*0.85,0.25,0.15,gc*1.1));

  obj.startGroup('rear_plate','hull_dark');
  obj.addShape(box(0,gc+hullH*0.5,-hullL/2-0.12,hullW,hullH,0.2));

  obj.startGroup('engine_deck','hull_dark');
  obj.addShape(box(0,gc+hullH+0.04,-1.6,sponW*0.82,0.06,2.6));
  obj.startGroup('grille_l','hull_dark');
  obj.addShape(box(-0.85,gc+hullH+0.08,-1.6,0.7,0.03,1.8));
  obj.startGroup('grille_r','hull_dark');
  obj.addShape(box(0.85,gc+hullH+0.08,-1.6,0.7,0.03,1.8));

  // Turret
  const tBase=gc+hullH+0.12, tW=2.05, tH=0.58, tD=2.30;
  obj.startGroup('turret_base','turret_dunkelgelb');
  obj.addShape(trapezoidBox(0,tBase+tH/2,0.35,tW,tW*0.92,tD,tD*0.9,tH));
  obj.startGroup('turret_roof','turret_dunkelgelb');
  obj.addShape(box(0,tBase+tH+0.04,0.35,tW*0.88,0.08,tD*0.88));
  obj.startGroup('turret_rear','hull_dark');
  obj.addShape(box(0,tBase+tH*0.5,-0.95,tW*0.7,tH*0.7,0.55));
  obj.startGroup('mantlet','hull_dark');
  obj.addShape(trapezoidBox(0,tBase+tH*0.5,1.55,1.1,0.95,0.35,0.25,tH*0.85));

  // 88mm barrel
  obj.startGroup('barrel','barrel_metal');
  obj.addShape(cylinder(0,tBase+tH*0.5,1.55+2.4,0.06,4.8,'z',10));
  obj.startGroup('muzzle_brake','barrel_metal');
  obj.addShape(cylinder(0,tBase+tH*0.5,6.05,0.10,0.22,'z',10));

  // Cupola & hatches
  obj.startGroup('cupola','turret_dunkelgelb');
  obj.addShape(cylinder(-0.45,tBase+tH+0.15,0.0,0.25,0.22,'z',12));
  obj.startGroup('cupola_hatch','hull_dark');
  obj.addShape(cylinder(-0.45,tBase+tH+0.28,0.0,0.18,0.04,'z',10));
  obj.startGroup('loader_hatch','hull_dark');
  obj.addShape(cylinder(0.4,tBase+tH+0.1,0.15,0.22,0.04,'z',8));

  // MG
  obj.startGroup('mg_port','barrel_metal');
  obj.addShape(cylinder(0.35,tBase+tH*0.35,1.6,0.03,0.15,'z',6));

  // Tracks with individual links
  const sprocketZ = hullL*0.48, idlerZ = -hullL*0.48;
  const sprocketY = gc+0.55, idlerY = gc+0.55;
  const sprocketR = 0.28, idlerR = 0.30;
  const trackTopY = gc+1.0;

  for (let side=-1; side<=1; side+=2) {
    const tx=side*(sponW/2+trackW/2);
    const prefix=side<0?'l':'r';

    // Track links (individual segments wrapping around)
    obj.startGroup(`track_links_${prefix}`,'track_metal');
    const links = generateTrackLinks(
      tx, gc*0.65, sprocketZ, idlerZ,
      sprocketY, sprocketR, idlerY, idlerR,
      trackTopY, trackW, 0.06, 0.14, 80
    );
    links.forEach(s => obj.addShape(s));

    // Track guide horns (center rail)
    obj.startGroup(`track_guide_${prefix}`,'track_metal');
    obj.addShape(box(tx,gc*0.55,0,trackW*0.3,0.05,hullL*0.95));
    obj.addShape(box(tx,trackTopY+0.03,0,trackW*0.3,0.05,hullL*0.85));

    // Fenders
    obj.startGroup(`fender_${prefix}`,'hull_dunkelgelb');
    obj.addShape(box(tx,gc+hullH*0.85,0,trackW+0.08,0.05,hullL*0.95));

    // 8 road wheels with inner detail
    for (let i=0; i<8; i++) {
      const zp=-2.6+i*0.72;
      // Outer wheel (rubber tire)
      obj.startGroup(`wheel_${prefix}_${i}`,'wheel_rubber');
      obj.addShape(cylinder(tx,gc+0.38,zp,0.40,trackW*0.55,'x',14));
      // Inner disc
      obj.startGroup(`disc_${prefix}_${i}`,'hull_dunkelgelb');
      obj.addShape(cylinder(tx+side*trackW*0.15,gc+0.38,zp,0.32,0.06,'x',12));
      // Hub bolt pattern
      obj.startGroup(`hub_${prefix}_${i}`,'hull_dark');
      obj.addShape(cylinder(tx,gc+0.38,zp,0.12,trackW*0.6,'x',8));
    }

    // Sprocket (toothed drive wheel)
    obj.startGroup(`sprocket_${prefix}`,'track_metal');
    obj.addShape(cylinder(tx,sprocketY,sprocketZ,sprocketR,trackW*0.5,'x',12));
    obj.startGroup(`sprocket_hub_${prefix}`,'hull_dark');
    obj.addShape(cylinder(tx,sprocketY,sprocketZ,0.12,trackW*0.55,'x',8));

    // Idler
    obj.startGroup(`idler_${prefix}`,'track_metal');
    obj.addShape(cylinder(tx,idlerY,idlerZ,idlerR,trackW*0.5,'x',12));
    obj.startGroup(`idler_hub_${prefix}`,'hull_dark');
    obj.addShape(cylinder(tx,idlerY,idlerZ,0.12,trackW*0.55,'x',8));

    // Return rollers (3)
    for (let r=0; r<3; r++) {
      const rz=-1.2+r*1.2;
      obj.startGroup(`return_${prefix}_${r}`,'track_metal');
      obj.addShape(cylinder(tx,trackTopY,rz,0.12,trackW*0.4,'x',8));
    }
  }

  // Details
  obj.startGroup('exhaust_l','hull_dark');
  obj.addShape(cylinder(-0.8,gc+hullH+0.12,-hullL/2-0.25,0.08,0.5,'z',6));
  obj.startGroup('exhaust_r','hull_dark');
  obj.addShape(cylinder(0.8,gc+hullH+0.12,-hullL/2-0.25,0.08,0.5,'z',6));
  obj.startGroup('tow_l','barrel_metal');
  obj.addShape(box(-1.2,gc+0.3,hullL/2+0.2,0.15,0.12,0.12));
  obj.startGroup('tow_r','barrel_metal');
  obj.addShape(box(1.2,gc+0.3,hullL/2+0.2,0.15,0.12,0.12));
  obj.startGroup('antenna','barrel_metal');
  obj.addShape(cylinder(-0.7,tBase+tH+0.7,-0.6,0.015,1.2,'z',4));
  obj.startGroup('toolbox_l','hull_dark');
  obj.addShape(box(-sponW/2-0.08,gc+hullH*0.55,1.5,0.12,0.25,0.8));
  obj.startGroup('toolbox_r','hull_dark');
  obj.addShape(box(sponW/2+0.08,gc+hullH*0.55,1.5,0.12,0.25,0.8));

  const mtl = `# Tiger I - Dunkelgelb (RAL 7028)
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

newmtl wheel_rubber
Ka 0.02 0.02 0.02
Kd 0.08 0.08 0.07
Ks 0.05 0.05 0.04
Ns 15.0
d 1.0
`;

  return { obj: obj.toOBJ('tiger1.mtl'), mtl };
}

// ─────────────── T-34/76 ───────────────
function generateT34() {
  const obj = new ObjBuilder();
  const gc=0.40, hullH=0.75, hullW=2.60, totalW=3.00, hullL=5.50, trackW=0.50;

  // Hull
  obj.startGroup('hull_lower','hull_green');
  obj.addShape(box(0,gc+hullH/2,0,hullW,hullH,hullL));

  obj.startGroup('hull_upper','hull_green');
  obj.addShape(trapezoidBox(0,gc+hullH+0.18,0.2,hullW,hullW*0.85,hullL*0.75,hullL*0.70,0.36));

  // 60° glacis
  obj.startGroup('glacis_upper','hull_green');
  obj.addShape({
    verts: [
      [-hullW/2,gc+0.1,hullL/2+0.9],[hullW/2,gc+0.1,hullL/2+0.9],
      [hullW*0.42,gc+hullH+0.36,hullL/2-0.1],[-hullW*0.42,gc+hullH+0.36,hullL/2-0.1],
      [-hullW/2,gc+0.1,hullL/2+0.84],[hullW/2,gc+0.1,hullL/2+0.84],
      [hullW*0.42,gc+hullH+0.36,hullL/2-0.16],[-hullW*0.42,gc+hullH+0.36,hullL/2-0.16],
    ],
    faces: [[0,1,2,3],[5,4,7,6],[4,0,3,7],[1,5,6,2],[4,5,1,0],[3,2,6,7]],
    normals: [[0,0.5,0.866],[0,0.5,-0.866],[-0.3,0.5,0.866],[0.3,0.5,0.866],[0,-1,0],[0,1,0]]
  });

  obj.startGroup('lower_glacis','hull_green');
  obj.addShape(trapezoidBox(0,gc*0.6,hullL/2+0.5,hullW*0.9,hullW*0.7,0.3,0.15,gc));

  obj.startGroup('driver_hatch','hull_dark_green');
  obj.addShape(box(-0.55,gc+hullH+0.38,hullL/2-0.3,0.5,0.06,0.5));

  obj.startGroup('mg_ball','hull_dark_green');
  obj.addShape(cylinder(0.55,gc+hullH*0.6,hullL/2+0.5,0.1,0.15,'z',8));

  obj.startGroup('rear_plate','hull_dark_green');
  obj.addShape(box(0,gc+hullH*0.55,-hullL/2-0.1,hullW,hullH*0.9,0.18));

  obj.startGroup('engine_deck','hull_dark_green');
  obj.addShape(box(0,gc+hullH+0.02,-1.2,hullW*0.88,0.06,2.5));
  obj.startGroup('grille_l','hull_dark_green');
  obj.addShape(box(-0.5,gc+hullH+0.06,-2.0,0.6,0.03,0.7));
  obj.startGroup('grille_r','hull_dark_green');
  obj.addShape(box(0.5,gc+hullH+0.06,-2.0,0.6,0.03,0.7));

  // Turret
  const tBase=gc+hullH+0.36, tW=1.50, tH=0.48, tD=1.70;
  obj.startGroup('turret_base','turret_green');
  obj.addShape(trapezoidBox(0,tBase+tH/2,0.45,tW,tW*0.78,tD,tD*0.7,tH));
  obj.startGroup('turret_roof','turret_green');
  obj.addShape(box(0,tBase+tH+0.03,0.45,tW*0.72,0.06,tD*0.65));
  obj.startGroup('turret_rear_ext','hull_dark_green');
  obj.addShape(box(0,tBase+tH*0.5,-0.35,tW*0.55,tH*0.65,0.4));
  obj.startGroup('mantlet','hull_dark_green');
  obj.addShape(cylinder(0,tBase+tH*0.5,0.45+tD/2+0.1,0.32,0.28,'z',12));

  // 76mm barrel
  obj.startGroup('barrel','barrel_metal');
  obj.addShape(cylinder(0,tBase+tH*0.5,0.45+tD/2+0.1+1.6,0.05,3.2,'z',8));
  obj.startGroup('muzzle','barrel_metal');
  obj.addShape(cylinder(0,tBase+tH*0.5,0.45+tD/2+0.1+3.2+0.05,0.065,0.12,'z',8));

  obj.startGroup('cupola','turret_green');
  obj.addShape(cylinder(0.0,tBase+tH+0.12,0.3,0.22,0.18,'z',10));
  obj.startGroup('periscope','hull_dark_green');
  obj.addShape(box(0.0,tBase+tH+0.24,0.4,0.08,0.06,0.08));

  // Tracks with links
  const sprocketZ=-hullL*0.46, idlerZ=hullL*0.46;
  const sprocketY=gc+0.50, idlerY=gc+0.50;
  const sprocketR=0.22, idlerR=0.24;
  const trackTopY=gc+0.85;

  for (let side=-1; side<=1; side+=2) {
    const tx=side*(totalW/2);
    const prefix=side<0?'l':'r';

    // Track links
    obj.startGroup(`track_links_${prefix}`,'track_metal');
    const links = generateTrackLinks(
      tx, gc*0.55, idlerZ, sprocketZ,
      idlerY, idlerR, sprocketY, sprocketR,
      trackTopY, trackW, 0.05, 0.12, 70
    );
    links.forEach(s => obj.addShape(s));

    // Track guide
    obj.startGroup(`track_guide_${prefix}`,'track_metal');
    obj.addShape(box(tx,gc*0.45,0,trackW*0.3,0.04,hullL*0.88));
    obj.addShape(box(tx,trackTopY+0.02,0,trackW*0.3,0.04,hullL*0.82));

    // Fenders
    obj.startGroup(`fender_${prefix}`,'hull_dark_green');
    obj.addShape(box(tx+side*0.05,gc+hullH*0.85,0.3,trackW+0.2,0.04,hullL*0.85));

    // 5 Christie road wheels
    for (let i=0; i<5; i++) {
      const zp=-1.9+i*0.98;
      obj.startGroup(`wheel_outer_${prefix}_${i}`,'wheel_rubber');
      obj.addShape(cylinder(tx,gc+0.40,zp,0.42,trackW*0.6,'x',16));
      obj.startGroup(`wheel_inner_${prefix}_${i}`,'hull_green');
      obj.addShape(cylinder(tx+side*trackW*0.12,gc+0.40,zp,0.34,0.06,'x',14));
      obj.startGroup(`hub_${prefix}_${i}`,'hull_dark_green');
      obj.addShape(cylinder(tx,gc+0.40,zp,0.10,trackW*0.65,'x',8));
    }

    // Sprocket & idler
    obj.startGroup(`sprocket_${prefix}`,'track_metal');
    obj.addShape(cylinder(tx,sprocketY,sprocketZ,sprocketR,trackW*0.5,'x',12));
    obj.startGroup(`idler_${prefix}`,'track_metal');
    obj.addShape(cylinder(tx,idlerY,idlerZ,idlerR,trackW*0.5,'x',12));
  }

  // Details
  obj.startGroup('fuel_l','hull_dark_green');
  obj.addShape(cylinder(-totalW/2+0.05,gc+hullH*0.55,-1.8,0.18,1.2,'z',8));
  obj.startGroup('fuel_r','hull_dark_green');
  obj.addShape(cylinder(totalW/2-0.05,gc+hullH*0.55,-1.8,0.18,1.2,'z',8));
  obj.startGroup('exhaust_l','hull_dark_green');
  obj.addShape(cylinder(-0.6,gc+hullH+0.1,-hullL/2-0.2,0.07,0.4,'z',6));
  obj.startGroup('exhaust_r','hull_dark_green');
  obj.addShape(cylinder(-0.3,gc+hullH+0.1,-hullL/2-0.2,0.07,0.4,'z',6));
  obj.startGroup('tow_hook_l','barrel_metal');
  obj.addShape(box(-0.8,gc+0.25,hullL/2+0.55,0.12,0.08,0.12));
  obj.startGroup('tow_hook_r','barrel_metal');
  obj.addShape(box(0.8,gc+0.25,hullL/2+0.55,0.12,0.08,0.12));
  obj.startGroup('antenna','barrel_metal');
  obj.addShape(cylinder(-0.5,tBase+tH+0.6,-0.1,0.012,1.3,'z',4));
  obj.startGroup('spare_track_1','track_metal');
  obj.addShape(box(0.3,gc+hullH*0.85,hullL/2+0.2,0.25,0.06,0.12));
  obj.startGroup('spare_track_2','track_metal');
  obj.addShape(box(-0.3,gc+hullH*0.85,hullL/2+0.2,0.25,0.06,0.12));
  obj.startGroup('log','hull_dark_green');
  obj.addShape(cylinder(0,gc+hullH+0.14,-0.5,0.08,2.0,'x',6));

  const mtl = `# T-34 - Soviet 4BO green
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

newmtl wheel_rubber
Ka 0.02 0.02 0.02
Kd 0.08 0.08 0.07
Ks 0.05 0.05 0.04
Ns 15.0
d 1.0
`;

  return { obj: obj.toOBJ('t34.mtl'), mtl };
}

const tiger1 = generateTiger1();
const tiger1Dir = path.join(__dirname,'..','public','models','tiger1');
fs.mkdirSync(tiger1Dir,{recursive:true});
fs.writeFileSync(path.join(tiger1Dir,'tiger1.obj'),tiger1.obj);
fs.writeFileSync(path.join(tiger1Dir,'tiger1.mtl'),tiger1.mtl);
console.log(`Tiger I: ${tiger1.obj.split('\n').length} lines`);

const t34 = generateT34();
const t34Dir = path.join(__dirname,'..','public','models','t34');
fs.mkdirSync(t34Dir,{recursive:true});
fs.writeFileSync(path.join(t34Dir,'t34.obj'),t34.obj);
fs.writeFileSync(path.join(t34Dir,'t34.mtl'),t34.mtl);
console.log(`T-34: ${t34.obj.split('\n').length} lines`);
