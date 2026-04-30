import {
  Scene,
  Vector3,
  Plane,
  SceneLoader,
  TransformNode,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  PBRMaterial,
  Texture,
} from '@babylonjs/core';
import { Tank, TankConfig } from './Tank';
import { MathUtils } from '../utils/MathUtils';
import type { InputState } from '../core/InputManager';
import type { CameraSystem } from '../core/CameraSystem';
import type { MapManager } from '../world/MapManager';
import { TankModelLoader } from './TankModelLoader';

/** OBJ under `public/` — served from `import.meta.env.BASE_URL`. */
export const PLAYER_EXTERNAL_MODEL_REL =
  'models/WWII_Tank_Germany_Panzer_III_v1/14077_WWII_Tank_Germany_Panzer_III_v1_L2.obj';

export class PlayerTank extends Tank {
  private cameraSystem: CameraSystem | null = null;

  constructor(scene: Scene, config: TankConfig, position: Vector3) {
    super(scene, config, position);
  }

  attachCamera(camera: CameraSystem): void {
    this.cameraSystem = camera;
    camera.setTarget(this.root);
  }

  /**
   * Replace procedural mesh with Panzer III OBJ. Falls back silently if load fails.
   */
  async applyExternalPlayerModel(map: MapManager): Promise<void> {
    const base = import.meta.env.BASE_URL;
    const modelUrl = (base.endsWith('/') ? base : base + '/') + PLAYER_EXTERNAL_MODEL_REL;
    const { rootUrl, fileName } = TankModelLoader.splitModelPath(modelUrl);

    let result;
    try {
      result = await SceneLoader.ImportMeshAsync('', rootUrl, fileName, this.scene);
    } catch (e) {
      console.warn('[PlayerTank] External model load failed, using procedural mesh.', e);
      return;
    }

    const meshes = result.meshes.filter(
      (m) => m instanceof Mesh && !m.name.toLowerCase().includes('__root__')
    ) as Mesh[];
    if (meshes.length === 0) {
      console.warn('[PlayerTank] External model produced no meshes.');
      return;
    }

    for (const child of [...this.root.getChildren()]) {
      child.dispose(false, true);
    }

    // 3ds Max 导出坐标：x=车长, y=车宽(部分), z=车高
    // Babylon 需要：x=车宽, y=车高, z=车长
    // 变换：rotation.x=-π/2 (Z-up→Y-up) + rotation.z=-π/2 (车长从X对齐到Z)
    const bodyOrient = new TransformNode(this.tankId + '_bodyOrient', this.scene);
    bodyOrient.parent = this.root;
    bodyOrient.rotation.x = -Math.PI / 2;
    bodyOrient.rotation.z = -Math.PI / 2;

    // 炮塔枢轴直接挂 root，这样 rotation.y 就是绕世界 Y 轴（水平旋转）
    this.turret = new TransformNode(this.tankId + '_turretPivot', this.scene);
    this.turret.parent = this.root;

    // 炮塔 mesh 的坐标修正（与车体相同）
    const turretOrient = new TransformNode(this.tankId + '_turretOrient', this.scene);
    turretOrient.parent = this.turret;
    turretOrient.rotation.x = -Math.PI / 2;
    turretOrient.rotation.z = -Math.PI / 2;

    for (const mesh of meshes) {
      mesh.refreshBoundingInfo(false, false);
      this.fixMeshMaterial(mesh);

      const nm = mesh.name.toLowerCase();
      if (nm.includes('turret')) {
        mesh.parent = turretOrient;
      } else {
        mesh.parent = bodyOrient;
      }
    }

    this.body =
      (meshes.find((m) => m.name.toLowerCase().includes('hull')) as Mesh | undefined) ?? meshes[0];

    this.turretMesh =
      (meshes.find((m) => m.name.toLowerCase().includes('turret')) as Mesh | undefined) ?? meshes[0];

    this.firePoint = new TransformNode(this.tankId + '_firePoint', this.scene);
    this.firePoint.parent = this.turret;
    this.placeFirePointFromTurretMesh();

    this.barrel = MeshBuilder.CreateBox(this.tankId + '_barrelStub', { size: 0.02 }, this.scene);
    this.barrel.parent = this.turret;
    this.barrel.position.copyFrom(this.firePoint.position);
    this.barrel.isVisible = false;
    this.barrel.isPickable = false;

    this.root.computeWorldMatrix(true);
    for (const mesh of meshes) {
      mesh.computeWorldMatrix(true);
    }

    const ref = Math.max(this.config.bodyScale.x, this.config.bodyScale.z) * 0.92;
    const modelLen = this.estimateTankFootprintXZ(meshes);
    if (Number.isFinite(modelLen) && Number.isFinite(ref) && modelLen > 0.05 && modelLen < 400 && ref > 1e-3) {
      let s = ref / modelLen;
      s = Math.min(6, Math.max(0.08, s));
      this.root.scaling.scaleInPlace(s);
    }

    this.root.computeWorldMatrix(true);
    const bottomY = this.getWorldBottomYUnderRoot();
    const terrainY = map.getHeightAt(this.root.position.x, this.root.position.z);
    if (Number.isFinite(bottomY) && Number.isFinite(terrainY)) {
      this.root.position.y += terrainY - bottomY + 0.06;
    }
    const hSample = map.getHeightAt(this.root.position.x, this.root.position.z);
    let yo = this.root.position.y - hSample;
    if (!Number.isFinite(yo)) yo = 0;
    this.terrainYOffset = Math.max(-30, Math.min(30, yo));

    if (!Number.isFinite(this.root.position.x)) this.root.position.x = 0;
    if (!Number.isFinite(this.root.position.y)) this.root.position.y = terrainY;
    if (!Number.isFinite(this.root.position.z)) this.root.position.z = 0;
  }

  private estimateTankFootprintXZ(meshes: Mesh[]): number {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const m of meshes) {
      m.computeWorldMatrix(true);
      const bi = m.getBoundingInfo();
      if (!bi) continue;
      const mn = bi.boundingBox.minimumWorld;
      const mx = bi.boundingBox.maximumWorld;
      if (![mn.x, mn.y, mn.z, mx.x, mx.y, mx.z].every(Number.isFinite)) continue;
      minX = Math.min(minX, mn.x);
      maxX = Math.max(maxX, mx.x);
      minZ = Math.min(minZ, mn.z);
      maxZ = Math.max(maxZ, mx.z);
    }
    const span = Math.max(maxX - minX, maxZ - minZ);
    return Number.isFinite(span) && span > 0 ? span : 2.5;
  }

  private getWorldBottomYUnderRoot(): number {
    let y = Infinity;
    for (const m of this.root.getChildMeshes(true)) {
      if (m.isDisposed()) continue;
      m.computeWorldMatrix(true);
      const bi = m.getBoundingInfo();
      if (!bi) continue;
      const wy = bi.boundingBox.minimumWorld.y;
      if (Number.isFinite(wy)) y = Math.min(y, wy);
    }
    return Number.isFinite(y) ? y : this.root.position.y;
  }

  private fixMeshMaterial(mesh: Mesh): void {
    const mat = mesh.material;
    if (!mat) return;
    mat.backFaceCulling = false;
    if (mat instanceof StandardMaterial) {
      mat.emissiveColor.set(0.18, 0.18, 0.15);
    }
  }

  private placeFirePointFromTurretMesh(): void {
    const tm = this.turretMesh;
    if (!tm?.getBoundingInfo()) {
      this.firePoint.position.set(0, 0.55, this.config.bodyScale.z * 0.45);
      return;
    }
    const b = tm.getBoundingInfo().boundingBox;
    // OBJ 空间: x=前后(炮管), y=左右, z=高度
    // turretOrient 变换后: OBJ(x,y,z) → turretPivot(y, z, x)
    // firePoint 在 turretPivot 本地空间中
    const fpX = (b.minimum.y + b.maximum.y) * 0.5; // OBJ y 中心 → 横向居中
    const fpY = (b.minimum.z + b.maximum.z) * 0.5; // OBJ z 中心 → 炮管高度
    const fpZ = b.maximum.x + 0.15;                // OBJ x 最大值 → 炮口前方
    this.firePoint.position.set(fpX, fpY, fpZ);
  }

  handleInput(input: InputState, dt: number): void {
    if (!this.isAlive) return;

    let moveInput = 0;
    let turnInput = 0;

    if (input.moveForward) moveInput += 1;
    if (input.moveBackward) moveInput -= 1;
    if (input.turnLeft) turnInput -= 1;
    if (input.turnRight) turnInput += 1;

    if (Math.abs(input.moveAxis.y) > 0.1 || Math.abs(input.moveAxis.x) > 0.1) {
      moveInput = input.moveAxis.y;
      turnInput = input.moveAxis.x;
    }

    this.root.rotation.y += turnInput * this.config.turnSpeed * dt;
    this.velocity = MathUtils.lerp(this.velocity, moveInput * this.config.speed, dt * 5);

    const forward = new Vector3(
      Math.sin(this.root.rotation.y),
      0,
      Math.cos(this.root.rotation.y)
    );

    this.root.position.addInPlace(forward.scale(this.velocity * dt));

    if (input.isMobile) {
      this.aimTurretWithJoystick(input, dt);
    } else {
      this.aimTurretAtMouse(input, dt);
    }
  }

  private aimTurretWithJoystick(input: InputState, dt: number): void {
    const ax = input.aimAxis.x;
    const ay = input.aimAxis.y;

    if (Math.abs(ax) < 0.15 && Math.abs(ay) < 0.15) return;

    const targetAngle = Math.atan2(ax, ay);
    const diff = MathUtils.normalizeAngle(targetAngle - this.turret.rotation.y);
    const lerpFactor = MathUtils.clamp(this.config.turretSpeed * dt * 10, 0, 1);

    if (Math.abs(diff) < 0.02) {
      this.turret.rotation.y = targetAngle;
    } else {
      this.turret.rotation.y += diff * lerpFactor;
    }
  }

  private aimTurretAtMouse(input: InputState, dt: number): void {
    if (!this.cameraSystem) return;

    const cam = this.cameraSystem.camera;
    const sx = input.mouseScreenX;
    const sy = input.mouseScreenY;

    if (sx === 0 && sy === 0) return;

    const ray = this.scene.createPickingRay(sx, sy, null, cam, false);

    const groundY = this.root.position.y;
    const groundPlane = Plane.FromPositionAndNormal(
      new Vector3(0, groundY, 0),
      new Vector3(0, 1, 0)
    );

    const denom = Vector3.Dot(ray.direction, groundPlane.normal);
    if (Math.abs(denom) < 0.0001) return;

    const t = -(Vector3.Dot(ray.origin, groundPlane.normal) + groundPlane.d) / denom;
    if (t < 0) return;

    const hitPoint = ray.origin.add(ray.direction.scale(t));

    const dx = hitPoint.x - this.root.position.x;
    const dz = hitPoint.z - this.root.position.z;
    const worldAngle = Math.atan2(dx, dz);
    const targetLocal = MathUtils.normalizeAngle(worldAngle - this.root.rotation.y);

    const diff = MathUtils.normalizeAngle(targetLocal - this.turret.rotation.y);
    const lerpFactor = MathUtils.clamp(this.config.turretSpeed * dt * 15, 0, 1);

    if (Math.abs(diff) < 0.01) {
      this.turret.rotation.y = targetLocal;
    } else {
      this.turret.rotation.y += diff * lerpFactor;
    }
  }
}
