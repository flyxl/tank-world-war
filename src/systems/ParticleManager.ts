import { Scene } from '@babylonjs/core/scene';
import { ParticleSystem } from '@babylonjs/core/Particles/particleSystem';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color4 } from '@babylonjs/core/Maths/math.color';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';

export class ParticleManager {
  private activeSystems: ParticleSystem[] = [];
  private particleTex: Texture;

  constructor(private scene: Scene) {
    this.particleTex = this.createParticleTexture();
  }

  private createParticleTexture(): Texture {
    const tex = new Texture(
      'https://assets.babylonjs.com/textures/flare.png',
      this.scene
    );
    tex.hasAlpha = true;
    return tex;
  }

  createMuzzleFlash(position: Vector3, direction: Vector3): void {
    const ps = new ParticleSystem('muzzle', 40, this.scene);
    ps.particleTexture = this.particleTex;
    ps.createPointEmitter(direction.scale(0.5), direction.scale(3));
    ps.emitter = position.clone();

    ps.minSize = 0.15;
    ps.maxSize = 0.5;
    ps.minLifeTime = 0.05;
    ps.maxLifeTime = 0.2;
    ps.emitRate = 600;
    ps.targetStopDuration = 0.06;

    ps.color1 = new Color4(1, 0.9, 0.3, 1);
    ps.color2 = new Color4(1, 0.5, 0.1, 1);
    ps.colorDead = new Color4(1, 0.2, 0, 0);

    ps.minEmitPower = 8;
    ps.maxEmitPower = 20;
    ps.blendMode = ParticleSystem.BLENDMODE_ADD;

    ps.disposeOnStop = true;
    ps.start();
    this.activeSystems.push(ps);
  }

  createExplosion(position: Vector3, scale: number = 1): void {
    const firePS = new ParticleSystem('explosionFire', 100 * scale, this.scene);
    firePS.particleTexture = this.particleTex;
    firePS.createSphereEmitter(0.8 * scale);
    firePS.emitter = position.clone();

    firePS.minSize = 0.4 * scale;
    firePS.maxSize = 2.0 * scale;
    firePS.minLifeTime = 0.2;
    firePS.maxLifeTime = 0.8;
    firePS.emitRate = 400;
    firePS.targetStopDuration = 0.2;

    firePS.color1 = new Color4(1, 0.8, 0.2, 1);
    firePS.color2 = new Color4(1, 0.4, 0.1, 1);
    firePS.colorDead = new Color4(0.5, 0.1, 0, 0);

    firePS.minEmitPower = 4 * scale;
    firePS.maxEmitPower = 12 * scale;
    firePS.gravity = new Vector3(0, 2, 0);
    firePS.blendMode = ParticleSystem.BLENDMODE_ADD;

    firePS.disposeOnStop = true;
    firePS.start();

    const smokePS = new ParticleSystem('explosionSmoke', 80 * scale, this.scene);
    smokePS.particleTexture = this.particleTex;
    smokePS.createSphereEmitter(1.2 * scale);
    smokePS.emitter = position.clone();

    smokePS.minSize = 0.8 * scale;
    smokePS.maxSize = 3.5 * scale;
    smokePS.minLifeTime = 0.5;
    smokePS.maxLifeTime = 2.5;
    smokePS.emitRate = 200;
    smokePS.targetStopDuration = 0.4;

    smokePS.color1 = new Color4(0.3, 0.3, 0.3, 0.9);
    smokePS.color2 = new Color4(0.2, 0.2, 0.2, 0.6);
    smokePS.colorDead = new Color4(0.1, 0.1, 0.1, 0);

    smokePS.minEmitPower = 2 * scale;
    smokePS.maxEmitPower = 7 * scale;
    smokePS.gravity = new Vector3(0, 4, 0);
    smokePS.blendMode = ParticleSystem.BLENDMODE_STANDARD;

    smokePS.disposeOnStop = true;
    smokePS.start();

    const debrisPS = new ParticleSystem('debris', 50 * scale, this.scene);
    debrisPS.particleTexture = this.particleTex;
    debrisPS.createSphereEmitter(0.4 * scale);
    debrisPS.emitter = position.clone();

    debrisPS.minSize = 0.06;
    debrisPS.maxSize = 0.25;
    debrisPS.minLifeTime = 0.5;
    debrisPS.maxLifeTime = 2.0;
    debrisPS.emitRate = 300;
    debrisPS.targetStopDuration = 0.12;

    debrisPS.color1 = new Color4(0.7, 0.5, 0.3, 1);
    debrisPS.color2 = new Color4(0.4, 0.35, 0.2, 1);
    debrisPS.colorDead = new Color4(0.2, 0.15, 0.1, 0);

    debrisPS.minEmitPower = 6 * scale;
    debrisPS.maxEmitPower = 18 * scale;
    debrisPS.gravity = new Vector3(0, -15, 0);

    debrisPS.disposeOnStop = true;
    debrisPS.start();

    this.activeSystems.push(firePS, smokePS, debrisPS);
  }

  createHitSpark(position: Vector3): void {
    const spark = new ParticleSystem('hitSpark', 80, this.scene);
    spark.particleTexture = this.particleTex;
    spark.createSphereEmitter(0.8);
    spark.emitter = position.clone();
    spark.minSize = 0.3;
    spark.maxSize = 1.0;
    spark.minLifeTime = 0.3;
    spark.maxLifeTime = 0.8;
    spark.emitRate = 600;
    spark.targetStopDuration = 0.2;
    spark.color1 = new Color4(1, 0.9, 0.3, 1);
    spark.color2 = new Color4(1, 0.5, 0.1, 1);
    spark.colorDead = new Color4(0.3, 0.1, 0, 0);
    spark.minEmitPower = 4;
    spark.maxEmitPower = 12;
    spark.gravity = new Vector3(0, -5, 0);
    spark.blendMode = ParticleSystem.BLENDMODE_ADD;
    spark.disposeOnStop = true;
    spark.start();

    const smoke = new ParticleSystem('hitSmoke', 30, this.scene);
    smoke.particleTexture = this.particleTex;
    smoke.createSphereEmitter(0.5);
    smoke.emitter = position.clone();
    smoke.minSize = 0.5;
    smoke.maxSize = 1.5;
    smoke.minLifeTime = 0.4;
    smoke.maxLifeTime = 1.2;
    smoke.emitRate = 200;
    smoke.targetStopDuration = 0.15;
    smoke.color1 = new Color4(0.4, 0.4, 0.4, 0.8);
    smoke.color2 = new Color4(0.2, 0.2, 0.2, 0.5);
    smoke.colorDead = new Color4(0.1, 0.1, 0.1, 0);
    smoke.minEmitPower = 1;
    smoke.maxEmitPower = 4;
    smoke.gravity = new Vector3(0, 3, 0);
    smoke.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    smoke.disposeOnStop = true;
    smoke.start();

    this.activeSystems.push(spark, smoke);
  }

  createTankDestroyExplosion(position: Vector3): void {
    this.createExplosion(position, 2.5);

    setTimeout(() => this.createExplosion(position.add(new Vector3(1.5, 0.5, 0.5)), 1.5), 100);
    setTimeout(() => this.createExplosion(position.add(new Vector3(-0.8, 1, -0.5)), 1.0), 250);
  }

  cleanup(): void {
    this.activeSystems = this.activeSystems.filter((ps) => ps.isAlive());
  }

  dispose(): void {
    this.activeSystems.forEach((ps) => ps.dispose());
    this.activeSystems = [];
    this.particleTex.dispose();
  }
}
