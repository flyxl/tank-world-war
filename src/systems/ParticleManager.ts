import { Scene, ParticleSystem, Vector3, Color4, Texture } from '@babylonjs/core';

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
    const flash = new ParticleSystem('muzzleFlash', 60, this.scene);
    flash.particleTexture = this.particleTex;
    flash.createPointEmitter(direction.scale(0.5), direction.scale(4));
    flash.emitter = position.clone();
    flash.minSize = 0.2;
    flash.maxSize = 0.7;
    flash.minLifeTime = 0.03;
    flash.maxLifeTime = 0.15;
    flash.emitRate = 1000;
    flash.targetStopDuration = 0.05;
    flash.color1 = new Color4(1, 0.95, 0.6, 1);
    flash.color2 = new Color4(1, 0.7, 0.2, 1);
    flash.colorDead = new Color4(1, 0.3, 0, 0);
    flash.minEmitPower = 10;
    flash.maxEmitPower = 25;
    flash.blendMode = ParticleSystem.BLENDMODE_ADD;
    flash.disposeOnStop = true;
    flash.start();

    const smoke = new ParticleSystem('muzzleSmoke', 25, this.scene);
    smoke.particleTexture = this.particleTex;
    smoke.createConeEmitter(0.3, Math.PI / 6);
    smoke.emitter = position.clone();
    smoke.minSize = 0.3;
    smoke.maxSize = 1.2;
    smoke.minLifeTime = 0.3;
    smoke.maxLifeTime = 0.8;
    smoke.emitRate = 200;
    smoke.targetStopDuration = 0.1;
    smoke.color1 = new Color4(0.5, 0.5, 0.5, 0.5);
    smoke.color2 = new Color4(0.35, 0.35, 0.35, 0.3);
    smoke.colorDead = new Color4(0.2, 0.2, 0.2, 0);
    smoke.minEmitPower = 2;
    smoke.maxEmitPower = 5;
    smoke.gravity = new Vector3(0, 2, 0);
    smoke.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    smoke.disposeOnStop = true;
    smoke.start();

    this.activeSystems.push(flash, smoke);
  }

  createExplosion(position: Vector3, scale: number = 1): void {
    const coreFlash = new ParticleSystem('expCore', 30 * scale, this.scene);
    coreFlash.particleTexture = this.particleTex;
    coreFlash.createSphereEmitter(0.3 * scale);
    coreFlash.emitter = position.clone();
    coreFlash.minSize = 1.5 * scale;
    coreFlash.maxSize = 3.5 * scale;
    coreFlash.minLifeTime = 0.05;
    coreFlash.maxLifeTime = 0.2;
    coreFlash.emitRate = 600;
    coreFlash.targetStopDuration = 0.08;
    coreFlash.color1 = new Color4(1, 1, 0.8, 1);
    coreFlash.color2 = new Color4(1, 0.9, 0.5, 1);
    coreFlash.colorDead = new Color4(1, 0.5, 0.1, 0);
    coreFlash.minEmitPower = 1;
    coreFlash.maxEmitPower = 3;
    coreFlash.blendMode = ParticleSystem.BLENDMODE_ADD;
    coreFlash.disposeOnStop = true;
    coreFlash.start();

    const fire = new ParticleSystem('expFire', 120 * scale, this.scene);
    fire.particleTexture = this.particleTex;
    fire.createSphereEmitter(1.0 * scale);
    fire.emitter = position.clone();
    fire.minSize = 0.5 * scale;
    fire.maxSize = 2.2 * scale;
    fire.minLifeTime = 0.15;
    fire.maxLifeTime = 0.7;
    fire.emitRate = 500;
    fire.targetStopDuration = 0.2;
    fire.color1 = new Color4(1, 0.8, 0.15, 1);
    fire.color2 = new Color4(1, 0.4, 0.05, 0.9);
    fire.colorDead = new Color4(0.6, 0.1, 0, 0);
    fire.minEmitPower = 5 * scale;
    fire.maxEmitPower = 14 * scale;
    fire.gravity = new Vector3(0, 3, 0);
    fire.blendMode = ParticleSystem.BLENDMODE_ADD;
    fire.disposeOnStop = true;
    fire.start();

    const smoke = new ParticleSystem('expSmoke', 100 * scale, this.scene);
    smoke.particleTexture = this.particleTex;
    smoke.createSphereEmitter(1.5 * scale);
    smoke.emitter = position.clone();
    smoke.minSize = 1.0 * scale;
    smoke.maxSize = 4.5 * scale;
    smoke.minLifeTime = 0.6;
    smoke.maxLifeTime = 3.0;
    smoke.emitRate = 200;
    smoke.targetStopDuration = 0.5;
    smoke.color1 = new Color4(0.35, 0.3, 0.25, 0.85);
    smoke.color2 = new Color4(0.2, 0.18, 0.15, 0.6);
    smoke.colorDead = new Color4(0.1, 0.1, 0.1, 0);
    smoke.minEmitPower = 2 * scale;
    smoke.maxEmitPower = 8 * scale;
    smoke.gravity = new Vector3(0, 5, 0);
    smoke.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    smoke.disposeOnStop = true;
    smoke.start();

    const embers = new ParticleSystem('embers', 60 * scale, this.scene);
    embers.particleTexture = this.particleTex;
    embers.createSphereEmitter(0.5 * scale);
    embers.emitter = position.clone();
    embers.minSize = 0.04;
    embers.maxSize = 0.18;
    embers.minLifeTime = 0.6;
    embers.maxLifeTime = 2.5;
    embers.emitRate = 350;
    embers.targetStopDuration = 0.15;
    embers.color1 = new Color4(1, 0.7, 0.2, 1);
    embers.color2 = new Color4(1, 0.4, 0.1, 0.8);
    embers.colorDead = new Color4(0.3, 0.1, 0, 0);
    embers.minEmitPower = 8 * scale;
    embers.maxEmitPower = 22 * scale;
    embers.gravity = new Vector3(0, -12, 0);
    embers.blendMode = ParticleSystem.BLENDMODE_ADD;
    embers.disposeOnStop = true;
    embers.start();

    const debris = new ParticleSystem('debris', 40 * scale, this.scene);
    debris.particleTexture = this.particleTex;
    debris.createSphereEmitter(0.3 * scale);
    debris.emitter = position.clone();
    debris.minSize = 0.08;
    debris.maxSize = 0.3;
    debris.minLifeTime = 0.8;
    debris.maxLifeTime = 2.5;
    debris.emitRate = 300;
    debris.targetStopDuration = 0.1;
    debris.color1 = new Color4(0.6, 0.45, 0.3, 1);
    debris.color2 = new Color4(0.35, 0.28, 0.18, 0.9);
    debris.colorDead = new Color4(0.15, 0.1, 0.05, 0);
    debris.minEmitPower = 7 * scale;
    debris.maxEmitPower = 20 * scale;
    debris.gravity = new Vector3(0, -18, 0);
    debris.disposeOnStop = true;
    debris.start();

    this.activeSystems.push(coreFlash, fire, smoke, embers, debris);
  }

  createHitSpark(position: Vector3): void {
    const spark = new ParticleSystem('hitSpark', 100, this.scene);
    spark.particleTexture = this.particleTex;
    spark.createSphereEmitter(0.6);
    spark.emitter = position.clone();
    spark.minSize = 0.15;
    spark.maxSize = 0.6;
    spark.minLifeTime = 0.1;
    spark.maxLifeTime = 0.5;
    spark.emitRate = 800;
    spark.targetStopDuration = 0.12;
    spark.color1 = new Color4(1, 0.95, 0.5, 1);
    spark.color2 = new Color4(1, 0.6, 0.15, 1);
    spark.colorDead = new Color4(0.4, 0.15, 0, 0);
    spark.minEmitPower = 6;
    spark.maxEmitPower = 16;
    spark.gravity = new Vector3(0, -8, 0);
    spark.blendMode = ParticleSystem.BLENDMODE_ADD;
    spark.disposeOnStop = true;
    spark.start();

    const sparks = new ParticleSystem('hitSparks', 40, this.scene);
    sparks.particleTexture = this.particleTex;
    sparks.createSphereEmitter(0.2);
    sparks.emitter = position.clone();
    sparks.minSize = 0.02;
    sparks.maxSize = 0.1;
    sparks.minLifeTime = 0.3;
    sparks.maxLifeTime = 1.0;
    sparks.emitRate = 500;
    sparks.targetStopDuration = 0.08;
    sparks.color1 = new Color4(1, 0.9, 0.4, 1);
    sparks.color2 = new Color4(1, 0.6, 0.2, 0.9);
    sparks.colorDead = new Color4(0.5, 0.2, 0, 0);
    sparks.minEmitPower = 10;
    sparks.maxEmitPower = 28;
    sparks.gravity = new Vector3(0, -15, 0);
    sparks.blendMode = ParticleSystem.BLENDMODE_ADD;
    sparks.disposeOnStop = true;
    sparks.start();

    const smoke = new ParticleSystem('hitSmoke', 35, this.scene);
    smoke.particleTexture = this.particleTex;
    smoke.createSphereEmitter(0.4);
    smoke.emitter = position.clone();
    smoke.minSize = 0.4;
    smoke.maxSize = 1.8;
    smoke.minLifeTime = 0.4;
    smoke.maxLifeTime = 1.5;
    smoke.emitRate = 200;
    smoke.targetStopDuration = 0.15;
    smoke.color1 = new Color4(0.4, 0.38, 0.35, 0.75);
    smoke.color2 = new Color4(0.25, 0.22, 0.2, 0.5);
    smoke.colorDead = new Color4(0.1, 0.1, 0.1, 0);
    smoke.minEmitPower = 1;
    smoke.maxEmitPower = 4;
    smoke.gravity = new Vector3(0, 4, 0);
    smoke.blendMode = ParticleSystem.BLENDMODE_STANDARD;
    smoke.disposeOnStop = true;
    smoke.start();

    this.activeSystems.push(spark, sparks, smoke);
  }

  createTankDestroyExplosion(position: Vector3): void {
    this.createExplosion(position, 3);
    setTimeout(() => this.createExplosion(position.add(new Vector3(1.8, 0.6, 0.6)), 1.8), 80);
    setTimeout(() => this.createExplosion(position.add(new Vector3(-1, 1.2, -0.5)), 1.2), 200);
    setTimeout(() => this.createExplosion(position.add(new Vector3(0.3, 0.3, 1.2)), 1.0), 350);
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
