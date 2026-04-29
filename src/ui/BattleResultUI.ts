import { Scene } from '@babylonjs/core';

export interface BattleResult {
  victory: boolean;
  kills: number;
  expGained: number;
  coinsGained: number;
  levelUp: boolean;
}

export class BattleResultUI {
  private root: HTMLDivElement;

  constructor(result: BattleResult, onContinue: () => void, _scene?: Scene) {
    this.root = document.createElement('div');
    this.root.id = 'battleResult';
    this.root.innerHTML = `
      <style>
        #battleResult {
          position: absolute; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0,0,0,0.82); display: flex; flex-direction: column;
          align-items: center; justify-content: center; z-index: 100;
          font-family: Arial, sans-serif; user-select: none;
        }
        #battleResult .r-title {
          font-size: 3.2rem; font-weight: 900; margin-bottom: 0.3rem;
        }
        #battleResult .r-title.win { color: #2ecc71; text-shadow: 0 0 25px rgba(46,204,113,0.5); }
        #battleResult .r-title.lose { color: #e74c3c; text-shadow: 0 0 25px rgba(231,76,60,0.5); }
        #battleResult .r-sub { color: rgba(255,255,255,0.6); font-size: 1rem; margin-bottom: 2rem; }
        #battleResult .r-stat-row {
          display: flex; width: 220px; justify-content: space-between; margin-bottom: 8px;
        }
        #battleResult .r-stat-label { color: rgba(255,255,255,0.5); font-size: 1rem; }
        #battleResult .r-stat-val { font-weight: 900; font-size: 1.15rem; }
        #battleResult .r-stat-val.kills { color: #e74c3c; }
        #battleResult .r-stat-val.exp { color: #3498db; }
        #battleResult .r-stat-val.coins { color: #f1c40f; }
        #battleResult .r-lvup {
          color: #f1c40f; font-size: 1.3rem; font-weight: 700; margin-top: 1rem;
          text-shadow: 0 0 15px rgba(241,196,15,0.5);
        }
        #battleResult .r-continue {
          margin-top: 2rem; padding: 13px 50px; border-radius: 12px; border: none;
          background: #e94560; color: #fff; font-size: 1.1rem; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
          box-shadow: 0 4px 15px rgba(233,69,96,0.4);
        }
        #battleResult .r-continue:hover { transform: scale(1.03); box-shadow: 0 6px 25px rgba(233,69,96,0.6); }
      </style>

      <div class="r-title ${result.victory ? 'win' : 'lose'}">${result.victory ? '胜　利' : '战　败'}</div>
      <div class="r-sub">${result.victory ? '所有敌人已被歼灭！' : '你的坦克已被击毁...'}</div>

      <div class="r-stat-row"><span class="r-stat-label">击杀数</span><span class="r-stat-val kills">${result.kills}</span></div>
      <div class="r-stat-row"><span class="r-stat-label">经验值</span><span class="r-stat-val exp">+${result.expGained}</span></div>
      <div class="r-stat-row"><span class="r-stat-label">金　币</span><span class="r-stat-val coins">+${result.coinsGained}</span></div>

      ${result.levelUp ? '<div class="r-lvup">升级了！</div>' : ''}

      <button class="r-continue">返回主菜单</button>
    `;

    document.body.appendChild(this.root);

    this.root.querySelector('.r-continue')!.addEventListener('click', () => onContinue());
  }

  dispose(): void {
    this.root.remove();
  }
}
