import { Scene, Vector3, Plane } from '@babylonjs/core';
import { Tank, TankConfig } from './Tank';
import { MathUtils } from '../utils/MathUtils';
import type { InputState } from '../core/InputManager';
import type { CameraSystem } from '../core/CameraSystem';

export class PlayerTank extends Tank {
  private cameraSystem: CameraSystem | null = null;

  constructor(scene: Scene, config: TankConfig, position: Vector3) {
    super(scene, config, position);
  }

  attachCamera(camera: CameraSystem): void {
    this.cameraSystem = camera;
    camera.setTarget(this.root);
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
