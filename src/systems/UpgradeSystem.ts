export interface PlayerProgress {
  level: number;
  experience: number;
  coins: number;
  unlockedTanks: string[];
  upgrades: Record<string, TankUpgrades>;
  totalKills: number;
  totalBattles: number;
}

export interface TankUpgrades {
  armor: number;
  damage: number;
  speed: number;
  reload: number;
}

const STORAGE_KEY = 'tankBattle_progress';
const EXP_PER_LEVEL = 100;

const UPGRADE_COST_BASE = 50;

export class UpgradeSystem {
  progress: PlayerProgress;

  constructor() {
    this.progress = this.load();
  }

  private defaultProgress(): PlayerProgress {
    return {
      level: 1,
      experience: 0,
      coins: 100,
      unlockedTanks: ['medium'],
      upgrades: {},
      totalKills: 0,
      totalBattles: 0,
    };
  }

  private load(): PlayerProgress {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (data) return JSON.parse(data);
    } catch {}
    return this.defaultProgress();
  }

  save(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.progress));
    } catch {}
  }

  addBattleReward(kills: number, victory: boolean): { exp: number; coins: number; levelUp: boolean } {
    const expGain = kills * 20 + (victory ? 50 : 10);
    const coinGain = kills * 15 + (victory ? 30 : 5);

    this.progress.experience += expGain;
    this.progress.coins += coinGain;
    this.progress.totalKills += kills;
    this.progress.totalBattles += 1;

    let levelUp = false;
    while (this.progress.experience >= this.progress.level * EXP_PER_LEVEL) {
      this.progress.experience -= this.progress.level * EXP_PER_LEVEL;
      this.progress.level += 1;
      levelUp = true;
    }

    if (this.progress.level >= 3 && !this.progress.unlockedTanks.includes('light')) {
      this.progress.unlockedTanks.push('light');
    }
    if (this.progress.level >= 5 && !this.progress.unlockedTanks.includes('heavy')) {
      this.progress.unlockedTanks.push('heavy');
    }
    if (this.progress.level >= 8 && !this.progress.unlockedTanks.includes('destroyer')) {
      this.progress.unlockedTanks.push('destroyer');
    }

    this.save();
    return { exp: expGain, coins: coinGain, levelUp };
  }

  getUpgrades(tankType: string): TankUpgrades {
    return this.progress.upgrades[tankType] || { armor: 0, damage: 0, speed: 0, reload: 0 };
  }

  getUpgradeCost(tankType: string, stat: keyof TankUpgrades): number {
    const current = this.getUpgrades(tankType)[stat];
    return UPGRADE_COST_BASE * (current + 1);
  }

  canUpgrade(tankType: string, stat: keyof TankUpgrades): boolean {
    const cost = this.getUpgradeCost(tankType, stat);
    const current = this.getUpgrades(tankType)[stat];
    return this.progress.coins >= cost && current < 5;
  }

  upgrade(tankType: string, stat: keyof TankUpgrades): boolean {
    if (!this.canUpgrade(tankType, stat)) return false;

    const cost = this.getUpgradeCost(tankType, stat);
    this.progress.coins -= cost;

    if (!this.progress.upgrades[tankType]) {
      this.progress.upgrades[tankType] = { armor: 0, damage: 0, speed: 0, reload: 0 };
    }
    this.progress.upgrades[tankType][stat] += 1;

    this.save();
    return true;
  }

  getModifiedStats(tankType: string, baseStats: { armor: number; damage: number; speed: number; reloadTime: number }) {
    const upgrades = this.getUpgrades(tankType);
    return {
      armor: baseStats.armor + upgrades.armor * 3,
      damage: baseStats.damage + upgrades.damage * 5,
      speed: baseStats.speed + upgrades.speed * 1,
      reloadTime: Math.max(0.5, baseStats.reloadTime - upgrades.reload * 0.3),
    };
  }

  reset(): void {
    this.progress = this.defaultProgress();
    this.save();
  }
}
