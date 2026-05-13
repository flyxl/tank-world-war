# 地图视觉全面升级设计文档

**日期**: 2026-05-13
**范围**: 升级现有 4 张地图 + 新增 4 张二战主题地图，全面提升战场环境真实感
**性能策略**: 桌面与移动端平衡，移动端自动降级

---

## 1. 整体架构

在不重写游戏逻辑的前提下，升级世界渲染子系统。新增/改造 6 个模块：

```
Game.ts (已有)
├─ MapManager.ts (改造: 新地图注册)
│   ├─ Terrain.ts (改造: PBR纹理 + 法线贴图 + Splatmap)
│   ├─ SkyboxManager.ts (改造: HDR 环境贴图天空盒)
│   ├─ Environment.ts (改造: 外部 glTF 模型加载)
│   ├─ WeatherSystem.ts (增强: 更丰富的天气粒子)
│   ├─ WaterSystem.ts (新增: 诺曼底海水渲染)
│   └─ DestructionSystem.ts (新增: 建筑/掩体破坏)
├─ ShadowSystem.ts (新增: 级联阴影管理)
├─ AssetManager.ts (新增: 纹理/模型统一加载与缓存)
└─ ParticleManager.ts (增强: 扬尘/烟火/环境粒子)
```

### 依赖关系

- `AssetManager` 被所有需要加载外部资源的模块依赖
- `ShadowSystem` 在 `Game.startBattle` 中创建，传递给 `MapManager.loadMap`
- `DestructionSystem` 依赖 `ParticleManager` 产生破坏粒子
- `WaterSystem` 仅在诺曼底地图启用

---

## 2. AssetManager（新增）

统一的资源加载与缓存中心。

### 职责

- 管理 PBR 纹理套件（albedo + normal + roughness + AO）的加载
- 管理 glTF 环境模型的加载与实例化
- 管理 HDR 天空盒贴图的加载
- 地图选择界面触发预加载，进入战斗前资源就绪
- LRU 缓存机制，切换地图时释放旧资源

### 接口设计

```typescript
class AssetManager {
  loadTextureSet(id: string, basePath: string): Promise<PBRTextureSet>;
  loadModel(id: string, path: string): Promise<AssetContainer>;
  loadHDR(id: string, path: string): Promise<CubeTexture>;
  preloadMap(mapId: string): Promise<void>;
  dispose(): void;
}

interface PBRTextureSet {
  albedo: Texture;
  normal: Texture;
  roughness: Texture;
  ao?: Texture;
}
```

### 分辨率策略

| 资源类型 | 桌面端 | 移动端 |
|----------|--------|--------|
| 地面纹理 | 1024×1024 | 512×512 |
| 法线贴图 | 1024×1024 | 512×512 |
| HDR 天空 | 512px | 256px |
| 环境模型 | 完整 LOD | 低多边形 LOD |

### 资源来源

| 类型 | 来源 | 许可证 |
|------|------|--------|
| PBR 地面纹理 | [Poly Haven Textures](https://polyhaven.com/textures) | CC0 |
| HDR 天空盒 | [Poly Haven HDRIs](https://polyhaven.com/hdris) | CC0 |
| 环境 3D 模型 | [Kenney](https://kenney.nl/), [Quaternius](https://quaternius.com/) | CC0 |

### 文件结构

```
public/assets/
├─ textures/
│   ├─ sand/          (albedo.jpg, normal.jpg, roughness.jpg, ao.jpg)
│   ├─ grass/
│   ├─ dirt/
│   ├─ snow/
│   ├─ rubble/
│   ├─ asphalt/
│   ├─ wet-sand/
│   ├─ wheat-field/
│   └─ pine-needles/
├─ skyboxes/
│   ├─ desert.env
│   ├─ overcast.env
│   ├─ clear.env
│   ├─ winter.env
│   ├─ smoky.env
│   └─ stormy.env
└─ models/
    ├─ military/      (sandbag.glb, barbed-wire.glb, dragon-teeth.glb, bunker.glb)
    ├─ buildings/      (house.glb, ruin-house.glb, rubble.glb, church.glb)
    ├─ vegetation/     (oak-tree.glb, pine-tree.glb, bush.glb, grass-patch.glb)
    ├─ terrain-detail/ (rock.glb, crater.glb, trench.glb)
    └─ normandy/       (cliff.glb, beach-obstacle.glb, pillbox.glb)
```

---

## 3. 地形系统升级（Terrain.ts 改造）

### 现状

- 噪声高度场 + `DynamicTexture` 纯色涂抹
- `PBRMetallicRoughnessMaterial`，仅 albedo 为运行时涂色

### 目标

保留噪声高度场，替换材质系统为真实 PBR。

### 实现

- **材质**：替换为 `PBRMaterial`，加载真实的 albedo + normal + roughness 纹理
- **UV Tiling**：地面纹理以 tiling 方式铺满。200m 地形 tile 20-30 次，避免拉伸
- **Splatmap 混合**：对需要多纹理地图（诺曼底沙滩→草地、沙漠沙地→岩石），使用 `NodeMaterial`（Babylon.js 节点材质编辑器）实现。vertex color 的 R/G/B 通道作为 3 种纹理的混合权重，在 Terrain 构建时根据高度/位置规则写入顶点颜色
- **法线贴图**：为地表增加微观凹凸细节

### 每张地图纹理配置

| 地图 | 主纹理 (R) | 次纹理 (G) | 第三纹理 (B) | 混合逻辑 |
|------|-----------|-----------|-------------|---------|
| 沙漠 desert | 沙地 sand | 岩石 rock | — | 高度>3m 岩石 |
| 城市 urban | 碎石 rubble | 沥青 asphalt | — | 道路区域沥青 |
| 森林 forest | 草地 grass | 泥土 dirt | — | 树下/低洼泥土 |
| 雪地 snow | 积雪 snow | 冻土 dirt | — | 高处雪厚 |
| 诺曼底 normandy | 湿沙 wet-sand | 草地 grass | — | Y>海平面→草地 |
| 斯大林格勒 stalingrad | 碎砖 rubble | 泥土 dirt | 灰尘 dust | 全区域混合 |
| 库尔斯克 kursk | 草原 grass | 麦田 wheat | — | 随机区块 |
| 阿登 ardennes | 雪地 snow | 松针 pine-needles | — | 树下松针 |

---

## 4. 天空盒系统升级（SkyboxManager.ts 改造）

### 现状

单面渐变色 box + `DynamicTexture` + `disableLighting`

### 目标

真实 HDR 环境贴图，同时提供 IBL 照明。

### 实现

- 使用 `CubeTexture.CreateFromPrefilteredData(path, scene)` 加载 `.env` 格式 HDR
- 设置 `scene.environmentTexture` 用于 PBR IBL 反射
- 创建 `scene.createDefaultSkybox(envTexture, true, 1000, 0.3)` 生成天空盒
- 每张地图对应一个 HDR 主题

### 天空盒分配

| 地图 | HDR 主题 | 色调描述 |
|------|---------|---------|
| 沙漠 | desert.env | 炎热晴朗，强烈日照 |
| 城市 | overcast.env | 阴沉多云 |
| 森林 | clear.env | 明朗蓝天白云 |
| 雪地 | winter.env | 灰白色冬日天空 |
| 诺曼底 | stormy.env | 多云阴沉，海风 |
| 斯大林格勒 | smoky.env | 红褐色浓烟天空 |
| 库尔斯克 | clear.env | 广阔晴朗夏日天空 |
| 阿登 | winter.env | 灰暗冬日低云 |

---

## 5. 阴影系统（ShadowSystem.ts 新增）

### 现状

`ShadowGenerator` 传入 `null`，完全无阴影。

### 实现

- 在 `Game.startBattle` 中创建 `CascadedShadowGenerator`
- 挂载到主方向光（sun）
- 传递给 `MapManager.loadMap` 用于注册阴影投射者

### 配置

| 参数 | 桌面端 | 移动端 |
|------|--------|--------|
| 分辨率 | 2048 | 1024 |
| 级联数 | 4 | 2 |
| 过滤 | PCF (软阴影) | PCF |
| 阴影距离 | 100m | 60m |
| 偏移 | 0.005 | 0.005 |

### 阴影投射者

- 坦克（玩家 + 敌方）
- 建筑和碉堡
- 大型树木和岩石
- **不投影**：草丛、小型灌木、铁丝网（节省性能）

### 阴影接收者

- 地形网格
- 地面装饰物

---

## 6. 环境物体系统（Environment.ts 改造）

### 现状

`MeshBuilder` 程序化生成 Box/Cylinder/Sphere。

### 目标

加载外部 glTF 模型，按地图主题配置放置。

### 物体分类

| 类别 | 模型列表 | 适用地图 |
|------|---------|---------|
| 军事设施 | 沙袋墙、铁丝网、龙齿反坦克桩、碉堡 | 全部 |
| 建筑 | 完整房屋、损毁房屋、废墟、教堂 | urban, stalingrad |
| 植被 | 橡树、松树、灌木、草丛 | forest, kursk, ardennes |
| 地形装饰 | 岩石、弹坑、壕沟 | 全部 |
| 诺曼底特有 | 海滩碉堡、反登陆桩、悬崖 | normandy |

### 放置系统

每张地图定义放置配置：

```typescript
interface EnvPlacementConfig {
  presetPositions: { model: string; position: Vector3; rotation: number }[];
  randomPlacements: {
    model: string;
    count: number;
    exclusionRadius: number; // 距出生点最小距离
    heightRange?: [number, number]; // 放置高度范围
    clustering?: number; // 0=均匀, 1=高度聚集
  }[];
}
```

- 大型物体（建筑/碉堡）：`presetPositions` 手动编排战术布局
- 中小型物体（树木/岩石/沙袋）：`randomPlacements` 随机 + 密度控制
- 碰撞体积从模型 bounding box 自动生成

### 模型实例化

使用 `AssetContainer.instantiateModelsToScene()` 实现同一模型的多次实例化，共享 GPU 数据。

### LOD / 移动端优化

- 移动端：放置密度降为桌面端的 70%
- 距离裁剪（非 LOD 网格简化）：距离 >100m 的小型物体调用 `mesh.setEnabled(false)` 隐藏，每帧按摄像机距离更新可见性

---

## 7. 水面系统（WaterSystem.ts 新增）

专为诺曼底海滩地图设计，其他地图不启用。

### 实现

- 使用 Babylon.js `WaterMaterial` 创建水面
- 水面网格覆盖地图海岸线以下区域（约地图 30% 面积）
- 水面高度固定为海平面（y=0 或自定义）

### 配置

| 特性 | 桌面端 | 移动端 |
|------|--------|--------|
| 波浪动画 | ✅ | ✅ |
| 反射 | ✅ (render target) | ❌ |
| 折射 | ✅ (render target) | ❌ |
| 泡沫 | 粒子 | ❌ |
| 半透明 | — | ✅ (alpha blend) |

### 游戏逻辑交互

- 坦克进入浅水区（深度 < 0.5m）：速度降低 50%
- 坦克进入深水区（深度 > 0.5m）：不可通行，自动停止
- 水面判断集成到 `Game.resolveCollisions` 或坦克 `update` 逻辑

---

## 8. 破坏系统（DestructionSystem.ts 新增）

### 设计原则

简单但有冲击力。不做物理模拟，使用模型切换 + 粒子。

### 可破坏物体

| 物体 | HP | 破坏后 |
|------|-----|--------|
| 完整房屋 | 200 | 废墟 → 碎块 |
| 损毁房屋 | 100 | 碎块 |
| 沙袋墙 | 50 | 散落沙袋 |
| 铁丝网 | 30 | 消失 |
| 碉堡 | 300 | 损毁碉堡 |

### 三阶段模型系统

每个可破坏物体注册 3 个模型变体：

```typescript
interface DestructibleDef {
  id: string;
  hp: number;
  models: {
    intact: string;    // 完好
    damaged: string;   // 损坏（50% HP 以下）
    destroyed: string; // 废墟（0 HP）
  };
  collisionShrink: number; // 破坏后碰撞体积缩小比例（0-1）
  debrisParticles: number; // 破坏时碎片粒子数量
}
```

### 破坏时效果

- 模型从 intact → damaged → destroyed 切换
- 粒子爆发：碎片飞溅 + 尘土云
- 碰撞体积缩小（废墟可以翻越/穿过）
- 播放破坏音效

### 移动端

- 粒子数量减半
- 跳过碎片飞溅（仅尘土云）

---

## 9. 粒子效果升级（ParticleManager.ts 改造）

### 新增粒子类型

| 效果 | 触发条件 | 粒子数 (桌面/移动) | 持续时间 |
|------|----------|-------------------|---------|
| 坦克扬尘 | 坦克移动中 | 30/15 | 持续 |
| 增强炮口焰 | 开火瞬间 | 50/25 | 0.3s |
| 弹道曳光 | 炮弹飞行 | 20/10 | 跟随炮弹 |
| 装甲火花 | 击中装甲 | 40/20 | 0.5s |
| 增强爆炸 | 坦克/建筑摧毁 | 100/50 | 1.5s |
| 燃烧残骸 | 摧毁后 | 60/30 | 10-15s |
| 环境粒子 | 持续 | 100/0 | 持续 |

### 扬尘主题

| 地图 | 扬尘颜色 | 扬尘类型 |
|------|---------|---------|
| 沙漠 | 金黄色 | 细沙 |
| 城市 | 灰色 | 碎屑 |
| 森林 | 棕色 | 泥土 |
| 雪地 | 白色 | 雪花 |
| 诺曼底 | 米黄色 | 湿沙 |
| 斯大林格勒 | 深灰色 | 灰尘碎砖 |
| 库尔斯克 | 浅棕色 | 泥土草叶 |
| 阿登 | 白色 | 雪粉 |

### 环境粒子

| 地图 | 环境粒子 | 描述 |
|------|---------|------|
| 沙漠 | 飞沙 | 水平飘动的沙粒 |
| 森林 | 落叶 | 缓慢飘落的树叶 |
| 斯大林格勒 | 余烬 | 红橙色上升飘动 |
| 雪地/阿登 | 增强飘雪 | 更密集的雪花 |
| 其他 | 尘埃 | 微弱的空气粒子 |

---

## 10. 8 张地图详细配置

### 10.1 沙漠战场 (desert) — 升级

| 属性 | 配置 |
|------|------|
| 地形高度 | maxHeight: 5, seed: 42 |
| 地面纹理 | 主: sand, 次: rock (高处岩石) |
| 天空盒 | desert.env (炎热晴朗) |
| 天气 | clear, 可选: fog (沙尘暴) |
| 环境物体 | 岩石(×15), 仙人掌灌木(×20), 沙袋(×8), 龙齿(×6) |
| 粒子 | 飞沙环境, 金黄扬尘 |
| 后处理 | 暖色调色温偏移 |

### 10.2 城市废墟 (urban) — 升级

| 属性 | 配置 |
|------|------|
| 地形高度 | maxHeight: 1, seed: 123 |
| 地面纹理 | 主: rubble, 次: asphalt (道路) |
| 天空盒 | overcast.env (阴沉) |
| 天气 | cloudy |
| 环境物体 | 房屋(×6), 损毁房屋(×4), 废墟(×8), 沙袋(×10), 铁丝网(×6) |
| 可破坏 | 房屋, 沙袋, 铁丝网 |
| 粒子 | 灰色扬尘, 尘埃环境 |

### 10.3 森林草原 (forest) — 升级

| 属性 | 配置 |
|------|------|
| 地形高度 | maxHeight: 3, seed: 789 |
| 地面纹理 | 主: grass, 次: dirt (树下) |
| 天空盒 | clear.env (晴朗) |
| 天气 | clear |
| 环境物体 | 橡树(×25), 灌木(×30), 草丛(×40), 岩石(×10) |
| 粒子 | 落叶环境, 棕色扬尘 |

### 10.4 雪地冻原 (snow) — 升级

| 属性 | 配置 |
|------|------|
| 地形高度 | maxHeight: 2, seed: 456 |
| 地面纹理 | 主: snow, 次: dirt (冻土) |
| 天空盒 | winter.env (灰白冬日) |
| 天气 | snow |
| 环境物体 | 松树(×20), 雪覆盖岩石(×12), 灌木(×15) |
| 粒子 | 增强飘雪, 白色扬尘 |

### 10.5 诺曼底海滩 (normandy) — 新增

| 属性 | 配置 |
|------|------|
| 地形高度 | maxHeight: 8 (含悬崖), seed: 1944 |
| 地形特点 | 地图北侧为海滩(低平), 南侧为悬崖(高耸), 中间斜坡 |
| 地面纹理 | 主: wet-sand, 次: grass (内陆), splatmap 按高度混合 |
| 天空盒 | stormy.env (多云阴沉) |
| 天气 | cloudy, 轻微雾气 |
| 水面 | 北侧海面, WaterMaterial (反射/折射/波浪) |
| 环境物体 | 碉堡(×3 预设), 反登陆桩(×15), 龙齿(×10), 沙袋(×12), 弹坑(×8) |
| 可破坏 | 碉堡(高HP), 沙袋, 铁丝网 |
| 粒子 | 海浪泡沫, 米黄扬尘 |
| 出生点 | 玩家: 海滩侧, 敌方: 悬崖顶侧 |

### 10.6 斯大林格勒 (stalingrad) — 新增

| 属性 | 配置 |
|------|------|
| 地形高度 | maxHeight: 1 (平坦城市), seed: 1942 |
| 地面纹理 | 主: rubble, 次: dirt, 三: dust |
| 天空盒 | smoky.env (红褐浓烟) |
| 天气 | fog (浓雾+烟) |
| 环境物体 | 废墟建筑(×10), 损毁房屋(×6), 教堂(×1 预设), 沙袋(×15), 弹坑(×12) |
| 可破坏 | 大量可破坏建筑和掩体 |
| 粒子 | 余烬环境, 火焰(建筑), 深灰扬尘, 浓烟 |
| 特色 | 多个建筑持续燃烧(装饰性火焰粒子) |

### 10.7 库尔斯克 (kursk) — 新增

| 属性 | 配置 |
|------|------|
| 地形高度 | maxHeight: 4 (缓丘), seed: 1943 |
| 地形特点 | 广阔开阔, 缓坡丘陵, 视野远 |
| 地面纹理 | 主: grass, 次: wheat-field |
| 天空盒 | clear.env (广阔晴朗夏日) |
| 天气 | clear |
| 环境物体 | 壕沟(×6), 散兵坑(×10), 稀疏树木(×8), 岩石(×5), 龙齿(×4) |
| 粒子 | 浅棕扬尘, 轻微尘埃环境 |
| 特色 | 开阔地形, 适合远距离坦克对战 |

### 10.8 阿登森林 (ardennes) — 新增

| 属性 | 配置 |
|------|------|
| 地形高度 | maxHeight: 5 (丘陵), seed: 1944 |
| 地形特点 | 密林覆盖, 狭窄林间通道, 起伏山路 |
| 地面纹理 | 主: snow, 次: pine-needles (树下) |
| 天空盒 | winter.env (灰暗低云) |
| 天气 | snow (大雪) |
| 环境物体 | 松树(×40 高密度), 岩石(×10), 灌木(×15), 弹坑(×5) |
| 粒子 | 增强飘雪, 白色扬尘, 薄雾 |
| 特色 | 低能见度, 密林遭遇战 |

---

## 11. 性能策略总结

| 特性 | 桌面端 | 移动端 |
|------|--------|--------|
| 地面纹理分辨率 | 1024px | 512px |
| HDR 天空分辨率 | 512px | 256px |
| 阴影分辨率 | 2048px, 4级联 | 1024px, 2级联 |
| 环境物体密度 | 100% | 70% |
| 水面 | 反射+折射+波浪 | 半透明+波浪 |
| 粒子发射率 | 100% | 50% |
| 环境粒子 | 启用 | 关闭 |
| 破坏碎片 | 完整 | 仅尘土 |
| 后处理 | 全部(暗角/色差/颗粒/锐化) | 基础(bloom/FXAA/色调) |
| 距离裁剪 | 150m | 100m |

`DeviceDetector.isMobile()` 已存在，用于所有分支判断。

---

## 12. 对现有系统的改动

### Game.ts

- `startBattle`: 创建 `ShadowSystem`，将 `shadowGenerator` 传入 `loadMap`
- `setupBattleLighting`: 调整光照参数配合 IBL
- `resolveCollisions`: 新增水面/可破坏物体碰撞检测
- `cleanupBattle`: 新增 `WaterSystem`、`DestructionSystem`、`ShadowSystem` 的 dispose

### MapManager.ts

- `MapConfig` 新增字段：水面配置、破坏物配置、环境放置配置
- `MAPS` 新增 4 张地图
- `loadMap` 调用链扩展（水面、破坏系统初始化）

### MainMenu.ts

- 地图选择网格新增 4 张地图卡片

### ParticleManager.ts

- 新增扬尘、曳光、燃烧残骸等粒子类型
- 提供 `createDustTrail(tank)` 等便捷方法

---

## 13. 不在范围内

- 多人联机
- 地形编辑器
- 动态昼夜循环（保持 WeatherSystem 的简单时间推进）
- 物理引擎驱动的破坏（使用模型切换代替）
- 自定义着色器水体（使用 Babylon.js 内置 WaterMaterial）
