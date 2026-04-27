import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { MathUtils } from '../utils/MathUtils';
import { DeviceDetector } from '../utils/DeviceDetector';
import type { InputState } from './InputManager';

export class CameraSystem {
  camera: ArcRotateCamera;
  private targetNode: TransformNode | null = null;
  private desiredRadius = 18;
  private minRadius = 8;
  private maxRadius = 35;
  private heightOffset = 4;
  private isMobile: boolean;

  constructor(private scene: Scene) {
    this.isMobile = DeviceDetector.isMobile();

    this.camera = new ArcRotateCamera(
      'mainCamera',
      -Math.PI / 2,
      Math.PI / 4,
      this.desiredRadius,
      Vector3.Zero(),
      scene
    );

    this.camera.lowerRadiusLimit = this.minRadius;
    this.camera.upperRadiusLimit = this.maxRadius;
    this.camera.lowerBetaLimit = 0.4;
    this.camera.upperBetaLimit = Math.PI / 2.5;
    this.camera.panningSensibility = 0;
    this.camera.inputs.clear();

    this.camera.minZ = 0.5;
    this.camera.maxZ = 500;
    this.camera.fov = this.isMobile ? 0.9 : 0.8;
  }

  setTarget(node: TransformNode): void {
    this.targetNode = node;
  }

  update(input: InputState, dt: number): void {
    if (!this.targetNode) return;

    const targetPos = this.targetNode.position.clone();
    targetPos.y += this.heightOffset;
    this.camera.target = Vector3.Lerp(this.camera.target, targetPos, MathUtils.clamp(dt * 10, 0, 1));

    const tankRotY = this.targetNode.rotation.y;
    const desiredAlpha = -tankRotY - Math.PI / 2;
    const alphaDiff = MathUtils.normalizeAngle(desiredAlpha - this.camera.alpha);
    this.camera.alpha += alphaDiff * MathUtils.clamp(dt * 4, 0, 1);

    if (input.zoomIn) this.desiredRadius = Math.max(this.minRadius, this.desiredRadius - 2);
    if (input.zoomOut) this.desiredRadius = Math.min(this.maxRadius, this.desiredRadius + 2);
    this.camera.radius = MathUtils.lerp(this.camera.radius, this.desiredRadius, MathUtils.clamp(dt * 5, 0, 1));
  }
}
