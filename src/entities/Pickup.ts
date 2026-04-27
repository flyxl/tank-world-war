import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';

export enum PickupType {
  HEALTH = 'health',
  DAMAGE = 'damage',
  SPEED = 'speed',
  SHIELD = 'shield',
}

interface PickupConfig {
  color: Color3;
  emissive: Color3;
  label: string;
  duration: number;
}

const PICKUP_CONFIGS: Record<PickupType, PickupConfig> = {
  [PickupType.HEALTH]: {
    color: new Color3(0.1, 1, 0.2),
    emissive: new Color3(0.1, 1, 0.2),
    label: '生命',
    duration: 0,
  },
  [PickupType.DAMAGE]: {
    color: new Color3(1, 0.15, 0.05),
    emissive: new Color3(1, 0.2, 0.05),
    label: '火力',
    duration: 15,
  },
  [PickupType.SPEED]: {
    color: new Color3(0.1, 0.5, 1),
    emissive: new Color3(0.2, 0.5, 1),
    label: '速度',
    duration: 12,
  },
  [PickupType.SHIELD]: {
    color: new Color3(1, 0.9, 0.1),
    emissive: new Color3(1, 0.85, 0.1),
    label: '护盾',
    duration: 10,
  },
};

export class Pickup {
  root: TransformNode;
  type: PickupType;
  collected = false;
  private meshes: Mesh[] = [];
  private scene: Scene;
  private floatOffset: number;
  private config: PickupConfig;

  constructor(scene: Scene, type: PickupType, position: Vector3) {
    this.scene = scene;
    this.type = type;
    this.config = PICKUP_CONFIGS[type];
    this.floatOffset = Math.random() * Math.PI * 2;

    this.root = new TransformNode('pickup_' + type, scene);
    this.root.position = position.clone();
    this.root.position.y += 1;

    this.buildModel();
  }

  get label(): string { return this.config.label; }
  get duration(): number { return this.config.duration; }

  private buildModel(): void {
    const mat = new StandardMaterial('pickupMat', this.scene);
    mat.diffuseColor = this.config.color;
    mat.emissiveColor = this.config.emissive;
    mat.alpha = 0.85;

    const coreMat = new StandardMaterial('pickupCoreMat', this.scene);
    coreMat.emissiveColor = this.config.color;
    coreMat.disableLighting = true;
    coreMat.alpha = 0.9;

    switch (this.type) {
      case PickupType.HEALTH:
        this.buildCross(mat, coreMat);
        break;
      case PickupType.DAMAGE:
        this.buildStar(mat, coreMat);
        break;
      case PickupType.SPEED:
        this.buildArrow(mat, coreMat);
        break;
      case PickupType.SHIELD:
        this.buildShield(mat, coreMat);
        break;
    }

    const glow = MeshBuilder.CreateSphere('pickupGlow', { diameter: 4, segments: 8 }, this.scene);
    const glowMat = new StandardMaterial('glowMat', this.scene);
    glowMat.emissiveColor = this.config.emissive.scale(0.5);
    glowMat.disableLighting = true;
    glowMat.alpha = 0.2;
    glow.material = glowMat;
    glow.parent = this.root;
    this.meshes.push(glow);

    const beam = MeshBuilder.CreateCylinder('beam', {
      diameterTop: 0.15, diameterBottom: 0.15, height: 5, tessellation: 8,
    }, this.scene);
    const beamMat = new StandardMaterial('beamMat', this.scene);
    beamMat.emissiveColor = this.config.color;
    beamMat.disableLighting = true;
    beamMat.alpha = 0.3;
    beam.material = beamMat;
    beam.parent = this.root;
    beam.position.y = 2;
    this.meshes.push(beam);

    this.createLabel();
  }

  private createLabel(): void {
    const tex = new DynamicTexture('pickupLabel', { width: 128, height: 48 }, this.scene, false);
    const ctx = tex.getContext() as any;
    ctx.clearRect(0, 0, 128, 48);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(this.config.label, 64, 24);
    tex.update();

    const plane = MeshBuilder.CreatePlane('labelPlane', { width: 1.5, height: 0.6 }, this.scene);
    const planeMat = new StandardMaterial('labelMat', this.scene);
    planeMat.diffuseTexture = tex;
    planeMat.emissiveColor = this.config.color;
    planeMat.disableLighting = true;
    planeMat.useAlphaFromDiffuseTexture = true;
    planeMat.alpha = 0.9;
    planeMat.backFaceCulling = false;
    plane.material = planeMat;
    plane.parent = this.root;
    plane.position.y = 1.8;
    plane.billboardMode = Mesh.BILLBOARDMODE_ALL;
    this.meshes.push(plane);
  }

  private buildCross(mat: StandardMaterial, _coreMat: StandardMaterial): void {
    const h = MeshBuilder.CreateBox('crossH', { width: 1.2, height: 0.3, depth: 0.3 }, this.scene);
    h.material = mat;
    h.parent = this.root;
    this.meshes.push(h);

    const v = MeshBuilder.CreateBox('crossV', { width: 0.3, height: 1.2, depth: 0.3 }, this.scene);
    v.material = mat;
    v.parent = this.root;
    this.meshes.push(v);
  }

  private buildStar(mat: StandardMaterial, _coreMat: StandardMaterial): void {
    const core = MeshBuilder.CreateSphere('star', { diameter: 0.9, segments: 8 }, this.scene);
    core.material = mat;
    core.parent = this.root;
    this.meshes.push(core);

    for (let i = 0; i < 6; i++) {
      const spike = MeshBuilder.CreateCylinder('spike', {
        diameterTop: 0, diameterBottom: 0.3, height: 0.7, tessellation: 6,
      }, this.scene);
      spike.material = mat;
      spike.parent = this.root;
      const angle = (i / 6) * Math.PI * 2;
      spike.rotation.z = angle;
      spike.position.y = Math.sin(angle) * 0.4;
      spike.position.x = Math.cos(angle) * 0.4;
      this.meshes.push(spike);
    }
  }

  private buildArrow(mat: StandardMaterial, _coreMat: StandardMaterial): void {
    const body = MeshBuilder.CreateBox('arrowBody', { width: 0.2, height: 0.9, depth: 0.2 }, this.scene);
    body.material = mat;
    body.parent = this.root;
    this.meshes.push(body);

    const head = MeshBuilder.CreateCylinder('arrowHead', {
      diameterTop: 0, diameterBottom: 0.7, height: 0.55, tessellation: 4,
    }, this.scene);
    head.material = mat;
    head.parent = this.root;
    head.position.y = 0.7;
    this.meshes.push(head);
  }

  private buildShield(mat: StandardMaterial, _coreMat: StandardMaterial): void {
    const shield = MeshBuilder.CreateTorus('shieldRing', {
      diameter: 1.0, thickness: 0.18, tessellation: 20,
    }, this.scene);
    shield.material = mat;
    shield.parent = this.root;
    this.meshes.push(shield);

    const center = MeshBuilder.CreateSphere('shieldCenter', { diameter: 0.5, segments: 10 }, this.scene);
    center.material = mat;
    center.parent = this.root;
    this.meshes.push(center);
  }

  update(dt: number, time: number): void {
    if (this.collected) return;
    this.root.rotation.y += dt * 1.5;
    this.root.position.y = 1 + Math.sin(time * 2 + this.floatOffset) * 0.3;
  }

  collect(): void {
    this.collected = true;
    this.root.setEnabled(false);
  }

  dispose(): void {
    this.root.dispose(false, true);
  }
}
