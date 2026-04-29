import { Scene, Vector3, Color3, ShadowGenerator } from '@babylonjs/core';
import { Terrain, TerrainConfig } from './Terrain';
import { SkyboxManager, SkyTheme } from './SkyboxManager';
import { Environment, EnvTheme } from './Environment';
import { WeatherSystem, WeatherType } from './WeatherSystem';

export interface MapConfig {
  name: string;
  description: string;
  theme: EnvTheme;
  terrain: TerrainConfig;
  defaultWeather: WeatherType;
  spawnPoints: Vector3[];
  enemySpawns: Vector3[];
}

export const MAPS: Record<string, MapConfig> = {
  desert: {
    name: '沙漠战场',
    description: '广袤的沙丘与废墟遗迹',
    theme: 'desert',
    terrain: {
      size: 200,
      subdivisions: 80,
      maxHeight: 4,
      seed: 42,
      baseColor: new Color3(0.76, 0.65, 0.42),
      detailColor: new Color3(0.68, 0.55, 0.35),
      roughness: 0.95,
    },
    defaultWeather: 'clear',
    spawnPoints: [new Vector3(0, 0, -60)],
    enemySpawns: [
      new Vector3(30, 0, 40), new Vector3(-30, 0, 50),
      new Vector3(50, 0, 20), new Vector3(-50, 0, 30),
      new Vector3(0, 0, 60),
    ],
  },
  urban: {
    name: '城市废墟',
    description: '残垣断壁中的巷战',
    theme: 'urban',
    terrain: {
      size: 200,
      subdivisions: 80,
      maxHeight: 1,
      seed: 77,
      baseColor: new Color3(0.45, 0.42, 0.38),
      detailColor: new Color3(0.4, 0.38, 0.35),
      roughness: 0.9,
    },
    defaultWeather: 'cloudy',
    spawnPoints: [new Vector3(0, 0, -50)],
    enemySpawns: [
      new Vector3(25, 0, 35), new Vector3(-25, 0, 40),
      new Vector3(40, 0, 15), new Vector3(-40, 0, 25),
      new Vector3(10, 0, 55),
    ],
  },
  forest: {
    name: '森林草原',
    description: '茂密林间的丛林战',
    theme: 'forest',
    terrain: {
      size: 200,
      subdivisions: 80,
      maxHeight: 3,
      seed: 123,
      baseColor: new Color3(0.28, 0.45, 0.18),
      detailColor: new Color3(0.35, 0.5, 0.22),
      roughness: 0.85,
    },
    defaultWeather: 'clear',
    spawnPoints: [new Vector3(0, 0, -55)],
    enemySpawns: [
      new Vector3(35, 0, 35), new Vector3(-35, 0, 45),
      new Vector3(45, 0, 10), new Vector3(-45, 0, 20),
      new Vector3(0, 0, 55),
    ],
  },
  snow: {
    name: '雪地冻原',
    description: '白雪覆盖的极寒战场',
    theme: 'snow',
    terrain: {
      size: 200,
      subdivisions: 80,
      maxHeight: 5,
      seed: 256,
      baseColor: new Color3(0.85, 0.88, 0.92),
      detailColor: new Color3(0.75, 0.78, 0.82),
      roughness: 0.7,
    },
    defaultWeather: 'snow',
    spawnPoints: [new Vector3(0, 0, -60)],
    enemySpawns: [
      new Vector3(30, 0, 40), new Vector3(-30, 0, 50),
      new Vector3(50, 0, 20), new Vector3(-50, 0, 30),
      new Vector3(0, 0, 60),
    ],
  },
};

export class MapManager {
  terrain: Terrain | null = null;
  skybox: SkyboxManager;
  environment: Environment;
  weather: WeatherSystem;
  currentMap: MapConfig | null = null;

  constructor(private scene: Scene) {
    this.skybox = new SkyboxManager(scene);
    this.environment = new Environment(scene);
    this.weather = new WeatherSystem(scene);
  }

  loadMap(mapId: string, shadowGen: ShadowGenerator | null): MapConfig {
    const config = MAPS[mapId] || MAPS.forest;
    this.currentMap = config;

    this.terrain?.dispose();
    this.terrain = new Terrain(this.scene, config.terrain);

    this.skybox.setTheme(config.theme as SkyTheme);
    this.environment.generate(config.theme, this.terrain, shadowGen);
    this.weather.setWeather(config.defaultWeather);

    return config;
  }

  update(dt: number): void {
    this.weather.update(dt);
  }

  getHeightAt(x: number, z: number): number {
    return this.terrain?.getHeightAt(x, z) || 0;
  }

  dispose(): void {
    this.terrain?.dispose();
    this.skybox.dispose();
    this.environment.dispose();
    this.weather.dispose();
  }

  static getMapList(): { id: string; name: string; description: string }[] {
    return Object.entries(MAPS).map(([id, config]) => ({
      id,
      name: config.name,
      description: config.description,
    }));
  }
}
