import { Scene } from '@babylonjs/core';
import { MapManager } from '../world/MapManager';
import { PlayerProgress } from '../systems/UpgradeSystem';
import { DeviceDetector } from '../utils/DeviceDetector';

export interface MenuCallbacks {
  onStartBattle: (mapId: string, tankType: string) => void;
  onOpenGarage: () => void;
  onSettings: () => void;
}

export class MainMenu {
  private root: HTMLDivElement;
  private selectedMap = 'forest';
  private selectedTank = 'medium';
  private callbacks: MenuCallbacks;
  private progress: PlayerProgress;
  private currentPage: 'main' | 'battle-setup' = 'main';

  constructor(callbacks: MenuCallbacks, progress: PlayerProgress, _scene?: Scene) {
    this.callbacks = callbacks;
    this.progress = progress;
    this.root = document.createElement('div');
    this.root.id = 'mainMenu';
    this.injectStyles();
    this.buildMainPage();
    document.body.appendChild(this.root);
  }

  private injectStyles(): void {
    if (document.getElementById('mainMenuStyles')) return;
    const style = document.createElement('style');
    style.id = 'mainMenuStyles';
    style.textContent = `
      #mainMenu {
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        background: linear-gradient(135deg, #0a0f1e 0%, #16213e 40%, #1a1a2e 100%);
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        z-index: 100; font-family: 'Segoe UI', Arial, sans-serif; user-select: none;
        overflow: hidden;
      }
      .menu-page {
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        width: 100%; height: 100%; position: absolute; top: 0; left: 0;
        transition: transform 0.4s cubic-bezier(0.4,0,0.2,1), opacity 0.35s ease;
      }
      .menu-page.hidden-left { transform: translateX(-100%); opacity: 0; pointer-events: none; }
      .menu-page.hidden-right { transform: translateX(100%); opacity: 0; pointer-events: none; }
      .menu-page.active { transform: translateX(0); opacity: 1; }

      .menu-title {
        color: #e94560; font-size: clamp(2rem, 6vw, 3.5rem); font-weight: 900;
        text-shadow: 0 0 40px rgba(233,69,96,0.4), 0 4px 20px rgba(0,0,0,0.5);
        margin-bottom: 0.2rem; letter-spacing: 0.15rem;
      }
      .menu-stats {
        color: rgba(255,255,255,0.4); font-size: clamp(0.7rem, 2vw, 0.9rem);
        margin-bottom: 2.5rem; letter-spacing: 0.05rem;
      }
      .menu-btn-group { display: flex; flex-direction: column; gap: 12px; width: min(280px, 80vw); }
      .menu-btn {
        padding: clamp(12px, 3vw, 16px) 0; border-radius: 12px; border: none;
        color: #fff; font-size: clamp(0.95rem, 2.5vw, 1.2rem); font-weight: 600;
        cursor: pointer; transition: transform 0.12s, box-shadow 0.2s;
        letter-spacing: 0.1rem; text-align: center; width: 100%;
      }
      .menu-btn:active { transform: scale(0.96); }
      .menu-btn.primary {
        background: linear-gradient(135deg, #e94560 0%, #c0392b 100%);
        box-shadow: 0 4px 25px rgba(233,69,96,0.4);
      }
      .menu-btn.primary:hover { box-shadow: 0 6px 35px rgba(233,69,96,0.6); transform: scale(1.02); }
      .menu-btn.secondary {
        background: rgba(52, 152, 219, 0.6);
        border: 1px solid rgba(52,152,219,0.3);
      }
      .menu-btn.secondary:hover { background: rgba(52,152,219,0.8); }
      .menu-btn.tertiary {
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.1);
        font-size: clamp(0.8rem, 2vw, 0.95rem);
      }
      .menu-btn.tertiary:hover { background: rgba(255,255,255,0.15); }

      .setup-header {
        display: flex; align-items: center; gap: 12px; margin-bottom: 1.5rem;
      }
      .back-btn {
        width: 36px; height: 36px; border-radius: 50%; border: 1px solid rgba(255,255,255,0.2);
        background: rgba(255,255,255,0.08); color: #fff; font-size: 1.2rem;
        cursor: pointer; display: flex; align-items: center; justify-content: center;
        transition: background 0.15s;
      }
      .back-btn:hover { background: rgba(255,255,255,0.2); }
      .setup-title {
        color: #e94560; font-size: clamp(1.2rem, 3.5vw, 1.6rem); font-weight: 700;
      }

      .setup-section { margin-bottom: 1.5rem; width: min(400px, 85vw); }
      .section-label {
        color: rgba(255,255,255,0.5); font-size: clamp(0.7rem, 1.8vw, 0.82rem);
        margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.1rem;
      }
      .option-grid {
        display: grid; grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
        gap: 8px;
      }
      .opt-card {
        padding: clamp(8px, 2vw, 12px) 4px; border-radius: 10px;
        border: 1.5px solid rgba(255,255,255,0.1);
        background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.8);
        font-size: clamp(0.75rem, 2vw, 0.88rem); text-align: center;
        cursor: pointer; transition: all 0.15s; font-weight: 500;
      }
      .opt-card:hover { background: rgba(255,255,255,0.12); border-color: rgba(255,255,255,0.2); }
      .opt-card.active {
        background: rgba(233,69,96,0.25); border-color: #e94560;
        color: #fff; box-shadow: 0 0 12px rgba(233,69,96,0.3);
      }
      .opt-card.locked {
        color: rgba(255,255,255,0.25); cursor: not-allowed;
        border-color: rgba(255,255,255,0.05);
      }
      .opt-card.locked:hover { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.05); }

      .start-battle-btn {
        margin-top: 1rem; padding: clamp(13px, 3vw, 16px) 0;
        width: min(280px, 80vw); border-radius: 12px; border: none;
        background: linear-gradient(135deg, #e94560, #c0392b); color: #fff;
        font-size: clamp(1rem, 2.8vw, 1.3rem); font-weight: 700;
        cursor: pointer; letter-spacing: 0.15rem;
        box-shadow: 0 4px 25px rgba(233,69,96,0.4);
        transition: transform 0.12s, box-shadow 0.2s;
      }
      .start-battle-btn:active { transform: scale(0.96); }
      .start-battle-btn:hover { box-shadow: 0 6px 35px rgba(233,69,96,0.6); transform: scale(1.02); }

      .menu-footer {
        position: absolute; bottom: clamp(10px, 2vh, 20px);
        color: rgba(255,255,255,0.2); font-size: clamp(0.6rem, 1.5vw, 0.75rem);
      }

      .menu-deco {
        position: absolute; width: 300px; height: 300px; border-radius: 50%;
        background: radial-gradient(circle, rgba(233,69,96,0.06), transparent 70%);
        pointer-events: none;
      }
      .menu-deco.top-right { top: -80px; right: -80px; }
      .menu-deco.bottom-left { bottom: -100px; left: -100px;
        background: radial-gradient(circle, rgba(52,152,219,0.06), transparent 70%);
      }
    `;
    document.head.appendChild(style);
  }

  private buildMainPage(): void {
    const p = this.progress;
    this.root.innerHTML = `
      <div class="menu-deco top-right"></div>
      <div class="menu-deco bottom-left"></div>

      <div class="menu-page active" id="pageMain">
        <div class="menu-title">坦克世界大战</div>
        <div class="menu-stats">Lv.${p.level}　·　金币 ${p.coins}　·　击杀 ${p.totalKills}</div>
        <div class="menu-btn-group">
          <button class="menu-btn primary" id="btnGoBattle">出　击　→</button>
          <div style="color:rgba(255,255,255,0.3);font-size:clamp(0.65rem,1.5vw,0.78rem);margin-top:-6px;margin-bottom:4px">选择地图与坦克</div>
          <button class="menu-btn secondary" id="btnGarage">车　库</button>
          <div style="color:rgba(255,255,255,0.3);font-size:clamp(0.65rem,1.5vw,0.78rem);margin-top:-6px">查看与升级坦克</div>
        </div>
      </div>

      <div class="menu-page hidden-right" id="pageBattleSetup">
        ${this.buildBattleSetupHTML()}
      </div>

      <div class="menu-footer">${DeviceDetector.isMobile()
        ? '左摇杆移动 · 右摇杆瞄准 · 开火按钮射击'
        : 'WASD 移动 · 鼠标瞄准 · 左键/空格 开火 · 滚轮缩放'}</div>
    `;

    this.bindEvents();
  }

  private buildBattleSetupHTML(): string {
    const maps = MapManager.getMapList();
    const tankTypes = [
      { id: 'light', name: '轻型', unlockLv: 3 },
      { id: 'medium', name: '中型', unlockLv: 1 },
      { id: 'heavy', name: '重型', unlockLv: 5 },
      { id: 'destroyer', name: '歼击', unlockLv: 8 },
    ];

    return `
      <div class="setup-header">
        <button class="back-btn" id="btnBack">←</button>
        <div class="setup-title">战斗准备</div>
      </div>

      <div class="setup-section">
        <div class="section-label">选择地图</div>
        <div class="option-grid" id="mapGrid">
          ${maps.map(m =>
            `<div class="opt-card ${m.id === this.selectedMap ? 'active' : ''}" data-map="${m.id}">${m.name}</div>`
          ).join('')}
        </div>
      </div>

      <div class="setup-section">
        <div class="section-label">选择坦克</div>
        <div class="option-grid" id="tankGrid">
          ${tankTypes.map(t => {
            const unlocked = this.progress.unlockedTanks.includes(t.id);
            const cls = !unlocked ? 'locked' : (t.id === this.selectedTank ? 'active' : '');
            const label = unlocked ? t.name : `Lv.${t.unlockLv}`;
            return `<div class="opt-card ${cls}" data-tank="${t.id}" ${!unlocked ? 'data-locked="1"' : ''}>${label}</div>`;
          }).join('')}
        </div>
      </div>

      <button class="start-battle-btn" id="btnStartBattle">开始战斗</button>
    `;
  }

  private bindEvents(): void {
    this.root.querySelector('#btnGoBattle')?.addEventListener('click', () => {
      this.navigateTo('battle-setup');
    });

    this.root.querySelector('#btnGarage')?.addEventListener('click', () => {
      this.callbacks.onOpenGarage();
    });

    this.root.querySelector('#btnBack')?.addEventListener('click', () => {
      this.navigateTo('main');
    });

    this.root.querySelector('#mapGrid')?.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('[data-map]') as HTMLElement | null;
      if (!target) return;
      this.selectedMap = target.dataset.map!;
      this.root.querySelectorAll('#mapGrid .opt-card').forEach(el => {
        el.classList.toggle('active', (el as HTMLElement).dataset.map === this.selectedMap);
      });
    });

    this.root.querySelector('#tankGrid')?.addEventListener('click', (e) => {
      const target = (e.target as HTMLElement).closest('[data-tank]') as HTMLElement | null;
      if (!target || target.dataset.locked) return;
      this.selectedTank = target.dataset.tank!;
      this.root.querySelectorAll('#tankGrid .opt-card').forEach(el => {
        if (!(el as HTMLElement).dataset.locked) {
          el.classList.toggle('active', (el as HTMLElement).dataset.tank === this.selectedTank);
        }
      });
    });

    this.root.querySelector('#btnStartBattle')?.addEventListener('click', () => {
      if (DeviceDetector.isMobile()) {
        this.enterFullscreen();
      }
      this.callbacks.onStartBattle(this.selectedMap, this.selectedTank);
    });
  }

  private navigateTo(page: 'main' | 'battle-setup'): void {
    const pageMain = this.root.querySelector('#pageMain') as HTMLElement;
    const pageSetup = this.root.querySelector('#pageBattleSetup') as HTMLElement;

    if (page === 'battle-setup') {
      pageMain.className = 'menu-page hidden-left';
      pageSetup.className = 'menu-page active';
    } else {
      pageMain.className = 'menu-page active';
      pageSetup.className = 'menu-page hidden-right';
    }
    this.currentPage = page;
  }

  private enterFullscreen(): void {
    const el = document.documentElement as any;
    const rfs = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (rfs) {
      rfs.call(el).then(() => {
        try { (screen.orientation as any).lock?.('landscape').catch(() => {}); } catch (_) {}
      }).catch(() => {});
    }
  }

  show(): void {
    this.root.style.display = 'flex';
  }

  hide(): void {
    this.root.style.display = 'none';
  }

  dispose(): void {
    this.root.remove();
  }
}
