import { Engine, Scene, Vector3, Color3, Color4, DirectionalLight, HemisphericLight, DefaultRenderingPipeline, FreeCamera } from '@babylonjs/core';

import { InputManager } from './core/InputManager';
import { CameraSystem } from './core/CameraSystem';
import { AudioManager, SoundType } from './core/AudioManager';

import { TankFactory } from './entities/TankFactory';
import { PlayerTank } from './entities/PlayerTank';
import { EnemyTank } from './entities/EnemyTank';
import { Tank } from './entities/Tank';

import { MapManager } from './world/MapManager';

import { CombatSystem } from './systems/CombatSystem';
import { AISystem } from './systems/AISystem';
import { ParticleManager } from './systems/ParticleManager';
import { UpgradeSystem } from './systems/UpgradeSystem';

import { HUD } from './ui/HUD';
import { MainMenu, MenuCallbacks } from './ui/MainMenu';
import { GarageUI } from './ui/GarageUI';
import { BattleResultUI, BattleResult } from './ui/BattleResultUI';
import { DeviceDetector } from './utils/DeviceDetector';
import { Pickup, PickupType } from './entities/Pickup';
import { MathUtils } from './utils/MathUtils';

export enum GameState {
  MENU,
  GARAGE,
  BATTLE,
  RESULT,
}

export class Game {
  private engine: Engine;
  private scene!: Scene;
  private canvas: HTMLCanvasElement;

  private input!: InputManager;
  private camera!: CameraSystem;
  private audio!: AudioManager;

  private tankFactory!: TankFactory;
  private player!: PlayerTank;
  private enemies: EnemyTank[] = [];

  private mapManager!: MapManager;

  private combat!: CombatSystem;
  private ai!: AISystem;
  private particles!: ParticleManager;
  private upgradeSystem: UpgradeSystem;

  private hud: HUD | null = null;
  private mainMenu: MainMenu | null = null;
  private garageUI: GarageUI | null = null;
  private battleResult: BattleResultUI | null = null;

  private state: GameState = GameState.MENU;
  private kills = 0;
  private previousEnemyAlive: Map<string, boolean> = new Map();

  private pickups: Pickup[] = [];
  private pickupSpawnTimer = 0;
  private pickupSpawnInterval = 12;
  private gameTime = 0;
  private activeBuff: { type: PickupType; remaining: number; originalValue: number } | null = null;
  private buffIndicator: HTMLElement | null = null;

  private battlePipeline: DefaultRenderingPipeline | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.engine = new Engine(canvas, true, {
      adaptToDeviceRatio: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    this.engine.setHardwareScalingLevel(1 / DeviceDetector.getPixelRatio());
    this.upgradeSystem = new UpgradeSystem();
  }

  async init(): Promise<void> {
    this.updateLoading(10, '初始化引擎...');
    this.createScene();
    this.updateLoading(50, '创建场景...');

    this.audio = new AudioManager(this.scene);

    this.updateLoading(90, '准备就绪...');
    this.showMainMenu();

    this.engine.runRenderLoop(() => this.gameLoop());
    window.addEventListener('resize', () => this.engine.resize());

    setTimeout(() => this.hideLoading(), 500);
  }

  private createScene(): void {
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.05, 0.07, 0.15, 1);

    const menuCamera = new FreeCamera('menuCamera', new Vector3(0, 5, -10), this.scene);
    menuCamera.inputs.clear();
    this.scene.activeCamera = menuCamera;
  }

  private setupBattleLighting(): void {
    this.scene.environmentIntensity = 0.3;
    this.scene.ambientColor = new Color3(0.25, 0.28, 0.35);

    const hemiLight = new HemisphericLight('hemiLight', new Vector3(0.2, 1, 0.1), this.scene);
    hemiLight.intensity = 0.9;
    hemiLight.groundColor = new Color3(0.35, 0.38, 0.4);
    hemiLight.specular = new Color3(0.15, 0.15, 0.18);
    hemiLight.diffuse = new Color3(0.75, 0.82, 0.9);

    const sunLight = new DirectionalLight('sunLight', new Vector3(-0.7, -1.5, -0.5).normalize(), this.scene);
    sunLight.intensity = 2.0;
    sunLight.diffuse = new Color3(1, 0.92, 0.78);
    sunLight.specular = new Color3(0.6, 0.55, 0.45);

    const fillLight = new DirectionalLight('fillLight', new Vector3(0.5, -0.8, 0.3).normalize(), this.scene);
    fillLight.intensity = 0.5;
    fillLight.diffuse = new Color3(0.6, 0.7, 0.85);
    fillLight.specular = new Color3(0.1, 0.1, 0.1);

    this.scene.fogMode = Scene.FOGMODE_EXP2;
    this.scene.fogDensity = 0.0007;
    this.scene.fogColor = new Color3(0.7, 0.75, 0.8);
  }

  private setupBattlePostProcessing(): void {
    this.battlePipeline?.dispose();
    this.battlePipeline = null;

    const cam = this.scene.activeCamera;
    if (!cam) return;

    // hdr=false：部分环境下 HDR 管线会导致画面全黑/异常；重复进入战斗需先释放旧管线
    const pipeline = new DefaultRenderingPipeline('defaultPipeline', false, this.scene, [cam]);
    this.battlePipeline = pipeline;
    pipeline.bloomEnabled = true;
    pipeline.bloomThreshold = 0.6;
    pipeline.bloomWeight = 0.35;
    pipeline.bloomKernel = 64;
    pipeline.bloomScale = 0.5;
    pipeline.fxaaEnabled = true;

    pipeline.imageProcessingEnabled = true;
    pipeline.imageProcessing.toneMappingEnabled = true;
    pipeline.imageProcessing.toneMappingType = 1;
    pipeline.imageProcessing.contrast = 1.15;
    pipeline.imageProcessing.exposure = 1.1;

    if (!DeviceDetector.isMobile()) {
      pipeline.imageProcessing.vignetteEnabled = true;
      pipeline.imageProcessing.vignetteWeight = 1.2;
      pipeline.chromaticAberrationEnabled = true;
      pipeline.chromaticAberration.aberrationAmount = 15;
      pipeline.grainEnabled = true;
      pipeline.grain.intensity = 8;
      pipeline.grain.animated = true;
      pipeline.sharpenEnabled = true;
      pipeline.sharpen.edgeAmount = 0.2;
    }
  }

  private showMainMenu(): void {
    this.state = GameState.MENU;

    if (this.player || this.mapManager) {
      this.cleanupBattle();
    }

    const callbacks: MenuCallbacks = {
      onStartBattle: (mapId, tankType) => {
        void this.startBattle(mapId, tankType);
      },
      onOpenGarage: () => this.showGarage(),
      onSettings: () => {},
    };

    this.mainMenu?.dispose();
    this.mainMenu = new MainMenu(callbacks, this.upgradeSystem.progress, this.scene);
  }

  private showGarage(): void {
    this.state = GameState.GARAGE;
    this.mainMenu?.hide();

    this.garageUI?.dispose();
    this.garageUI = new GarageUI(this.upgradeSystem, () => {
      this.garageUI?.dispose();
      this.garageUI = null;
      this.showMainMenu();
    }, this.scene);
  }

  private async startBattle(mapId: string, tankType: string): Promise<void> {
    this.state = GameState.BATTLE;
    this.kills = 0;

    this.mainMenu?.dispose();
    this.mainMenu = null;
    this.garageUI?.dispose();
    this.garageUI = null;
    this.battleResult?.dispose();
    this.battleResult = null;

    this.audio.init();

    const oldMenuCam = this.scene.getCameraByName('menuCamera');
    if (oldMenuCam) oldMenuCam.dispose();

    this.setupBattleLighting();

    this.mapManager = new MapManager(this.scene);
    const mapConfig = this.mapManager.loadMap(mapId, null);

    this.camera = new CameraSystem(this.scene);
    this.scene.activeCamera = this.camera.camera;

    this.setupBattlePostProcessing();

    this.input = new InputManager(this.scene);

    this.particles = new ParticleManager(this.scene);
    this.combat = new CombatSystem(this.scene, this.particles, this.audio);
    this.ai = new AISystem(this.combat);
    this.tankFactory = new TankFactory(this.scene);

    const spawnPos = mapConfig.spawnPoints[0].clone() || new Vector3(0, 0, -60);
    spawnPos.y = this.mapManager.getHeightAt(spawnPos.x, spawnPos.z);
    this.player = this.tankFactory.createPlayerTank(tankType, spawnPos);

    const modStats = this.upgradeSystem.getModifiedStats(tankType, {
      armor: this.player.config.armor,
      damage: this.player.config.damage,
      speed: this.player.config.speed,
      reloadTime: this.player.config.reloadTime,
    });
    this.player.config.armor = modStats.armor;
    this.player.config.damage = modStats.damage;
    this.player.config.speed = modStats.speed;
    this.player.config.reloadTime = modStats.reloadTime;

    this.player.attachCamera(this.camera);

    this.enemies = [];
    this.previousEnemyAlive.clear();
    const enemyTypes = ['light', 'medium', 'heavy', 'medium', 'destroyer'];
    const difficulty = 0.5 + this.upgradeSystem.progress.level * 0.1;

    mapConfig.enemySpawns.forEach((spawn, i) => {
      const type = enemyTypes[i % enemyTypes.length];
      const pos = spawn.clone();
      pos.y = this.mapManager.getHeightAt(pos.x, pos.z);
      const enemy = this.tankFactory.createEnemyTank(type, pos, difficulty);
      this.enemies.push(enemy);
      this.previousEnemyAlive.set(enemy.tankId, true);
    });

    const allTanks: Tank[] = [this.player, ...this.enemies];
    this.combat.setTanks(allTanks);
    this.ai.setEnemies(this.enemies);
    this.ai.setTarget(this.player);

    this.hud = new HUD(this.scene);
    this.hud.setPlayer(this.player);
    this.hud.setEnemies(this.enemies);
    this.hud.setPickups(this.pickups);

    for (let i = 0; i < 3; i++) {
      this.spawnPickup();
    }

    // 必须在 BATTLE 且敌军已注册之后再 await，否则加载期间 getAliveCount()===0 会误判胜利
    await this.player.applyExternalPlayerModel(this.mapManager);
  }

  private gameLoop(): void {
    try {
      if (this.state === GameState.BATTLE) {
        this.updateBattle();
      }
      this.scene.render();
    } catch (e) {
      // Silently catch rare render errors to keep the loop alive
    }
  }

  private updateBattle(): void {
    const dt = this.engine.getDeltaTime() / 1000;
    if (dt > 0.1) return;

    const inputState = this.input.getState();

    this.player.handleInput(inputState, dt);
    this.player.update(dt);

    this.resolveCollisions(this.player);

    const playerY = this.mapManager.getHeightAt(this.player.root.position.x, this.player.root.position.z);
    this.player.root.position.y = playerY + this.player.terrainYOffset;

    this.camera.update(inputState, dt);

    if (inputState.fire && this.player.canFire()) {
      this.combat.fireProjectile(this.player);
    }

    this.ai.update(dt);

    for (const enemy of this.enemies) {
      if (enemy.isAlive) {
        this.resolveCollisions(enemy);
        const ey = this.mapManager.getHeightAt(enemy.root.position.x, enemy.root.position.z);
        enemy.root.position.y = ey;
      }

      const wasAlive = this.previousEnemyAlive.get(enemy.tankId) ?? true;
      if (wasAlive && !enemy.isAlive) {
        this.kills++;
        this.hud?.addKill();
        this.tryDropPickup(enemy.root.position);
      }
      this.previousEnemyAlive.set(enemy.tankId, enemy.isAlive);
    }

    this.combat.update(dt);
    this.mapManager.update(dt);
    this.hud?.update();

    this.gameTime += dt;
    this.updatePickups(dt);
    this.updateBuffs(dt);

    if (!this.player.isAlive) {
      this.endBattle(false);
    } else if (this.ai.getAliveCount() === 0) {
      this.endBattle(true);
    }
  }

  private resolveCollisions(tank: Tank): void {
    const pos = tank.root.position;
    const radius = Math.max(tank.config.bodyScale.x, tank.config.bodyScale.z) * 0.5;

    const allTanks = [this.player as Tank, ...this.enemies as Tank[]];
    for (const other of allTanks) {
      if (other === tank || !other.isAlive) continue;
      const otherRadius = Math.max(other.config.bodyScale.x, other.config.bodyScale.z) * 0.5;
      const minDist = radius + otherRadius;

      const dx = pos.x - other.root.position.x;
      const dz = pos.z - other.root.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < minDist && dist > 0.01) {
        const overlap = minDist - dist;
        const nx = dx / dist;
        const nz = dz / dist;
        pos.x += nx * overlap * 0.6;
        pos.z += nz * overlap * 0.6;
      }
    }

    for (const mesh of this.scene.meshes) {
      const n = mesh.name;
      let obstRadius = 0;
      if (n.startsWith('building')) obstRadius = 2.5;
      else if (n.startsWith('rock') || n.startsWith('snowRock')) obstRadius = 1.2;
      else if (n === 'trunk' || n === 'cTrunk') obstRadius = 0.5;
      else continue;

      const mp = mesh.getAbsolutePosition();
      const dx = pos.x - mp.x;
      const dz = pos.z - mp.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const minDist = radius + obstRadius;

      if (dist < minDist && dist > 0.01) {
        const overlap = minDist - dist;
        const nx = dx / dist;
        const nz = dz / dist;
        pos.x += nx * overlap;
        pos.z += nz * overlap;
      }
    }

    const mapHalf = this.mapManager?.currentMap?.terrain.size
      ? this.mapManager.currentMap.terrain.size / 2 - 2
      : 98;
    pos.x = Math.max(-mapHalf, Math.min(mapHalf, pos.x));
    pos.z = Math.max(-mapHalf, Math.min(mapHalf, pos.z));
  }

  private updatePickups(dt: number): void {
    this.pickupSpawnTimer += dt;
    if (this.pickupSpawnTimer >= this.pickupSpawnInterval) {
      this.pickupSpawnTimer = 0;
      this.spawnPickup();
    }

    const playerPos = this.player.root.position;
    const pickRadius = 2.5;

    for (const pickup of this.pickups) {
      if (pickup.collected) continue;
      pickup.update(dt, this.gameTime);

      const dx = playerPos.x - pickup.root.position.x;
      const dz = playerPos.z - pickup.root.position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < pickRadius) {
        this.applyPickup(pickup);
        pickup.collect();
        this.showPickupNotice(pickup.label);
      }
    }
  }

  private spawnPickup(): void {
    const types = [PickupType.HEALTH, PickupType.DAMAGE, PickupType.SPEED, PickupType.SHIELD];
    const type = types[MathUtils.randomInt(0, types.length - 1)];

    const mapHalf = this.mapManager?.currentMap?.terrain.size
      ? this.mapManager.currentMap.terrain.size / 2 - 10
      : 80;

    const px = MathUtils.randomRange(-mapHalf, mapHalf);
    const pz = MathUtils.randomRange(-mapHalf, mapHalf);
    const py = this.mapManager.getHeightAt(px, pz);
    const pos = new Vector3(px, py, pz);

    const pickup = new Pickup(this.scene, type, pos);
    this.pickups.push(pickup);

    if (this.pickups.length > 8) {
      const old = this.pickups.shift();
      if (old && !old.collected) old.dispose();
    }
  }

  private tryDropPickup(position: Vector3): void {
    if (Math.random() > 0.6) return;

    const types = [PickupType.HEALTH, PickupType.HEALTH, PickupType.DAMAGE, PickupType.SPEED, PickupType.SHIELD];
    const type = types[MathUtils.randomInt(0, types.length - 1)];
    const dropPos = position.clone();
    dropPos.y = this.mapManager.getHeightAt(dropPos.x, dropPos.z);

    const pickup = new Pickup(this.scene, type, dropPos);
    this.pickups.push(pickup);
  }

  private applyPickup(pickup: Pickup): void {
    this.audio.playSynth(SoundType.UI_CLICK);

    switch (pickup.type) {
      case PickupType.HEALTH: {
        const heal = Math.round(this.player.config.maxHealth * 0.4);
        this.player.health = Math.min(this.player.config.maxHealth, this.player.health + heal);
        break;
      }
      case PickupType.DAMAGE: {
        if (this.activeBuff) this.removeBuff();
        const orig = this.player.config.damage;
        this.player.config.damage = Math.round(orig * 2);
        this.activeBuff = { type: PickupType.DAMAGE, remaining: pickup.duration, originalValue: orig };
        break;
      }
      case PickupType.SPEED: {
        if (this.activeBuff) this.removeBuff();
        const orig = this.player.config.speed;
        this.player.config.speed = orig * 1.6;
        this.activeBuff = { type: PickupType.SPEED, remaining: pickup.duration, originalValue: orig };
        break;
      }
      case PickupType.SHIELD: {
        if (this.activeBuff) this.removeBuff();
        const orig = this.player.config.armor;
        this.player.config.armor = orig + 50;
        this.activeBuff = { type: PickupType.SHIELD, remaining: pickup.duration, originalValue: orig };
        break;
      }
    }
  }

  private updateBuffs(dt: number): void {
    if (!this.activeBuff) return;
    this.activeBuff.remaining -= dt;

    if (!this.buffIndicator) {
      this.buffIndicator = document.createElement('div');
      Object.assign(this.buffIndicator.style, {
        position: 'fixed', top: '10px', left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(0,0,0,0.6)', color: '#fff', padding: '6px 16px',
        borderRadius: '20px', fontSize: '13px', fontFamily: 'Arial, sans-serif',
        zIndex: '80', pointerEvents: 'none', textAlign: 'center',
      });
      document.body.appendChild(this.buffIndicator);
    }

    const label = this.activeBuff.type === PickupType.DAMAGE ? '火力增强'
      : this.activeBuff.type === PickupType.SPEED ? '速度提升'
      : '护盾防护';
    const secs = Math.ceil(this.activeBuff.remaining);
    this.buffIndicator.textContent = `${label} ${secs}s`;
    this.buffIndicator.style.display = 'block';

    if (this.activeBuff.remaining <= 0) {
      this.removeBuff();
    }
  }

  private removeBuff(): void {
    if (!this.activeBuff) return;
    switch (this.activeBuff.type) {
      case PickupType.DAMAGE:
        this.player.config.damage = this.activeBuff.originalValue;
        break;
      case PickupType.SPEED:
        this.player.config.speed = this.activeBuff.originalValue;
        break;
      case PickupType.SHIELD:
        this.player.config.armor = this.activeBuff.originalValue;
        break;
    }
    this.activeBuff = null;
    if (this.buffIndicator) {
      this.buffIndicator.style.display = 'none';
    }
  }

  private showPickupNotice(label: string): void {
    const notice = document.createElement('div');
    Object.assign(notice.style, {
      position: 'fixed', top: '40%', left: '50%', transform: 'translate(-50%,-50%)',
      color: '#fff', fontSize: 'clamp(1rem, 3vw, 1.5rem)', fontWeight: '700',
      fontFamily: 'Arial, sans-serif',
      textShadow: '0 0 10px rgba(255,255,255,0.5), 0 2px 8px rgba(0,0,0,0.5)',
      zIndex: '90', pointerEvents: 'none',
      transition: 'opacity 0.5s, transform 0.5s',
    });
    notice.textContent = `+${label}`;
    document.body.appendChild(notice);
    setTimeout(() => {
      notice.style.opacity = '0';
      notice.style.transform = 'translate(-50%,-80%)';
    }, 800);
    setTimeout(() => notice.remove(), 1500);
  }

  private endBattle(victory: boolean): void {
    this.state = GameState.RESULT;

    const reward = this.upgradeSystem.addBattleReward(this.kills, victory);

    this.hud?.hide();

    const result: BattleResult = {
      victory,
      kills: this.kills,
      expGained: reward.exp,
      coinsGained: reward.coins,
      levelUp: reward.levelUp,
    };

    if (victory) {
      this.audio.playSynth(SoundType.EXPLOSION);
    }

    this.battleResult = new BattleResultUI(result, () => {
      this.battleResult?.dispose();
      this.battleResult = null;
      this.showMainMenu();
    }, this.scene);
  }

  private cleanupBattle(): void {
    this.battlePipeline?.dispose();
    this.battlePipeline = null;

    this.hud?.dispose();
    this.hud = null;

    this.combat?.dispose();
    this.ai?.dispose();
    this.particles?.dispose();
    this.input?.dispose();

    this.player?.dispose();
    this.enemies.forEach((e) => e.dispose());
    this.enemies = [];

    this.pickups.forEach((p) => p.dispose());
    this.pickups = [];
    this.pickupSpawnTimer = 0;
    this.gameTime = 0;
    this.removeBuff();
    this.buffIndicator?.remove();
    this.buffIndicator = null;

    this.mapManager?.dispose();

    this.scene.lights.slice().forEach((l) => l.dispose());
    this.scene.meshes.slice().forEach((m) => m.dispose());
    this.scene.particleSystems?.slice().forEach((ps) => ps.dispose());

    const cam = new FreeCamera('menuCamera', new Vector3(0, 5, -10), this.scene);
    cam.inputs.clear();
    this.scene.activeCamera = cam;
  }

  private updateLoading(percent: number, text: string): void {
    const bar = document.getElementById('loaderBar');
    const txt = document.getElementById('loadingText');
    if (bar) bar.style.width = percent + '%';
    if (txt) txt.textContent = text;
  }

  private hideLoading(): void {
    const screen = document.getElementById('loadingScreen');
    if (screen) {
      screen.style.pointerEvents = 'none';
      screen.style.opacity = '0';
      setTimeout(() => screen.remove(), 500);
    }
  }
}
