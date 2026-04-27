import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Tank, TANK_CONFIGS, TankConfig } from './Tank';
import { PlayerTank } from './PlayerTank';
import { EnemyTank } from './EnemyTank';

export class TankFactory {
  constructor(private scene: Scene) {}

  createPlayerTank(type: string, position: Vector3): PlayerTank {
    const config = this.getConfig(type);
    return new PlayerTank(this.scene, config, position);
  }

  createEnemyTank(type: string, position: Vector3, difficulty: number = 1): EnemyTank {
    const config = this.getConfig(type);
    return new EnemyTank(this.scene, config, position, difficulty);
  }

  private getConfig(type: string): TankConfig {
    const config = TANK_CONFIGS[type];
    if (!config) {
      console.warn(`Unknown tank type: ${type}, using medium`);
      return { ...TANK_CONFIGS.medium };
    }
    return { ...config, bodyColor: config.bodyColor.clone() };
  }

  static getTankTypes(): string[] {
    return Object.keys(TANK_CONFIGS);
  }

  static getConfig(type: string): TankConfig {
    return TANK_CONFIGS[type] || TANK_CONFIGS.medium;
  }
}
