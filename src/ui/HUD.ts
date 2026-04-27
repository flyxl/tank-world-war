import { AdvancedDynamicTexture } from '@babylonjs/gui/2D/advancedDynamicTexture';
import { TextBlock } from '@babylonjs/gui/2D/controls/textBlock';
import { Rectangle } from '@babylonjs/gui/2D/controls/rectangle';
import { Control } from '@babylonjs/gui/2D/controls/control';
import { Ellipse } from '@babylonjs/gui/2D/controls/ellipse';
import { Scene } from '@babylonjs/core/scene';
import { PlayerTank } from '../entities/PlayerTank';
import { Tank } from '../entities/Tank';

interface EnemyHealthBar {
  container: Rectangle;
  fill: Rectangle;
  text: TextBlock;
  tank: Tank;
}

export class HUD {
  private ui: AdvancedDynamicTexture;
  private healthFill!: Rectangle;
  private healthText!: TextBlock;
  private reloadFill!: Rectangle;
  private ammoText!: TextBlock;
  private killsText!: TextBlock;
  private enemiesText!: TextBlock;
  private container!: Rectangle;
  private minimapContainer!: Rectangle;
  private minimapDots: Rectangle[] = [];

  private player: PlayerTank | null = null;
  private enemies: Tank[] = [];
  private enemyBars: EnemyHealthBar[] = [];
  private kills = 0;

  constructor(scene?: Scene) {
    this.ui = AdvancedDynamicTexture.CreateFullscreenUI('hud', true, scene);
    this.buildUI();
  }

  private buildUI(): void {
    this.container = new Rectangle('hudContainer');
    this.container.width = 1;
    this.container.height = 1;
    this.container.thickness = 0;
    this.container.isPointerBlocker = false;
    this.ui.addControl(this.container);

    this.buildCrosshair();
    this.buildHealthBar();
    this.buildReloadBar();
    this.buildInfoPanel();
    this.buildMinimap();
  }

  private buildCrosshair(): void {
    const crosshair = new Ellipse('crosshair');
    crosshair.width = '30px';
    crosshair.height = '30px';
    crosshair.color = 'rgba(255, 100, 100, 0.8)';
    crosshair.thickness = 2;
    crosshair.background = 'transparent';
    this.container.addControl(crosshair);

    const dot = new Ellipse('crosshairDot');
    dot.width = '4px';
    dot.height = '4px';
    dot.color = 'rgba(255, 100, 100, 0.9)';
    dot.background = 'rgba(255, 100, 100, 0.9)';
    dot.thickness = 0;
    this.container.addControl(dot);
  }

  private buildHealthBar(): void {
    const bg = new Rectangle('hpBg');
    bg.width = '250px';
    bg.height = '24px';
    bg.cornerRadius = 12;
    bg.background = 'rgba(0,0,0,0.6)';
    bg.thickness = 1;
    bg.color = 'rgba(255,255,255,0.2)';
    bg.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    bg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    bg.left = 20;
    bg.top = -60;
    this.container.addControl(bg);

    this.healthFill = new Rectangle('hpFill');
    this.healthFill.width = 1;
    this.healthFill.height = 1;
    this.healthFill.cornerRadius = 12;
    this.healthFill.background = '#2ecc71';
    this.healthFill.thickness = 0;
    this.healthFill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    bg.addControl(this.healthFill);

    this.healthText = new TextBlock('hpText');
    this.healthText.text = '100/100';
    this.healthText.color = 'white';
    this.healthText.fontSize = 12;
    this.healthText.fontFamily = 'Arial';
    bg.addControl(this.healthText);
  }

  private buildReloadBar(): void {
    const bg = new Rectangle('reloadBg');
    bg.width = '180px';
    bg.height = '10px';
    bg.cornerRadius = 5;
    bg.background = 'rgba(0,0,0,0.6)';
    bg.thickness = 0;
    bg.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    bg.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    bg.left = 20;
    bg.top = -35;
    this.container.addControl(bg);

    this.reloadFill = new Rectangle('reloadFill');
    this.reloadFill.width = 1;
    this.reloadFill.height = 1;
    this.reloadFill.cornerRadius = 5;
    this.reloadFill.background = '#3498db';
    this.reloadFill.thickness = 0;
    this.reloadFill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    bg.addControl(this.reloadFill);

    this.ammoText = new TextBlock('ammoText');
    this.ammoText.text = '就绪';
    this.ammoText.color = '#3498db';
    this.ammoText.fontSize = 11;
    this.ammoText.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
    this.ammoText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.ammoText.left = 205;
    this.ammoText.top = -32;
    this.container.addControl(this.ammoText);
  }

  private buildInfoPanel(): void {
    this.killsText = new TextBlock('killsText');
    this.killsText.text = '击杀: 0';
    this.killsText.color = '#e74c3c';
    this.killsText.fontSize = 16;
    this.killsText.fontFamily = 'Arial';
    this.killsText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.killsText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this.killsText.top = 20;
    this.killsText.left = -20;
    this.killsText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this.container.addControl(this.killsText);

    this.enemiesText = new TextBlock('enemiesText');
    this.enemiesText.text = '敌方: 0';
    this.enemiesText.color = 'rgba(255,255,255,0.8)';
    this.enemiesText.fontSize = 14;
    this.enemiesText.fontFamily = 'Arial';
    this.enemiesText.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.enemiesText.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this.enemiesText.top = 45;
    this.enemiesText.left = -20;
    this.enemiesText.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
    this.container.addControl(this.enemiesText);
  }

  private buildMinimap(): void {
    this.minimapContainer = new Rectangle('minimap');
    this.minimapContainer.width = '140px';
    this.minimapContainer.height = '140px';
    this.minimapContainer.cornerRadius = 8;
    this.minimapContainer.background = 'rgba(0,0,0,0.5)';
    this.minimapContainer.thickness = 2;
    this.minimapContainer.color = 'rgba(255,255,255,0.3)';
    this.minimapContainer.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    this.minimapContainer.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    this.minimapContainer.top = 15;
    this.minimapContainer.left = 15;
    this.container.addControl(this.minimapContainer);

    const mapLabel = new TextBlock('mapLabel');
    mapLabel.text = '小地图';
    mapLabel.color = 'rgba(255,255,255,0.5)';
    mapLabel.fontSize = 10;
    mapLabel.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    mapLabel.top = 3;
    this.minimapContainer.addControl(mapLabel);
  }

  setPlayer(player: PlayerTank): void {
    this.player = player;
  }

  setEnemies(enemies: Tank[]): void {
    this.enemies = enemies;
    this.createEnemyHealthBars();
  }

  private createEnemyHealthBars(): void {
    for (const tank of this.enemies) {
      const barContainer = new Rectangle('ebar_' + tank.tankId);
      barContainer.width = '60px';
      barContainer.height = '12px';
      barContainer.background = 'rgba(0,0,0,0.7)';
      barContainer.thickness = 1;
      barContainer.color = 'rgba(255,255,255,0.3)';
      barContainer.cornerRadius = 3;
      barContainer.linkOffsetY = -60;
      this.ui.addControl(barContainer);
      barContainer.linkWithMesh(tank.root);

      const fill = new Rectangle('ebarFill_' + tank.tankId);
      fill.width = 1;
      fill.height = 1;
      fill.background = '#e74c3c';
      fill.thickness = 0;
      fill.cornerRadius = 3;
      fill.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
      barContainer.addControl(fill);

      const text = new TextBlock('ebarText_' + tank.tankId);
      text.text = '';
      text.color = 'white';
      text.fontSize = 8;
      barContainer.addControl(text);

      this.enemyBars.push({ container: barContainer, fill, text, tank });
    }
  }

  addKill(): void {
    this.kills++;
  }

  update(): void {
    if (!this.player) return;

    const hp = this.player.health;
    const maxHp = this.player.config.maxHealth;
    const hpPercent = hp / maxHp;

    this.healthFill.width = Math.max(0, hpPercent);
    this.healthText.text = `${Math.ceil(hp)}/${maxHp}`;

    if (hpPercent > 0.5) {
      this.healthFill.background = '#2ecc71';
    } else if (hpPercent > 0.25) {
      this.healthFill.background = '#f39c12';
    } else {
      this.healthFill.background = '#e74c3c';
    }

    const reloadPercent = 1 - Math.max(0, this.player.reloadTimer / this.player.config.reloadTime);
    this.reloadFill.width = reloadPercent;
    this.ammoText.text = reloadPercent >= 1 ? '就绪' : '装填中...';
    this.ammoText.color = reloadPercent >= 1 ? '#2ecc71' : '#e67e22';

    this.killsText.text = `击杀: ${this.kills}`;
    const aliveEnemies = this.enemies.filter((e) => e.isAlive).length;
    this.enemiesText.text = `敌方: ${aliveEnemies}`;

    this.updateEnemyBars();
    this.updateMinimap();
  }

  private updateEnemyBars(): void {
    for (const bar of this.enemyBars) {
      if (!bar.tank.isAlive) {
        bar.container.isVisible = false;
        continue;
      }
      const pct = bar.tank.health / bar.tank.config.maxHealth;
      bar.fill.width = Math.max(0, pct);
      bar.text.text = `${Math.ceil(bar.tank.health)}`;

      if (pct > 0.5) {
        bar.fill.background = '#e74c3c';
      } else if (pct > 0.25) {
        bar.fill.background = '#e67e22';
      } else {
        bar.fill.background = '#c0392b';
      }
    }
  }

  private updateMinimap(): void {
    this.minimapDots.forEach((d) => d.dispose());
    this.minimapDots = [];

    if (!this.player) return;

    const mapScale = 140 / 200;

    const playerDot = new Rectangle('pDot');
    playerDot.width = '6px';
    playerDot.height = '6px';
    playerDot.background = '#2ecc71';
    playerDot.thickness = 0;
    playerDot.cornerRadius = 3;
    playerDot.left = this.player.root.position.x * mapScale;
    playerDot.top = -this.player.root.position.z * mapScale;
    this.minimapContainer.addControl(playerDot);
    this.minimapDots.push(playerDot);

    for (const enemy of this.enemies) {
      if (!enemy.isAlive) continue;
      const dot = new Rectangle('eDot');
      dot.width = '5px';
      dot.height = '5px';
      dot.background = '#e74c3c';
      dot.thickness = 0;
      dot.cornerRadius = 2.5;
      dot.left = enemy.root.position.x * mapScale;
      dot.top = -enemy.root.position.z * mapScale;
      this.minimapContainer.addControl(dot);
      this.minimapDots.push(dot);
    }
  }

  show(): void {
    this.container.isVisible = true;
  }

  hide(): void {
    this.container.isVisible = false;
  }

  dispose(): void {
    this.enemyBars.forEach((b) => b.container.dispose());
    this.enemyBars = [];
    this.ui.dispose();
  }
}
