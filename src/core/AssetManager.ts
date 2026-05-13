import {
  Scene, Texture, CubeTexture, HDRCubeTexture,
  SceneLoader, AssetContainer,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { DeviceDetector } from '../utils/DeviceDetector';

export interface PBRTextureSet {
  albedo: Texture;
  normal: Texture;
  roughness: Texture;
}

export class AssetManager {
  private textureCache = new Map<string, PBRTextureSet>();
  private modelCache = new Map<string, AssetContainer>();
  private hdrCache = new Map<string, CubeTexture | HDRCubeTexture>();

  constructor(private scene: Scene) {}

  get texResolution(): number {
    return DeviceDetector.isMobile() ? 512 : 1024;
  }

  async loadTextureSet(id: string, basePath: string): Promise<PBRTextureSet> {
    if (this.textureCache.has(id)) return this.textureCache.get(id)!;

    const [albedo, normal, roughness] = await Promise.all([
      this.loadTex(`${basePath}/albedo.jpg`),
      this.loadTex(`${basePath}/normal.jpg`),
      this.loadTex(`${basePath}/roughness.jpg`),
    ]);

    const set: PBRTextureSet = { albedo, normal, roughness };
    this.textureCache.set(id, set);
    return set;
  }

  async loadModel(id: string, path: string): Promise<AssetContainer> {
    if (this.modelCache.has(id)) return this.modelCache.get(id)!;

    const lastSlash = path.lastIndexOf('/');
    const rootUrl = path.substring(0, lastSlash + 1);
    const fileName = path.substring(lastSlash + 1);

    const container = await SceneLoader.LoadAssetContainerAsync(
      rootUrl, fileName, this.scene
    );
    this.modelCache.set(id, container);
    return container;
  }

  async loadHDR(id: string, path: string): Promise<CubeTexture | HDRCubeTexture> {
    if (this.hdrCache.has(id)) return this.hdrCache.get(id)!;

    const size = DeviceDetector.isMobile() ? 256 : 512;
    const tex = new HDRCubeTexture(path, this.scene, size);
    this.hdrCache.set(id, tex);
    return tex;
  }

  private loadTex(url: string): Promise<Texture> {
    return new Promise((resolve, reject) => {
      const tex = new Texture(url, this.scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
        () => resolve(tex),
        (_msg, err) => reject(err ?? new Error(`Failed to load ${url}`))
      );
    });
  }

  dispose(): void {
    this.textureCache.forEach(set => {
      set.albedo.dispose();
      set.normal.dispose();
      set.roughness.dispose();
    });
    this.textureCache.clear();

    this.modelCache.forEach(c => c.dispose());
    this.modelCache.clear();

    this.hdrCache.forEach(t => t.dispose());
    this.hdrCache.clear();
  }
}
