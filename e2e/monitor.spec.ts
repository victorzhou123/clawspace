import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('系统状态模块', () => {

  test('01 - 系统状态入口', async ({ page }) => {
    await login(page);
    await page.locator('.uni-tabbar').locator('text=设置').click();
    await expect(page.locator('text=系统状态')).toBeVisible();
  });

  test('02 - 系统状态页加载', async ({ page }) => {
    await login(page);
    await page.locator('.uni-tabbar').locator('text=设置').click();
    await page.locator('text=系统状态').click();
    await expect(page.locator('.monitor-page')).toBeVisible({ timeout: 5000 });
  });

  test('03 - 系统健康状态显示', async ({ page }) => {
    await login(page);
    await page.locator('.uni-tabbar').locator('text=设置').click();
    await page.locator('text=系统状态').click();
    await expect(page.locator('text=系统健康')).toBeVisible({ timeout: 5000 });
    await page.waitForTimeout(2000);
    const statusText = await page.locator('.status-text').textContent();
    expect(['运行正常', '异常']).toContain(statusText?.trim());
  });

  test('04 - 会话状态显示', async ({ page }) => {
    await login(page);
    await page.locator('.uni-tabbar').locator('text=设置').click();
    await page.locator('text=系统状态').click();
    await page.waitForTimeout(2000);
    await expect(page.locator('text=会话状态')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=会话总数')).toBeVisible();
  });

});
