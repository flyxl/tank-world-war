import {
  Scene, MeshBuilder, Mesh, HDRCubeTexture,
  StandardMaterial, Color3, Color4,
} from '@babylonjs/core';
import { DeviceDetector } from '../utils/DeviceDetector';

export type SkyTheme = 'desert' | 'urban' | 'forest' | 'snow'
  | 'normandy' | 'stalingrad' | 'kursk' | 'ardennes';

const SKY_HDR_MAP: Record<SkyTheme, string> = {
  desert: 'assets/skyboxes/desert.hdr',
  urban: 'assets/skyboxes/overcast.hdr',
  forest: 'assets/skyboxes/clear.hdr',
  snow: 'assets/skyboxes/winter.hdr',
  normandy: 'assets/skyboxes/stormy.hdr',
  stalingrad: 'assets/skyboxes/smoky.hdr',
  kursk: 'assets/skyboxes/clear.hdr',
  ardennes: 'assets/skyboxes/winter.hdr',
};

const SKY_AMBIENT: Record<SkyTheme, { clear: Color4; ambient: Color3 }> = {
  desert:      { clear: new Color4(0.85, 0.65, 0.4, 1),  ambient: new Color3(0.6, 0.5, 0.35) },
  urban:       { clear: new Color4(0.5, 0.52, 0.55, 1),  ambient: new Color3(0.4, 0.4, 0.42) },
  forest:      { clear: new Color4(0.45, 0.6, 0.8, 1),   ambient: new Color3(0.35, 0.45, 0.35) },
  snow:        { clear: new Color4(0.75, 0.8, 0.85, 1),  ambient: new Color3(0.6, 0.65, 0.7) },
  normandy:    { clear: new Color4(0.5, 0.55, 0.6, 1),   ambient: new Color3(0.4, 0.42, 0.45) },
  stalingrad:  { clear: new Color4(0.35, 0.28, 0.25, 1), ambient: new Color3(0.3, 0.25, 0.22) },
  kursk:       { clear: new Color4(0.5, 0.65, 0.85, 1),  ambient: new Color3(0.4, 0.5, 0.4) },
  ardennes:    { clear: new Color4(0.6, 0.65, 0.7, 1),   ambient: new Color3(0.5, 0.52, 0.55) },
};

export class SkyboxManager {
  private skybox: Mesh | null = null;
  private currentHdr: HDRCubeTexture | null = null;

  constructor(private scene: Scene) {}

  setTheme(theme: SkyTheme): void {
    this.disposeSky();

    const hdrPath = SKY_HDR_MAP[theme];
    const colors = SKY_AMBIENT[theme] || SKY_AMBIENT.forest;

    this.scene.clearColor = colors.clear;
    this.scene.ambientColor = colors.ambient;

    const size = DeviceDetector.isMobile() ? 256 : 512;

    try {
      this.currentHdr = new HDRCubeTexture(hdrPath, this.scene, size);
      this.scene.environmentTexture = this.currentHdr;
      this.skybox = this.scene.createDefaultSkybox(this.currentHdr, true, 1000, 0.3) as Mesh;
    } catch {
      this.createFallbackSky();
    }
  }

  getSkyboxMesh(): Mesh | null {
    return this.skybox;
  }

  private createFallbackSky(): void {
    this.skybox = MeshBuilder.CreateBox('skybox', { size: 500 }, this.scene);
    const mat = new StandardMaterial('skyMat', this.scene);
    mat.backFaceCulling = false;
    mat.disableLighting = true;
    mat.emissiveColor = new Color3(0.3, 0.4, 0.5);
    this.skybox.material = mat;
    this.skybox.infiniteDistance = true;
  }

  private disposeSky(): void {
    this.skybox?.dispose();
    this.skybox = null;
    if (this.currentHdr) {
      if (this.scene.environmentTexture === this.currentHdr) {
        this.scene.environmentTexture = null;
      }
      this.currentHdr.dispose();
      this.currentHdr = null;
    }
  }

  dispose(): void {
    this.disposeSky();
  }
}
