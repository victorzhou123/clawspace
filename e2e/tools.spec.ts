import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('工具目录模块', () => {

  test('01 - 工具页加载', async ({ page }) => {
    await login(page);
    await page.locator('.uni-tabbar').locator('text=设置').click();
    await page.locator('text=工具目录').click();
    await expect(page.locator('.tools-page')).toBeVisible({ timeout: 5000 });
  });

  test('02 - 工具页列表或空状态', async ({ page }) => {
    await login(page);
    await page.locator('.uni-tabbar').locator('text=设置').click();
    await page.locator('text=工具目录').click();
    await page.waitForTimeout(2000);
    const groupCount = await page.locator('.group').count();
    if (groupCount === 0) {
      await expect(page.locator('text=暂无工具')).toBeVisible();
    } else {
      await expect(page.locator('.group').first()).toBeVisible();
      await expect(page.locator('.tool-item').first()).toBeVisible();
    }
  });

});
