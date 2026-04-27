import { Scene } from '@babylonjs/core/scene';
import { Mesh } from '@babylonjs/core/Meshes/mesh';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { PBRMetallicRoughnessMaterial } from '@babylonjs/core/Materials/PBR/pbrMetallicRoughnessMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { TrailMesh } from '@babylonjs/core/Meshes/trailMesh';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';

export class Projectile {
  mesh: Mesh;
  velocity: Vector3;
  damage: number;
  ownerId: string;
  alive = true;
  lifetime = 5;
  private age = 0;
  private trail: TrailMesh | null = null;
  private scene: Scene;

  constructor(scene: Scene, position: Vector3, direction: Vector3, speed: number, damage: number, ownerId: string) {
    this.scene = scene;
    this.damage = damage;
    this.ownerId = ownerId;
    this.velocity = direction.scale(speed);

    this.mesh = MeshBuilder.CreateSphere('projectile', { diameter: 0.25, segments: 8 }, scene);
    this.mesh.position = position.clone();

    const mat = new PBRMetallicRoughnessMaterial('projMat', scene);
    mat.baseColor = new Color3(1, 0.8, 0.3);
    mat.metallic = 1;
    mat.roughness = 0.15;
    mat.emissiveColor = new Color3(1, 0.6, 0.15);
    this.mesh.material = mat;

    try {
      this.trail = new TrailMesh('trail', this.mesh, scene, 0.06, 40, true);
      const trailMat = new StandardMaterial('trailMat', scene);
      trailMat.emissiveColor = new Color3(1, 0.4, 0.1);
      trailMat.alpha = 0.4;
      trailMat.disableLighting = true;
      this.trail.material = trailMat;
    } catch {
      // Trail not supported
    }
  }

  update(dt: number): void {
    if (!this.alive) return;
    this.age += dt;

    this.velocity.y -= 9.81 * dt * 0.15;
    this.mesh.position.addInPlace(this.velocity.scale(dt));

    if (this.mesh.position.y < -1 || this.age > this.lifetime) {
      this.alive = false;
    }
  }

  dispose(): void {
    this.alive = false;
    this.trail?.dispose();
    this.mesh.dispose();
  }
}
