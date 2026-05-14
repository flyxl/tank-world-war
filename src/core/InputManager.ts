import { Scene, Vector2 } from '@babylonjs/core';
import { DeviceDetector } from '../utils/DeviceDetector';

export interface InputState {
  moveForward: boolean;
  moveBackward: boolean;
  turnLeft: boolean;
  turnRight: boolean;
  fire: boolean;
  mouseScreenX: number;
  mouseScreenY: number;
  moveAxis: Vector2;
  aimAxis: Vector2;
  /** Mobile elevation slider: -1 (max depression) to 1 (max elevation), 0 = level */
  elevationInput: number;
  zoomIn: boolean;
  zoomOut: boolean;
  isMobile: boolean;
}

interface VirtualJoystick {
  container: HTMLElement;
  base: HTMLElement;
  thumb: HTMLElement;
  touchId: number;
  active: boolean;
  cx: number;
  cy: number;
  dx: number;
  dy: number;
  radius: number;
}

export class InputManager {
  private keys: Set<string> = new Set();
  private mouseDown = false;
  readonly isMobile: boolean;
  private mobileFiring = false;
  private moveJoystickData = { x: 0, y: 0 };
  private aimJoystickData = { x: 0, y: 0 };
  private elevationValue = 0;
  private wheelDelta = 0;
  private canvas: HTMLCanvasElement;
  private mouseX = 0;
  private mouseY = 0;

  private moveStick: VirtualJoystick | null = null;
  private aimStick: VirtualJoystick | null = null;
  private fireBtn: HTMLElement | null = null;
  private elevSlider: { container: HTMLElement; thumb: HTMLElement; track: HTMLElement; touchId: number; active: boolean } | null = null;

  private boundTouchStart: ((e: TouchEvent) => void) | null = null;
  private boundTouchMove: ((e: TouchEvent) => void) | null = null;
  private boundTouchEnd: ((e: TouchEvent) => void) | null = null;

  constructor(private scene: Scene) {
    this.canvas = scene.getEngine().getRenderingCanvas()!;
    this.isMobile = DeviceDetector.isMobile();

    if (this.isMobile) {
      this.setupMobileControls();
    } else {
      this.setupPCControls();
    }
  }

  private setupPCControls(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
    });
    window.addEventListener('pointermove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    }, true);
    window.addEventListener('pointerdown', (e) => {
      if (e.button === 0) this.mouseDown = true;
    }, true);
    window.addEventListener('pointerup', (e) => {
      if (e.button === 0) this.mouseDown = false;
    }, true);
    this.canvas.addEventListener('wheel', (e) => {
      this.wheelDelta += e.deltaY;
    });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private createJoystickUI(side: 'left' | 'right', color: string): VirtualJoystick {
    const container = document.createElement('div');
    container.className = `joystick-${side}`;
    const r = 50;
    Object.assign(container.style, {
      position: 'fixed',
      [side]: '30px',
      bottom: '30px',
      width: `${r * 2}px`,
      height: `${r * 2}px`,
      borderRadius: '50%',
      background: 'rgba(255,255,255,0.12)',
      border: `2px solid rgba(255,255,255,0.25)`,
      zIndex: '50',
      touchAction: 'none',
      pointerEvents: 'none',
    });
    document.body.appendChild(container);

    const base = document.createElement('div');
    Object.assign(base.style, {
      position: 'absolute', top: '0', left: '0',
      width: '100%', height: '100%', borderRadius: '50%',
    });
    container.appendChild(base);

    const thumbSize = r * 0.8;
    const thumb = document.createElement('div');
    Object.assign(thumb.style, {
      position: 'absolute',
      width: `${thumbSize}px`, height: `${thumbSize}px`,
      borderRadius: '50%',
      background: color,
      border: '2px solid rgba(255,255,255,0.5)',
      top: `${r - thumbSize / 2}px`,
      left: `${r - thumbSize / 2}px`,
      transition: 'none',
    });
    container.appendChild(thumb);

    return {
      container, base, thumb,
      touchId: -1, active: false,
      cx: 0, cy: 0, dx: 0, dy: 0, radius: r,
    };
  }

  private setupMobileControls(): void {
    this.moveStick = this.createJoystickUI('left', 'rgba(255,255,255,0.35)');
    this.aimStick = this.createJoystickUI('right', 'rgba(255,100,100,0.35)');

    this.fireBtn = document.createElement('div');
    Object.assign(this.fireBtn.style, {
      position: 'fixed', right: '30px', bottom: `${50 * 2 + 50}px`,
      width: '60px', height: '60px', borderRadius: '50%',
      background: 'radial-gradient(circle, #e94560 0%, #c0392b 100%)',
      border: '3px solid rgba(255,255,255,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#fff', fontSize: '12px', fontWeight: 'bold',
      zIndex: '50', userSelect: 'none', touchAction: 'none',
      pointerEvents: 'none',
      boxShadow: '0 0 15px rgba(233,69,96,0.5)',
    });
    this.fireBtn.textContent = '开火';
    document.body.appendChild(this.fireBtn);

    this.elevSlider = this.createElevationSlider();

    this.boundTouchStart = this.onTouchStart.bind(this);
    this.boundTouchMove = this.onTouchMove.bind(this);
    this.boundTouchEnd = this.onTouchEnd.bind(this);

    document.addEventListener('touchstart', this.boundTouchStart, { passive: false, capture: true });
    document.addEventListener('touchmove', this.boundTouchMove, { passive: false, capture: true });
    document.addEventListener('touchend', this.boundTouchEnd, { passive: false, capture: true });
    document.addEventListener('touchcancel', this.boundTouchEnd, { passive: false, capture: true });

  }

  private createElevationSlider(): typeof this.elevSlider {
    const trackH = 120;
    const thumbH = 24;

    const container = document.createElement('div');
    Object.assign(container.style, {
      position: 'fixed', right: '115px', bottom: '50px',
      width: '30px', height: `${trackH}px`,
      zIndex: '50', touchAction: 'none', pointerEvents: 'none',
    });

    const label = document.createElement('div');
    Object.assign(label.style, {
      position: 'absolute', top: '-18px', left: '0', width: '100%',
      textAlign: 'center', color: 'rgba(255,255,255,0.6)',
      fontSize: '10px', fontFamily: 'sans-serif',
    });
    label.textContent = '仰角';
    container.appendChild(label);

    const track = document.createElement('div');
    Object.assign(track.style, {
      position: 'absolute', top: '0', left: '50%', transform: 'translateX(-50%)',
      width: '6px', height: '100%', borderRadius: '3px',
      background: 'rgba(255,255,255,0.15)',
      border: '1px solid rgba(255,255,255,0.25)',
    });
    container.appendChild(track);

    const centerMark = document.createElement('div');
    Object.assign(centerMark.style, {
      position: 'absolute', top: `${trackH / 2 - 1}px`, left: '2px',
      width: '26px', height: '2px',
      background: 'rgba(255,255,255,0.3)',
    });
    container.appendChild(centerMark);

    const thumb = document.createElement('div');
    Object.assign(thumb.style, {
      position: 'absolute', left: '50%', transform: 'translateX(-50%)',
      top: `${trackH / 2 - thumbH / 2}px`,
      width: '22px', height: `${thumbH}px`, borderRadius: '4px',
      background: 'rgba(255,200,100,0.5)',
      border: '2px solid rgba(255,255,255,0.5)',
    });
    container.appendChild(thumb);
    document.body.appendChild(container);

    return { container, thumb, track, touchId: -1, active: false };
  }

  private isNearElevSlider(tx: number, ty: number): boolean {
    if (!this.elevSlider) return false;
    const rect = this.elevSlider.container.getBoundingClientRect();
    const margin = 25;
    return tx >= rect.left - margin && tx <= rect.right + margin &&
           ty >= rect.top - margin && ty <= rect.bottom + margin;
  }

  private updateElevSlider(ty: number): void {
    if (!this.elevSlider) return;
    const rect = this.elevSlider.container.getBoundingClientRect();
    const trackH = rect.height;
    const thumbH = 24;
    const relY = ty - rect.top;
    const clamped = Math.max(0, Math.min(trackH, relY));
    this.elevationValue = 1 - (clamped / trackH) * 2;
    this.elevSlider.thumb.style.top = `${clamped - thumbH / 2}px`;
  }

  private resetElevSlider(): void {
    if (!this.elevSlider) return;
    const trackH = parseInt(this.elevSlider.container.style.height);
    const thumbH = 24;
    this.elevSlider.thumb.style.top = `${trackH / 2 - thumbH / 2}px`;
    this.elevationValue = 0;
  }

  private getStickCenter(stick: VirtualJoystick): { x: number; y: number } {
    const rect = stick.container.getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  private isInFireBtn(tx: number, ty: number): boolean {
    if (!this.fireBtn) return false;
    const rect = this.fireBtn.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dist = Math.sqrt((tx - cx) ** 2 + (ty - cy) ** 2);
    return dist < rect.width;
  }

  private isNearStick(stick: VirtualJoystick, tx: number, ty: number): boolean {
    const c = this.getStickCenter(stick);
    const dist = Math.sqrt((tx - c.x) ** 2 + (ty - c.y) ** 2);
    return dist < stick.radius * 2.5;
  }

  private onTouchStart(e: TouchEvent): void {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];
      const tx = t.clientX;
      const ty = t.clientY;

      if (this.isInFireBtn(tx, ty)) {
        this.mobileFiring = true;
        e.preventDefault();
        continue;
      }

      if (this.moveStick && !this.moveStick.active && this.isNearStick(this.moveStick, tx, ty)) {
        this.moveStick.active = true;
        this.moveStick.touchId = t.identifier;
        const c = this.getStickCenter(this.moveStick);
        this.moveStick.cx = c.x;
        this.moveStick.cy = c.y;
        e.preventDefault();
        continue;
      }

      if (this.aimStick && !this.aimStick.active && this.isNearStick(this.aimStick, tx, ty)) {
        this.aimStick.active = true;
        this.aimStick.touchId = t.identifier;
        const c = this.getStickCenter(this.aimStick);
        this.aimStick.cx = c.x;
        this.aimStick.cy = c.y;
        e.preventDefault();
        continue;
      }

      if (this.elevSlider && !this.elevSlider.active && this.isNearElevSlider(tx, ty)) {
        this.elevSlider.active = true;
        this.elevSlider.touchId = t.identifier;
        this.updateElevSlider(ty);
        e.preventDefault();
        continue;
      }
    }
  }

  private onTouchMove(e: TouchEvent): void {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];

      if (this.moveStick?.active && t.identifier === this.moveStick.touchId) {
        this.updateStick(this.moveStick, t.clientX, t.clientY);
        this.moveJoystickData.x = this.moveStick.dx;
        this.moveJoystickData.y = this.moveStick.dy;
        e.preventDefault();
      }

      if (this.aimStick?.active && t.identifier === this.aimStick.touchId) {
        this.updateStick(this.aimStick, t.clientX, t.clientY);
        this.aimJoystickData.x = this.aimStick.dx;
        this.aimJoystickData.y = this.aimStick.dy;
        e.preventDefault();
      }

      if (this.elevSlider?.active && t.identifier === this.elevSlider.touchId) {
        this.updateElevSlider(t.clientY);
        e.preventDefault();
      }
    }

  }

  private onTouchEnd(e: TouchEvent): void {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const t = e.changedTouches[i];

      if (this.mobileFiring) {
        if (this.isInFireBtn(t.clientX, t.clientY)) {
          this.mobileFiring = false;
        }
      }

      if (this.moveStick?.active && t.identifier === this.moveStick.touchId) {
        this.moveStick.active = false;
        this.moveStick.touchId = -1;
        this.moveStick.dx = 0;
        this.moveStick.dy = 0;
        this.resetThumb(this.moveStick);
        this.moveJoystickData.x = 0;
        this.moveJoystickData.y = 0;
      }

      if (this.aimStick?.active && t.identifier === this.aimStick.touchId) {
        this.aimStick.active = false;
        this.aimStick.touchId = -1;
        this.aimStick.dx = 0;
        this.aimStick.dy = 0;
        this.resetThumb(this.aimStick);
        this.aimJoystickData.x = 0;
        this.aimJoystickData.y = 0;
      }

      if (this.elevSlider?.active && t.identifier === this.elevSlider.touchId) {
        this.elevSlider.active = false;
        this.elevSlider.touchId = -1;
        this.resetElevSlider();
      }
    }

  }

  private updateStick(stick: VirtualJoystick, tx: number, ty: number): void {
    let ox = tx - stick.cx;
    let oy = -(ty - stick.cy);
    const dist = Math.sqrt(ox * ox + oy * oy);
    const maxDist = stick.radius;

    if (dist > maxDist) {
      ox = (ox / dist) * maxDist;
      oy = (oy / dist) * maxDist;
    }

    stick.dx = ox / maxDist;
    stick.dy = oy / maxDist;

    const thumbSize = stick.radius * 0.8;
    const visualOx = tx - stick.cx;
    const visualOy = ty - stick.cy;
    const clampedVx = dist > maxDist ? (visualOx / dist) * maxDist : visualOx;
    const clampedVy = dist > maxDist ? (visualOy / dist) * maxDist : visualOy;

    stick.thumb.style.left = `${stick.radius + clampedVx - thumbSize / 2}px`;
    stick.thumb.style.top = `${stick.radius + clampedVy - thumbSize / 2}px`;
  }

  private resetThumb(stick: VirtualJoystick): void {
    const thumbSize = stick.radius * 0.8;
    stick.thumb.style.left = `${stick.radius - thumbSize / 2}px`;
    stick.thumb.style.top = `${stick.radius - thumbSize / 2}px`;
  }

  getState(): InputState {
    if (!this.isMobile) {
      const elevSpeed = 0.03;
      if (this.keys.has('KeyQ')) this.elevationValue = Math.min(1, this.elevationValue + elevSpeed);
      if (this.keys.has('KeyE')) this.elevationValue = Math.max(-1, this.elevationValue - elevSpeed);
    }

    const state: InputState = {
      moveForward: this.keys.has('KeyW') || this.keys.has('ArrowUp'),
      moveBackward: this.keys.has('KeyS') || this.keys.has('ArrowDown'),
      turnLeft: this.keys.has('KeyA') || this.keys.has('ArrowLeft'),
      turnRight: this.keys.has('KeyD') || this.keys.has('ArrowRight'),
      fire: this.mouseDown || this.keys.has('Space') || this.mobileFiring,
      mouseScreenX: this.mouseX,
      mouseScreenY: this.mouseY,
      moveAxis: new Vector2(this.moveJoystickData.x, this.moveJoystickData.y),
      aimAxis: new Vector2(this.aimJoystickData.x, this.aimJoystickData.y),
      elevationInput: this.elevationValue,
      zoomIn: this.wheelDelta < 0,
      zoomOut: this.wheelDelta > 0,
      isMobile: this.isMobile,
    };

    this.wheelDelta = 0;
    return state;
  }

  dispose(): void {
    if (this.boundTouchStart) {
      document.removeEventListener('touchstart', this.boundTouchStart, true);
      document.removeEventListener('touchmove', this.boundTouchMove!, true);
      document.removeEventListener('touchend', this.boundTouchEnd!, true);
      document.removeEventListener('touchcancel', this.boundTouchEnd!, true);
    }
    this.moveStick?.container.remove();
    this.aimStick?.container.remove();
    this.fireBtn?.remove();
    this.elevSlider?.container.remove();
  }
}
