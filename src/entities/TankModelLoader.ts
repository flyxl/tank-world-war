import {
  AbstractMesh,
  Color3,
  PBRMetallicRoughnessMaterial,
  Scene,
  SceneLoader,
  TransformNode,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import '@babylonjs/loaders/OBJ';
import '@babylonjs/loaders/STL';

const SUPPORTED_EXTENSIONS = ['.glb', '.gltf', '.obj', '.stl'];

export class TankModelLoader {
  private static modelCache: Map<string, boolean> = new Map();

  private static getExtension(path: string): string {
    const idx = path.lastIndexOf('.');
    return idx >= 0 ? path.substring(idx).toLowerCase() : '';
  }

  /**
   * STL files have no material data; OBJ files may lack .mtl.
   * Apply a default PBR military-green material to any mesh without one.
   */
  private static applyDefaultMaterial(mesh: AbstractMesh, scene: Scene): void {
    if (mesh.material) return;
    const mat = new PBRMetallicRoughnessMaterial('defaultTankMat', scene);
    mat.baseColor = new Color3(0.32, 0.38, 0.22);
    mat.metallic = 0.7;
    mat.roughness = 0.55;
    mesh.material = mat;
  }

  static async loadModel(
    scene: Scene,
    modelPath: string,
    parent: TransformNode
  ): Promise<{ turretNode: TransformNode | null; firePoint: TransformNode | null } | null> {
    const ext = this.getExtension(modelPath);
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      console.warn(`Unsupported model format: ${ext}. Supported: ${SUPPORTED_EXTENSIONS.join(', ')}`);
      return null;
    }

    try {
      const result = await SceneLoader.ImportMeshAsync('', modelPath, '', scene);

      if (result.meshes.length === 0) return null;

      let turretNode: TransformNode | null = null;
      let firePoint: TransformNode | null = null;

      const needsDefaultMaterial = ext === '.stl' || ext === '.obj';

      for (const mesh of result.meshes) {
        if (!mesh.parent) {
          mesh.parent = parent;
        }

        if (needsDefaultMaterial) {
          this.applyDefaultMaterial(mesh, scene);
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

  static getSupportedExtensions(): string[] {
    return [...SUPPORTED_EXTENSIONS];
  }
}
