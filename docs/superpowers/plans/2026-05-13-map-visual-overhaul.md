# 地图视觉全面升级 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade all 4 existing maps and add 4 new WWII-themed maps with PBR textures, HDR skyboxes, cascaded shadows, water rendering, destruction effects, and enhanced particles.

**Architecture:** New `AssetManager` handles all resource loading/caching. `Terrain` switches from DynamicTexture to PBR with splatmap blending. `SkyboxManager` upgrades to HDR cubemaps with IBL. New `ShadowSystem` wraps `CascadedShadowGenerator`. `Environment` loads external glTF models instead of procedural geometry. New `WaterSystem` for Normandy. New `DestructionSystem` for breakable objects. `ParticleManager` gains dust trails, tracers, and environmental particles.

**Tech Stack:** Babylon.js 9.x, TypeScript, Vite, @babylonjs/materials (WaterMaterial), @babylonjs/loaders (glTF)

**Testing Note:** This is a 3D visual game — traditional unit tests are impractical for rendering changes. Each task includes visual verification steps: `npm run dev`, open browser, inspect the scene. Screenshots via Playwright can supplement visual checks.

---

## File Structure

### New files

| File | Responsibility |
|------|---------------|
| `src/core/AssetManager.ts` | Unified texture/model/HDR loading with LRU cache |
| `src/world/ShadowSystem.ts` | CascadedShadowGenerator wrapper with mobile/desktop presets |
| `src/world/WaterSystem.ts` | Water plane for Normandy using WaterMaterial |
| `src/world/DestructionSystem.ts` | Destructible objects: HP tracking, model swap, particles |

### Modified files

| File | Changes |
|------|---------|
| `src/world/Terrain.ts` | Replace DynamicTexture with PBR textures + splatmap via NodeMaterial |
| `src/world/SkyboxManager.ts` | Replace gradient box with HDR CubeTexture + IBL |
| `src/world/Environment.ts` | Load external glTF models, distance culling, new themes |
| `src/world/MapManager.ts` | New MapConfig fields, 4 new map entries, wire WaterSystem/DestructionSystem |
| `src/world/WeatherSystem.ts` | New weather presets for new maps |
| `src/systems/ParticleManager.ts` | Add dust trails, tracers, burning debris, environment particles |
| `src/Game.ts` | Create ShadowSystem, pass to loadMap, wire water/destruction, cleanup |
| `src/ui/MainMenu.ts` | Add 4 new map cards to selection grid |

### Asset directories

```
public/assets/
├─ textures/{sand,grass,dirt,snow,rubble,asphalt,wet-sand,wheat-field,pine-needles,rock}/
│   └─ {albedo,normal,roughness}.jpg  (512px for mobile, 1024px for desktop)
├─ skyboxes/
│   └─ {desert,overcast,clear,winter,smoky,stormy}.env
└─ models/
    ├─ military/{sandbag,barbed-wire,dragon-teeth,bunker}.glb
    ├─ buildings/{house,ruin-house,rubble-pile,church}.glb
    ├─ vegetation/{oak-tree,pine-tree,bush,grass-patch}.glb
    ├─ terrain-detail/{rock-large,crater,trench}.glb
    └─ normandy/{pillbox,beach-obstacle,cliff-wall}.glb
```

---

## Task 1: AssetManager

**Files:**
- Create: `src/core/AssetManager.ts`

- [ ] **Step 1: Create AssetManager class**

Create `src/core/AssetManager.ts`:

```typescript
import {
  Scene, Texture, CubeTexture, PBRMaterial,
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
  private hdrCache = new Map<string, CubeTexture>();

  constructor(private scene: Scene) {}

  get texResolution(): number {
    return DeviceDetector.isMobile() ? 512 : 1024;
  }

  async loadTextureSet(id: string, basePath: string): Promise<PBRTextureSet> {
    if (this.textureCache.has(id)) return this.textureCache.get(id)!;

    const suffix = `_${this.texResolution}`;
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

  async loadHDR(id: string, path: string): Promise<CubeTexture> {
    if (this.hdrCache.has(id)) return this.hdrCache.get(id)!;

    const tex = CubeTexture.CreateFromPrefilteredData(path, this.scene);
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
```

- [ ] **Step 2: Verify it compiles**

Run: `cd /Users/flyxl/code/tank && npx tsc --noEmit`
Expected: No errors related to AssetManager.

- [ ] **Step 3: Commit**

```bash
git add src/core/AssetManager.ts
git commit -m "feat: add AssetManager for unified texture/model/HDR loading"
```

---

## Task 2: Download and Organize Assets

**Files:**
- Create: `scripts/download-assets.sh`
- Create: Multiple files under `public/assets/`

This task downloads free CC0 assets from Poly Haven and other sources.

- [ ] **Step 1: Create asset download script**

Create `scripts/download-assets.sh`:

```bash
#!/bin/bash
set -e
cd "$(dirname "$0")/.."

ASSETS_DIR="public/assets"
mkdir -p "$ASSETS_DIR/textures"/{sand,grass,dirt,snow,rubble,asphalt,wet-sand,wheat-field,pine-needles,rock}
mkdir -p "$ASSETS_DIR/skyboxes"
mkdir -p "$ASSETS_DIR/models"/{military,buildings,vegetation,terrain-detail,normandy}

echo "=== Downloading PBR Textures from Poly Haven ==="

download_texture() {
  local name=$1 local id=$2
  local res=1024
  local dir="$ASSETS_DIR/textures/$name"

  if [ -f "$dir/albedo.jpg" ]; then
    echo "  [skip] $name (already exists)"
    return
  fi

  echo "  Downloading $name..."
  curl -sL "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/${id}/${id}_diff_1k.jpg" -o "$dir/albedo.jpg" || echo "  WARN: albedo failed for $name"
  curl -sL "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/${id}/${id}_nor_gl_1k.jpg" -o "$dir/normal.jpg" || echo "  WARN: normal failed for $name"
  curl -sL "https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/${id}/${id}_rough_1k.jpg" -o "$dir/roughness.jpg" || echo "  WARN: roughness failed for $name"
}

download_texture "sand" "coast_sand_rocks_02"
download_texture "grass" "forrest_ground_01"
download_texture "dirt" "brown_mud_leaves_01"
download_texture "snow" "snow_field_aerial"
download_texture "rubble" "rock_ground_02"
download_texture "asphalt" "asphalt_04"
download_texture "wet-sand" "coast_sand_01"
download_texture "rock" "rock_face_04"

echo "=== Downloading HDR Skyboxes from Poly Haven ==="

download_hdr() {
  local name=$1 local id=$2
  local path="$ASSETS_DIR/skyboxes/${name}.env"

  if [ -f "$path" ]; then
    echo "  [skip] $name (already exists)"
    return
  fi

  echo "  Downloading $name HDR..."
  curl -sL "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/${id}_1k.hdr" -o "$ASSETS_DIR/skyboxes/${name}.hdr" || echo "  WARN: HDR failed for $name"
}

download_hdr "desert" "kloofendal_48d_partly_cloudy_puresky"
download_hdr "overcast" "kloofendal_overcast_puresky"
download_hdr "clear" "kloofendal_43d_clear_puresky"
download_hdr "winter" "winter_lake_01"
download_hdr "smoky" "the_sky_is_on_fire"
download_hdr "stormy" "dikhololo_night"

echo "=== Asset download complete ==="
echo "NOTE: HDR files (.hdr) need to be converted to .env format using Babylon.js sandbox or IBL Baker."
echo "NOTE: glTF environment models need to be sourced from Kenney/Quaternius/Sketchfab."
echo "NOTE: wheat-field and pine-needles textures need manual sourcing."
```

- [ ] **Step 2: Run the download script**

Run: `bash scripts/download-assets.sh`
Expected: Textures and HDRs downloaded into `public/assets/`. Some may fail (Poly Haven URL structures can change); those will need manual sourcing by searching https://polyhaven.com/textures and https://polyhaven.com/hdris.

- [ ] **Step 3: Source glTF environment models**

Search these free sources for CC0 glTF models and save them to the appropriate directories:

- **Kenney** (https://kenney.nl/assets): Search for "nature kit", "city kit", "medieval" for buildings/trees/rocks
- **Quaternius** (https://quaternius.com/packs): Search for "lowpoly nature", "ultimate modular buildings"
- **Kay Lousberg** (https://kaylousberg.itch.io/): Search for military/nature packs

For each model, download the `.glb` file and place it in the appropriate `public/assets/models/` subdirectory.

If free models are not available for all items, create procedural glTF files using a Node.js script (similar to the tank model generator `scripts/generate-tank-models.cjs`). Priority models:
1. `rock-large.glb` — irregular rock
2. `pine-tree.glb` — low-poly pine with snow option
3. `oak-tree.glb` — low-poly deciduous tree
4. `bush.glb` — small bush
5. `sandbag.glb` — sandbag wall
6. `crater.glb` — shell crater
7. `house.glb` — simple 2-story house
8. `ruin-house.glb` — damaged version of house

- [ ] **Step 4: Convert HDR to .env format**

Babylon.js requires `.env` format (prefiltered cubemaps). Convert the downloaded `.hdr` files:

Option A: Use Babylon.js Sandbox (https://sandbox.babylonjs.com/) — drag in .hdr, export as .env
Option B: Use the IBL Baker tool (https://www.babylonjs.com/tools/ibl/)
Option C: Use HDR directly with `HDRCubeTexture` class instead of `.env` (simpler, slightly slower)

For expediency, switch to using `HDRCubeTexture` directly from `.hdr` files, avoiding the conversion step. Update `AssetManager.loadHDR` accordingly:

```typescript
import { HDRCubeTexture } from '@babylonjs/core';

async loadHDR(id: string, path: string): Promise<CubeTexture | HDRCubeTexture> {
  if (this.hdrCache.has(id)) return this.hdrCache.get(id)!;

  const size = DeviceDetector.isMobile() ? 256 : 512;
  const tex = new HDRCubeTexture(path, this.scene, size);
  this.hdrCache.set(id, tex as any);
  return tex;
}
```

- [ ] **Step 5: Commit assets**

```bash
git add public/assets/ scripts/download-assets.sh
git commit -m "feat: add PBR textures, HDR skyboxes, and env model assets"
```

---

## Task 3: ShadowSystem

**Files:**
- Create: `src/world/ShadowSystem.ts`
- Modify: `src/Game.ts` (wire shadow generator)

- [ ] **Step 1: Create ShadowSystem class**

Create `src/world/ShadowSystem.ts`:

```typescript
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
```

- [ ] **Step 2: Wire ShadowSystem into Game.ts**

In `src/Game.ts`, add import and create ShadowSystem in `startBattle`:

Add import at top:
```typescript
import { ShadowSystem } from './world/ShadowSystem';
```

Add property:
```typescript
private shadowSystem: ShadowSystem | null = null;
```

In `startBattle`, after `setupBattleLighting()`, before creating MapManager:
```typescript
const sunLight = this.scene.getLightByName('sunLight') as DirectionalLight;
this.shadowSystem = new ShadowSystem(this.scene, sunLight);
```

Change `loadMap` call:
```typescript
const mapConfig = this.mapManager.loadMap(mapId, this.shadowSystem?.generator ?? null);
```

In `cleanupBattle`:
```typescript
this.shadowSystem?.dispose();
this.shadowSystem = null;
```

Also add player tank as shadow caster after creating it:
```typescript
// After creating player tank
if (this.shadowSystem && this.player.root instanceof Mesh) {
  this.player.root.getChildMeshes().forEach(m => {
    if (m instanceof Mesh) this.shadowSystem!.addCaster(m);
  });
}
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/world/ShadowSystem.ts src/Game.ts
git commit -m "feat: add cascaded shadow system with mobile/desktop presets"
```

---

## Task 4: Terrain PBR Upgrade

**Files:**
- Modify: `src/world/Terrain.ts`
- Modify: `src/world/MapManager.ts` (TerrainConfig changes)

- [ ] **Step 1: Update TerrainConfig interface**

In `src/world/Terrain.ts`, update the `TerrainConfig` interface to support PBR textures:

```typescript
export interface TerrainConfig {
  size: number;
  subdivisions: number;
  maxHeight: number;
  seed: number;
  baseColor: Color3;
  detailColor: Color3;
  roughness: number;
  primaryTexture?: string;   // path under public/assets/textures/
  secondaryTexture?: string; // optional blend texture
  blendMode?: 'height' | 'random'; // how to blend primary+secondary
  blendThreshold?: number;   // height threshold for 'height' mode
  uvScale?: number;          // UV tiling factor, default 20
}
```

- [ ] **Step 2: Rewrite Terrain material system**

Replace the `DynamicTexture` section in `generateTerrain()` with PBR texture loading. Keep the existing height generation and noise code unchanged. Replace lines 65-89 (the DynamicTexture block) with:

```typescript
private async applyMaterial(): Promise<void> {
  const { roughness, primaryTexture, secondaryTexture, blendMode, blendThreshold, uvScale } = this.config;
  const tileScale = uvScale ?? 20;

  if (primaryTexture) {
    const mat = new PBRMaterial('terrainMat', this.scene);
    mat.metallic = 0;
    mat.roughness = roughness;

    const albedo = new Texture(`assets/textures/${primaryTexture}/albedo.jpg`, this.scene);
    albedo.uScale = tileScale;
    albedo.vScale = tileScale;
    mat.albedoTexture = albedo;

    const normal = new Texture(`assets/textures/${primaryTexture}/normal.jpg`, this.scene);
    normal.uScale = tileScale;
    normal.vScale = tileScale;
    mat.bumpTexture = normal;

    const rough = new Texture(`assets/textures/${primaryTexture}/roughness.jpg`, this.scene);
    rough.uScale = tileScale;
    rough.vScale = tileScale;
    mat.metallicTexture = rough;
    mat.useRoughnessFromMetallicTextureAlpha = false;
    mat.useRoughnessFromMetallicTextureGreen = true;

    if (secondaryTexture) {
      this.applyVertexColorBlend(blendMode ?? 'height', blendThreshold ?? 0.5);
    }

    this.mesh.material = mat;
  } else {
    this.applyFallbackMaterial();
  }

  this.mesh.receiveShadows = true;
}
```

The `applyFallbackMaterial` method is the old DynamicTexture approach, kept for backward compatibility:

```typescript
private applyFallbackMaterial(): void {
  const { baseColor, detailColor, roughness, seed } = this.config;
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
}
```

- [ ] **Step 3: Add vertex color blending for splatmaps**

Add a method that writes vertex colors based on terrain height for blending two textures:

```typescript
private applyVertexColorBlend(mode: string, threshold: number): void {
  const positions = this.mesh.getVerticesData('position');
  if (!positions) return;

  const vertCount = positions.length / 3;
  const colors = new Float32Array(vertCount * 4);

  for (let i = 0; i < vertCount; i++) {
    const y = positions[i * 3 + 1];
    let blend: number;

    if (mode === 'height') {
      const normalizedY = y / this.config.maxHeight;
      blend = Math.max(0, Math.min(1, (normalizedY - threshold + 0.2) / 0.4));
    } else {
      const x = positions[i * 3];
      const z = positions[i * 3 + 2];
      blend = (this.noise(x * 0.05, z * 0.05, this.config.seed + 200) + 1) * 0.5;
    }

    colors[i * 4] = 1 - blend;     // R = primary weight
    colors[i * 4 + 1] = blend;     // G = secondary weight
    colors[i * 4 + 2] = 0;         // B = unused
    colors[i * 4 + 3] = 1;         // A
  }

  this.mesh.setVerticesData('color', colors);
}
```

Note: Full splatmap rendering (sampling two texture sets and blending by vertex color in the shader) requires a `NodeMaterial`. For the initial implementation, use the vertex colors as a visual guide and the primary texture only. A follow-up enhancement can implement the full NodeMaterial blend.

- [ ] **Step 4: Update constructor to call applyMaterial**

Change the constructor to handle async material loading:

```typescript
constructor(private scene: Scene, config: TerrainConfig) {
  this.config = config;
  this.size = config.size;
  this.subdivisions = config.subdivisions;
  this.generateTerrain();
  void this.applyMaterial();
}
```

Move the material creation out of `generateTerrain()` — that method should only handle mesh creation and height displacement.

- [ ] **Step 5: Update MapManager with new texture configs**

In `src/world/MapManager.ts`, add texture fields to the 4 existing maps. Example for desert:

```typescript
desert: {
  name: '沙漠战场',
  description: '广袤的沙丘与废墟遗迹',
  theme: 'desert',
  terrain: {
    size: 200, subdivisions: 80, maxHeight: 4, seed: 42,
    baseColor: new Color3(0.76, 0.65, 0.42),
    detailColor: new Color3(0.68, 0.55, 0.35),
    roughness: 0.95,
    primaryTexture: 'sand',
    secondaryTexture: 'rock',
    blendMode: 'height',
    blendThreshold: 0.6,
    uvScale: 25,
  },
  // ... rest unchanged
},
```

Similarly update urban (rubble + asphalt), forest (grass + dirt), snow (snow + dirt).

- [ ] **Step 6: Verify visually**

Run: `npm run dev`
Open browser, select each map. The ground should show tiled PBR textures instead of flat colored blocks.
Expected: Visible texture detail on terrain, normal mapping adds surface depth.

- [ ] **Step 7: Commit**

```bash
git add src/world/Terrain.ts src/world/MapManager.ts
git commit -m "feat: upgrade terrain to PBR textures with tiling and normal maps"
```

---

## Task 5: SkyboxManager HDR Upgrade

**Files:**
- Modify: `src/world/SkyboxManager.ts`
- Modify: `src/world/MapManager.ts` (sky theme config)

- [ ] **Step 1: Rewrite SkyboxManager to use HDR**

Replace the entire `src/world/SkyboxManager.ts`:

```typescript
import {
  Scene, MeshBuilder, Mesh, CubeTexture, HDRCubeTexture,
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
  private currentHdr: HDRCubeTexture | CubeTexture | null = null;

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
      this.createFallbackSky(theme);
    }
  }

  private createFallbackSky(_theme: SkyTheme): void {
    this.skybox = MeshBuilder.CreateBox('skybox', { size: 500 }, this.scene);
    const mat = new StandardMaterial('skyMat', this.scene);
    mat.backFaceCulling = false;
    mat.disableLighting = true;
    this.skybox.material = mat;
    this.skybox.infiniteDistance = true;
  }

  getSkyboxMesh(): Mesh | null {
    return this.skybox;
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
```

- [ ] **Step 2: Update MapManager to pass new SkyTheme values**

In `MapManager.ts`, the existing maps already pass `config.theme as SkyTheme` to `setTheme`. The new maps will use their own theme names (e.g., `'normandy'`, `'stalingrad'`).

Update `EnvTheme` type reference — MapConfig.theme field now needs to accept the new themes. Change import and type:

In `MapManager.ts`, update the `MapConfig` interface to use `SkyTheme` directly:

```typescript
import { SkyboxManager, SkyTheme } from './SkyboxManager';

export interface MapConfig {
  name: string;
  description: string;
  theme: SkyTheme;  // was EnvTheme, now SkyTheme for wider range
  terrain: TerrainConfig;
  defaultWeather: WeatherType;
  spawnPoints: Vector3[];
  enemySpawns: Vector3[];
}
```

Update `loadMap`:
```typescript
this.skybox.setTheme(config.theme);
```
(Remove `as SkyTheme` cast since `theme` is now `SkyTheme` directly.)

- [ ] **Step 3: Verify visually**

Run: `npm run dev`
Open browser, check each map. Sky should show HDR environment (realistic sky) instead of gradient blocks.
If HDR files are not yet available, the fallback sky should appear.

- [ ] **Step 4: Commit**

```bash
git add src/world/SkyboxManager.ts src/world/MapManager.ts
git commit -m "feat: upgrade skybox to HDR environment maps with IBL"
```

---

## Task 6: Environment glTF Model Loading

**Files:**
- Modify: `src/world/Environment.ts`
- Modify: `src/world/MapManager.ts` (EnvTheme expansion)

- [ ] **Step 1: Add model-based environment generation**

Rewrite `Environment.ts` to support both procedural (fallback) and glTF model placement. Add new theme handlers for the 4 new maps. Keep existing procedural methods as fallback.

Add to `Environment.ts`:

```typescript
import { AssetContainer, SceneLoader, InstancedMesh } from '@babylonjs/core';

export type EnvTheme = 'desert' | 'urban' | 'forest' | 'snow'
  | 'normandy' | 'stalingrad' | 'kursk' | 'ardennes';

// Environment placement configuration per theme
interface PlacementRule {
  modelPath: string;
  count: number;
  scaleRange: [number, number];
  exclusionRadius: number;
  isShadowCaster: boolean;
  isCollider: boolean;
  colliderRadius: number;
}

const ENV_CONFIGS: Record<EnvTheme, PlacementRule[]> = {
  desert: [
    { modelPath: 'assets/models/terrain-detail/rock-large.glb', count: 15, scaleRange: [0.8, 2.0], exclusionRadius: 15, isShadowCaster: true, isCollider: true, colliderRadius: 1.5 },
    { modelPath: 'assets/models/vegetation/bush.glb', count: 20, scaleRange: [0.5, 1.2], exclusionRadius: 10, isShadowCaster: false, isCollider: false, colliderRadius: 0 },
    { modelPath: 'assets/models/military/sandbag.glb', count: 8, scaleRange: [1.0, 1.0], exclusionRadius: 20, isShadowCaster: true, isCollider: true, colliderRadius: 1.0 },
    { modelPath: 'assets/models/military/dragon-teeth.glb', count: 6, scaleRange: [1.0, 1.0], exclusionRadius: 20, isShadowCaster: true, isCollider: true, colliderRadius: 0.8 },
  ],
  urban: [
    { modelPath: 'assets/models/buildings/house.glb', count: 6, scaleRange: [1.0, 1.5], exclusionRadius: 20, isShadowCaster: true, isCollider: true, colliderRadius: 3.0 },
    { modelPath: 'assets/models/buildings/ruin-house.glb', count: 4, scaleRange: [0.8, 1.2], exclusionRadius: 18, isShadowCaster: true, isCollider: true, colliderRadius: 2.5 },
    { modelPath: 'assets/models/buildings/rubble-pile.glb', count: 8, scaleRange: [0.6, 1.0], exclusionRadius: 10, isShadowCaster: false, isCollider: false, colliderRadius: 0 },
    { modelPath: 'assets/models/military/sandbag.glb', count: 10, scaleRange: [1.0, 1.0], exclusionRadius: 15, isShadowCaster: true, isCollider: true, colliderRadius: 1.0 },
    { modelPath: 'assets/models/military/barbed-wire.glb', count: 6, scaleRange: [1.0, 1.0], exclusionRadius: 15, isShadowCaster: false, isCollider: false, colliderRadius: 0.3 },
  ],
  forest: [
    { modelPath: 'assets/models/vegetation/oak-tree.glb', count: 25, scaleRange: [0.7, 1.3], exclusionRadius: 15, isShadowCaster: true, isCollider: false, colliderRadius: 0 },
    { modelPath: 'assets/models/vegetation/bush.glb', count: 30, scaleRange: [0.5, 1.0], exclusionRadius: 8, isShadowCaster: false, isCollider: false, colliderRadius: 0 },
    { modelPath: 'assets/models/vegetation/grass-patch.glb', count: 40, scaleRange: [0.8, 1.2], exclusionRadius: 5, isShadowCaster: false, isCollider: false, colliderRadius: 0 },
    { modelPath: 'assets/models/terrain-detail/rock-large.glb', count: 10, scaleRange: [0.5, 1.5], exclusionRadius: 12, isShadowCaster: true, isCollider: true, colliderRadius: 1.2 },
  ],
  snow: [
    { modelPath: 'assets/models/vegetation/pine-tree.glb', count: 20, scaleRange: [0.6, 1.2], exclusionRadius: 15, isShadowCaster: true, isCollider: false, colliderRadius: 0 },
    { modelPath: 'assets/models/terrain-detail/rock-large.glb', count: 12, scaleRange: [0.8, 2.0], exclusionRadius: 12, isShadowCaster: true, isCollider: true, colliderRadius: 1.5 },
    { modelPath: 'assets/models/vegetation/bush.glb', count: 15, scaleRange: [0.4, 0.8], exclusionRadius: 8, isShadowCaster: false, isCollider: false, colliderRadius: 0 },
  ],
  normandy: [
    { modelPath: 'assets/models/normandy/pillbox.glb', count: 3, scaleRange: [1.0, 1.0], exclusionRadius: 25, isShadowCaster: true, isCollider: true, colliderRadius: 3.5 },
    { modelPath: 'assets/models/normandy/beach-obstacle.glb', count: 15, scaleRange: [0.8, 1.2], exclusionRadius: 10, isShadowCaster: true, isCollider: true, colliderRadius: 0.8 },
    { modelPath: 'assets/models/military/dragon-teeth.glb', count: 10, scaleRange: [1.0, 1.0], exclusionRadius: 12, isShadowCaster: true, isCollider: true, colliderRadius: 0.8 },
    { modelPath: 'assets/models/military/sandbag.glb', count: 12, scaleRange: [1.0, 1.0], exclusionRadius: 15, isShadowCaster: true, isCollider: true, colliderRadius: 1.0 },
    { modelPath: 'assets/models/terrain-detail/crater.glb', count: 8, scaleRange: [0.6, 1.2], exclusionRadius: 10, isShadowCaster: false, isCollider: false, colliderRadius: 0 },
  ],
  stalingrad: [
    { modelPath: 'assets/models/buildings/ruin-house.glb', count: 10, scaleRange: [0.8, 1.5], exclusionRadius: 18, isShadowCaster: true, isCollider: true, colliderRadius: 2.5 },
    { modelPath: 'assets/models/buildings/house.glb', count: 6, scaleRange: [1.0, 1.3], exclusionRadius: 20, isShadowCaster: true, isCollider: true, colliderRadius: 3.0 },
    { modelPath: 'assets/models/buildings/church.glb', count: 1, scaleRange: [1.0, 1.0], exclusionRadius: 25, isShadowCaster: true, isCollider: true, colliderRadius: 4.0 },
    { modelPath: 'assets/models/military/sandbag.glb', count: 15, scaleRange: [1.0, 1.0], exclusionRadius: 12, isShadowCaster: true, isCollider: true, colliderRadius: 1.0 },
    { modelPath: 'assets/models/terrain-detail/crater.glb', count: 12, scaleRange: [0.5, 1.0], exclusionRadius: 8, isShadowCaster: false, isCollider: false, colliderRadius: 0 },
  ],
  kursk: [
    { modelPath: 'assets/models/terrain-detail/trench.glb', count: 6, scaleRange: [1.0, 1.5], exclusionRadius: 20, isShadowCaster: false, isCollider: true, colliderRadius: 1.5 },
    { modelPath: 'assets/models/terrain-detail/crater.glb', count: 10, scaleRange: [0.5, 1.0], exclusionRadius: 10, isShadowCaster: false, isCollider: false, colliderRadius: 0 },
    { modelPath: 'assets/models/vegetation/oak-tree.glb', count: 8, scaleRange: [0.8, 1.2], exclusionRadius: 20, isShadowCaster: true, isCollider: false, colliderRadius: 0 },
    { modelPath: 'assets/models/terrain-detail/rock-large.glb', count: 5, scaleRange: [0.6, 1.2], exclusionRadius: 15, isShadowCaster: true, isCollider: true, colliderRadius: 1.2 },
    { modelPath: 'assets/models/military/dragon-teeth.glb', count: 4, scaleRange: [1.0, 1.0], exclusionRadius: 15, isShadowCaster: true, isCollider: true, colliderRadius: 0.8 },
  ],
  ardennes: [
    { modelPath: 'assets/models/vegetation/pine-tree.glb', count: 40, scaleRange: [0.6, 1.3], exclusionRadius: 10, isShadowCaster: true, isCollider: false, colliderRadius: 0 },
    { modelPath: 'assets/models/terrain-detail/rock-large.glb', count: 10, scaleRange: [0.5, 1.5], exclusionRadius: 12, isShadowCaster: true, isCollider: true, colliderRadius: 1.5 },
    { modelPath: 'assets/models/vegetation/bush.glb', count: 15, scaleRange: [0.4, 0.8], exclusionRadius: 8, isShadowCaster: false, isCollider: false, colliderRadius: 0 },
    { modelPath: 'assets/models/terrain-detail/crater.glb', count: 5, scaleRange: [0.5, 1.0], exclusionRadius: 12, isShadowCaster: false, isCollider: false, colliderRadius: 0 },
  ],
};
```

Add a `generateFromModels` method:

```typescript
private async generateFromModels(
  theme: EnvTheme,
  terrain: Terrain,
  shadowGen: ShadowGenerator | null
): Promise<void> {
  const rules = ENV_CONFIGS[theme];
  if (!rules) return;

  const mobile = DeviceDetector.isMobile();
  const densityMult = mobile ? 0.7 : 1.0;

  for (const rule of rules) {
    const count = Math.round(rule.count * densityMult);
    let container: AssetContainer;

    try {
      const lastSlash = rule.modelPath.lastIndexOf('/');
      container = await SceneLoader.LoadAssetContainerAsync(
        rule.modelPath.substring(0, lastSlash + 1),
        rule.modelPath.substring(lastSlash + 1),
        this.scene
      );
    } catch {
      continue; // Skip if model not available
    }

    for (let i = 0; i < count; i++) {
      const x = MathUtils.randomRange(-80, 80);
      const z = MathUtils.randomRange(-80, 80);
      if (Math.abs(x) < rule.exclusionRadius && Math.abs(z) < rule.exclusionRadius) continue;

      const entries = container.instantiateModelsToScene(
        (name) => `${name}_${theme}_${i}`
      );

      if (entries.rootNodes.length > 0) {
        const root = entries.rootNodes[0];
        const y = terrain.getHeightAt(x, z);
        root.position.set(x, y, z);
        root.rotation.y = Math.random() * Math.PI * 2;
        const s = MathUtils.randomRange(rule.scaleRange[0], rule.scaleRange[1]);
        root.scaling.setAll(s);

        this.objects.push(root as TransformNode);

        if (rule.isShadowCaster && shadowGen) {
          root.getChildMeshes().forEach(m => {
            if (m instanceof Mesh) shadowGen.addShadowCaster(m);
          });
        }

        if (rule.isCollider) {
          root.getChildMeshes().forEach(m => {
            if (m instanceof Mesh) {
              m.name = `envCollider_${rule.colliderRadius.toFixed(1)}`;
              this.colliders.push(m);
            }
          });
        }
      }
    }
  }
}
```

Update the `generate` method to try models first, fall back to procedural:

```typescript
async generate(theme: EnvTheme, terrain: Terrain, shadowGen: ShadowGenerator | null): Promise<void> {
  this.clear();

  try {
    await this.generateFromModels(theme, terrain, shadowGen);
    if (this.objects.length > 0) return;
  } catch {}

  // Fallback to procedural
  switch (theme) {
    case 'desert': this.generateDesert(terrain, shadowGen); break;
    case 'urban': this.generateUrban(terrain, shadowGen); break;
    case 'forest': this.generateForest(terrain, shadowGen); break;
    case 'snow': this.generateSnow(terrain, shadowGen); break;
    default: this.generateForest(terrain, shadowGen); break;
  }
}
```

Note: Since `generate` is now async, update `MapManager.loadMap` to await it (see Task 10).

- [ ] **Step 2: Update collision system for new collider names**

In `src/Game.ts` `resolveCollisions`, update the mesh name check to handle the new `envCollider_` prefix:

```typescript
} else if (n.startsWith('envCollider_')) {
  const radiusStr = n.split('_')[1];
  obstRadius = parseFloat(radiusStr) || 1.0;
}
```

Add this before the `else continue;` in the existing name-matching chain.

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/world/Environment.ts src/Game.ts
git commit -m "feat: upgrade environment to load external glTF models with fallback"
```

---

## Task 7: WaterSystem

**Files:**
- Create: `src/world/WaterSystem.ts`
- Modify: `src/world/MapManager.ts`

- [ ] **Step 1: Create WaterSystem class**

Create `src/world/WaterSystem.ts`:

```typescript
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

    if (!mobile) {
      if (skybox) {
        this.waterMaterial.addToRenderList(skybox);
      }
    } else {
      this.waterMaterial.disableClipPlane = true;
    }

    this.waterMesh.material = this.waterMaterial;
  }

  isInWater(x: number, z: number, waterLevel: number): number {
    if (!this.waterMesh) return 0;
    const terrainY = 0; // caller should provide actual terrain height
    return Math.max(0, waterLevel - terrainY);
  }

  dispose(): void {
    this.waterMaterial?.dispose();
    this.waterMaterial = null;
    this.waterMesh?.dispose();
    this.waterMesh = null;
  }
}
```

- [ ] **Step 2: Wire into MapManager**

In `MapManager.ts`, add WaterSystem:

```typescript
import { WaterSystem, WaterConfig } from './WaterSystem';
```

Add to MapConfig:
```typescript
export interface MapConfig {
  // ... existing fields ...
  water?: WaterConfig;
}
```

Add property to MapManager:
```typescript
water: WaterSystem | null = null;
```

In `loadMap`, after weather setup:
```typescript
if (config.water) {
  this.water = new WaterSystem(this.scene);
  this.water.create(config.water, this.skybox.getSkyboxMesh());
}
```

In `dispose`:
```typescript
this.water?.dispose();
```

- [ ] **Step 3: Add water config to Normandy map (will be added in Task 10)**

Water config for Normandy:
```typescript
water: {
  waterLevel: 0,
  size: 200,
  position: new Vector3(0, 0, -70),
},
```

- [ ] **Step 4: Commit**

```bash
git add src/world/WaterSystem.ts src/world/MapManager.ts
git commit -m "feat: add water system using Babylon.js WaterMaterial"
```

---

## Task 8: DestructionSystem

**Files:**
- Create: `src/world/DestructionSystem.ts`

- [ ] **Step 1: Create DestructionSystem class**

Create `src/world/DestructionSystem.ts`:

```typescript
import {
  Scene, TransformNode, Mesh, Vector3,
} from '@babylonjs/core';
import { ParticleManager } from '../systems/ParticleManager';

interface DestructibleObject {
  id: string;
  hp: number;
  maxHp: number;
  root: TransformNode;
  colliderRadius: number;
  state: 'intact' | 'damaged' | 'destroyed';
}

export class DestructionSystem {
  private destructibles: DestructibleObject[] = [];

  constructor(
    private scene: Scene,
    private particles: ParticleManager,
  ) {}

  register(
    id: string,
    root: TransformNode,
    hp: number,
    colliderRadius: number,
  ): void {
    this.destructibles.push({
      id, hp, maxHp: hp, root, colliderRadius,
      state: 'intact',
    });
  }

  applyDamage(position: Vector3, radius: number, damage: number): void {
    for (const obj of this.destructibles) {
      if (obj.state === 'destroyed') continue;

      const dist = Vector3.Distance(position, obj.root.position);
      if (dist > radius + obj.colliderRadius) continue;

      obj.hp -= damage;

      if (obj.hp <= 0) {
        this.destroyObject(obj);
      } else if (obj.hp < obj.maxHp * 0.5 && obj.state === 'intact') {
        obj.state = 'damaged';
        this.particles.createHitSpark(obj.root.position.add(new Vector3(0, 1, 0)));
      }
    }
  }

  private destroyObject(obj: DestructibleObject): void {
    obj.state = 'destroyed';

    this.particles.createExplosion(obj.root.position.add(new Vector3(0, 1, 0)), 1.5);

    obj.root.scaling.y *= 0.3;
    obj.root.position.y -= 0.5;

    obj.root.getChildMeshes().forEach(m => {
      if (m instanceof Mesh) {
        m.isPickable = false;
        m.name = 'rubble_destroyed';
      }
    });
  }

  getDestructibles(): DestructibleObject[] {
    return this.destructibles;
  }

  dispose(): void {
    this.destructibles = [];
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/world/DestructionSystem.ts
git commit -m "feat: add destruction system for breakable environment objects"
```

---

## Task 9: ParticleManager Upgrade

**Files:**
- Modify: `src/systems/ParticleManager.ts`

- [ ] **Step 1: Add dust trail method**

Add to `ParticleManager`:

```typescript
createDustTrail(emitter: TransformNode, theme: string): ParticleSystem {
  const dust = new ParticleSystem('dustTrail', 30, this.scene);
  dust.particleTexture = this.particleTex;
  dust.emitter = emitter;
  dust.createConeEmitter(0.5, Math.PI / 4);

  dust.minSize = 0.3;
  dust.maxSize = 1.5;
  dust.minLifeTime = 0.5;
  dust.maxLifeTime = 2.0;
  dust.emitRate = 20;
  dust.minEmitPower = 0.5;
  dust.maxEmitPower = 2;
  dust.gravity = new Vector3(0, 1, 0);

  const colors = this.getDustColors(theme);
  dust.color1 = colors.color1;
  dust.color2 = colors.color2;
  dust.colorDead = colors.colorDead;
  dust.blendMode = ParticleSystem.BLENDMODE_STANDARD;

  dust.start();
  this.activeSystems.push(dust);
  return dust;
}

private getDustColors(theme: string): { color1: Color4; color2: Color4; colorDead: Color4 } {
  switch (theme) {
    case 'desert': case 'normandy':
      return { color1: new Color4(0.76, 0.65, 0.42, 0.6), color2: new Color4(0.68, 0.55, 0.35, 0.4), colorDead: new Color4(0.6, 0.5, 0.3, 0) };
    case 'snow': case 'ardennes':
      return { color1: new Color4(0.9, 0.92, 0.95, 0.7), color2: new Color4(0.85, 0.88, 0.92, 0.5), colorDead: new Color4(0.8, 0.82, 0.85, 0) };
    case 'forest': case 'kursk':
      return { color1: new Color4(0.45, 0.35, 0.2, 0.5), color2: new Color4(0.4, 0.3, 0.18, 0.3), colorDead: new Color4(0.3, 0.25, 0.15, 0) };
    default: // urban, stalingrad
      return { color1: new Color4(0.5, 0.48, 0.45, 0.6), color2: new Color4(0.4, 0.38, 0.35, 0.4), colorDead: new Color4(0.3, 0.28, 0.25, 0) };
  }
}
```

- [ ] **Step 2: Add tracer round method**

```typescript
createTracer(emitter: Vector3, direction: Vector3): ParticleSystem {
  const tracer = new ParticleSystem('tracer', 20, this.scene);
  tracer.particleTexture = this.particleTex;
  tracer.emitter = emitter.clone();
  tracer.createPointEmitter(direction.scale(-0.5), direction.scale(-1));
  tracer.minSize = 0.05;
  tracer.maxSize = 0.15;
  tracer.minLifeTime = 0.1;
  tracer.maxLifeTime = 0.3;
  tracer.emitRate = 100;
  tracer.targetStopDuration = 0.5;
  tracer.color1 = new Color4(1, 0.6, 0.1, 1);
  tracer.color2 = new Color4(1, 0.4, 0.05, 0.8);
  tracer.colorDead = new Color4(1, 0.2, 0, 0);
  tracer.minEmitPower = 1;
  tracer.maxEmitPower = 3;
  tracer.blendMode = ParticleSystem.BLENDMODE_ADD;
  tracer.disposeOnStop = true;
  tracer.start();
  this.activeSystems.push(tracer);
  return tracer;
}
```

- [ ] **Step 3: Add burning debris method**

```typescript
createBurningDebris(position: Vector3): ParticleSystem {
  const fire = new ParticleSystem('burning', 60, this.scene);
  fire.particleTexture = this.particleTex;
  fire.createConeEmitter(0.5, Math.PI / 8);
  fire.emitter = position.clone();
  fire.minSize = 0.3;
  fire.maxSize = 1.2;
  fire.minLifeTime = 0.3;
  fire.maxLifeTime = 1.0;
  fire.emitRate = 40;
  fire.color1 = new Color4(1, 0.7, 0.2, 0.9);
  fire.color2 = new Color4(1, 0.3, 0.05, 0.7);
  fire.colorDead = new Color4(0.3, 0.1, 0, 0);
  fire.minEmitPower = 1;
  fire.maxEmitPower = 4;
  fire.gravity = new Vector3(0, 3, 0);
  fire.blendMode = ParticleSystem.BLENDMODE_ADD;

  const smoke = new ParticleSystem('burnSmoke', 40, this.scene);
  smoke.particleTexture = this.particleTex;
  smoke.createConeEmitter(0.3, Math.PI / 6);
  smoke.emitter = position.add(new Vector3(0, 1.5, 0));
  smoke.minSize = 1.0;
  smoke.maxSize = 4.0;
  smoke.minLifeTime = 1.5;
  smoke.maxLifeTime = 5.0;
  smoke.emitRate = 15;
  smoke.color1 = new Color4(0.2, 0.18, 0.15, 0.6);
  smoke.color2 = new Color4(0.15, 0.13, 0.1, 0.4);
  smoke.colorDead = new Color4(0.1, 0.1, 0.1, 0);
  smoke.minEmitPower = 0.5;
  smoke.maxEmitPower = 2;
  smoke.gravity = new Vector3(0, 4, 0);
  smoke.blendMode = ParticleSystem.BLENDMODE_STANDARD;

  fire.start();
  smoke.start();
  this.activeSystems.push(fire, smoke);

  setTimeout(() => { fire.stop(); smoke.stop(); }, 12000);

  return fire;
}
```

- [ ] **Step 4: Add environment particle method**

```typescript
createEnvironmentParticles(theme: string): ParticleSystem | null {
  if (DeviceDetector.isMobile()) return null;

  const env = new ParticleSystem('envParticles', 100, this.scene);
  env.particleTexture = this.particleTex;
  env.createBoxEmitter(
    new Vector3(-1, -0.5, -1), new Vector3(1, 0.5, 1),
    new Vector3(-40, 10, -40), new Vector3(40, 20, 40)
  );
  env.emitter = new Vector3(0, 15, 0);
  env.minLifeTime = 3;
  env.maxLifeTime = 8;
  env.emitRate = 30;
  env.minEmitPower = 0.2;
  env.maxEmitPower = 1;

  switch (theme) {
    case 'desert':
      env.minSize = 0.05; env.maxSize = 0.15;
      env.gravity = new Vector3(2, -0.3, 1);
      env.color1 = new Color4(0.76, 0.65, 0.42, 0.4);
      env.color2 = new Color4(0.68, 0.55, 0.35, 0.2);
      env.colorDead = new Color4(0.6, 0.5, 0.3, 0);
      break;
    case 'forest': case 'kursk':
      env.minSize = 0.08; env.maxSize = 0.2;
      env.gravity = new Vector3(0.5, -1, 0.3);
      env.color1 = new Color4(0.4, 0.5, 0.15, 0.6);
      env.color2 = new Color4(0.5, 0.4, 0.1, 0.4);
      env.colorDead = new Color4(0.3, 0.25, 0.1, 0);
      break;
    case 'stalingrad':
      env.minSize = 0.03; env.maxSize = 0.1;
      env.gravity = new Vector3(0.3, 1, 0.2);
      env.color1 = new Color4(1, 0.5, 0.15, 0.5);
      env.color2 = new Color4(1, 0.3, 0.05, 0.3);
      env.colorDead = new Color4(0.5, 0.15, 0, 0);
      env.blendMode = ParticleSystem.BLENDMODE_ADD;
      break;
    default:
      env.dispose();
      return null;
  }

  env.start();
  this.activeSystems.push(env);
  return env;
}
```

- [ ] **Step 5: Add TransformNode import**

At the top of `ParticleManager.ts`, update the import:

```typescript
import { Scene, ParticleSystem, Vector3, Color4, Texture, TransformNode } from '@babylonjs/core';
```

Also add:
```typescript
import { DeviceDetector } from '../utils/DeviceDetector';
```

- [ ] **Step 6: Commit**

```bash
git add src/systems/ParticleManager.ts
git commit -m "feat: add dust trails, tracers, burning debris, and environment particles"
```

---

## Task 10: Add 4 New Maps + Update MapManager

**Files:**
- Modify: `src/world/MapManager.ts`
- Modify: `src/world/Environment.ts` (new ENV_CONFIGS)

- [ ] **Step 1: Add new map definitions to MapManager**

In `src/world/MapManager.ts`, add 4 new entries to `MAPS`:

```typescript
normandy: {
  name: '诺曼底海滩',
  description: '血染的沙滩与碉堡防线',
  theme: 'normandy' as SkyTheme,
  terrain: {
    size: 200, subdivisions: 80, maxHeight: 8, seed: 1944,
    baseColor: new Color3(0.72, 0.65, 0.5),
    detailColor: new Color3(0.4, 0.55, 0.3),
    roughness: 0.9,
    primaryTexture: 'wet-sand',
    secondaryTexture: 'grass',
    blendMode: 'height' as const,
    blendThreshold: 0.3,
    uvScale: 25,
  },
  defaultWeather: 'cloudy',
  water: {
    waterLevel: 0.2,
    size: 200,
    position: new Vector3(0, 0, -70),
  },
  spawnPoints: [new Vector3(0, 0, -80)],
  enemySpawns: [
    new Vector3(30, 0, 50), new Vector3(-30, 0, 60),
    new Vector3(50, 0, 40), new Vector3(-50, 0, 45),
    new Vector3(0, 0, 70),
  ],
},

stalingrad: {
  name: '斯大林格勒',
  description: '烈焰中的废墟巷战',
  theme: 'stalingrad' as SkyTheme,
  terrain: {
    size: 200, subdivisions: 80, maxHeight: 1, seed: 1942,
    baseColor: new Color3(0.5, 0.45, 0.4),
    detailColor: new Color3(0.4, 0.35, 0.3),
    roughness: 0.95,
    primaryTexture: 'rubble',
    secondaryTexture: 'dirt',
    blendMode: 'random' as const,
    uvScale: 20,
  },
  defaultWeather: 'fog',
  spawnPoints: [new Vector3(0, 0, -50)],
  enemySpawns: [
    new Vector3(25, 0, 35), new Vector3(-25, 0, 40),
    new Vector3(40, 0, 15), new Vector3(-40, 0, 25),
    new Vector3(10, 0, 55),
  ],
},

kursk: {
  name: '库尔斯克',
  description: '广阔草原上的钢铁洪流',
  theme: 'kursk' as SkyTheme,
  terrain: {
    size: 200, subdivisions: 80, maxHeight: 4, seed: 1943,
    baseColor: new Color3(0.4, 0.55, 0.25),
    detailColor: new Color3(0.6, 0.55, 0.3),
    roughness: 0.85,
    primaryTexture: 'grass',
    uvScale: 30,
  },
  defaultWeather: 'clear',
  spawnPoints: [new Vector3(0, 0, -60)],
  enemySpawns: [
    new Vector3(40, 0, 40), new Vector3(-40, 0, 50),
    new Vector3(60, 0, 20), new Vector3(-60, 0, 30),
    new Vector3(0, 0, 65),
  ],
},

ardennes: {
  name: '阿登森林',
  description: '冰天雪地的密林遭遇战',
  theme: 'ardennes' as SkyTheme,
  terrain: {
    size: 200, subdivisions: 80, maxHeight: 5, seed: 1944,
    baseColor: new Color3(0.85, 0.88, 0.92),
    detailColor: new Color3(0.35, 0.3, 0.2),
    roughness: 0.75,
    primaryTexture: 'snow',
    uvScale: 22,
  },
  defaultWeather: 'snow',
  spawnPoints: [new Vector3(0, 0, -55)],
  enemySpawns: [
    new Vector3(25, 0, 35), new Vector3(-25, 0, 45),
    new Vector3(35, 0, 15), new Vector3(-35, 0, 25),
    new Vector3(0, 0, 55),
  ],
},
```

- [ ] **Step 2: Make loadMap async**

Update `MapManager.loadMap` to be async since `Environment.generate` is now async:

```typescript
async loadMap(mapId: string, shadowGen: ShadowGenerator | null): Promise<MapConfig> {
  const config = MAPS[mapId] || MAPS.forest;
  this.currentMap = config;

  this.terrain?.dispose();
  this.terrain = new Terrain(this.scene, config.terrain);

  this.skybox.setTheme(config.theme);
  await this.environment.generate(config.theme as EnvTheme, this.terrain, shadowGen);
  this.weather.setWeather(config.defaultWeather);

  if (config.water) {
    this.water = new WaterSystem(this.scene);
    this.water.create(config.water);
  }

  return config;
}
```

Update `Game.startBattle` to await `loadMap`:

```typescript
const mapConfig = await this.mapManager.loadMap(mapId, this.shadowSystem?.generator ?? null);
```

- [ ] **Step 3: Commit**

```bash
git add src/world/MapManager.ts
git commit -m "feat: add Normandy, Stalingrad, Kursk, and Ardennes maps"
```

---

## Task 11: Update MainMenu

**Files:**
- Modify: `src/ui/MainMenu.ts`

- [ ] **Step 1: The map grid is auto-generated from MapManager.getMapList()**

No code change needed — `MainMenu.buildBattleSetupHTML` already calls `MapManager.getMapList()` which iterates over all `MAPS` entries. The 4 new maps will automatically appear in the grid.

Verify by checking that the map grid renders all 8 maps in the browser.

- [ ] **Step 2: Commit (if any style adjustments needed)**

```bash
git add src/ui/MainMenu.ts
git commit -m "style: adjust map grid for 8 maps"
```

---

## Task 12: Game.ts Full Integration

**Files:**
- Modify: `src/Game.ts`

- [ ] **Step 1: Add all new imports**

At the top of `Game.ts`, add:

```typescript
import { DirectionalLight, Mesh } from '@babylonjs/core';
import { ShadowSystem } from './world/ShadowSystem';
```

- [ ] **Step 2: Add dust trail and environment particles**

After `this.particles = new ParticleManager(this.scene);`:

```typescript
// Environment particles
this.particles.createEnvironmentParticles(mapId);
```

In `updateBattle`, when the player is moving (after `player.handleInput`), create/manage dust trail:

```typescript
// Add a flag in Game class:
private dustTrail: ParticleSystem | null = null;

// In startBattle, after particles init:
this.dustTrail = this.particles.createDustTrail(this.player.root, mapId);
```

Update the dust trail emitter to follow the player — it already does since `emitter` is set to `this.player.root` (a TransformNode), so particles follow automatically. Control emission rate based on speed:

In `updateBattle`, after player movement:
```typescript
if (this.dustTrail) {
  const speed = this.player.currentSpeed ?? 0;
  this.dustTrail.emitRate = speed > 0.5 ? 20 : 0;
}
```

- [ ] **Step 3: Wire destruction system**

Add destruction system property and creation in startBattle:

```typescript
private destruction: DestructionSystem | null = null;

// In startBattle, after particles:
this.destruction = new DestructionSystem(this.scene, this.particles);
```

In `cleanupBattle`:
```typescript
this.destruction?.dispose();
this.destruction = null;
this.dustTrail = null;
```

- [ ] **Step 4: Add shadow casters for enemy tanks**

In `startBattle`, after creating enemies:
```typescript
for (const enemy of this.enemies) {
  enemy.root.getChildMeshes().forEach(m => {
    if (m instanceof Mesh && this.shadowSystem) {
      this.shadowSystem.addCaster(m);
    }
  });
}
```

- [ ] **Step 5: Commit**

```bash
git add src/Game.ts
git commit -m "feat: integrate shadows, dust trails, destruction, and env particles"
```

---

## Task 13: Visual Verification & Polish

- [ ] **Step 1: Build and run**

Run: `npm run dev`
Open browser, test each of the 8 maps:
1. Desert — sand texture, HDR sky, shadows, dust
2. Urban — rubble texture, overcast sky, destructible buildings
3. Forest — grass texture, clear sky, tree shadows
4. Snow — snow texture, winter sky, enhanced snowfall
5. Normandy — wet sand + water, stormy sky, bunkers
6. Stalingrad — rubble + fire embers, smoky sky, ruins
7. Kursk — grass, clear wide sky, open terrain
8. Ardennes — snow + dense pines, heavy snowfall

- [ ] **Step 2: Fix any visual issues**

Adjust texture scales, lighting intensity, particle rates, and shadow quality based on visual inspection.

- [ ] **Step 3: Test on mobile viewport**

Use browser DevTools to simulate mobile device. Verify:
- Lower texture resolution loads
- Shadow resolution is reduced
- Environment particle count is lower
- Water has simplified rendering (no reflection)
- Acceptable frame rate (>30fps)

- [ ] **Step 4: Build for production**

Run: `npm run build`
Expected: No build errors. Output in `dist/`.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "polish: visual adjustments and mobile optimization"
```

---

## Task 14: Deploy

- [ ] **Step 1: Build**

```bash
npm run build
```

- [ ] **Step 2: Deploy to server**

```bash
scp -r dist/* root@kaien.tbeasy.com:/var/www/html/tank/
scp -r public/assets root@kaien.tbeasy.com:/var/www/html/tank/
```

- [ ] **Step 3: Verify deployment**

```bash
curl -sI https://kaien.tbeasy.com/tank/index.html | head -3
curl -sI https://kaien.tbeasy.com/tank/assets/textures/sand/albedo.jpg | head -3
```

- [ ] **Step 4: Commit deploy state**

```bash
git add -A
git commit -m "deploy: map visual overhaul to production"
```
