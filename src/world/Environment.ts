import { Scene, Mesh, MeshBuilder, Vector3, PBRMetallicRoughnessMaterial, StandardMaterial, Color3, ShadowGenerator, TransformNode } from '@babylonjs/core';
import { MathUtils } from '../utils/MathUtils';
import { Terrain } from './Terrain';

export type EnvTheme = 'desert' | 'urban' | 'forest' | 'snow';

export class Environment {
  private objects: TransformNode[] = [];
  private colliders: Mesh[] = [];

  constructor(private scene: Scene) {}

  generate(theme: EnvTheme, terrain: Terrain, shadowGen: ShadowGenerator | null): void {
    this.clear();

    switch (theme) {
      case 'desert':
        this.generateDesert(terrain, shadowGen);
        break;
      case 'urban':
        this.generateUrban(terrain, shadowGen);
        break;
      case 'forest':
        this.generateForest(terrain, shadowGen);
        break;
      case 'snow':
        this.generateSnow(terrain, shadowGen);
        break;
    }
  }

  private generateDesert(terrain: Terrain, sg: ShadowGenerator | null): void {
    const rockMat = new PBRMetallicRoughnessMaterial('rockMat', this.scene);
    rockMat.baseColor = new Color3(0.6, 0.5, 0.35);
    rockMat.metallic = 0.1;
    rockMat.roughness = 0.9;

    for (let i = 0; i < 30; i++) {
      const rock = MeshBuilder.CreateBox('rock', {
        width: MathUtils.randomRange(1, 4),
        height: MathUtils.randomRange(0.5, 3),
        depth: MathUtils.randomRange(1, 4),
      }, this.scene);
      rock.material = rockMat;
      const x = MathUtils.randomRange(-80, 80);
      const z = MathUtils.randomRange(-80, 80);
      rock.position.set(x, terrain.getHeightAt(x, z), z);
      rock.rotation.y = Math.random() * Math.PI * 2;
      rock.rotation.x = MathUtils.randomRange(-0.2, 0.2);
      sg?.addShadowCaster(rock);
      this.objects.push(rock);
      this.colliders.push(rock);
    }

    const cactusMat = new PBRMetallicRoughnessMaterial('cactusMat', this.scene);
    cactusMat.baseColor = new Color3(0.2, 0.5, 0.15);
    cactusMat.roughness = 0.8;

    for (let i = 0; i < 20; i++) {
      const cactus = this.createCactus(cactusMat);
      const x = MathUtils.randomRange(-80, 80);
      const z = MathUtils.randomRange(-80, 80);
      cactus.position.set(x, terrain.getHeightAt(x, z), z);
      sg?.addShadowCaster(cactus as unknown as Mesh);
      this.objects.push(cactus);
    }
  }

  private generateUrban(terrain: Terrain, sg: ShadowGenerator | null): void {
    const buildingMat = new PBRMetallicRoughnessMaterial('buildingMat', this.scene);
    buildingMat.baseColor = new Color3(0.5, 0.48, 0.45);
    buildingMat.metallic = 0.2;
    buildingMat.roughness = 0.85;

    const rubbleMat = new PBRMetallicRoughnessMaterial('rubbleMat', this.scene);
    rubbleMat.baseColor = new Color3(0.55, 0.52, 0.48);
    rubbleMat.roughness = 0.95;

    for (let i = 0; i < 20; i++) {
      const w = MathUtils.randomRange(3, 10);
      const h = MathUtils.randomRange(2, 12);
      const d = MathUtils.randomRange(3, 10);
      const building = MeshBuilder.CreateBox('building', { width: w, height: h, depth: d }, this.scene);
      building.material = buildingMat;
      const x = MathUtils.randomRange(-70, 70);
      const z = MathUtils.randomRange(-70, 70);
      building.position.set(x, h / 2 + terrain.getHeightAt(x, z), z);
      building.rotation.y = Math.random() * Math.PI * 2;
      sg?.addShadowCaster(building);
      this.objects.push(building);
      this.colliders.push(building);
    }

    for (let i = 0; i < 40; i++) {
      const rubble = MeshBuilder.CreateBox('rubble', {
        width: MathUtils.randomRange(0.5, 2),
        height: MathUtils.randomRange(0.3, 1),
        depth: MathUtils.randomRange(0.5, 2),
      }, this.scene);
      rubble.material = rubbleMat;
      const x = MathUtils.randomRange(-80, 80);
      const z = MathUtils.randomRange(-80, 80);
      rubble.position.set(x, terrain.getHeightAt(x, z) + 0.2, z);
      rubble.rotation.set(MathUtils.randomRange(-0.3, 0.3), Math.random() * 6, MathUtils.randomRange(-0.3, 0.3));
      this.objects.push(rubble);
    }
  }

  private generateForest(terrain: Terrain, sg: ShadowGenerator | null): void {
    const trunkMat = new PBRMetallicRoughnessMaterial('trunkMat', this.scene);
    trunkMat.baseColor = new Color3(0.35, 0.22, 0.1);
    trunkMat.roughness = 0.9;

    const leafMat = new PBRMetallicRoughnessMaterial('leafMat', this.scene);
    leafMat.baseColor = new Color3(0.15, 0.45, 0.12);
    leafMat.roughness = 0.85;
    leafMat.metallic = 0.0;

    for (let i = 0; i < 60; i++) {
      const x = MathUtils.randomRange(-85, 85);
      const z = MathUtils.randomRange(-85, 85);
      if (Math.abs(x) < 15 && Math.abs(z) < 15) continue;

      const tree = this.createTree(trunkMat, leafMat);
      tree.position.set(x, terrain.getHeightAt(x, z), z);
      tree.scaling.setAll(MathUtils.randomRange(0.7, 1.3));
      tree.rotation.y = Math.random() * Math.PI * 2;
      sg?.addShadowCaster(tree as unknown as Mesh);
      this.objects.push(tree);
    }

    const grassMat = new StandardMaterial('grassBlade', this.scene);
    grassMat.diffuseColor = new Color3(0.2, 0.55, 0.15);
    grassMat.specularColor = Color3.Black();

    for (let i = 0; i < 100; i++) {
      const x = MathUtils.randomRange(-80, 80);
      const z = MathUtils.randomRange(-80, 80);
      const grass = MeshBuilder.CreatePlane('grass', { width: 0.3, height: MathUtils.randomRange(0.3, 0.8) }, this.scene);
      grass.material = grassMat;
      grass.position.set(x, terrain.getHeightAt(x, z) + 0.2, z);
      grass.rotation.y = Math.random() * Math.PI;
      grass.billboardMode = Mesh.BILLBOARDMODE_Y;
      this.objects.push(grass);
    }
  }

  private generateSnow(terrain: Terrain, sg: ShadowGenerator | null): void {
    const snowRockMat = new PBRMetallicRoughnessMaterial('snowRock', this.scene);
    snowRockMat.baseColor = new Color3(0.7, 0.72, 0.75);
    snowRockMat.roughness = 0.85;

    for (let i = 0; i < 35; i++) {
      const rock = MeshBuilder.CreateBox('snowRock', {
        width: MathUtils.randomRange(1, 5),
        height: MathUtils.randomRange(1, 4),
        depth: MathUtils.randomRange(1, 5),
      }, this.scene);
      rock.material = snowRockMat;
      const x = MathUtils.randomRange(-80, 80);
      const z = MathUtils.randomRange(-80, 80);
      rock.position.set(x, terrain.getHeightAt(x, z), z);
      rock.rotation.y = Math.random() * Math.PI * 2;
      sg?.addShadowCaster(rock);
      this.objects.push(rock);
      this.colliders.push(rock);
    }

    const pineMat = new PBRMetallicRoughnessMaterial('pineMat', this.scene);
    pineMat.baseColor = new Color3(0.12, 0.28, 0.12);
    pineMat.roughness = 0.9;

    const trunkMat = new PBRMetallicRoughnessMaterial('pTrunk', this.scene);
    trunkMat.baseColor = new Color3(0.3, 0.2, 0.1);
    trunkMat.roughness = 0.9;

    for (let i = 0; i < 30; i++) {
      const x = MathUtils.randomRange(-85, 85);
      const z = MathUtils.randomRange(-85, 85);
      if (Math.abs(x) < 15 && Math.abs(z) < 15) continue;

      const pine = this.createPineTree(trunkMat, pineMat);
      pine.position.set(x, terrain.getHeightAt(x, z), z);
      pine.scaling.setAll(MathUtils.randomRange(0.6, 1.2));
      sg?.addShadowCaster(pine as unknown as Mesh);
      this.objects.push(pine);
    }
  }

  private createCactus(mat: PBRMetallicRoughnessMaterial): TransformNode {
    const root = new TransformNode('cactus', this.scene);
    const trunk = MeshBuilder.CreateCylinder('cTrunk', { height: 2, diameter: 0.4, tessellation: 8 }, this.scene);
    trunk.material = mat;
    trunk.parent = root;
    trunk.position.y = 1;

    if (Math.random() > 0.3) {
      const arm = MeshBuilder.CreateCylinder('cArm', { height: 1, diameter: 0.3, tessellation: 8 }, this.scene);
      arm.material = mat;
      arm.parent = root;
      arm.position.set(0.4, 1.2, 0);
      arm.rotation.z = -Math.PI / 4;
    }
    return root;
  }

  private createTree(trunkMat: PBRMetallicRoughnessMaterial, leafMat: PBRMetallicRoughnessMaterial): TransformNode {
    const root = new TransformNode('tree', this.scene);
    const h = MathUtils.randomRange(3, 6);

    const trunk = MeshBuilder.CreateCylinder('trunk', { height: h, diameterTop: 0.2, diameterBottom: 0.4, tessellation: 8 }, this.scene);
    trunk.material = trunkMat;
    trunk.parent = root;
    trunk.position.y = h / 2;

    const leafSize = MathUtils.randomRange(1.5, 3);
    const leaves = MeshBuilder.CreateSphere('leaves', { diameter: leafSize, segments: 6 }, this.scene);
    leaves.material = leafMat;
    leaves.parent = root;
    leaves.position.y = h;
    leaves.scaling.y = 0.7;

    return root;
  }

  private createPineTree(trunkMat: PBRMetallicRoughnessMaterial, pineMat: PBRMetallicRoughnessMaterial): TransformNode {
    const root = new TransformNode('pine', this.scene);
    const h = MathUtils.randomRange(4, 8);

    const trunk = MeshBuilder.CreateCylinder('trunk', { height: h, diameterTop: 0.1, diameterBottom: 0.3, tessellation: 8 }, this.scene);
    trunk.material = trunkMat;
    trunk.parent = root;
    trunk.position.y = h / 2;

    for (let layer = 0; layer < 3; layer++) {
      const y = h * 0.4 + (h * 0.5 * layer) / 3;
      const size = (1.5 - layer * 0.3);
      const cone = MeshBuilder.CreateCylinder('pineLayer', { height: h * 0.25, diameterTop: 0, diameterBottom: size * 2, tessellation: 8 }, this.scene);
      cone.material = pineMat;
      cone.parent = root;
      cone.position.y = y;
    }

    return root;
  }

  getColliders(): Mesh[] {
    return this.colliders;
  }

  clear(): void {
    this.objects.forEach((o) => o.dispose());
    this.objects = [];
    this.colliders = [];
  }

  dispose(): void {
    this.clear();
  }
}
