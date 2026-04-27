import { Game } from './Game';

import '@babylonjs/core/Engines/engine';
import '@babylonjs/core/Meshes/meshBuilder';
import '@babylonjs/core/Materials/standardMaterial';
import '@babylonjs/core/Materials/PBR/pbrMetallicRoughnessMaterial';
import '@babylonjs/core/Lights/hemisphericLight';
import '@babylonjs/core/Lights/directionalLight';
import '@babylonjs/core/Cameras/arcRotateCamera';
import '@babylonjs/core/Cameras/freeCamera';
import '@babylonjs/core/Particles/particleSystem';
import '@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline';
import '@babylonjs/core/Rendering/depthRendererSceneComponent';
import '@babylonjs/core/Materials/Textures/dynamicTexture';
import '@babylonjs/core/Meshes/trailMesh';

try {
  (screen.orientation as any).lock?.('landscape').catch(() => {});
} catch (_) {}

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

if (!canvas) {
  throw new Error('Canvas element not found');
}

const game = new Game(canvas);
game.init().catch(console.error);
