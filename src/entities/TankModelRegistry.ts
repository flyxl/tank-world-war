import { Vector3 } from '@babylonjs/core';

export interface TankModelDef {
  id: string;
  name: string;
  /** Relative path under public/ (appended to BASE_URL at runtime). */
  modelFile: string;
  /** Coordinate system origin. 'z-up' = 3ds Max style, 'y-up' = Babylon native. */
  upAxis: 'y-up' | 'z-up';
  /** Extra Y rotation (radians) applied after axis correction to face +Z. */
  yawOffset: number;
  /** diffuseColor multiplier to compensate dark textures. */
  brightnessMult: number;
  /** emissiveColor added for shadow-side visibility. */
  emissiveBoost: Vector3;
  /** If true, the model file is an X-forward model needing additional Z rotation. */
  xForward: boolean;
  /** Material names to exclude (duplicate LOD meshes, etc.). */
  excludeMaterials?: string[];
  /** Extra scale multiplier applied after auto-fit (default 1.0). */
  scaleMult?: number;
}

export const TANK_MODELS: Record<string, TankModelDef> = {
  panzer3: {
    id: 'panzer3',
    name: 'Panzer III',
    modelFile: 'models/panzer3/panzer3.obj',
    upAxis: 'z-up',
    yawOffset: 0,
    brightnessMult: 3.0,
    emissiveBoost: new Vector3(0.25, 0.25, 0.22),
    xForward: true,
  },
  t34: {
    id: 't34',
    name: 'T-34',
    modelFile: 'models/t34/t34.obj',
    upAxis: 'y-up',
    yawOffset: 0,
    brightnessMult: 2.5,
    emissiveBoost: new Vector3(0.18, 0.22, 0.12),
    xForward: false,
  },
  tiger1: {
    id: 'tiger1',
    name: 'Tiger I',
    modelFile: 'models/tiger1/tiger1.obj',
    upAxis: 'y-up',
    yawOffset: 0,
    brightnessMult: 2.5,
    emissiveBoost: new Vector3(0.22, 0.20, 0.12),
    xForward: false,
  },
  t90a: {
    id: 't90a',
    name: 'T-90A',
    modelFile: 'models/t90a/t90a.obj',
    upAxis: 'z-up',
    yawOffset: 0,
    brightnessMult: 2.0,
    emissiveBoost: new Vector3(0.15, 0.15, 0.12),
    xForward: false,
    excludeMaterials: ['Material__3919', 'Material__3920'],
    scaleMult: 2.5,
  },
};

export function getModelDef(id: string): TankModelDef | undefined {
  return TANK_MODELS[id];
}

export function getDefaultModelId(): string {
  return 'panzer3';
}

const STORAGE_KEY = 'tank_selected_model';

export function getSelectedModelId(): string {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved && TANK_MODELS[saved]) return saved;
  return getDefaultModelId();
}

export function setSelectedModelId(id: string): void {
  if (TANK_MODELS[id]) {
    localStorage.setItem(STORAGE_KEY, id);
  }
}
