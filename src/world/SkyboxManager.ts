import {
  Scene, MeshBuilder, Mesh, StandardMaterial, Color3, Color4, DynamicTexture,
} from '@babylonjs/core';

export type SkyTheme = 'desert' | 'urban' | 'forest' | 'snow'
  | 'normandy' | 'stalingrad' | 'kursk' | 'ardennes';

interface SkyConfig {
  topColor: string;
  midColor: string;
  bottomColor: string;
  clearColor: Color4;
  ambientColor: Color3;
  fogColor: Color3;
  fogDensity: number;
  sunTint: Color3;
  cloudCount: number;
  cloudAlpha: number;
}

const SKY_CONFIGS: Record<SkyTheme, SkyConfig> = {
  desert: {
    topColor: '#0e2a5c',
    midColor: '#d4963a',
    bottomColor: '#c07840',
    clearColor: new Color4(0.85, 0.65, 0.4, 1),
    ambientColor: new Color3(0.6, 0.5, 0.35),
    fogColor: new Color3(0.82, 0.7, 0.5),
    fogDensity: 0.0012,
    sunTint: new Color3(1, 0.85, 0.6),
    cloudCount: 8,
    cloudAlpha: 0.4,
  },
  urban: {
    topColor: '#3a4a5e',
    midColor: '#788898',
    bottomColor: '#959faa',
    clearColor: new Color4(0.5, 0.52, 0.55, 1),
    ambientColor: new Color3(0.4, 0.4, 0.42),
    fogColor: new Color3(0.55, 0.57, 0.6),
    fogDensity: 0.001,
    sunTint: new Color3(0.85, 0.85, 0.9),
    cloudCount: 20,
    cloudAlpha: 0.6,
  },
  forest: {
    topColor: '#1557a0',
    midColor: '#64b5f6',
    bottomColor: '#90caf9',
    clearColor: new Color4(0.45, 0.6, 0.8, 1),
    ambientColor: new Color3(0.35, 0.45, 0.35),
    fogColor: new Color3(0.5, 0.6, 0.45),
    fogDensity: 0.0008,
    sunTint: new Color3(1, 0.95, 0.85),
    cloudCount: 12,
    cloudAlpha: 0.5,
  },
  snow: {
    topColor: '#4a6070',
    midColor: '#9eacb8',
    bottomColor: '#c5d0d8',
    clearColor: new Color4(0.75, 0.8, 0.85, 1),
    ambientColor: new Color3(0.6, 0.65, 0.7),
    fogColor: new Color3(0.78, 0.82, 0.88),
    fogDensity: 0.0015,
    sunTint: new Color3(0.9, 0.92, 1),
    cloudCount: 18,
    cloudAlpha: 0.7,
  },
  normandy: {
    topColor: '#354555',
    midColor: '#6a7a85',
    bottomColor: '#8a9aa5',
    clearColor: new Color4(0.5, 0.55, 0.6, 1),
    ambientColor: new Color3(0.4, 0.42, 0.45),
    fogColor: new Color3(0.55, 0.58, 0.62),
    fogDensity: 0.0014,
    sunTint: new Color3(0.8, 0.82, 0.88),
    cloudCount: 25,
    cloudAlpha: 0.7,
  },
  stalingrad: {
    topColor: '#2a1e1a',
    midColor: '#5a4035',
    bottomColor: '#7a5848',
    clearColor: new Color4(0.35, 0.28, 0.25, 1),
    ambientColor: new Color3(0.3, 0.25, 0.22),
    fogColor: new Color3(0.4, 0.32, 0.28),
    fogDensity: 0.002,
    sunTint: new Color3(1, 0.6, 0.3),
    cloudCount: 20,
    cloudAlpha: 0.8,
  },
  kursk: {
    topColor: '#1a5599',
    midColor: '#5ba0d8',
    bottomColor: '#80c0e8',
    clearColor: new Color4(0.5, 0.65, 0.85, 1),
    ambientColor: new Color3(0.4, 0.5, 0.4),
    fogColor: new Color3(0.5, 0.55, 0.45),
    fogDensity: 0.0006,
    sunTint: new Color3(1, 0.95, 0.88),
    cloudCount: 10,
    cloudAlpha: 0.4,
  },
  ardennes: {
    topColor: '#455565',
    midColor: '#8a98a5',
    bottomColor: '#b0bcc5',
    clearColor: new Color4(0.6, 0.65, 0.7, 1),
    ambientColor: new Color3(0.5, 0.52, 0.55),
    fogColor: new Color3(0.7, 0.74, 0.78),
    fogDensity: 0.0018,
    sunTint: new Color3(0.85, 0.88, 0.95),
    cloudCount: 22,
    cloudAlpha: 0.65,
  },
};

export class SkyboxManager {
  private skybox: Mesh | null = null;
  private skyMat: StandardMaterial | null = null;

  constructor(private scene: Scene) {}

  setTheme(theme: SkyTheme): void {
    this.disposeSky();

    const cfg = SKY_CONFIGS[theme] || SKY_CONFIGS.forest;

    this.scene.clearColor = cfg.clearColor;
    this.scene.ambientColor = cfg.ambientColor;
    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = cfg.fogDensity;
    this.scene.fogColor = cfg.fogColor;

    this.skybox = MeshBuilder.CreateSphere('skybox', { diameter: 800, segments: 32 }, this.scene);
    this.skyMat = new StandardMaterial('skyboxMat', this.scene);
    this.skyMat.backFaceCulling = false;
    this.skyMat.disableLighting = true;

    const tex = this.createSkyTexture(cfg);
    this.skyMat.emissiveTexture = tex;
    this.skyMat.emissiveColor = Color3.White();
    this.skyMat.diffuseColor = Color3.Black();

    this.skybox.material = this.skyMat;
    this.skybox.infiniteDistance = true;
    this.skybox.renderingGroupId = 0;
  }

  getSkyboxMesh(): Mesh | null {
    return this.skybox;
  }

  getSunTint(theme: SkyTheme): Color3 {
    return (SKY_CONFIGS[theme] || SKY_CONFIGS.forest).sunTint;
  }

  private createSkyTexture(cfg: SkyConfig): DynamicTexture {
    const size = 512;
    const tex = new DynamicTexture('skyTex', size, this.scene, false);
    const ctx = tex.getContext();

    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, cfg.topColor);
    gradient.addColorStop(0.4, cfg.midColor);
    gradient.addColorStop(1, cfg.bottomColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    for (let i = 0; i < cfg.cloudCount; i++) {
      const cx = Math.random() * size;
      const cy = Math.random() * size * 0.55;
      const w = 20 + Math.random() * 60;
      const h = 4 + Math.random() * 14;
      ctx.fillStyle = `rgba(255,255,255,${cfg.cloudAlpha * (0.3 + Math.random() * 0.7)})`;
      ctx.beginPath();
      if ((ctx as any).ellipse) {
        (ctx as any).ellipse(cx, cy, w, h, 0, 0, Math.PI * 2);
      } else {
        ctx.arc(cx, cy, w, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    if (cfg.cloudAlpha < 0.5) {
      ctx.fillStyle = `rgba(255,255,200,0.9)`;
      ctx.beginPath();
      ctx.arc(size * 0.75, size * 0.15, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = `rgba(255,255,180,0.3)`;
      ctx.beginPath();
      ctx.arc(size * 0.75, size * 0.15, 40, 0, Math.PI * 2);
      ctx.fill();
    }

    tex.update();
    return tex;
  }

  private disposeSky(): void {
    this.skybox?.dispose();
    this.skybox = null;
    this.skyMat?.dispose();
    this.skyMat = null;
  }

  dispose(): void {
    this.disposeSky();
  }
}
