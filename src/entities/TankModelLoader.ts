import { Scene } from '@babylonjs/core/scene';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode';
import { SceneLoader } from '@babylonjs/core/Loading/sceneLoader';
import '@babylonjs/loaders/glTF';

export class TankModelLoader {
  private static modelCache: Map<string, boolean> = new Map();

  static async loadModel(
    scene: Scene,
    modelPath: string,
    parent: TransformNode
  ): Promise<{ turretNode: TransformNode | null; firePoint: TransformNode | null } | null> {
    try {
      const result = await SceneLoader.ImportMeshAsync('', modelPath, '', scene);

      if (result.meshes.length === 0) return null;

      let turretNode: TransformNode | null = null;
      let firePoint: TransformNode | null = null;

      for (const mesh of result.meshes) {
        if (!mesh.parent) {
          mesh.parent = parent;
        }

        const name = mesh.name.toLowerCase();
        if (name.includes('turret')) {
          turretNode = mesh;
        }
        if (name.includes('firepoint') || name.includes('fire_point') || name.includes('muzzle')) {
          firePoint = mesh;
        }
      }

      TankModelLoader.modelCache.set(modelPath, true);
      return { turretNode, firePoint };
    } catch (e) {
      console.warn(`Failed to load tank model: ${modelPath}`, e);
      TankModelLoader.modelCache.set(modelPath, false);
      return null;
    }
  }

  static isModelAvailable(modelPath: string): boolean | undefined {
    return this.modelCache.get(modelPath);
  }
}
