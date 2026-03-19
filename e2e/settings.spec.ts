import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('设置模块', () => {

  test('01 - 设置页加载', async ({ page }) => {
    await login(page);
    await page.locator('.uni-tabbar').locator('text=设置').click();
    await expect(page.locator('.settings-page')).toBeVisible();
    await expect(page.locator('text=已登录')).toBeVisible();
    await expect(page.locator('text=退出登录')).toBeVisible();
  });

  test('02 - 设置页清除缓存', async ({ page }) => {
    await login(page);
    await page.locator('.uni-tabbar').locator('text=设置').click();
    await page.locator('text=清除缓存').click();
    await expect(page.locator('text=将清除本地缓存数据')).toBeVisible({ timeout: 3000 });
    await page.locator('.uni-modal__btn_primary').click();
    await expect(page.locator('text=已清除')).toBeVisible({ timeout: 3000 });
  });

  test('03 - 设置页版本号显示', async ({ page }) => {
    await login(page);
    await page.locator('.uni-tabbar').locator('text=设置').click();
    await expect(page.locator('text=版本号')).toBeVisible();
    await expect(page.locator('text=1.0.0')).toBeVisible();
  });

  test('04 - 工具目录入口', async ({ page }) => {
    await login(page);
    await page.locator('.uni-tabbar').locator('text=设置').click();
    await expect(page.locator('text=工具目录')).toBeVisible();
  });

  test('05 - 工具目录跳转', async ({ page }) => {
    await login(page);
    await page.locator('.uni-tabbar').locator('text=设置').click();
    await page.locator('text=工具目录').click();
    await expect(page.locator('.tools-page')).toBeVisible({ timeout: 5000 });
  });

  test('06 - 系统状态入口', async ({ page }) => {
    await login(page);
    await page.locator('.uni-tabbar').locator('text=设置').click();
    await expect(page.locator('text=系统状态')).toBeVisible();
  });

  test('07 - 系统状态跳转', async ({ page }) => {
    await login(page);
    await page.locator('.uni-tabbar').locator('text=设置').click();
    await page.locator('text=系统状态').click();
    await expect(page.locator('.monitor-page')).toBeVisible({ timeout: 5000 });
  });

});

