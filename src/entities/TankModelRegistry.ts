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
}

export const TANK_MODELS: Record<string, TankModelDef> = {
  panzer3: {
    id: 'panzer3',
    name: 'Panzer III',
    modelFile: 'models/WWII_Tank_Germany_Panzer_III_v1/14077_WWII_Tank_Germany_Panzer_III_v1_L2.obj',
    upAxis: 'z-up',
    yawOffset: 0,
    brightnessMult: 3.0,
    emissiveBoost: new Vector3(0.25, 0.25, 0.22),
    xForward: true,
  },
  t90a: {
    id: 't90a',
    name: 'T-90A',
    modelFile: 'models/t-90a(Elements_of_war)/t-90a(Elements_of_war).obj',
    upAxis: 'z-up',
    yawOffset: 0,
    brightnessMult: 2.0,
    emissiveBoost: new Vector3(0.15, 0.15, 0.12),
    xForward: false,
    excludeMaterials: ['Material__3919', 'Material__3920'],
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
