# Tank World War / 坦克世界大战

A 3D tank battle game built with Babylon.js, supporting both PC and mobile.

基于 Babylon.js 的 3D 坦克对战游戏，支持 PC 和移动端。

---

## Features / 功能特性

- **Multiple Tanks / 多种坦克**: Light, Medium, Heavy, Tank Destroyer — each with unique stats  
  轻型、中型、重型、歼击车，各有不同属性
- **4 Battle Maps / 4 张战斗地图**: Desert, City Ruins, Forest, Snow  
  沙漠战场、城市废墟、森林草原、雪地冻原
- **AI Enemies / AI 对战**: FSM-driven tanks — Patrol → Chase → Attack → Retreat  
  有限状态机驱动的敌方坦克
- **Pickup System / 拾取系统**: Health, Damage, Speed, Shield — dropped by defeated enemies  
  战场增益物品，击毁敌人有概率掉落
- **Upgrade System / 升级系统**: Spend coins to upgrade armor, damage, speed, reload  
  使用金币升级坦克属性
- **Cross-Platform / 跨平台**: Keyboard + mouse on PC, virtual joysticks on mobile  
  PC 键鼠操控，移动端虚拟摇杆 + 强制横屏
- **Visual Effects / 视觉效果**: PBR materials, post-processing (Bloom, SSAO, FXAA), particles, weather  
  PBR 材质、后处理效果、粒子效果、天气系统

## Tech Stack / 技术栈

| Tech | Purpose / 用途 |
|------|----------------|
| Babylon.js 9.x | 3D rendering engine / 3D 渲染引擎 |
| TypeScript | Primary language / 主开发语言 |
| Vite | Build tool & dev server / 构建与开发服务器 |

## Quick Start / 快速开始

```bash
# Install dependencies / 安装依赖
pnpm install

# Development mode / 开发模式
pnpm dev

# Build for production / 构建生产版本
pnpm build

# Preview production build / 预览构建产物
pnpm preview
```

## Controls / 操控方式

### PC

| Action / 操作 | Key / 按键 |
|---------------|------------|
| Move / 移动 | WASD / Arrow Keys |
| Aim / 瞄准 | Mouse movement / 鼠标移动 |
| Fire / 开火 | Left click / Space / 鼠标左键 / 空格 |
| Zoom / 缩放 | Mouse wheel / 鼠标滚轮 |

### Mobile / 移动端

| Action / 操作 | Control / 控制 |
|---------------|----------------|
| Move / 移动 | Left joystick / 左侧摇杆 |
| Aim / 瞄准 | Right joystick / 右侧摇杆 |
| Fire / 开火 | Fire button / 开火按钮 |

## Deployment / 部署

The `dist/` directory contains static files ready to deploy anywhere.  
构建后的 `dist/` 目录为纯静态文件，可部署至任何平台。

- **Vercel**: `npx vercel`
- **Netlify**: Drag & drop `dist/` / 拖拽 `dist/` 上传
- **Nginx**: Set `dist/` as web root / 将 `dist/` 配置为网站根目录
- **Docker**: Mount `dist/` in `nginx:alpine` / 使用 `nginx:alpine` 镜像

## Project Structure / 项目结构

```
src/
├── core/           # Core systems / 核心系统（输入、相机、音频）
├── entities/       # Game entities / 游戏实体（坦克、炮弹、拾取物）
├── systems/        # Game systems / 游戏系统（AI、战斗、粒子、升级）
├── ui/             # UI / 界面（主菜单、HUD、车库、战斗结果）
├── world/          # World / 世界（地形、环境、天空、天气）
├── utils/          # Utilities / 工具函数
├── Game.ts         # Main game controller / 游戏主控制器
└── main.ts         # Entry point / 入口文件
```

## License

MIT
