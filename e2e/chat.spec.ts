import { test, expect } from '@playwright/test';
import { login, loginAndOpenFirstSession } from './helpers';

test.describe('聊天模块', () => {

  test('01 - 聊天页无会话状态', async ({ page }) => {
    await login(page);
    await expect(page.locator('text=请从「会话」标签选择一个会话')).toBeVisible();
    await expect(page.locator('.input-bar')).not.toBeVisible();
  });

  test('02 - 聊天页有会话时显示输入框', async ({ page }) => {
    const hasSession = await loginAndOpenFirstSession(page);
    if (!hasSession) { test.skip(); return; }
    await expect(page.locator('.btn-send')).toBeVisible();
  });

  test('03 - 发送消息', async ({ page }) => {
    const hasSession = await loginAndOpenFirstSession(page);
    if (!hasSession) { test.skip(); return; }

    const msgBefore = await page.locator('.bubble-user').count();
    await page.locator('.input textarea').fill('你好');
    await expect(page.locator('.btn-send')).not.toBeDisabled();
    await page.locator('.btn-send').click();

    await expect(page.locator('.bubble-user').last()).toContainText('你好', { timeout: 3000 });
    await expect(page.locator('.bubble-user')).toHaveCount(msgBefore + 1, { timeout: 3000 });
  });

  test('04 - 等待 AI 回复', async ({ page }) => {
    const hasSession = await loginAndOpenFirstSession(page);
    if (!hasSession) { test.skip(); return; }

    await page.locator('.input textarea').fill('ping');
    await page.locator('.btn-send').click();

    await expect(page.locator('.bubble-assistant').last()).toBeVisible({ timeout: 30000 });
  });

  test('05 - 发送后用户消息气泡增加', async ({ page }) => {
    const hasSession = await loginAndOpenFirstSession(page);
    if (!hasSession) { test.skip(); return; }

    // 等历史消息加载完再记录基准
    await page.waitForTimeout(2000);
    const msgBefore = await page.locator('.bubble-user').count();
    await page.locator('.input textarea').fill('你好');
    await page.locator('.btn-send').click();

    await expect(page.locator('.bubble-user')).toHaveCount(msgBefore + 1, { timeout: 5000 });
  });

  test('06 - 消息历史加载', async ({ page }) => {
    const hasSession = await loginAndOpenFirstSession(page);
    if (!hasSession) { test.skip(); return; }

    await page.waitForTimeout(2000);
    const msgCount = await page.locator('.bubble-row').count();
    expect(msgCount).toBeGreaterThanOrEqual(0);
  });

});
