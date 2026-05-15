import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * These tests verify the error-handling contract for battle initialization.
 * Bug: startBattle errors were silently swallowed by `void this.startBattle(...)`,
 * causing a black screen with no error feedback to the user.
 *
 * Expected behavior after fix:
 * 1. Errors in startBattle are logged to console.error
 * 2. An error overlay is shown to the user with a retry option
 * 3. The game returns to a usable state (not stuck on black screen)
 */
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
    // Import the actual Game module to test its error handling
    // Since Game depends on Babylon.js Engine (WebGL), we test the error handling
    // pattern that should wrap startBattle calls
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
});
