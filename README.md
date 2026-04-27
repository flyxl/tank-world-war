# Tank World War

[中文文档](README_CN.md)

A 3D tank battle game built with Babylon.js, supporting both PC and mobile.

## Features

- **Multiple Tanks**: Light, Medium, Heavy, Tank Destroyer — each with unique stats
- **4 Battle Maps**: Desert, City Ruins, Forest, Snow
- **AI Enemies**: FSM-driven tanks — Patrol → Chase → Attack → Retreat
- **Pickup System**: Health, Damage, Speed, Shield — dropped by defeated enemies
- **Upgrade System**: Spend coins to upgrade armor, damage, speed, reload
- **Cross-Platform**: Keyboard + mouse on PC, virtual joysticks on mobile
- **Visual Effects**: PBR materials, post-processing (Bloom, SSAO, FXAA), particles, weather

## Tech Stack

| Tech | Purpose |
|------|---------|
| Babylon.js 9.x | 3D rendering engine |
| TypeScript | Primary language |
| Vite | Build tool & dev server |

## Quick Start

```bash
# Install dependencies
pnpm install

# Development mode
pnpm dev

# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Controls

### PC

| Action | Key |
|--------|-----|
| Move | WASD / Arrow Keys |
| Aim | Mouse movement |
| Fire | Left click / Space |
| Zoom | Mouse wheel |

### Mobile

| Action | Control |
|--------|---------|
| Move | Left joystick |
| Aim | Right joystick |
| Fire | Fire button |

## Deployment

The `dist/` directory contains static files ready to deploy anywhere:

- **Vercel**: `npx vercel`
- **Netlify**: Drag & drop `dist/`
- **Nginx**: Set `dist/` as web root
- **Docker**: Mount `dist/` in `nginx:alpine`

## Project Structure

```
src/
├── core/           # Core systems (input, camera, audio)
├── entities/       # Game entities (tanks, projectiles, pickups)
├── systems/        # Game systems (AI, combat, particles, upgrades)
├── ui/             # UI (main menu, HUD, garage, battle results)
├── world/          # World (terrain, environment, skybox, weather)
├── utils/          # Utility functions
├── Game.ts         # Main game controller
└── main.ts         # Entry point
```

## License

MIT
