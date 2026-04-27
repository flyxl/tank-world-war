import { Scene } from '@babylonjs/core/scene';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color';
import { Texture } from '@babylonjs/core/Materials/Textures/texture';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture';
import { Mesh } from '@babylonjs/core/Meshes/mesh';

export type SkyTheme = 'desert' | 'urban' | 'forest' | 'snow';

export class SkyboxManager {
  private skybox: Mesh;
  private skyMat: StandardMaterial;

  constructor(private scene: Scene) {
    this.skybox = MeshBuilder.CreateBox('skybox', { size: 500 }, scene);
    this.skyMat = new StandardMaterial('skyboxMat', scene);
    this.skyMat.backFaceCulling = false;
    this.skyMat.disableLighting = true;
    this.skybox.material = this.skyMat;
    this.skybox.infiniteDistance = true;
    this.skybox.renderingGroupId = 0;

    this.setTheme('forest');
  }

  setTheme(theme: SkyTheme): void {
    const tex = this.createSkyTexture(theme);
    this.skyMat.emissiveTexture = tex;
    this.skyMat.emissiveColor = Color3.White();
    this.skyMat.diffuseColor = Color3.Black();

    switch (theme) {
      case 'desert':
        this.scene.clearColor = new Color4(0.85, 0.65, 0.4, 1);
        this.scene.ambientColor = new Color3(0.6, 0.5, 0.35);
        break;
      case 'urban':
        this.scene.clearColor = new Color4(0.5, 0.52, 0.55, 1);
        this.scene.ambientColor = new Color3(0.4, 0.4, 0.42);
        break;
      case 'forest':
        this.scene.clearColor = new Color4(0.45, 0.6, 0.8, 1);
        this.scene.ambientColor = new Color3(0.35, 0.45, 0.35);
        break;
      case 'snow':
        this.scene.clearColor = new Color4(0.75, 0.8, 0.85, 1);
        this.scene.ambientColor = new Color3(0.6, 0.65, 0.7);
        break;
    }
  }

  private createSkyTexture(theme: SkyTheme): DynamicTexture {
    const size = 256;
    const tex = new DynamicTexture('skyTex', size, this.scene, false);
    const ctx = tex.getContext();

    let topColor: string, midColor: string, bottomColor: string;

    switch (theme) {
      case 'desert':
        topColor = '#1a3a6e';
        midColor = '#e8a953';
        bottomColor = '#d4915a';
        break;
      case 'urban':
        topColor = '#4a5568';
        midColor = '#8899aa';
        bottomColor = '#a0aab4';
        break;
      case 'forest':
        topColor = '#1e5799';
        midColor = '#7db9e8';
        bottomColor = '#a8d8f0';
        break;
      case 'snow':
        topColor = '#607d8b';
        midColor = '#b0bec5';
        bottomColor = '#cfd8dc';
        break;
    }

    const gradient = ctx.createLinearGradient(0, 0, 0, size);
    gradient.addColorStop(0, topColor);
    gradient.addColorStop(0.4, midColor);
    gradient.addColorStop(1, bottomColor);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 15; i++) {
      const cx = Math.random() * size;
      const cy = Math.random() * size * 0.5;
      const w = 20 + Math.random() * 40;
      const h = 5 + Math.random() * 10;
      ctx.beginPath();
      (ctx as any).ellipse?.(cx, cy, w, h, 0, 0, Math.PI * 2);
      if (!(ctx as any).ellipse) {
        ctx.arc(cx, cy, w, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    tex.update();
    return tex;
  }

  dispose(): void {
    this.skybox.dispose();
  }
}
