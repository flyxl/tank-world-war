import { Scene, ParticleSystem, Texture, Vector3, Color4, DirectionalLight, MeshBuilder } from '@babylonjs/core';

export type WeatherType = 'clear' | 'cloudy' | 'rain' | 'snow' | 'fog';

export class WeatherSystem {
  currentWeather: WeatherType = 'clear';
  private particleSys: ParticleSystem | null = null;
  private sunLight: DirectionalLight | null = null;
  private timeOfDay = 0.4;
  private daySpeed = 0.01;

  constructor(private scene: Scene) {
    this.sunLight = scene.lights.find((l) => l instanceof DirectionalLight) as DirectionalLight || null;
  }

  setWeather(type: WeatherType): void {
    this.clearParticles();
    this.currentWeather = type;

    switch (type) {
      case 'rain':
        this.createRain();
        if (this.scene.fogMode !== undefined) {
          this.scene.fogMode = Scene.FOGMODE_EXP;
          this.scene.fogDensity = 0.005;
          this.scene.fogColor.set(0.5, 0.55, 0.6);
        }
        break;
      case 'snow':
        this.createSnow();
        this.scene.fogMode = Scene.FOGMODE_EXP;
        this.scene.fogDensity = 0.003;
        this.scene.fogColor.set(0.8, 0.82, 0.85);
        break;
      case 'fog':
        this.scene.fogMode = Scene.FOGMODE_EXP;
        this.scene.fogDensity = 0.015;
        this.scene.fogColor.set(0.6, 0.62, 0.65);
        break;
      case 'cloudy':
        this.scene.fogMode = Scene.FOGMODE_EXP;
        this.scene.fogDensity = 0.002;
        this.scene.fogColor.set(0.55, 0.55, 0.58);
        break;
      default:
        this.scene.fogMode = Scene.FOGMODE_NONE;
        break;
    }
  }

  private createRain(): void {
    const emitter = MeshBuilder.CreateBox('rainEmitter', { size: 0.01 }, this.scene);
    emitter.isVisible = false;

    this.particleSys = new ParticleSystem('rain', 3000, this.scene);
    this.particleSys.createPointEmitter(new Vector3(-60, 0, -60), new Vector3(60, 0, 60));
    this.particleSys.emitter = new Vector3(0, 40, 0);

    this.particleSys.minSize = 0.05;
    this.particleSys.maxSize = 0.08;
    this.particleSys.minLifeTime = 0.8;
    this.particleSys.maxLifeTime = 1.2;
    this.particleSys.emitRate = 2000;
    this.particleSys.gravity = new Vector3(0, -40, 0);

    this.particleSys.color1 = new Color4(0.6, 0.65, 0.8, 0.4);
    this.particleSys.color2 = new Color4(0.5, 0.55, 0.7, 0.3);
    this.particleSys.colorDead = new Color4(0.4, 0.45, 0.6, 0);

    this.particleSys.minEmitPower = 1;
    this.particleSys.maxEmitPower = 3;
    this.particleSys.blendMode = ParticleSystem.BLENDMODE_ADD;

    this.particleSys.start();
  }

  private createSnow(): void {
    const emitter = MeshBuilder.CreateBox('snowEmitter', { size: 0.01 }, this.scene);
    emitter.isVisible = false;

    this.particleSys = new ParticleSystem('snow', 2000, this.scene);
    this.particleSys.createPointEmitter(new Vector3(-60, 0, -60), new Vector3(60, 0, 60));
    this.particleSys.emitter = new Vector3(0, 35, 0);

    this.particleSys.minSize = 0.1;
    this.particleSys.maxSize = 0.3;
    this.particleSys.minLifeTime = 3;
    this.particleSys.maxLifeTime = 6;
    this.particleSys.emitRate = 800;
    this.particleSys.gravity = new Vector3(0, -3, 0);

    this.particleSys.color1 = new Color4(1, 1, 1, 0.8);
    this.particleSys.color2 = new Color4(0.9, 0.95, 1, 0.6);
    this.particleSys.colorDead = new Color4(0.8, 0.85, 0.9, 0);

    this.particleSys.minEmitPower = 0.5;
    this.particleSys.maxEmitPower = 2;
    this.particleSys.blendMode = ParticleSystem.BLENDMODE_STANDARD;

    this.particleSys.start();
  }

  update(dt: number): void {
    this.timeOfDay = (this.timeOfDay + this.daySpeed * dt) % 1;
    this.updateLighting();
  }

  private updateLighting(): void {
    if (!this.sunLight) return;

    const sunAngle = this.timeOfDay * Math.PI;
    this.sunLight.direction.set(
      -Math.cos(sunAngle) * 0.5,
      -Math.sin(sunAngle),
      -0.3
    ).normalize();

    const intensity = Math.max(0.1, Math.sin(sunAngle));
    let weatherDim = 1;
    if (this.currentWeather === 'cloudy') weatherDim = 0.6;
    if (this.currentWeather === 'rain') weatherDim = 0.4;
    if (this.currentWeather === 'fog') weatherDim = 0.5;
    if (this.currentWeather === 'snow') weatherDim = 0.7;

    this.sunLight.intensity = intensity * weatherDim * 1.5;
  }

  private clearParticles(): void {
    this.particleSys?.dispose();
    this.particleSys = null;
    this.scene.fogMode = Scene.FOGMODE_NONE;
  }

  setTimeOfDay(t: number): void {
    this.timeOfDay = t;
  }

  dispose(): void {
    this.clearParticles();
  }
}
