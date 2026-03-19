import { test, expect } from '@playwright/test';
import { login, INSTANCE_URL, TOKEN } from './helpers';

test.describe('登录模块', () => {

  test('01 - 页面加载和路由', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('text=ClawSpace')).toBeVisible();
    await expect(page.locator('text=OpenClaw AI Assistant')).toBeVisible();
  });

  test('02 - 登录页结构', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('textbox').first()).toBeVisible();
    await expect(page.getByRole('textbox').nth(1)).toBeVisible();
    await expect(page.locator('text=连接')).toBeVisible();
  });

  test('03 - 登录表单空值验证', async ({ page }) => {
    await page.goto('/');
    await page.locator('text=连接').click();
    await expect(page.locator('text=请输入实例地址')).toBeVisible({ timeout: 3000 });
  });

  test('04 - 登录成功跳转', async ({ page }) => {
    await login(page);
    await expect(page.locator('text=请从「会话」标签选择一个会话')).toBeVisible();
  });

  test('05 - 错误 URL 连接失败', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('textbox').first().fill('ws://192.168.99.99:18789');
    await page.getByRole('textbox').nth(1).fill(TOKEN);
    await page.locator('text=连接').click();
    await expect(page.locator('.error-msg')).toBeVisible({ timeout: 6000 });
    await expect(page.locator('.error-msg')).toContainText('连接');
  });

  test('05b - http:// 格式 URL 被拒绝', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('textbox').first().fill('http://192.168.22.177:18789');
    await page.getByRole('textbox').nth(1).fill(TOKEN);
    await page.locator('text=连接').click();
    await expect(page.locator('text=请输入完整地址（以 ws:// 或 wss:// 开头）')).toBeVisible({ timeout: 3000 });
  });

  test('05c - Token 少于 16 字符被拒绝', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('textbox').first().fill(INSTANCE_URL);
    await page.getByRole('textbox').nth(1).fill('short');
    await page.locator('text=连接').click();
    await expect(page.locator('text=Token 格式无效（至少 16 字符）')).toBeVisible({ timeout: 3000 });
  });

  test('06 - 正确 URL 错误 Token 认证失败', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('textbox').first().fill(INSTANCE_URL);
    await page.getByRole('textbox').nth(1).fill('0000000000000000invalidtoken0000');
    await page.locator('text=连接').click();
    await expect(page.locator('.error-msg')).toBeVisible({ timeout: 15000 });
  });

  test('07 - 未登录访问受保护页面', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.uni-tabbar')).not.toBeVisible();
  });

  test('08 - TabBar 登录后显示', async ({ page }) => {
    await login(page);
    await expect(page.locator('.uni-tabbar').locator('text=聊天')).toBeVisible();
    await expect(page.locator('.uni-tabbar').locator('text=会话')).toBeVisible();
    await expect(page.locator('.uni-tabbar').locator('text=Agent')).toBeVisible();
    await expect(page.locator('.uni-tabbar').locator('text=设置')).toBeVisible();
  });

  test('09 - 响应式布局检查', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    await expect(page.locator('.login-page')).toBeVisible();
    await expect(page.locator('.login-body')).toBeVisible();
    await expect(page.locator('.form')).toBeVisible();
  });

  test('10 - 输入框字符限制', async ({ page }) => {
    await page.goto('/');
    const tokenInput = page.getByRole('textbox').nth(1);
    await tokenInput.fill('a'.repeat(1000));
    const value = await tokenInput.inputValue();
    expect(value.length).toBeLessThanOrEqual(512);
  });

  test('11 - 页面标题检查', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle('登录');
  });

  test('12 - 样式和布局完整性', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.app-name')).toHaveText('ClawSpace');
    await expect(page.locator('.app-desc')).toHaveText('OpenClaw AI Assistant');
    await expect(page.locator('.btn-primary')).toHaveCSS('background', /rgb\(0, 122, 255\)/);
  });

});
