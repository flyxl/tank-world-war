import { Scene, Vector3, Color3, MeshBuilder, StandardMaterial, Mesh } from '@babylonjs/core';
import { Tank } from '../entities/Tank';
import { PlayerTank } from '../entities/PlayerTank';
import { EnemyTank } from '../entities/EnemyTank';
import { Projectile } from '../entities/Projectile';
import { ParticleManager } from './ParticleManager';
import { AudioManager, SoundType } from '../core/AudioManager';

interface FlashEffect {
  mesh: Mesh;
  age: number;
  maxAge: number;
}

export class CombatSystem {
  projectiles: Projectile[] = [];
  private allTanks: Tank[] = [];
  private projectileSpeed = 40;
  private flashEffects: FlashEffect[] = [];

  constructor(
    private scene: Scene,
    private particles: ParticleManager,
    private audio: AudioManager
  ) {}

  setTanks(tanks: Tank[]): void {
    this.allTanks = tanks;
  }

  fireProjectile(tank: Tank, skipCheck = false): void {
    if (!skipCheck && !tank.canFire()) return;

    tank.root.computeWorldMatrix(true);
    tank.turret.computeWorldMatrix(true);

    const pos = tank.getFirePosition();
    const dir = tank.getFireDirection();
    if (!skipCheck) tank.fire();

    const proj = new Projectile(
      this.scene,
      pos,
      dir,
      this.projectileSpeed,
      tank.config.damage,
      tank.tankId
    );
    this.projectiles.push(proj);

    this.particles.createMuzzleFlash(pos, dir);
    this.audio.playSynth(SoundType.CANNON_FIRE);
  }

  update(dt: number): void {
    for (const proj of this.projectiles) {
      if (!proj.alive) continue;

      const prevPos = proj.mesh.position.clone();
      proj.update(dt);
      const curPos = proj.mesh.position.clone();

      if (curPos.y <= -0.5) {
        this.particles.createHitSpark(curPos);
        proj.alive = false;
        continue;
      }

      for (const tank of this.allTanks) {
        if (!tank.isAlive) continue;
        if (tank.tankId === proj.ownerId) continue;

        if (this.sweepTest(prevPos, curPos, tank)) {
          tank.takeDamage(proj.damage);
          const hitPos = proj.mesh.position.clone();
          this.createHitFlash(hitPos);
          this.particles.createHitSpark(hitPos);
          this.audio.playSynth(SoundType.HIT);

          if (!tank.isAlive) {
            this.createExplosionFlash(tank.root.position.clone());
            this.particles.createTankDestroyExplosion(tank.root.position.clone());
            this.audio.playSynth(SoundType.EXPLOSION);
          }

          proj.alive = false;
          break;
        }
      }
    }

    this.projectiles = this.projectiles.filter((p) => {
      if (!p.alive) {
        p.dispose();
        return false;
      }
      return true;
    });

    this.updateFlashEffects(dt);
    this.particles.cleanup();
  }

  private createHitFlash(pos: Vector3): void {
    const hitPos = pos.clone();
    hitPos.y += 0.5;

    const core = MeshBuilder.CreateSphere('hitCore', { diameter: 0.8, segments: 8 }, this.scene);
    core.position = hitPos.clone();
    const coreMat = new StandardMaterial('cMat', this.scene);
    coreMat.emissiveColor = new Color3(1, 1, 0.7);
    coreMat.disableLighting = true;
    coreMat.alpha = 1;
    core.material = coreMat;
    this.flashEffects.push({ mesh: core, age: 0, maxAge: 0.3 });

    const glow = MeshBuilder.CreateSphere('hitGlow', { diameter: 2.0, segments: 8 }, this.scene);
    glow.position = hitPos.clone();
    const glowMat = new StandardMaterial('gMat', this.scene);
    glowMat.emissiveColor = new Color3(1, 0.5, 0.1);
    glowMat.disableLighting = true;
    glowMat.alpha = 0.6;
    glow.material = glowMat;
    this.flashEffects.push({ mesh: glow, age: 0, maxAge: 0.5 });

    for (let i = 0; i < 6; i++) {
      const shard = MeshBuilder.CreateBox('shard', { width: 0.08, height: 0.08, depth: 0.2 }, this.scene);
      shard.position = hitPos.clone();
      const sMat = new StandardMaterial('sMat', this.scene);
      sMat.emissiveColor = new Color3(1, 0.6, 0.2);
      sMat.disableLighting = true;
      shard.material = sMat;
      const angle = (i / 6) * Math.PI * 2;
      const speed = 4 + Math.random() * 6;
      (shard as any)._vel = new Vector3(
        Math.cos(angle) * speed, 2 + Math.random() * 3, Math.sin(angle) * speed
      );
      this.flashEffects.push({ mesh: shard, age: 0, maxAge: 0.8 });
    }
  }

  private createExplosionFlash(pos: Vector3): void {
    const hitPos = pos.clone();
    hitPos.y += 1;

    const core = MeshBuilder.CreateSphere('expCore', { diameter: 2, segments: 8 }, this.scene);
    core.position = hitPos.clone();
    const coreMat = new StandardMaterial('ecMat', this.scene);
    coreMat.emissiveColor = new Color3(1, 0.9, 0.5);
    coreMat.disableLighting = true;
    core.material = coreMat;
    this.flashEffects.push({ mesh: core, age: 0, maxAge: 0.4 });

    const fireball = MeshBuilder.CreateSphere('fireball', { diameter: 5, segments: 10 }, this.scene);
    fireball.position = hitPos.clone();
    const fbMat = new StandardMaterial('fbMat', this.scene);
    fbMat.emissiveColor = new Color3(1, 0.3, 0.05);
    fbMat.disableLighting = true;
    fbMat.alpha = 0.8;
    fireball.material = fbMat;
    this.flashEffects.push({ mesh: fireball, age: 0, maxAge: 1.0 });

    const smoke = MeshBuilder.CreateSphere('expSmoke', { diameter: 3, segments: 8 }, this.scene);
    smoke.position = hitPos.clone();
    smoke.position.y += 1;
    const sMat = new StandardMaterial('esMat', this.scene);
    sMat.emissiveColor = new Color3(0.15, 0.15, 0.15);
    sMat.disableLighting = true;
    sMat.alpha = 0.7;
    smoke.material = sMat;
    this.flashEffects.push({ mesh: smoke, age: 0, maxAge: 1.5 });

    for (let i = 0; i < 10; i++) {
      const debris = MeshBuilder.CreateBox('debris', { width: 0.12, height: 0.12, depth: 0.3 }, this.scene);
      debris.position = hitPos.clone();
      const dMat = new StandardMaterial('dMat', this.scene);
      dMat.emissiveColor = new Color3(0.4, 0.3, 0.15);
      dMat.disableLighting = true;
      debris.material = dMat;
      const angle = (i / 10) * Math.PI * 2;
      const speed = 5 + Math.random() * 10;
      (debris as any)._vel = new Vector3(
        Math.cos(angle) * speed, 3 + Math.random() * 5, Math.sin(angle) * speed
      );
      this.flashEffects.push({ mesh: debris, age: 0, maxAge: 1.2 });
    }
  }

  private updateFlashEffects(dt: number): void {
    this.flashEffects = this.flashEffects.filter((f) => {
      f.age += dt;
      if (f.age >= f.maxAge) {
        f.mesh.dispose();
        return false;
      }
      const t = f.age / f.maxAge;

      const vel = (f.mesh as any)._vel as Vector3 | undefined;
      if (vel) {
        f.mesh.position.addInPlace(vel.scale(dt));
        vel.y -= 12 * dt;
        f.mesh.rotation.x += dt * 5;
        f.mesh.rotation.z += dt * 3;
        (f.mesh.material as StandardMaterial).alpha = Math.max(0, 1 - t);
      } else {
        const scale = 1 + t * 1.5;
        f.mesh.scaling.setAll(scale);
        (f.mesh.material as StandardMaterial).alpha = Math.max(0, 1 - t * t);
      }
      return true;
    });
  }

  private sweepTest(p0: Vector3, p1: Vector3, tank: Tank): boolean {
    const s = tank.config.bodyScale;
    const center = tank.root.position.clone();
    center.y += (s.y + 0.8) * 0.5;

    const hitRadius = Math.max(s.x, s.z) * 0.6 + 0.5;
    const hitHeight = s.y + 1.5;

    const dist = Vector3.Distance(p0, p1);
    const steps = Math.max(3, Math.ceil(dist / 0.5));

    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = p0.x + (p1.x - p0.x) * t;
      const py = p0.y + (p1.y - p0.y) * t;
      const pz = p0.z + (p1.z - p0.z) * t;

      const dx = px - center.x;
      const dz = pz - center.z;
      const horizontalDist = Math.sqrt(dx * dx + dz * dz);

      const dy = py - center.y;

      if (horizontalDist <= hitRadius && Math.abs(dy) <= hitHeight * 0.5) {
        return true;
      }
    }

    return false;
  }

  dispose(): void {
    this.projectiles.forEach((p) => p.dispose());
    this.projectiles = [];
    this.flashEffects.forEach((f) => f.mesh.dispose());
    this.flashEffects = [];
  }
}
