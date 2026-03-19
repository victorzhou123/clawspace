import { expect, type Page } from '@playwright/test';

export const INSTANCE_URL = 'http://192.168.22.177:18789';
export const TOKEN = '88dd04e7d0bcf9395c78300458f57740c72c2b24ec2c9289';

export async function login(page: Page) {
  await page.goto('/');
  await page.getByRole('textbox').first().fill(INSTANCE_URL);
  await page.getByRole('textbox').nth(1).fill(TOKEN);
  await page.locator('text=连接').click();
  await expect(page.locator('.uni-tabbar')).toBeVisible({ timeout: 10000 });
}

export async function loginAndGoSession(page: Page) {
  await login(page);
  await page.locator('.uni-tabbar').locator('text=会话').click();
  await page.waitForTimeout(2000);
}

export async function loginAndOpenFirstSession(page: Page): Promise<boolean> {
  await loginAndGoSession(page);
  const count = await page.locator('.session-item').count();
  if (count === 0) return false;
  await page.locator('.session-item').first().click();
  await expect(page.locator('.input-bar')).toBeVisible({ timeout: 5000 });
  return true;
}
