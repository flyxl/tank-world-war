import { EnemyTank, AIState } from '../entities/EnemyTank';
import { Tank } from '../entities/Tank';
import { CombatSystem } from './CombatSystem';

export class AISystem {
  private enemies: EnemyTank[] = [];
  private target: Tank | null = null;
  private maxEngaged = 2;

  constructor(private combat: CombatSystem) {}

  setEnemies(enemies: EnemyTank[]): void {
    this.enemies = enemies;
  }

  setTarget(target: Tank): void {
    this.target = target;
    this.enemies.forEach((e) => e.setTarget(target));
  }

  update(dt: number): void {
    const engaged = this.enemies.filter(
      (e) => e.isAlive && (e.state === AIState.CHASE || e.state === AIState.ATTACK)
    ).length;

    for (const enemy of this.enemies) {
      if (!enemy.isAlive) continue;

      const isEngaged = enemy.state === AIState.CHASE || enemy.state === AIState.ATTACK;

      if (!isEngaged && engaged >= this.maxEngaged) {
        enemy.allowAttack = false;
        enemy.allowChase = false;
      } else {
        enemy.allowAttack = true;
        enemy.allowChase = true;
      }

      enemy.updateAI(dt);

      if (enemy.wantsFire) {
        enemy.wantsFire = false;
        this.combat.fireProjectile(enemy, true);
      }
    }
  }

  getAliveCount(): number {
    return this.enemies.filter((e) => e.isAlive).length;
  }

  dispose(): void {
    this.enemies = [];
  }
}
