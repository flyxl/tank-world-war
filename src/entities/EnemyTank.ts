import { Scene } from '@babylonjs/core/scene';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Tank, TankConfig } from './Tank';
import { MathUtils } from '../utils/MathUtils';

export enum AIState {
  PATROL,
  CHASE,
  ATTACK,
  RETREAT,
}

interface PatrolPoint {
  position: Vector3;
  waitTime: number;
}

export class EnemyTank extends Tank {
  state: AIState = AIState.PATROL;
  detectionRange = 80;
  attackRange = 40;
  retreatHealthPercent = 0.2;
  accuracy = 0.85;
  reactionTime = 0.8;

  private target: Tank | null = null;
  private reactionTimer = 0;
  private patrolPoints: PatrolPoint[] = [];
  private currentPatrolIndex = 0;
  private patrolWaitTimer = 0;
  private stuckTimer = 0;
  private lastPosition = Vector3.Zero();
  private difficulty: number;

  constructor(scene: Scene, config: TankConfig, position: Vector3, difficulty: number = 1) {
    super(scene, config, position);
    this.difficulty = MathUtils.clamp(difficulty, 0.5, 2);
    this.accuracy = MathUtils.clamp(0.35 + difficulty * 0.12, 0.25, 0.7);
    this.reactionTime = MathUtils.clamp(1.5 - difficulty * 0.3, 0.5, 2.0);
    this.config.reloadTime = Math.max(this.config.reloadTime * 2.5, 4);
    this.config.damage = Math.max(Math.round(this.config.damage * 0.6), 5);
    this.generatePatrolPoints(position);
    this.lastPosition = position.clone();
  }

  private generatePatrolPoints(center: Vector3): void {
    const count = MathUtils.randomInt(3, 6);
    for (let i = 0; i < count; i++) {
      this.patrolPoints.push({
        position: new Vector3(
          center.x + MathUtils.randomRange(-30, 30),
          0,
          center.z + MathUtils.randomRange(-30, 30)
        ),
        waitTime: MathUtils.randomRange(1, 3),
      });
    }
  }

  setTarget(target: Tank): void {
    this.target = target;
  }

  updateAI(dt: number): void {
    if (!this.isAlive) return;
    this.update(dt);

    const distToTarget = this.target && this.target.isAlive
      ? MathUtils.distanceXZ(this.root.position, this.target.root.position)
      : Infinity;

    const healthPercent = this.health / this.config.maxHealth;

    switch (this.state) {
      case AIState.PATROL:
        this.doPatrol(dt);
        if (distToTarget < this.detectionRange && this.allowChase) {
          this.state = AIState.CHASE;
          this.reactionTimer = this.reactionTime;
        }
        break;

      case AIState.CHASE:
        this.reactionTimer -= dt;
        if (this.reactionTimer <= 0) {
          this.moveToward(this.target!.root.position, dt);
          this.aimAtTarget(dt);
        }
        if (distToTarget < this.attackRange && this.allowAttack) {
          this.state = AIState.ATTACK;
        } else if (distToTarget > this.detectionRange * 1.5) {
          this.state = AIState.PATROL;
        }
        if (healthPercent < this.retreatHealthPercent) {
          this.state = AIState.RETREAT;
        }
        break;

      case AIState.ATTACK:
        this.aimAtTarget(dt);
        this.maintainDistance(dt, this.attackRange * 0.7);

        if (this.canFire() && distToTarget < this.attackRange) {
          if (Math.random() < this.accuracy) {
            this.fire();
            this.wantsFire = true;
          }
        }

        if (distToTarget > this.attackRange * 1.3) {
          this.state = AIState.CHASE;
        }
        if (healthPercent < this.retreatHealthPercent) {
          this.state = AIState.RETREAT;
        }
        break;

      case AIState.RETREAT: {
        if (!this.target) break;
        const awayDir = this.root.position.subtract(this.target.root.position).normalize();
        const retreatPos = this.root.position.add(awayDir.scale(20));
        this.moveToward(retreatPos, dt);

        if (healthPercent > this.retreatHealthPercent + 0.1) {
          this.state = AIState.CHASE;
        }
        break;
      }
    }

    this.checkStuck(dt);
  }

  wantsFire = false;
  allowAttack = true;
  allowChase = true;

  private doPatrol(dt: number): void {
    if (this.patrolPoints.length === 0) return;
    const point = this.patrolPoints[this.currentPatrolIndex];
    const dist = MathUtils.distanceXZ(this.root.position, point.position);

    if (dist < 3) {
      this.patrolWaitTimer += dt;
      if (this.patrolWaitTimer >= point.waitTime) {
        this.patrolWaitTimer = 0;
        this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
      }
    } else {
      this.moveToward(point.position, dt);
    }
  }

  private moveToward(target: Vector3, dt: number): void {
    const angle = MathUtils.angleBetweenVectors(this.root.position, target);
    const diff = MathUtils.normalizeAngle(angle - this.root.rotation.y);
    this.root.rotation.y += MathUtils.clamp(diff, -this.config.turnSpeed * dt, this.config.turnSpeed * dt);

    if (Math.abs(diff) < Math.PI / 3) {
      const speed = this.config.speed * (1 - Math.abs(diff) / Math.PI);
      const forward = new Vector3(Math.sin(this.root.rotation.y), 0, Math.cos(this.root.rotation.y));
      this.root.position.addInPlace(forward.scale(speed * dt));
    }
  }

  private aimAtTarget(dt: number): void {
    if (!this.target) return;
    const dirToTarget = this.target.root.position.subtract(this.root.position);
    const targetAngle = Math.atan2(dirToTarget.x, dirToTarget.z) - this.root.rotation.y;
    const normalizedTarget = MathUtils.normalizeAngle(targetAngle);
    const diff = MathUtils.normalizeAngle(normalizedTarget - this.turret.rotation.y);
    this.turret.rotation.y += MathUtils.clamp(diff, -this.config.turretSpeed * dt, this.config.turretSpeed * dt);
  }

  private maintainDistance(dt: number, idealDist: number): void {
    if (!this.target) return;
    const dist = MathUtils.distanceXZ(this.root.position, this.target.root.position);
    if (dist < idealDist * 0.6) {
      const awayDir = this.root.position.subtract(this.target.root.position).normalize();
      const retreatPos = this.root.position.add(awayDir.scale(5));
      this.moveToward(retreatPos, dt * 0.5);
    }
  }

  private checkStuck(dt: number): void {
    const moved = MathUtils.distanceXZ(this.root.position, this.lastPosition);
    if (moved < 0.05 * dt && this.state !== AIState.PATROL) {
      this.stuckTimer += dt;
      if (this.stuckTimer > 3) {
        this.root.rotation.y += MathUtils.randomRange(-0.5, 0.5);
        this.stuckTimer = 0;
      }
    } else {
      this.stuckTimer = 0;
    }
    this.lastPosition = this.root.position.clone();
  }
}
