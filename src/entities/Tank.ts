import { Scene, Mesh, MeshBuilder, TransformNode, Vector3, PBRMetallicRoughnessMaterial, Color3 } from '@babylonjs/core';
import { MathUtils } from '../utils/MathUtils';

export interface TankConfig {
  name: string;
  type: 'light' | 'medium' | 'heavy' | 'destroyer';
  maxHealth: number;
  speed: number;
  turnSpeed: number;
  turretSpeed: number;
  damage: number;
  reloadTime: number;
  armor: number;
  bodyColor: Color3;
  bodyScale: Vector3;
}

export const TANK_CONFIGS: Record<string, TankConfig> = {
  light: {
    name: '轻型坦克',
    type: 'light',
    maxHealth: 80,
    speed: 10,
    turnSpeed: 2.5,
    turretSpeed: 3,
    damage: 8,
    reloadTime: 1.8,
    armor: 3,
    bodyColor: new Color3(0.3, 0.45, 0.25),
    bodyScale: new Vector3(1.6, 0.5, 2.4),
  },
  medium: {
    name: '中型坦克',
    type: 'medium',
    maxHealth: 150,
    speed: 8,
    turnSpeed: 2,
    turretSpeed: 2.5,
    damage: 30,
    reloadTime: 1.5,
    armor: 8,
    bodyColor: new Color3(0.35, 0.38, 0.22),
    bodyScale: new Vector3(1.8, 0.6, 2.8),
  },
  heavy: {
    name: '重型坦克',
    type: 'heavy',
    maxHealth: 180,
    speed: 5,
    turnSpeed: 1.2,
    turretSpeed: 1.5,
    damage: 12,
    reloadTime: 5,
    armor: 18,
    bodyColor: new Color3(0.28, 0.3, 0.2),
    bodyScale: new Vector3(2.2, 0.7, 3.2),
  },
  destroyer: {
    name: '坦克歼击车',
    type: 'destroyer',
    maxHealth: 90,
    speed: 6,
    turnSpeed: 1.5,
    turretSpeed: 1,
    damage: 15,
    reloadTime: 6,
    armor: 10,
    bodyColor: new Color3(0.25, 0.28, 0.18),
    bodyScale: new Vector3(2, 0.55, 3.0),
  },
};

export class Tank {
  root: TransformNode;
  body!: Mesh;
  turret!: TransformNode;
  barrel!: Mesh;
  turretMesh!: Mesh;
  firePoint!: TransformNode;

  config: TankConfig;
  health: number;
  reloadTimer = 0;
  isAlive = true;
  velocity = 0;
  /** 相对 `getHeightAt` 的 root Y 修正；外部模型贴地后非 0，每帧与地形同步 */
  terrainYOffset = 0;

  protected scene: Scene;

  private static nextId = 0;
  readonly tankId: string;

  constructor(scene: Scene, config: TankConfig, position: Vector3) {
    this.scene = scene;
    this.config = config;
    this.health = config.maxHealth;
    this.tankId = 'tank_' + Tank.nextId++;

    this.root = new TransformNode(this.tankId, scene);
    this.root.position = position.clone();

    this.buildModel();
  }

  private createMat(name: string, color: Color3, metallic: number, roughness: number): PBRMetallicRoughnessMaterial {
    const mat = new PBRMetallicRoughnessMaterial(name, this.scene);
    mat.baseColor = color;
    mat.metallic = metallic;
    mat.roughness = roughness;
    return mat;
  }

  private buildModel(): void {
    const scene = this.scene;
    const c = this.config;
    const s = c.bodyScale;

    const bodyMat = this.createMat('bodyMat_' + c.name, c.bodyColor, 0.65, 0.55);
    const darkMat = this.createMat('darkMat_' + c.name, c.bodyColor.scale(0.6), 0.8, 0.65);
    const trackMat = this.createMat('trackMat_' + c.name, new Color3(0.1, 0.1, 0.08), 0.85, 0.7);
    const accentMat = this.createMat('accentMat_' + c.name, c.bodyColor.scale(0.75), 0.7, 0.5);

    const baseY = 0.25;

    // --- HULL ---
    const hullH = s.y * 0.7;
    this.body = MeshBuilder.CreateBox('hull', {
      width: s.x, height: hullH, depth: s.z,
    }, scene);
    this.body.material = bodyMat;
    this.body.parent = this.root;
    this.body.position.y = baseY + hullH / 2;

    const upperH = s.y * 0.35;
    const upperPlate = MeshBuilder.CreateBox('upperHull', {
      width: s.x * 0.92, height: upperH, depth: s.z * 0.85,
    }, scene);
    upperPlate.material = bodyMat;
    upperPlate.parent = this.root;
    upperPlate.position.set(0, baseY + hullH + upperH / 2, -s.z * 0.04);

    const glacis = MeshBuilder.CreateBox('glacis', {
      width: s.x * 0.88, height: s.y * 0.45, depth: s.z * 0.22,
    }, scene);
    glacis.material = accentMat;
    glacis.parent = this.root;
    glacis.position.set(0, baseY + hullH * 0.6, s.z * 0.45);
    glacis.rotation.x = -0.45;

    const rearPlate = MeshBuilder.CreateBox('rear', {
      width: s.x * 0.8, height: hullH * 0.7, depth: 0.12,
    }, scene);
    rearPlate.material = darkMat;
    rearPlate.parent = this.root;
    rearPlate.position.set(0, baseY + hullH * 0.5, -s.z * 0.52);

    // fenders
    [-1, 1].forEach((side) => {
      const fender = MeshBuilder.CreateBox('fender', {
        width: 0.12, height: 0.06, depth: s.z * 1.02,
      }, scene);
      fender.material = darkMat;
      fender.parent = this.root;
      fender.position.set(side * s.x * 0.52, baseY + hullH + 0.03, 0);
    });

    // --- TRACKS ---
    const trackW = 0.35;
    const trackH = s.y * 0.65;
    [-1, 1].forEach((side) => {
      const trackOuter = MeshBuilder.CreateBox('trackOuter', {
        width: trackW, height: trackH, depth: s.z * 1.08,
      }, scene);
      trackOuter.material = trackMat;
      trackOuter.parent = this.root;
      trackOuter.position.set(side * (s.x / 2 + trackW / 2), baseY + trackH / 2, 0);

      const skirtH = trackH * 0.55;
      const skirt = MeshBuilder.CreateBox('skirt', {
        width: 0.06, height: skirtH, depth: s.z * 0.9,
      }, scene);
      skirt.material = accentMat;
      skirt.parent = this.root;
      skirt.position.set(side * (s.x / 2 + trackW + 0.03), baseY + trackH - skirtH / 2, 0);

      const wheelCount = 5;
      for (let i = 0; i < wheelCount; i++) {
        const isEnd = i === 0 || i === wheelCount - 1;
        const diam = isEnd ? trackH * 0.55 : trackH * 0.65;
        const wheel = MeshBuilder.CreateCylinder('wheel', {
          diameter: diam, height: trackW * 0.7, tessellation: 14,
        }, scene);
        wheel.material = trackMat;
        wheel.rotation.z = Math.PI / 2;
        wheel.parent = this.root;
        const zPos = -s.z * 0.5 + s.z * (i + 0.5) / wheelCount;
        wheel.position.set(side * (s.x / 2 + trackW / 2), baseY + diam * 0.36, zPos);

        const hub = MeshBuilder.CreateCylinder('hub', {
          diameter: diam * 0.35, height: trackW * 0.75, tessellation: 8,
        }, scene);
        hub.material = darkMat;
        hub.rotation.z = Math.PI / 2;
        hub.parent = this.root;
        hub.position.set(side * (s.x / 2 + trackW * 0.7), baseY + diam * 0.36, zPos);
      }

      const sprocketD = trackH * 0.6;
      const sprocket = MeshBuilder.CreateCylinder('sprocket', {
        diameter: sprocketD, height: trackW * 0.6, tessellation: 10,
      }, scene);
      sprocket.material = accentMat;
      sprocket.rotation.z = Math.PI / 2;
      sprocket.parent = this.root;
      sprocket.position.set(side * (s.x / 2 + trackW / 2), baseY + sprocketD * 0.45, s.z * 0.55);
    });

    // --- TURRET ---
    this.turret = new TransformNode('turretPivot', scene);
    this.turret.parent = this.root;
    this.turret.position.y = baseY + hullH + upperH;

    const turretMat = this.createMat('turretMat_' + c.name, c.bodyColor.scale(0.88), 0.72, 0.48);

    const isDestroyer = c.type === 'destroyer';
    const tw = isDestroyer ? s.x * 0.82 : s.x * 0.62;
    const th = isDestroyer ? 0.32 : 0.45;
    const td = isDestroyer ? s.z * 0.42 : s.z * 0.36;

    this.turretMesh = MeshBuilder.CreateBox('turretBase', {
      width: tw, height: th, depth: td,
    }, scene);
    this.turretMesh.material = turretMat;
    this.turretMesh.parent = this.turret;
    this.turretMesh.position.y = th / 2;

    if (!isDestroyer) {
      const turretTop = MeshBuilder.CreateBox('turretTop', {
        width: tw * 0.85, height: th * 0.45, depth: td * 0.9,
      }, scene);
      turretTop.material = turretMat;
      turretTop.parent = this.turret;
      turretTop.position.set(0, th + th * 0.225, -td * 0.05);

      const mantlet = MeshBuilder.CreateCylinder('mantlet', {
        diameter: th * 1.6, height: tw * 0.5, tessellation: 16,
      }, scene);
      mantlet.material = accentMat;
      mantlet.rotation.z = Math.PI / 2;
      mantlet.parent = this.turret;
      mantlet.position.set(0, th * 0.55, td * 0.48);

      const cupola = MeshBuilder.CreateCylinder('cupola', {
        diameterTop: tw * 0.25, diameterBottom: tw * 0.3,
        height: 0.18, tessellation: 14,
      }, scene);
      cupola.material = accentMat;
      cupola.parent = this.turret;
      cupola.position.set(-tw * 0.18, th + th * 0.45 + 0.09, -td * 0.1);

      const hatch = MeshBuilder.CreateCylinder('hatch', {
        diameter: tw * 0.2, height: 0.04, tessellation: 12,
      }, scene);
      hatch.material = darkMat;
      hatch.parent = this.turret;
      hatch.position.set(-tw * 0.18, th + th * 0.45 + 0.2, -td * 0.1);
    }

    const turretRear = MeshBuilder.CreateBox('turretRear', {
      width: tw * 0.7, height: th * 0.65, depth: td * 0.35,
    }, scene);
    turretRear.material = darkMat;
    turretRear.parent = this.turret;
    turretRear.position.set(0, th * 0.4, -td * 0.55 - td * 0.15);

    // --- BARREL ---
    const barrelMat = this.createMat('barrelMat_' + c.name, new Color3(0.18, 0.2, 0.16), 0.9, 0.3);

    const barrelLen = isDestroyer ? s.z * 0.85 : s.z * 0.65;
    const barrelDBot = isDestroyer ? 0.18 : 0.14;
    const barrelDTop = isDestroyer ? 0.14 : 0.1;

    this.barrel = MeshBuilder.CreateCylinder('barrel', {
      diameterTop: barrelDTop, diameterBottom: barrelDBot,
      height: barrelLen, tessellation: 14,
    }, scene);
    this.barrel.material = barrelMat;
    this.barrel.rotation.x = Math.PI / 2;
    this.barrel.parent = this.turret;
    this.barrel.position.set(0, th * 0.55, barrelLen / 2 + td * 0.48);

    const muzzleD = barrelDTop * 1.5;
    const muzzle = MeshBuilder.CreateCylinder('muzzleBrake', {
      diameterTop: muzzleD, diameterBottom: muzzleD * 1.15,
      height: barrelLen * 0.12, tessellation: 14,
    }, scene);
    muzzle.material = barrelMat;
    muzzle.rotation.x = Math.PI / 2;
    muzzle.parent = this.turret;
    muzzle.position.set(0, th * 0.55, barrelLen + td * 0.48 - barrelLen * 0.03);

    const bore = MeshBuilder.CreateCylinder('bore', {
      diameter: barrelDTop * 0.7, height: 0.05, tessellation: 10,
    }, scene);
    bore.material = this.createMat('boreMat', new Color3(0.05, 0.05, 0.05), 0.1, 0.9);
    bore.rotation.x = Math.PI / 2;
    bore.parent = this.turret;
    bore.position.set(0, th * 0.55, barrelLen + td * 0.48 + barrelLen * 0.04);

    this.firePoint = new TransformNode('firePoint', scene);
    this.firePoint.parent = this.turret;
    this.firePoint.position.set(0, th * 0.55, barrelLen + td * 0.48 + 0.3);

    // --- DETAILS ---
    const antenna = MeshBuilder.CreateCylinder('antenna', {
      diameterTop: 0.01, diameterBottom: 0.02, height: 0.9, tessellation: 6,
    }, scene);
    antenna.material = darkMat;
    antenna.parent = this.root;
    antenna.position.set(s.x * 0.35, baseY + hullH + upperH + 0.45, -s.z * 0.35);

    [-1, 1].forEach((side) => {
      const toolBox = MeshBuilder.CreateBox('toolBox', {
        width: 0.2, height: 0.12, depth: 0.45,
      }, scene);
      toolBox.material = darkMat;
      toolBox.parent = this.root;
      toolBox.position.set(side * (s.x * 0.5 + 0.1), baseY + hullH + 0.06, -s.z * 0.2);
    });

    if (c.type === 'heavy') {
      [-1, 1].forEach((side) => {
        for (let i = 0; i < 3; i++) {
          const plate = MeshBuilder.CreateBox('sideArmor', {
            width: 0.05, height: s.y * 0.45, depth: s.z * 0.28,
          }, scene);
          plate.material = accentMat;
          plate.parent = this.root;
          plate.position.set(
            side * (s.x * 0.52 + trackW + 0.07),
            baseY + hullH * 0.6,
            -s.z * 0.25 + i * s.z * 0.3
          );
        }
      });
    }
  }

  rotateTurret(deltaAngle: number, dt: number): void {
    if (this.config.type === 'destroyer') {
      const maxAngle = Math.PI / 8;
      const newAngle = this.turret.rotation.y + deltaAngle * this.config.turretSpeed * dt;
      this.turret.rotation.y = MathUtils.clamp(newAngle, -maxAngle, maxAngle);
    } else {
      this.turret.rotation.y += deltaAngle * this.config.turretSpeed * dt;
    }
  }

  canFire(): boolean {
    return this.reloadTimer <= 0 && this.isAlive;
  }

  fire(): void {
    this.reloadTimer = this.config.reloadTime;
  }

  getFirePosition(): Vector3 {
    return this.firePoint.getAbsolutePosition();
  }

  getFireDirection(): Vector3 {
    const forward = new Vector3(0, 0, 1);
    const worldMatrix = this.turret.getWorldMatrix();
    return Vector3.TransformNormal(forward, worldMatrix).normalize();
  }

  takeDamage(amount: number): void {
    const reduction = 100 / (100 + this.config.armor);
    const effectiveDamage = Math.max(1, Math.round(amount * reduction));
    this.health -= effectiveDamage;
    if (this.health <= 0) {
      this.health = 0;
      this.isAlive = false;
      this.onDestroyed();
    }
  }

  private onDestroyed(): void {
    setTimeout(() => {
      this.root.setEnabled(false);
    }, 200);
  }

  update(dt: number): void {
    if (this.reloadTimer > 0) {
      this.reloadTimer -= dt;
    }
  }

  dispose(): void {
    this.root.dispose(false, true);
  }
}
