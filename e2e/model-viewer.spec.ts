import { test, expect, Page } from '@playwright/test';

async function openModelViewer(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: '车 库' }).click();
  await page.getByRole('button', { name: '选择出战坦克' }).click();
  await expect(page.locator('#modelViewerOverlay')).toBeVisible();
}

async function waitForModelLoad(page: Page, timeout = 15000) {
  // Wait until loading indicator disappears (model finished loading)
  await expect(page.locator('#mvLoading')).toBeHidden({ timeout });
}

test.describe('Model Viewer - Tank Preview', () => {
  test('should open model viewer from garage', async ({ page }) => {
    await openModelViewer(page);
    await expect(page.locator('#modelViewerCanvas')).toBeVisible();
    await expect(page.locator('.mv-name')).toHaveText('Panzer III');
  });

  test('should display Panzer III model on canvas', async ({ page }) => {
    await openModelViewer(page);
    await waitForModelLoad(page);

    // Verify canvas is rendering (not blank) by checking pixel data
    const canvasPixels = await page.evaluate(() => {
      const canvas = document.getElementById('modelViewerCanvas') as HTMLCanvasElement;
      if (!canvas) return null;
      const ctx = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!ctx) return null;
      const w = canvas.width, h = canvas.height;
      const pixels = new Uint8Array(4 * w * h);
      (ctx as WebGL2RenderingContext).readPixels(0, 0, w, h, ctx.RGBA, ctx.UNSIGNED_BYTE, pixels);
      // Check if there are non-background pixels (not all the same)
      let nonBgCount = 0;
      const bg = [pixels[0], pixels[1], pixels[2]];
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] !== bg[0] || pixels[i + 1] !== bg[1] || pixels[i + 2] !== bg[2]) {
          nonBgCount++;
        }
      }
      return { totalPixels: w * h, nonBgCount };
    });

    expect(canvasPixels).not.toBeNull();
    expect(canvasPixels!.nonBgCount).toBeGreaterThan(100);
  });

  test('should navigate to T-90A and display model', async ({ page }) => {
    await openModelViewer(page);
    await waitForModelLoad(page);

    // Navigate to T-90A
    await page.getByRole('button', { name: '下一个 ▶' }).click();
    await expect(page.locator('.mv-name')).toHaveText('T-90A');

    await waitForModelLoad(page);
    // Wait extra frames for WebGL to finish rendering the model
    await page.waitForTimeout(2000);

    // Verify T-90A canvas is rendering (not blank) with retry
    const canvasPixels = await page.evaluate(() => {
      const canvas = document.getElementById('modelViewerCanvas') as HTMLCanvasElement;
      if (!canvas) return null;
      const ctx = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!ctx) return null;
      const w = canvas.width, h = canvas.height;
      const pixels = new Uint8Array(4 * w * h);
      (ctx as WebGL2RenderingContext).readPixels(0, 0, w, h, ctx.RGBA, ctx.UNSIGNED_BYTE, pixels);
      let nonBgCount = 0;
      const bg = [pixels[0], pixels[1], pixels[2]];
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] !== bg[0] || pixels[i + 1] !== bg[1] || pixels[i + 2] !== bg[2]) {
          nonBgCount++;
        }
      }
      return { totalPixels: w * h, nonBgCount };
    });

    expect(canvasPixels).not.toBeNull();
    // T-90A should render significantly more colored pixels than background
    expect(canvasPixels!.nonBgCount).toBeGreaterThan(100);
  });

  test('should navigate between models with prev/next buttons', async ({ page }) => {
    await openModelViewer(page);
    await waitForModelLoad(page);

    await expect(page.locator('.mv-name')).toHaveText('Panzer III');

    await page.getByRole('button', { name: '下一个 ▶' }).click();
    await expect(page.locator('.mv-name')).toHaveText('T-90A');

    await page.getByRole('button', { name: '◀ 上一个' }).click();
    await expect(page.locator('.mv-name')).toHaveText('Panzer III');

    // Wrap around (prev from first goes to last)
    await page.getByRole('button', { name: '◀ 上一个' }).click();
    await expect(page.locator('.mv-name')).toHaveText('T-90A');
  });

  test('should select T-90A for battle', async ({ page }) => {
    await openModelViewer(page);
    await waitForModelLoad(page);

    // Initially Panzer III is selected
    await expect(page.locator('#mvSelectBtn')).toHaveText('✓ 当前出战');
    await expect(page.locator('#mvStatus')).toHaveText('此坦克已选为出战坦克');

    // Navigate to T-90A
    await page.getByRole('button', { name: '下一个 ▶' }).click();
    await expect(page.locator('#mvSelectBtn')).toHaveText('选择出战');
    await expect(page.locator('#mvStatus')).toContainText('当前出战: Panzer III');

    // Select T-90A
    await page.getByRole('button', { name: '选择出战' }).click();
    await expect(page.locator('#mvSelectBtn')).toHaveText('✓ 当前出战');
    await expect(page.locator('#mvStatus')).toHaveText('此坦克已选为出战坦克');
  });

  test('should persist selection across model viewer sessions', async ({ page }) => {
    await openModelViewer(page);
    await waitForModelLoad(page);

    // Navigate to T-90A and select it
    await page.getByRole('button', { name: '下一个 ▶' }).click();
    await page.getByRole('button', { name: '选择出战' }).click();
    await expect(page.locator('#mvSelectBtn')).toHaveText('✓ 当前出战');

    // Close model viewer
    await page.getByRole('button', { name: '返回车库' }).click();

    // Verify garage shows T-90A as selected
    await expect(page.locator('.g-model-name')).toHaveText('T-90A');

    // Reopen model viewer
    await page.getByRole('button', { name: '选择出战坦克' }).click();
    await waitForModelLoad(page);

    // Navigate to T-90A
    await page.getByRole('button', { name: '下一个 ▶' }).click();
    await expect(page.locator('#mvSelectBtn')).toHaveText('✓ 当前出战');
  });

  test('should close model viewer and return to garage', async ({ page }) => {
    await openModelViewer(page);
    await expect(page.locator('#modelViewerOverlay')).toBeVisible();

    await page.getByRole('button', { name: '返回车库' }).click();
    await expect(page.locator('#modelViewerOverlay')).not.toBeAttached();
  });

  test('should show loading indicator while model loads', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: '车 库' }).click();

    // Slow down network for model files to catch loading indicator
    await page.route('**/*.obj', async (route) => {
      await new Promise(r => setTimeout(r, 1000));
      await route.continue();
    });

    await page.getByRole('button', { name: '选择出战坦克' }).click();
    // Loading indicator should appear briefly
    await expect(page.locator('#mvLoading')).toBeVisible({ timeout: 3000 });
    // Then it should disappear
    await expect(page.locator('#mvLoading')).toBeHidden({ timeout: 20000 });
  });

  test('should not have console errors when loading T-90A', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await openModelViewer(page);
    await waitForModelLoad(page);

    // Navigate to T-90A
    await page.getByRole('button', { name: '下一个 ▶' }).click();
    await waitForModelLoad(page);

    // Filter out non-critical errors (like favicon 404)
    const criticalErrors = errors.filter(e =>
      e.includes('ModelViewer') || e.includes('RuntimeError') || e.includes('OBJ')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
