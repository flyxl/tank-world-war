import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  DirectionalLight,
  Vector3,
  Color3,
  Color4,
  SceneLoader,
  Mesh,
  TransformNode,
  StandardMaterial,
} from '@babylonjs/core';
import '@babylonjs/loaders/OBJ';
import { TANK_MODELS, type TankModelDef } from '../entities/TankModelRegistry';
import { TankModelLoader } from '../entities/TankModelLoader';

export class ModelViewer {
  private overlay: HTMLDivElement;
  private canvas: HTMLCanvasElement;
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private modelRoot: TransformNode | null = null;
  private modelIds: string[];
  private currentIdx = 0;
  private onClose: () => void;

  constructor(onClose: () => void) {
    this.onClose = onClose;
    this.modelIds = Object.keys(TANK_MODELS);

    this.overlay = document.createElement('div');
    this.overlay.id = 'modelViewerOverlay';
    document.body.appendChild(this.overlay);

    this.canvas = document.createElement('canvas');
    this.canvas.id = 'modelViewerCanvas';
    this.overlay.appendChild(this.canvas);

    this.engine = new Engine(this.canvas, true, { preserveDrawingBuffer: true, stencil: true });
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.08, 0.1, 0.15, 1);

    this.camera = new ArcRotateCamera('viewerCam', -Math.PI / 4, Math.PI / 3, 8, Vector3.Zero(), this.scene);
    this.camera.attachControl(this.canvas, true);
    this.camera.lowerRadiusLimit = 3;
    this.camera.upperRadiusLimit = 20;
    this.camera.wheelPrecision = 30;

    this.setupLighting();
    this.buildUI();
    this.loadCurrentModel();

    this.engine.runRenderLoop(() => this.scene.render());
    window.addEventListener('resize', this.handleResize);
    this.handleResize();
  }

  private setupLighting(): void {
    const hemi = new HemisphericLight('viewerHemi', new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 1.2;
    hemi.groundColor = new Color3(0.4, 0.42, 0.45);
    hemi.diffuse = new Color3(0.9, 0.92, 0.95);

    const sun = new DirectionalLight('viewerSun', new Vector3(-0.5, -1, -0.3).normalize(), this.scene);
    sun.intensity = 1.5;
    sun.diffuse = new Color3(1, 0.95, 0.85);

    this.scene.ambientColor = new Color3(0.5, 0.52, 0.55);
  }

  private buildUI(): void {
    const style = document.createElement('style');
    style.textContent = `
      #modelViewerOverlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        z-index: 200; display: flex; flex-direction: column;
        background: rgba(8,10,20,0.97);
      }
      #modelViewerCanvas {
        flex: 1; width: 100%; display: block; outline: none;
      }
      .mv-controls {
        position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%);
        display: flex; align-items: center; gap: 20px;
      }
      .mv-btn {
        padding: 10px 24px; border-radius: 10px; border: none;
        background: rgba(255,255,255,0.12); color: #fff; font-size: 1rem;
        cursor: pointer; transition: all 0.15s;
      }
      .mv-btn:hover { background: rgba(255,255,255,0.25); }
      .mv-name {
        color: #fff; font-size: 1.4rem; font-weight: 700; min-width: 180px;
        text-align: center; text-shadow: 0 2px 8px rgba(0,0,0,0.5);
      }
      .mv-close {
        position: absolute; top: 20px; right: 30px;
        padding: 8px 20px; border-radius: 8px; border: none;
        background: rgba(255,60,60,0.3); color: #fff; font-size: 0.9rem;
        cursor: pointer; transition: all 0.15s;
      }
      .mv-close:hover { background: rgba(255,60,60,0.5); }
      .mv-hint {
        position: absolute; top: 20px; left: 30px;
        color: rgba(255,255,255,0.5); font-size: 0.8rem;
      }
    `;
    this.overlay.appendChild(style);

    const hint = document.createElement('div');
    hint.className = 'mv-hint';
    hint.textContent = '拖拽旋转 | 滚轮缩放';
    this.overlay.appendChild(hint);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'mv-close';
    closeBtn.textContent = '返回车库';
    closeBtn.addEventListener('click', () => this.dispose());
    this.overlay.appendChild(closeBtn);

    const controls = document.createElement('div');
    controls.className = 'mv-controls';

    const prevBtn = document.createElement('button');
    prevBtn.className = 'mv-btn';
    prevBtn.textContent = '◀ 上一个';
    prevBtn.addEventListener('click', () => this.navigate(-1));

    const nameEl = document.createElement('div');
    nameEl.className = 'mv-name';
    nameEl.id = 'mvModelName';

    const nextBtn = document.createElement('button');
    nextBtn.className = 'mv-btn';
    nextBtn.textContent = '下一个 ▶';
    nextBtn.addEventListener('click', () => this.navigate(1));

    controls.appendChild(prevBtn);
    controls.appendChild(nameEl);
    controls.appendChild(nextBtn);
    this.overlay.appendChild(controls);
  }

  private navigate(delta: number): void {
    this.currentIdx = (this.currentIdx + delta + this.modelIds.length) % this.modelIds.length;
    this.loadCurrentModel();
  }

  private async loadCurrentModel(): Promise<void> {
    if (this.modelRoot) {
      this.modelRoot.dispose(false, true);
      this.modelRoot = null;
    }

    const def = TANK_MODELS[this.modelIds[this.currentIdx]];
    if (!def) return;

    const nameEl = document.getElementById('mvModelName');
    if (nameEl) nameEl.textContent = def.name;

    const base = import.meta.env.BASE_URL;
    const modelUrl = (base.endsWith('/') ? base : base + '/') + def.modelFile;
    const { rootUrl, fileName } = TankModelLoader.splitModelPath(modelUrl);

    try {
      const result = await SceneLoader.ImportMeshAsync('', rootUrl, fileName, this.scene);
      const meshes = result.meshes.filter(
        (m) => m instanceof Mesh && !m.name.toLowerCase().includes('__root__')
      ) as Mesh[];

      if (meshes.length === 0) return;

      this.modelRoot = new TransformNode('modelRoot', this.scene);

      const orient = new TransformNode('orient', this.scene);
      orient.parent = this.modelRoot;
      if (def.upAxis === 'z-up') orient.rotation.x = -Math.PI / 2;
      if (def.xForward) orient.rotation.z = -Math.PI / 2;
      orient.rotation.y = def.yawOffset;

      for (const mesh of meshes) {
        mesh.parent = orient;
        const mat = mesh.material as StandardMaterial;
        if (mat) {
          mat.backFaceCulling = false;
          mat.diffuseColor?.set(def.brightnessMult, def.brightnessMult, def.brightnessMult * 0.93);
          mat.emissiveColor?.set(def.emissiveBoost.x, def.emissiveBoost.y, def.emissiveBoost.z);
        }
      }

      this.modelRoot.computeWorldMatrix(true);
      let minY = Infinity, maxY = -Infinity;
      let maxSpan = 0;
      for (const m of meshes) {
        m.computeWorldMatrix(true);
        const bi = m.getBoundingInfo();
        if (!bi) continue;
        const mn = bi.boundingBox.minimumWorld;
        const mx = bi.boundingBox.maximumWorld;
        minY = Math.min(minY, mn.y);
        maxY = Math.max(maxY, mx.y);
        maxSpan = Math.max(maxSpan, mx.x - mn.x, mx.z - mn.z);
      }

      if (Number.isFinite(maxSpan) && maxSpan > 0.1) {
        const targetSize = 5;
        const s = targetSize / maxSpan;
        this.modelRoot.scaling.setAll(Math.min(s, 4));
      }

      this.modelRoot.computeWorldMatrix(true);
      for (const m of meshes) m.computeWorldMatrix(true);
      let newMinY = Infinity;
      for (const m of meshes) {
        const bi = m.getBoundingInfo();
        if (bi) newMinY = Math.min(newMinY, bi.boundingBox.minimumWorld.y);
      }
      if (Number.isFinite(newMinY)) {
        this.modelRoot.position.y = -newMinY;
      }

      this.camera.setTarget(new Vector3(0, (maxY - minY) * 0.3 * (this.modelRoot.scaling.x), 0));

    } catch (e) {
      console.warn('[ModelViewer] Failed to load:', def.modelFile, e);
    }
  }

  private handleResize = (): void => {
    this.engine.resize();
  };

  dispose(): void {
    window.removeEventListener('resize', this.handleResize);
    this.engine.stopRenderLoop();
    this.scene.dispose();
    this.engine.dispose();
    this.overlay.remove();
    this.onClose();
  }
}
