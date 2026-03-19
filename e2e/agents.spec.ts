import { test, expect } from '@playwright/test';
import { login } from './helpers';

test.describe('Agent 模块', () => {

  test('01 - Agent 页加载', async ({ page }) => {
    await login(page);
    await page.locator('.uni-tabbar').locator('text=Agent').click();
    await expect(page.locator('.agents-page')).toBeVisible();
    await expect(page.locator('text=+ 新建')).toBeVisible();
  });

  test('02 - Agent 页列表或空状态', async ({ page }) => {
    await login(page);
    await page.locator('.uni-tabbar').locator('text=Agent').click();
    await page.waitForTimeout(2000);
    const agentCount = await page.locator('.agent-item').count();
    if (agentCount === 0) {
      await expect(page.locator('text=暂无 Agent，点击右上角新建')).toBeVisible();
    } else {
      await expect(page.locator('.agent-item').first()).toBeVisible();
    }
  });

  test('03 - Agent 新建页跳转', async ({ page }) => {
    await login(page);
    await page.locator('.uni-tabbar').locator('text=Agent').click();
    await page.locator('text=+ 新建').click();
    await expect(page.locator('text=保存')).toBeVisible({ timeout: 5000 });
  });

  test('04 - Agent 点击跳转详情页', async ({ page }) => {
    await login(page);
    await page.locator('.uni-tabbar').locator('text=Agent').click();
    await page.waitForTimeout(2000);
    const agentCount = await page.locator('.agent-item').count();
    if (agentCount === 0) { test.skip(); return; }
    await page.locator('.agent-item').first().click();
    await expect(page.locator('.detail-page')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=编辑')).toBeVisible();
    await expect(page.locator('text=删除')).toBeVisible();
  });

  test('05 - Agent 新建表单 ModelPicker 显示', async ({ page }) => {
    await login(page);
    await page.locator('.uni-tabbar').locator('text=Agent').click();
    await page.locator('text=+ 新建').click();
    await expect(page.locator('.model-picker')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('.picker-trigger')).toBeVisible();
  });

  test('06 - Agent 新建表单 ModelPicker 弹出', async ({ page }) => {
    await login(page);
    await page.locator('.uni-tabbar').locator('text=Agent').click();
    await page.locator('text=+ 新建').click();
    await expect(page.locator('.model-picker')).toBeVisible({ timeout: 5000 });
    await page.locator('.picker-trigger').click();
    await expect(page.locator('text=选择模型')).toBeVisible({ timeout: 3000 });
    await expect(page.locator('.model-list')).toBeVisible();
  });

});
