import {
  TransformNode, Mesh, Vector3,
} from '@babylonjs/core';
import { ParticleManager } from '../systems/ParticleManager';

interface DestructibleObject {
  id: string;
  hp: number;
  maxHp: number;
  root: TransformNode;
  colliderRadius: number;
  state: 'intact' | 'damaged' | 'destroyed';
}

export class DestructionSystem {
  private destructibles: DestructibleObject[] = [];

  constructor(private particles: ParticleManager) {}

  register(id: string, root: TransformNode, hp: number, colliderRadius: number): void {
    this.destructibles.push({
      id, hp, maxHp: hp, root, colliderRadius,
      state: 'intact',
    });
  }

  applyDamage(position: Vector3, radius: number, damage: number): void {
    for (const obj of this.destructibles) {
      if (obj.state === 'destroyed') continue;

      const dist = Vector3.Distance(position, obj.root.position);
      if (dist > radius + obj.colliderRadius) continue;

      obj.hp -= damage;

      if (obj.hp <= 0) {
        this.destroyObject(obj);
      } else if (obj.hp < obj.maxHp * 0.5 && obj.state === 'intact') {
        obj.state = 'damaged';
        this.particles.createHitSpark(obj.root.position.add(new Vector3(0, 1, 0)));
      }
    }
  }

  private destroyObject(obj: DestructibleObject): void {
    obj.state = 'destroyed';
    this.particles.createExplosion(obj.root.position.add(new Vector3(0, 1, 0)), 1.5);

    obj.root.scaling.y *= 0.3;
    obj.root.position.y -= 0.5;

    obj.root.getChildMeshes().forEach(m => {
      if (m instanceof Mesh) {
        m.isPickable = false;
        m.name = 'rubble_destroyed';
      }
    });
  }

  getDestructibles(): DestructibleObject[] {
    return this.destructibles;
  }

  dispose(): void {
    this.destructibles = [];
  }
}
