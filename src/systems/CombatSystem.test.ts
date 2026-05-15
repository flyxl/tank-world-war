import { describe, it, expect } from 'vitest';
import { checkObstacleHit, ObstacleBox } from './CombatSystem';

describe('Projectile-Obstacle collision detection', () => {
  it('detects hit when projectile path passes through obstacle AABB', () => {
    const obstacle: ObstacleBox = {
      minX: 8, maxX: 12,
      minY: 0, maxY: 5,
      minZ: -2, maxZ: 2,
    };

    const prevPos = { x: 0, y: 2, z: 0 };
    const curPos = { x: 20, y: 2, z: 0 };

    const hit = checkObstacleHit(prevPos, curPos, [obstacle]);
    expect(hit).toBe(true);
  });

  it('does not detect hit when projectile path misses obstacle', () => {
    const obstacle: ObstacleBox = {
      minX: 8, maxX: 12,
      minY: 0, maxY: 5,
      minZ: -2, maxZ: 2,
    };

    const prevPos = { x: 0, y: 2, z: 5 };
    const curPos = { x: 20, y: 2, z: 5 };

    const hit = checkObstacleHit(prevPos, curPos, [obstacle]);
    expect(hit).toBe(false);
  });

  it('detects hit when projectile path grazes obstacle top edge', () => {
    const obstacle: ObstacleBox = {
      minX: 4, maxX: 6,
      minY: 0, maxY: 3,
      minZ: -1, maxZ: 1,
    };

    const prevPos = { x: 0, y: 2.5, z: 0 };
    const curPos = { x: 10, y: 2.5, z: 0 };

    const hit = checkObstacleHit(prevPos, curPos, [obstacle]);
    expect(hit).toBe(true);
  });

  it('does not detect hit when projectile flies over obstacle', () => {
    const obstacle: ObstacleBox = {
      minX: 4, maxX: 6,
      minY: 0, maxY: 3,
      minZ: -1, maxZ: 1,
    };

    const prevPos = { x: 0, y: 4, z: 0 };
    const curPos = { x: 10, y: 4, z: 0 };

    const hit = checkObstacleHit(prevPos, curPos, [obstacle]);
    expect(hit).toBe(false);
  });

  it('detects hit among multiple obstacles', () => {
    const obstacles: ObstacleBox[] = [
      { minX: 20, maxX: 24, minY: 0, maxY: 5, minZ: -2, maxZ: 2 },
      { minX: 8, maxX: 12, minY: 0, maxY: 4, minZ: -2, maxZ: 2 },
    ];

    const prevPos = { x: 0, y: 2, z: 0 };
    const curPos = { x: 15, y: 2, z: 0 };

    const hit = checkObstacleHit(prevPos, curPos, obstacles);
    expect(hit).toBe(true);
  });
});
