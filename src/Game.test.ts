import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Game startBattle error handling', () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    document.body.innerHTML = '<canvas id="gameCanvas"></canvas>';
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    document.body.innerHTML = '';
  });

  it('reports errors to console.error when battle initialization fails', async () => {
    const { handleBattleError } = await import('./Game');

    const error = new Error('Environment texture failed to load');
    handleBattleError(error);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      '[Game] Battle initialization failed:',
      error
    );
  });

  it('shows error overlay to user when battle initialization fails', async () => {
    const { handleBattleError } = await import('./Game');

    const error = new Error('Map loading failed');
    handleBattleError(error);

    const overlay = document.getElementById('battleErrorOverlay');
    expect(overlay).not.toBeNull();
    expect(overlay!.textContent).toContain('加载失败');
  });

  it('provides a retry button in error overlay', async () => {
    const { handleBattleError } = await import('./Game');

    handleBattleError(new Error('Network timeout'));

    const retryBtn = document.querySelector('#battleErrorOverlay button');
    expect(retryBtn).not.toBeNull();
    expect(retryBtn!.textContent).toContain('返回');
  });

  it('removes loading overlay when battle error occurs', async () => {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loadingOverlay';
    document.body.appendChild(loadingOverlay);

    expect(document.getElementById('loadingOverlay')).not.toBeNull();

    const { handleBattleError } = await import('./Game');
    handleBattleError(new Error('Crash during init'));

    expect(document.getElementById('loadingOverlay')).toBeNull();
  });

  it('handles battle error even without loading overlay present', async () => {
    expect(document.getElementById('loadingOverlay')).toBeNull();

    const { handleBattleError } = await import('./Game');
    handleBattleError(new Error('Early failure'));

    const errorOverlay = document.getElementById('battleErrorOverlay');
    expect(errorOverlay).not.toBeNull();
  });
});

describe('withTimeout utility', () => {
  it('resolves when promise completes within timeout', async () => {
    const { withTimeout } = await import('./Game');
    const fast = Promise.resolve('done');
    const result = await withTimeout(fast, 1000, 'test');
    expect(result).toBe('done');
  });

  it('rejects with timeout error when promise exceeds timeout', async () => {
    const { withTimeout } = await import('./Game');
    const slow = new Promise(() => {}); // never resolves
    await expect(withTimeout(slow, 50, 'model loading')).rejects.toThrow('model loading timed out');
  });
});
