export class DeviceDetector {
  static isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    ) || (navigator.maxTouchPoints > 0 && window.innerWidth < 1024);
  }

  static isTablet(): boolean {
    return /iPad/i.test(navigator.userAgent) ||
      (navigator.maxTouchPoints > 0 && window.innerWidth >= 768 && window.innerWidth < 1024);
  }

  static getPixelRatio(): number {
    if (this.isMobile()) {
      return Math.min(window.devicePixelRatio, 2);
    }
    return Math.min(window.devicePixelRatio, 2.5);
  }

  static supportsPointerLock(): boolean {
    return 'pointerLockElement' in document;
  }
}
