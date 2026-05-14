import {
  Scene, MeshBuilder, Mesh, Vector3, Vector2, Color3, Texture,
} from '@babylonjs/core';
import { WaterMaterial } from '@babylonjs/materials';
import { DeviceDetector } from '../utils/DeviceDetector';

export interface WaterConfig {
  waterLevel: number;
  size: number;
  position: Vector3;
}

export class WaterSystem {
  private waterMesh: Mesh | null = null;
  private waterMaterial: WaterMaterial | null = null;

  constructor(private scene: Scene) {}

  create(config: WaterConfig, skybox?: Mesh | null): void {
    this.dispose();

    this.waterMesh = MeshBuilder.CreateGround('waterPlane', {
      width: config.size,
      height: config.size,
      subdivisions: 32,
    }, this.scene);
    this.waterMesh.position = config.position.clone();
    this.waterMesh.position.y = config.waterLevel;

    const mobile = DeviceDetector.isMobile();

    this.waterMaterial = new WaterMaterial('waterMat', this.scene);
    this.waterMaterial.bumpTexture = new Texture(
      'https://assets.babylonjs.com/textures/waterbump.png',
      this.scene
    );
    this.waterMaterial.windForce = -5;
    this.waterMaterial.waveHeight = 0.3;
    this.waterMaterial.windDirection = new Vector2(1, 1);
    this.waterMaterial.waterColor = new Color3(0.1, 0.2, 0.3);
    this.waterMaterial.colorBlendFactor = 0.3;
    this.waterMaterial.bumpHeight = 0.1;
    this.waterMaterial.waveLength = 0.1;

    if (!mobile && skybox) {
      this.waterMaterial.addToRenderList(skybox);
    }

    this.waterMesh.material = this.waterMaterial;
  }

  getWaterDepth(terrainY: number, waterLevel: number): number {
    return Math.max(0, waterLevel - terrainY);
  }

  dispose(): void {
    this.waterMaterial?.dispose();
    this.waterMaterial = null;
    this.waterMesh?.dispose();
    this.waterMesh = null;
  }
}
