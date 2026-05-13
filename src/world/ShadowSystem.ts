import {
  Scene, DirectionalLight, CascadedShadowGenerator, Mesh,
} from '@babylonjs/core';
import { DeviceDetector } from '../utils/DeviceDetector';

export class ShadowSystem {
  generator: CascadedShadowGenerator;

  constructor(scene: Scene, sunLight: DirectionalLight) {
    const mobile = DeviceDetector.isMobile();
    const mapSize = mobile ? 1024 : 2048;
    const numCascades = mobile ? 2 : 4;

    this.generator = new CascadedShadowGenerator(mapSize, sunLight);
    this.generator.numCascades = numCascades;
    this.generator.lambda = 0.9;
    this.generator.shadowMaxZ = mobile ? 60 : 100;
    this.generator.bias = 0.005;
    this.generator.normalBias = 0.02;
    this.generator.usePercentageCloserFiltering = true;
    this.generator.filteringQuality = mobile
      ? CascadedShadowGenerator.QUALITY_LOW
      : CascadedShadowGenerator.QUALITY_MEDIUM;
    this.generator.stabilizeCascades = true;
    this.generator.depthClamp = true;
  }

  addCaster(mesh: Mesh): void {
    this.generator.addShadowCaster(mesh);
  }

  dispose(): void {
    this.generator.dispose();
  }
}
