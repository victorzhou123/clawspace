import { test, expect } from '@playwright/test';
import { login, loginAndGoSession, loginAndOpenFirstSession } from './helpers';

test.describe('会话模块', () => {

  test('01 - 会话页加载', async ({ page }) => {
    await loginAndGoSession(page);
    const hasSessions = await page.locator('.session-item').count();
    if (hasSessions === 0) {
      await expect(page.locator('text=暂无会话，去聊天开始吧')).toBeVisible();
    } else {
      await expect(page.locator('.session-item').first()).toBeVisible();
    }
  });

  test('02 - 会话页结构完整', async ({ page }) => {
    await login(page);
    await page.locator('.uni-tabbar').locator('text=会话').click();
    await expect(page.locator('.sessions-page')).toBeVisible();
    await expect(page.locator('.list')).toBeVisible();
  });

  test('03 - 点击会话跳转聊天页', async ({ page }) => {
    const hasSession = await loginAndOpenFirstSession(page);
    if (!hasSession) { test.skip(); return; }
    await expect(page.locator('.input-bar')).toBeVisible();
  });

});
