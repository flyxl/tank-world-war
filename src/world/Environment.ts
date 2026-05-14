import { Scene, Mesh, MeshBuilder, Vector3, VertexData, PBRMetallicRoughnessMaterial, StandardMaterial, Color3, ShadowGenerator, TransformNode } from '@babylonjs/core';
import { MathUtils } from '../utils/MathUtils';
import { Terrain } from './Terrain';

export type EnvTheme = 'desert' | 'urban' | 'forest' | 'snow'
  | 'normandy' | 'stalingrad' | 'kursk' | 'ardennes';

export class Environment {
  private objects: TransformNode[] = [];
  private colliders: Mesh[] = [];

  constructor(private scene: Scene) {}

  generate(theme: EnvTheme, terrain: Terrain, shadowGen: ShadowGenerator | null): void {
    this.clear();

    switch (theme) {
      case 'desert':       this.generateDesert(terrain, shadowGen); break;
      case 'urban':        this.generateUrban(terrain, shadowGen); break;
      case 'forest':       this.generateForest(terrain, shadowGen); break;
      case 'snow':         this.generateSnow(terrain, shadowGen); break;
      case 'normandy':     this.generateNormandy(terrain, shadowGen); break;
      case 'stalingrad':   this.generateStalingrad(terrain, shadowGen); break;
      case 'kursk':        this.generateKursk(terrain, shadowGen); break;
      case 'ardennes':     this.generateArdennes(terrain, shadowGen); break;
    }
  }

  private generateDesert(terrain: Terrain, sg: ShadowGenerator | null): void {
    const rockMat = new PBRMetallicRoughnessMaterial('rockMat', this.scene);
    rockMat.baseColor = new Color3(0.6, 0.5, 0.35);
    rockMat.metallic = 0.1;
    rockMat.roughness = 0.9;

    for (let i = 0; i < 30; i++) {
      const rock = this.createRock('rock', rockMat, 0.5, 2.0);
      const x = MathUtils.randomRange(-80, 80);
      const z = MathUtils.randomRange(-80, 80);
      rock.position.set(x, terrain.getHeightAt(x, z) + 0.3, z);
      rock.rotation.y = Math.random() * Math.PI * 2;
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
      this.addShadowCasters(sg, cactus);
      this.objects.push(cactus);
    }

    const pebbleMat = new PBRMetallicRoughnessMaterial('pebbleMat', this.scene);
    pebbleMat.baseColor = new Color3(0.55, 0.48, 0.35);
    pebbleMat.roughness = 0.95;
    for (let i = 0; i < 80; i++) {
      const pebble = this.createRock('pebble', pebbleMat, 0.05, 0.2);
      const x = MathUtils.randomRange(-85, 85);
      const z = MathUtils.randomRange(-85, 85);
      pebble.position.set(x, terrain.getHeightAt(x, z) + 0.05, z);
      this.objects.push(pebble);
    }

    const dryGrassMat = new StandardMaterial('dryGrass', this.scene);
    dryGrassMat.diffuseColor = new Color3(0.6, 0.55, 0.3);
    dryGrassMat.specularColor = Color3.Black();
    for (let i = 0; i < 60; i++) {
      const x = MathUtils.randomRange(-80, 80);
      const z = MathUtils.randomRange(-80, 80);
      const blade = MeshBuilder.CreatePlane('dryGrass', { width: 0.3, height: MathUtils.randomRange(0.2, 0.5) }, this.scene);
      blade.material = dryGrassMat;
      blade.position.set(x, terrain.getHeightAt(x, z) + 0.15, z);
      blade.rotation.y = Math.random() * Math.PI;
      blade.billboardMode = Mesh.BILLBOARDMODE_Y;
      this.objects.push(blade);
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

    const windowMat = new PBRMetallicRoughnessMaterial('windowMat', this.scene);
    windowMat.baseColor = new Color3(0.15, 0.18, 0.22);
    windowMat.metallic = 0.3;
    windowMat.roughness = 0.3;

    for (let i = 0; i < 20; i++) {
      const bldg = this.createBuilding(buildingMat, rubbleMat, windowMat, sg);
      const x = MathUtils.randomRange(-70, 70);
      const z = MathUtils.randomRange(-70, 70);
      const h = bldg.metadata?.height ?? 6;
      bldg.position.set(x, h / 2 + terrain.getHeightAt(x, z), z);
      bldg.rotation.y = Math.random() * Math.PI * 2;
      this.addShadowCasters(sg, bldg);
      this.objects.push(bldg);
      this.colliders.push(bldg.getChildMeshes().find(m => m.name === 'building') as Mesh);
    }

    for (let i = 0; i < 40; i++) {
      const rubble = this.createRock('rubble', rubbleMat, 0.3, 1.0);
      const x = MathUtils.randomRange(-80, 80);
      const z = MathUtils.randomRange(-80, 80);
      rubble.position.set(x, terrain.getHeightAt(x, z) + 0.15, z);
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
      this.addShadowCasters(sg, tree);
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
      const rock = this.createRock('snowRock', snowRockMat, 0.8, 2.5);
      const x = MathUtils.randomRange(-80, 80);
      const z = MathUtils.randomRange(-80, 80);
      rock.position.set(x, terrain.getHeightAt(x, z) + 0.3, z);
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
      this.addShadowCasters(sg, pine);
      this.objects.push(pine);
    }
  }

  private generateNormandy(terrain: Terrain, sg: ShadowGenerator | null): void {
    const bunkerMat = new PBRMetallicRoughnessMaterial('bunkerMat', this.scene);
    bunkerMat.baseColor = new Color3(0.5, 0.5, 0.48);
    bunkerMat.metallic = 0.15;
    bunkerMat.roughness = 0.9;

    const slitMat = new PBRMetallicRoughnessMaterial('slitMat', this.scene);
    slitMat.baseColor = new Color3(0.1, 0.1, 0.1);
    slitMat.roughness = 1;

    for (let i = 0; i < 8; i++) {
      const root = new TransformNode('bunkerGroup', this.scene);
      const bw = MathUtils.randomRange(5, 10);
      const bh = MathUtils.randomRange(2, 4);
      const bd = MathUtils.randomRange(5, 8);
      const bunker = MeshBuilder.CreateBox('bunker', { width: bw, height: bh, depth: bd }, this.scene);
      bunker.material = bunkerMat;
      bunker.parent = root;

      const slit = MeshBuilder.CreateBox('slit', { width: bw * 0.6, height: 0.4, depth: 0.2 }, this.scene);
      slit.material = slitMat;
      slit.parent = root;
      slit.position.set(0, bh * 0.2, -bd / 2 - 0.05);

      const x = MathUtils.randomRange(-60, 60);
      const z = MathUtils.randomRange(20, 70);
      root.position.set(x, bh / 2 + terrain.getHeightAt(x, z), z);
      this.addShadowCasters(sg, root);
      this.objects.push(root);
      this.colliders.push(bunker);
    }

    const sandbagMat = new PBRMetallicRoughnessMaterial('sandbagMat', this.scene);
    sandbagMat.baseColor = new Color3(0.55, 0.5, 0.35);
    sandbagMat.roughness = 0.95;

    for (let i = 0; i < 25; i++) {
      const bag = MeshBuilder.CreateCylinder('rock', {
        height: 0.3, diameter: 0.6, tessellation: 8,
      }, this.scene);
      bag.material = sandbagMat;
      bag.rotation.x = Math.PI / 2;
      const x = MathUtils.randomRange(-70, 70);
      const z = MathUtils.randomRange(-10, 50);
      bag.position.set(x, terrain.getHeightAt(x, z) + 0.15, z);
      bag.rotation.y = Math.random() * Math.PI;
      sg?.addShadowCaster(bag);
      this.objects.push(bag);
    }

    const beachRockMat = new PBRMetallicRoughnessMaterial('beachRock', this.scene);
    beachRockMat.baseColor = new Color3(0.6, 0.58, 0.5);
    beachRockMat.roughness = 0.9;
    for (let i = 0; i < 50; i++) {
      const peb = this.createRock('rock', beachRockMat, 0.05, 0.25);
      const x = MathUtils.randomRange(-90, 90);
      const z = MathUtils.randomRange(-60, -20);
      peb.position.set(x, terrain.getHeightAt(x, z) + 0.05, z);
      this.objects.push(peb);
    }

    this.addHedgerows(terrain, sg, 15);
    this.addAntiTankObstacles(terrain, sg, 20);
  }

  private generateStalingrad(terrain: Terrain, sg: ShadowGenerator | null): void {
    const ruinMat = new PBRMetallicRoughnessMaterial('ruinMat', this.scene);
    ruinMat.baseColor = new Color3(0.4, 0.35, 0.3);
    ruinMat.roughness = 0.95;

    const windowMat = new PBRMetallicRoughnessMaterial('sWindowMat', this.scene);
    windowMat.baseColor = new Color3(0.1, 0.1, 0.12);
    windowMat.roughness = 0.4;

    const rubbleMat = new PBRMetallicRoughnessMaterial('sRubbleMat', this.scene);
    rubbleMat.baseColor = new Color3(0.45, 0.38, 0.32);
    rubbleMat.roughness = 0.95;

    for (let i = 0; i < 25; i++) {
      const bldg = this.createBuilding(ruinMat, rubbleMat, windowMat, sg);
      const x = MathUtils.randomRange(-75, 75);
      const z = MathUtils.randomRange(-75, 75);
      const h = bldg.metadata?.height ?? 5;
      bldg.position.set(x, h / 2 + terrain.getHeightAt(x, z), z);
      bldg.rotation.y = Math.random() * Math.PI * 2;
      bldg.rotation.x = MathUtils.randomRange(-0.05, 0.05);
      this.addShadowCasters(sg, bldg);
      this.objects.push(bldg);
      this.colliders.push(bldg.getChildMeshes().find(m => m.name === 'building') as Mesh);
    }

    for (let i = 0; i < 60; i++) {
      const rubble = this.createRock('rubble', rubbleMat, 0.2, 1.2);
      const x = MathUtils.randomRange(-80, 80);
      const z = MathUtils.randomRange(-80, 80);
      rubble.position.set(x, terrain.getHeightAt(x, z) + 0.1, z);
      this.objects.push(rubble);
    }
  }

  private generateKursk(terrain: Terrain, sg: ShadowGenerator | null): void {
    const trunkMat = new PBRMetallicRoughnessMaterial('kTrunk', this.scene);
    trunkMat.baseColor = new Color3(0.35, 0.22, 0.1);
    trunkMat.roughness = 0.9;

    const leafMat = new PBRMetallicRoughnessMaterial('kLeaf', this.scene);
    leafMat.baseColor = new Color3(0.3, 0.55, 0.15);
    leafMat.roughness = 0.85;

    for (let i = 0; i < 25; i++) {
      const x = MathUtils.randomRange(-85, 85);
      const z = MathUtils.randomRange(-85, 85);
      if (Math.abs(x) < 20 && Math.abs(z) < 20) continue;
      const tree = this.createTree(trunkMat, leafMat);
      tree.position.set(x, terrain.getHeightAt(x, z), z);
      tree.scaling.setAll(MathUtils.randomRange(0.6, 1.1));
      this.addShadowCasters(sg, tree);
      this.objects.push(tree);
    }

    const trenchMat = new PBRMetallicRoughnessMaterial('trenchMat', this.scene);
    trenchMat.baseColor = new Color3(0.35, 0.3, 0.2);
    trenchMat.roughness = 0.95;

    for (let i = 0; i < 12; i++) {
      const wall = MeshBuilder.CreateBox('rock', {
        width: MathUtils.randomRange(8, 20),
        height: MathUtils.randomRange(0.5, 1.2),
        depth: MathUtils.randomRange(1, 2),
      }, this.scene);
      wall.material = trenchMat;
      const x = MathUtils.randomRange(-70, 70);
      const z = MathUtils.randomRange(-70, 70);
      wall.position.set(x, terrain.getHeightAt(x, z) + 0.3, z);
      wall.rotation.y = Math.random() * Math.PI;
      sg?.addShadowCaster(wall);
      this.objects.push(wall);
      this.colliders.push(wall);
    }

    const grassMat = new StandardMaterial('kGrass', this.scene);
    grassMat.diffuseColor = new Color3(0.25, 0.5, 0.15);
    grassMat.specularColor = Color3.Black();
    for (let i = 0; i < 120; i++) {
      const x = MathUtils.randomRange(-85, 85);
      const z = MathUtils.randomRange(-85, 85);
      const blade = MeshBuilder.CreatePlane('grass', {
        width: MathUtils.randomRange(0.15, 0.4),
        height: MathUtils.randomRange(0.3, 0.9),
      }, this.scene);
      blade.material = grassMat;
      blade.position.set(x, terrain.getHeightAt(x, z) + 0.2, z);
      blade.rotation.y = Math.random() * Math.PI;
      blade.billboardMode = Mesh.BILLBOARDMODE_Y;
      this.objects.push(blade);
    }

    const flowerColors = [
      new Color3(0.9, 0.8, 0.2),
      new Color3(0.9, 0.3, 0.3),
      new Color3(0.8, 0.5, 0.8),
    ];
    for (let i = 0; i < 40; i++) {
      const flowerMat = new StandardMaterial(`flower${i}`, this.scene);
      flowerMat.diffuseColor = flowerColors[i % flowerColors.length];
      flowerMat.specularColor = Color3.Black();
      const x = MathUtils.randomRange(-80, 80);
      const z = MathUtils.randomRange(-80, 80);
      const flower = MeshBuilder.CreateSphere('flower', { diameter: 0.2, segments: 4 }, this.scene);
      flower.material = flowerMat;
      flower.position.set(x, terrain.getHeightAt(x, z) + 0.3, z);
      this.objects.push(flower);
    }
  }

  private generateArdennes(terrain: Terrain, sg: ShadowGenerator | null): void {
    const pineMat = new PBRMetallicRoughnessMaterial('aPine', this.scene);
    pineMat.baseColor = new Color3(0.1, 0.22, 0.1);
    pineMat.roughness = 0.9;

    const trunkMat = new PBRMetallicRoughnessMaterial('aTrunk', this.scene);
    trunkMat.baseColor = new Color3(0.3, 0.2, 0.1);
    trunkMat.roughness = 0.9;

    for (let i = 0; i < 50; i++) {
      const x = MathUtils.randomRange(-85, 85);
      const z = MathUtils.randomRange(-85, 85);
      if (Math.abs(x) < 15 && Math.abs(z) < 15) continue;
      const pine = this.createPineTree(trunkMat, pineMat);
      pine.position.set(x, terrain.getHeightAt(x, z), z);
      pine.scaling.setAll(MathUtils.randomRange(0.5, 1.1));
      this.addShadowCasters(sg, pine);
      this.objects.push(pine);
    }

    const snowRockMat = new PBRMetallicRoughnessMaterial('aRock', this.scene);
    snowRockMat.baseColor = new Color3(0.65, 0.68, 0.72);
    snowRockMat.roughness = 0.85;

    for (let i = 0; i < 20; i++) {
      const rock = this.createRock('snowRock', snowRockMat, 0.6, 2.0);
      const x = MathUtils.randomRange(-80, 80);
      const z = MathUtils.randomRange(-80, 80);
      rock.position.set(x, terrain.getHeightAt(x, z) + 0.3, z);
      rock.rotation.y = Math.random() * Math.PI * 2;
      sg?.addShadowCaster(rock);
      this.objects.push(rock);
      this.colliders.push(rock);
    }

    const snowPatchMat = new StandardMaterial('snowPatch', this.scene);
    snowPatchMat.diffuseColor = new Color3(0.9, 0.92, 0.95);
    snowPatchMat.specularColor = new Color3(0.3, 0.3, 0.35);
    for (let i = 0; i < 30; i++) {
      const patch = MeshBuilder.CreateDisc('snow', {
        radius: MathUtils.randomRange(1, 4), tessellation: 8,
      }, this.scene);
      patch.material = snowPatchMat;
      const x = MathUtils.randomRange(-85, 85);
      const z = MathUtils.randomRange(-85, 85);
      patch.position.set(x, terrain.getHeightAt(x, z) + 0.02, z);
      patch.rotation.x = Math.PI / 2;
      this.objects.push(patch);
    }

    const deadLeafMat = new StandardMaterial('deadLeaf', this.scene);
    deadLeafMat.diffuseColor = new Color3(0.5, 0.35, 0.15);
    deadLeafMat.specularColor = Color3.Black();
    for (let i = 0; i < 80; i++) {
      const leaf = MeshBuilder.CreateDisc('leaf', { radius: 0.1, tessellation: 5 }, this.scene);
      leaf.material = deadLeafMat;
      const x = MathUtils.randomRange(-85, 85);
      const z = MathUtils.randomRange(-85, 85);
      leaf.position.set(x, terrain.getHeightAt(x, z) + 0.03, z);
      leaf.rotation.x = MathUtils.randomRange(1.3, 1.7);
      leaf.rotation.y = Math.random() * Math.PI * 2;
      this.objects.push(leaf);
    }
  }

  private addHedgerows(terrain: Terrain, sg: ShadowGenerator | null, count: number): void {
    const hedgeMat = new PBRMetallicRoughnessMaterial('hedgeMat', this.scene);
    hedgeMat.baseColor = new Color3(0.15, 0.35, 0.1);
    hedgeMat.roughness = 0.9;

    for (let i = 0; i < count; i++) {
      const root = new TransformNode('hedgeGroup', this.scene);
      const segCount = MathUtils.randomInt(2, 5);
      const totalLen = MathUtils.randomRange(4, 12);
      const hh = MathUtils.randomRange(1.5, 3);

      for (let s = 0; s < segCount; s++) {
        const seg = MeshBuilder.CreateSphere('hedge', {
          diameterX: totalLen / segCount * 1.3,
          diameterY: hh,
          diameterZ: MathUtils.randomRange(1, 2.5),
          segments: 5,
        }, this.scene);
        seg.material = hedgeMat;
        seg.parent = root;
        seg.position.x = (s - segCount / 2) * (totalLen / segCount) * 0.8;
        seg.position.y = hh * 0.4;
      }

      const x = MathUtils.randomRange(-80, 80);
      const z = MathUtils.randomRange(-80, 80);
      root.position.set(x, terrain.getHeightAt(x, z), z);
      root.rotation.y = Math.random() * Math.PI;
      this.addShadowCasters(sg, root);
      this.objects.push(root);
      root.getChildMeshes().forEach(m => {
        if (m instanceof Mesh) this.colliders.push(m);
      });
    }
  }

  private addAntiTankObstacles(terrain: Terrain, sg: ShadowGenerator | null, count: number): void {
    const metalMat = new PBRMetallicRoughnessMaterial('metalMat', this.scene);
    metalMat.baseColor = new Color3(0.3, 0.3, 0.32);
    metalMat.metallic = 0.6;
    metalMat.roughness = 0.7;

    for (let i = 0; i < count; i++) {
      const obstacle = MeshBuilder.CreateCylinder('rock', {
        height: MathUtils.randomRange(1, 2),
        diameterTop: 0.1,
        diameterBottom: MathUtils.randomRange(0.6, 1.2),
        tessellation: 4,
      }, this.scene);
      obstacle.material = metalMat;
      const x = MathUtils.randomRange(-60, 60);
      const z = MathUtils.randomRange(-20, 20);
      obstacle.position.set(x, terrain.getHeightAt(x, z) + 0.5, z);
      obstacle.rotation.x = MathUtils.randomRange(-0.3, 0.3);
      sg?.addShadowCaster(obstacle);
      this.objects.push(obstacle);
      this.colliders.push(obstacle);
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
    const h = MathUtils.randomRange(4, 7);

    const trunk = MeshBuilder.CreateCylinder('trunk', {
      height: h, diameterTop: 0.15, diameterBottom: 0.5, tessellation: 8,
    }, this.scene);
    trunk.material = trunkMat;
    trunk.parent = root;
    trunk.position.y = h / 2;

    const branchCount = MathUtils.randomInt(2, 4);
    for (let b = 0; b < branchCount; b++) {
      const bh = h * MathUtils.randomRange(0.4, 0.7);
      const branch = MeshBuilder.CreateCylinder('branch', {
        height: MathUtils.randomRange(1, 2.5),
        diameterTop: 0.05,
        diameterBottom: 0.12,
        tessellation: 6,
      }, this.scene);
      branch.material = trunkMat;
      branch.parent = root;
      branch.position.y = bh;
      branch.rotation.z = MathUtils.randomRange(0.5, 1.2) * (b % 2 === 0 ? 1 : -1);
      branch.rotation.y = (b / branchCount) * Math.PI * 2;
      branch.position.x = Math.sin(branch.rotation.y) * 0.3;
      branch.position.z = Math.cos(branch.rotation.y) * 0.3;
    }

    const clusterCount = MathUtils.randomInt(3, 6);
    for (let c = 0; c < clusterCount; c++) {
      const leafSize = MathUtils.randomRange(1.0, 2.0);
      const leaf = MeshBuilder.CreateSphere('leaves', { diameter: leafSize, segments: 5 }, this.scene);
      leaf.material = leafMat;
      leaf.parent = root;
      const angle = (c / clusterCount) * Math.PI * 2 + Math.random() * 0.5;
      const dist = MathUtils.randomRange(0.3, 1.5);
      leaf.position.set(
        Math.sin(angle) * dist,
        h * MathUtils.randomRange(0.7, 1.0) + MathUtils.randomRange(-0.5, 0.5),
        Math.cos(angle) * dist,
      );
      leaf.scaling.set(
        MathUtils.randomRange(0.8, 1.3),
        MathUtils.randomRange(0.6, 1.0),
        MathUtils.randomRange(0.8, 1.3),
      );
    }

    return root;
  }

  private createPineTree(trunkMat: PBRMetallicRoughnessMaterial, pineMat: PBRMetallicRoughnessMaterial): TransformNode {
    const root = new TransformNode('pine', this.scene);
    const h = MathUtils.randomRange(5, 10);

    const trunk = MeshBuilder.CreateCylinder('trunk', {
      height: h, diameterTop: 0.08, diameterBottom: 0.35, tessellation: 8,
    }, this.scene);
    trunk.material = trunkMat;
    trunk.parent = root;
    trunk.position.y = h / 2;

    const layers = MathUtils.randomInt(4, 7);
    for (let layer = 0; layer < layers; layer++) {
      const t = layer / (layers - 1);
      const y = h * (0.3 + t * 0.65);
      const size = (2.2 - t * 1.8) * MathUtils.randomRange(0.8, 1.2);
      const layerH = h * MathUtils.randomRange(0.12, 0.2);
      const cone = MeshBuilder.CreateCylinder('pineLayer', {
        height: layerH,
        diameterTop: size * 0.15,
        diameterBottom: size * 2,
        tessellation: 8,
      }, this.scene);
      cone.material = pineMat;
      cone.parent = root;
      cone.position.y = y;
      cone.rotation.y = Math.random() * Math.PI;
    }

    return root;
  }

  private createBuilding(
    wallMat: PBRMetallicRoughnessMaterial,
    damageMat: PBRMetallicRoughnessMaterial,
    windowMat: PBRMetallicRoughnessMaterial,
    sg: ShadowGenerator | null,
  ): TransformNode {
    const root = new TransformNode('buildingGroup', this.scene);
    const w = MathUtils.randomRange(4, 10);
    const h = MathUtils.randomRange(3, 12);
    const d = MathUtils.randomRange(4, 10);

    const body = MeshBuilder.CreateBox('building', { width: w, height: h, depth: d }, this.scene);
    body.material = wallMat;
    body.parent = root;

    const floors = Math.floor(h / 3);
    const sidesX = [-w / 2 - 0.01, w / 2 + 0.01];
    const sidesZ = [-d / 2 - 0.01, d / 2 + 0.01];

    for (let floor = 0; floor < floors; floor++) {
      const fy = -h / 2 + 1.5 + floor * 3;
      const windowsPerSide = Math.max(1, Math.floor(w / 2.5));

      for (const sx of sidesX) {
        for (let wi = 0; wi < windowsPerSide; wi++) {
          const wz = -d / 2 + d * (wi + 1) / (windowsPerSide + 1);
          const win = MeshBuilder.CreateBox('window', { width: 0.15, height: 1.2, depth: 0.8 }, this.scene);
          win.material = windowMat;
          win.parent = root;
          win.position.set(sx, fy, wz);
        }
      }

      const windowsPerZ = Math.max(1, Math.floor(d / 2.5));
      for (const sz of sidesZ) {
        for (let wi = 0; wi < windowsPerZ; wi++) {
          const wx = -w / 2 + w * (wi + 1) / (windowsPerZ + 1);
          const win = MeshBuilder.CreateBox('window', { width: 0.8, height: 1.2, depth: 0.15 }, this.scene);
          win.material = windowMat;
          win.parent = root;
          win.position.set(wx, fy, sz);
        }
      }
    }

    if (Math.random() > 0.4) {
      const dmgH = MathUtils.randomRange(1, h * 0.4);
      const dmgW = MathUtils.randomRange(1, w * 0.5);
      const dmg = MeshBuilder.CreateBox('damage', {
        width: dmgW, height: dmgH, depth: MathUtils.randomRange(0.5, 2),
      }, this.scene);
      dmg.material = damageMat;
      dmg.parent = root;
      dmg.position.set(
        MathUtils.randomRange(-w * 0.3, w * 0.3),
        h / 2 - dmgH / 2,
        d / 2 + 0.2,
      );
    }

    root.metadata = { height: h };
    return root;
  }

  private createRock(name: string, mat: PBRMetallicRoughnessMaterial, minSize: number, maxSize: number): Mesh {
    const rock = MeshBuilder.CreateIcoSphere(name, {
      radius: MathUtils.randomRange(minSize, maxSize),
      subdivisions: MathUtils.randomInt(2, 3),
    }, this.scene);

    const positions = rock.getVerticesData('position');
    if (positions) {
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] *= MathUtils.randomRange(0.7, 1.4);
        positions[i + 1] *= MathUtils.randomRange(0.5, 1.1);
        positions[i + 2] *= MathUtils.randomRange(0.7, 1.4);
      }
      rock.updateVerticesData('position', positions);
      const normals = rock.getVerticesData('normal');
      if (normals) {
        VertexData.ComputeNormals(positions, rock.getIndices(), normals);
        rock.updateVerticesData('normal', normals);
      }
    }

    rock.material = mat;
    return rock;
  }

  private addShadowCasters(sg: ShadowGenerator | null, node: TransformNode): void {
    if (!sg) return;
    node.getChildMeshes().forEach(m => {
      if (m instanceof Mesh) sg.addShadowCaster(m);
    });
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
