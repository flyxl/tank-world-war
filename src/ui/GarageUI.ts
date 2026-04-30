import { Scene } from '@babylonjs/core';
import { UpgradeSystem, TankUpgrades } from '../systems/UpgradeSystem';
import { TANK_CONFIGS } from '../entities/Tank';
import { ModelViewer } from './ModelViewer';
import { TANK_MODELS, getSelectedModelId } from '../entities/TankModelRegistry';

export class GarageUI {
  private root: HTMLDivElement;
  private upgradeSystem: UpgradeSystem;
  private onBack: () => void;
  private selectedTank = 'medium';

  constructor(upgradeSystem: UpgradeSystem, onBack: () => void, _scene?: Scene) {
    this.upgradeSystem = upgradeSystem;
    this.onBack = onBack;
    this.root = document.createElement('div');
    this.root.id = 'garageUI';
    document.body.appendChild(this.root);
    this.buildUI();
  }

  private buildUI(): void {
    this.root.innerHTML = '';

    const unlocked = this.upgradeSystem.progress.unlockedTanks;
    const config = TANK_CONFIGS[this.selectedTank];
    if (!config) return;

    const upgrades = this.upgradeSystem.getUpgrades(this.selectedTank);
    const modded = this.upgradeSystem.getModifiedStats(this.selectedTank, {
      armor: config.armor, damage: config.damage, speed: config.speed, reloadTime: config.reloadTime,
    });

    const stats: { label: string; key: keyof TankUpgrades; value: number; unit: string }[] = [
      { label: '装甲', key: 'armor', value: modded.armor, unit: '' },
      { label: '火力', key: 'damage', value: modded.damage, unit: '' },
      { label: '速度', key: 'speed', value: modded.speed, unit: '' },
      { label: '装填', key: 'reload', value: modded.reloadTime, unit: 's' },
    ];

    this.root.innerHTML = `
      <style>
        #garageUI {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(10,15,30,0.93); display: flex; flex-direction: column;
          align-items: center; justify-content: center; z-index: 100;
          font-family: Arial, sans-serif; color: #fff; user-select: none;
        }
        #garageUI .g-title { color: #3498db; font-size: 2rem; font-weight: 900; margin-bottom: 0.3rem; }
        #garageUI .g-coins { color: #f1c40f; font-size: 1.1rem; margin-bottom: 1rem; }
        #garageUI .g-tank-row { display: flex; gap: 8px; margin-bottom: 1.5rem; }
        #garageUI .g-tank-btn {
          padding: 7px 14px; border-radius: 8px; border: none; cursor: pointer;
          background: rgba(255,255,255,0.1); color: #fff; font-size: 0.85rem;
          transition: all 0.15s;
        }
        #garageUI .g-tank-btn.active { background: #3498db; }
        #garageUI .g-tank-btn.locked { color: rgba(255,255,255,0.3); cursor: not-allowed; }
        #garageUI .g-name { font-size: 1.3rem; margin-bottom: 1rem; }
        #garageUI .g-stat-row {
          display: flex; align-items: center; gap: 12px; margin-bottom: 10px; width: 320px;
        }
        #garageUI .g-stat-label { width: 50px; color: rgba(255,255,255,0.6); font-size: 0.85rem; }
        #garageUI .g-stat-val { width: 110px; font-size: 0.9rem; }
        #garageUI .g-stat-val.upgraded { color: #2ecc71; }
        #garageUI .g-up-btn {
          padding: 6px 14px; border-radius: 6px; border: none; cursor: pointer;
          font-size: 0.8rem; color: #fff; transition: all 0.15s;
        }
        #garageUI .g-up-btn.can { background: #e94560; }
        #garageUI .g-up-btn.can:hover { background: #c0392b; }
        #garageUI .g-up-btn.no { background: rgba(255,255,255,0.1); cursor: not-allowed; color: rgba(255,255,255,0.4); }
        #garageUI .g-model-info {
          margin-top: 1.2rem; padding: 8px 20px; border-radius: 8px;
          background: rgba(46,204,113,0.12); border: 1px solid rgba(46,204,113,0.3);
          font-size: 0.9rem; color: rgba(255,255,255,0.8);
        }
        #garageUI .g-model-name { color: #2ecc71; font-weight: 700; }
        #garageUI .g-btn-row { display: flex; gap: 12px; margin-top: 1.5rem; }
        #garageUI .g-back, #garageUI .g-browse {
          padding: 10px 32px; border-radius: 10px; border: none;
          background: rgba(255,255,255,0.12); color: #fff; font-size: 1rem;
          cursor: pointer; transition: all 0.15s;
        }
        #garageUI .g-back:hover, #garageUI .g-browse:hover { background: rgba(255,255,255,0.2); }
        #garageUI .g-browse { background: rgba(52,152,219,0.3); }
        #garageUI .g-browse:hover { background: rgba(52,152,219,0.5); }
      </style>

      <div class="g-title">车　库</div>
      <div class="g-coins">金币: ${this.upgradeSystem.progress.coins}</div>

      <div class="g-tank-row">
        ${Object.entries(TANK_CONFIGS).map(([id, c]) => {
          const ok = unlocked.includes(id);
          const cls = !ok ? 'locked' : (id === this.selectedTank ? 'active' : '');
          return `<div class="g-tank-btn ${cls}" data-tank="${id}" ${!ok ? 'data-locked="1"' : ''}>${ok ? c.name : '🔒'}</div>`;
        }).join('')}
      </div>

      <div class="g-name">${config.name}</div>

      ${stats.map(s => {
        const lvl = upgrades[s.key];
        const cost = this.upgradeSystem.getUpgradeCost(this.selectedTank, s.key);
        const canUp = this.upgradeSystem.canUpgrade(this.selectedTank, s.key);
        const btnLabel = canUp ? `升级 (${cost})` : (lvl >= 5 ? '满级' : '金币不足');
        return `<div class="g-stat-row">
          <div class="g-stat-label">${s.label}</div>
          <div class="g-stat-val ${lvl > 0 ? 'upgraded' : ''}">${s.value.toFixed(1)}${s.unit} [${lvl}/5]</div>
          <button class="g-up-btn ${canUp ? 'can' : 'no'}" data-stat="${s.key}" ${!canUp ? 'disabled' : ''}>${btnLabel}</button>
        </div>`;
      }).join('')}

      <div class="g-model-info">
        出战模型: <span class="g-model-name">${TANK_MODELS[getSelectedModelId()]?.name ?? '默认'}</span>
      </div>

      <div class="g-btn-row">
        <button class="g-browse">选择出战坦克</button>
        <button class="g-back">返回主菜单</button>
      </div>
    `;

    this.root.querySelector('.g-browse')!.addEventListener('click', () => {
      this.hide();
      new ModelViewer(() => this.show());
    });

    this.root.querySelector('.g-tank-row')!.addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).closest('[data-tank]') as HTMLElement | null;
      if (!t || t.dataset.locked) return;
      this.selectedTank = t.dataset.tank!;
      this.buildUI();
    });

    this.root.querySelectorAll('.g-up-btn.can').forEach(btn => {
      btn.addEventListener('click', () => {
        const stat = (btn as HTMLElement).dataset.stat as keyof TankUpgrades;
        this.upgradeSystem.upgrade(this.selectedTank, stat);
        this.buildUI();
      });
    });

    this.root.querySelector('.g-back')!.addEventListener('click', () => this.onBack());
  }

  show(): void { this.root.style.display = 'flex'; this.buildUI(); }
  hide(): void { this.root.style.display = 'none'; }
  dispose(): void { this.root.remove(); }
}
