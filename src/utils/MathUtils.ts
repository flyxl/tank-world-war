import { Vector3 } from '@babylonjs/core/Maths/math.vector';

export class MathUtils {
  static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }

  static lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  static lerpVector3(a: Vector3, b: Vector3, t: number): Vector3 {
    return new Vector3(
      MathUtils.lerp(a.x, b.x, t),
      MathUtils.lerp(a.y, b.y, t),
      MathUtils.lerp(a.z, b.z, t)
    );
  }

  static randomRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  static randomInt(min: number, max: number): number {
    return Math.floor(MathUtils.randomRange(min, max + 1));
  }

  static distanceXZ(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  static angleBetweenVectors(from: Vector3, to: Vector3): number {
    const dx = to.x - from.x;
    const dz = to.z - from.z;
    return Math.atan2(dx, dz);
  }

  static normalizeAngle(angle: number): number {
    while (angle > Math.PI) angle -= 2 * Math.PI;
    while (angle < -Math.PI) angle += 2 * Math.PI;
    return angle;
  }

  static smoothDamp(current: number, target: number, velocity: { value: number }, smoothTime: number, dt: number): number {
    const omega = 2 / smoothTime;
    const x = omega * dt;
    const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
    let change = current - target;
    const temp = (velocity.value + omega * change) * dt;
    velocity.value = (velocity.value - omega * temp) * exp;
    return target + (change + temp) * exp;
  }
}
