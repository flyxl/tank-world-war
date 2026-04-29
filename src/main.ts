import '@babylonjs/core';
import { Game } from './Game';

try {
  (screen.orientation as any).lock?.('landscape').catch(() => {});
} catch (_) {}

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

if (!canvas) {
  throw new Error('Canvas element not found');
}

const game = new Game(canvas);
game.init().catch(console.error);
