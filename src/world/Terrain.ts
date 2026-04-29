import { Scene, Mesh, MeshBuilder, VertexData, PBRMetallicRoughnessMaterial, Color3, Vector3, DynamicTexture } from '@babylonjs/core';

export interface TerrainConfig {
  size: number;
  subdivisions: number;
  maxHeight: number;
  seed: number;
  baseColor: Color3;
  detailColor: Color3;
  roughness: number;
}

export class Terrain {
  mesh!: Mesh;
  private heightData: Float32Array = new Float32Array(0);
  private config: TerrainConfig;
  private size: number;
  private subdivisions: number;

  constructor(private scene: Scene, config: TerrainConfig) {
    this.config = config;
    this.size = config.size;
    this.subdivisions = config.subdivisions;
    this.generateTerrain();
  }

  private generateTerrain(): void {
    const { size, subdivisions, maxHeight, seed, baseColor, detailColor, roughness } = this.config;
    const vertexCount = (subdivisions + 1) * (subdivisions + 1);
    this.heightData = new Float32Array(vertexCount);

    for (let i = 0; i <= subdivisions; i++) {
      for (let j = 0; j <= subdivisions; j++) {
        const idx = i * (subdivisions + 1) + j;
        const x = (j / subdivisions - 0.5) * 2;
        const z = (i / subdivisions - 0.5) * 2;
        this.heightData[idx] = this.noise(x, z, seed) * maxHeight;
      }
    }

    this.mesh = MeshBuilder.CreateGround('terrain', {
      width: size,
      height: size,
      subdivisions: subdivisions,
      updatable: true,
    }, this.scene);

    const positions = this.mesh.getVerticesData('position');
    if (positions) {
      for (let i = 0; i <= subdivisions; i++) {
        for (let j = 0; j <= subdivisions; j++) {
          const vertIdx = i * (subdivisions + 1) + j;
          positions[vertIdx * 3 + 1] = this.heightData[vertIdx];
        }
      }

      this.mesh.updateVerticesData('position', positions);
      const normals = this.mesh.getVerticesData('normal');
      if (normals) {
        VertexData.ComputeNormals(positions, this.mesh.getIndices(), normals);
        this.mesh.updateVerticesData('normal', normals);
      }
    }

    const texSize = 512;
    const groundTex = new DynamicTexture('terrainTex', texSize, this.scene, true);
    const ctx = groundTex.getContext();

    for (let y = 0; y < texSize; y++) {
      for (let x = 0; x < texSize; x++) {
        const nx = (x / texSize - 0.5) * 8;
        const ny = (y / texSize - 0.5) * 8;
        const n = (this.noise(nx, ny, seed + 100) + 1) * 0.5;
        const r = Math.floor((baseColor.r * (1 - n) + detailColor.r * n) * 255);
        const g = Math.floor((baseColor.g * (1 - n) + detailColor.g * n) * 255);
        const b = Math.floor((baseColor.b * (1 - n) + detailColor.b * n) * 255);
        const variation = 0.9 + Math.random() * 0.2;
        ctx.fillStyle = `rgb(${Math.min(255, r * variation)},${Math.min(255, g * variation)},${Math.min(255, b * variation)})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
    groundTex.update();

    const mat = new PBRMetallicRoughnessMaterial('terrainMat', this.scene);
    mat.baseTexture = groundTex;
    mat.metallic = 0.0;
    mat.roughness = roughness;
    this.mesh.material = mat;
    this.mesh.receiveShadows = true;
  }

  getHeightAt(x: number, z: number): number {
    const halfSize = this.size / 2;
    const nx = (x + halfSize) / this.size;
    const nz = (z + halfSize) / this.size;

    if (nx < 0 || nx > 1 || nz < 0 || nz > 1) return 0;

    const fi = nz * this.subdivisions;
    const fj = nx * this.subdivisions;
    const i = Math.floor(fi);
    const j = Math.floor(fj);
    const ti = fi - i;
    const tj = fj - j;

    const i0 = Math.min(i, this.subdivisions);
    const i1 = Math.min(i + 1, this.subdivisions);
    const j0 = Math.min(j, this.subdivisions);
    const j1 = Math.min(j + 1, this.subdivisions);

    const h00 = this.heightData[i0 * (this.subdivisions + 1) + j0] || 0;
    const h10 = this.heightData[i1 * (this.subdivisions + 1) + j0] || 0;
    const h01 = this.heightData[i0 * (this.subdivisions + 1) + j1] || 0;
    const h11 = this.heightData[i1 * (this.subdivisions + 1) + j1] || 0;

    return h00 * (1 - ti) * (1 - tj) + h10 * ti * (1 - tj) + h01 * (1 - ti) * tj + h11 * ti * tj;
  }

  private noise(x: number, y: number, seed: number): number {
    let val = 0;
    let amp = 1;
    let freq = 1;
    let maxVal = 0;
    for (let o = 0; o < 5; o++) {
      val += this.simplex2d(x * freq + seed, y * freq + seed) * amp;
      maxVal += amp;
      amp *= 0.5;
      freq *= 2;
    }
    return val / maxVal;
  }

  private simplex2d(x: number, y: number): number {
    const p = (n: number) => {
      const s = Math.sin(n) * 43758.5453123;
      return s - Math.floor(s);
    };
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const ux = fx * fx * (3 - 2 * fx);
    const uy = fy * fy * (3 - 2 * fy);
    const a = p(ix + iy * 157.0);
    const b = p(ix + 1.0 + iy * 157.0);
    const c = p(ix + (iy + 1.0) * 157.0);
    const d = p(ix + 1.0 + (iy + 1.0) * 157.0);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }

  dispose(): void {
    this.mesh.dispose();
  }
}
