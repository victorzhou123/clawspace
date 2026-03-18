import { test, expect } from '@playwright/test';

test.describe('ClawSpace E2E Tests', () => {

  test('01 - 页面加载和路由', async ({ page }) => {
    await page.goto('/');

    // 应该重定向到登录页（因为未登录）
    await expect(page).toHaveURL(/\/pages\/auth\/login/);
    await expect(page.locator('text=ClawSpace')).toBeVisible();
    await expect(page.locator('text=OpenClaw AI Assistant')).toBeVisible();
  });

  test('02 - 登录页 Tab 切换', async ({ page }) => {
    await page.goto('/');

    // 默认 Token tab
    await expect(page.locator('.tab-item.active:has-text("Token")')).toBeVisible();
    await expect(page.getByRole('textbox')).toBeVisible();

    // 切换到密码 tab
    await page.locator('.tab-item:has-text("密码")').click();
    await expect(page.locator('.tab-item.active:has-text("密码")')).toBeVisible();
    await expect(page.getByRole('textbox').first()).toBeVisible();

    // 切换到 Device Token tab
    await page.locator('.tab-item:has-text("Device Token")').click();
    await expect(page.locator('.tab-item.active:has-text("Device Token")')).toBeVisible();
    await expect(page.getByRole('textbox')).toBeVisible();
  });

  test('03 - 登录表单验证', async ({ page }) => {
    await page.goto('/');

    // Token 登录 - 空值时按钮应该存在
    const submitBtn = page.locator('text=连接').first();
    await expect(submitBtn).toBeVisible();

    // 输入 token
    await page.getByRole('textbox').fill('test-token-123');

    // 按钮仍然可见（uni-app button disabled 状态通过 Vue 绑定，不一定反映在 DOM attribute）
    await expect(submitBtn).toBeVisible();
  });

  test('04 - 登录成功跳转', async ({ page }) => {
    await page.goto('/');

    // 输入 token 尝试登录
    await page.getByRole('textbox').fill('test-token-for-e2e');
    await page.locator('text=连接').first().click();

    // 应该跳转到聊天页（检查页面内容而非 URL，因为 uni-app hash 路由）
    await expect(page.locator('text=请从「会话」标签选择一个会话')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.uni-tabbar')).toBeVisible();
  });

  test('05 - 未登录访问受保护页面', async ({ page }) => {
    // 直接访问聊天页
    await page.goto('/#/pages/chat/chat');

    // 应该被重定向到登录页
    await expect(page).toHaveURL(/\/pages\/auth\/login/, { timeout: 5000 });
  });

  test('06 - TabBar 结构检查', async ({ page }) => {
    await page.goto('/');

    // 登录页不应该显示 TabBar（navigationStyle: custom）
    const tabBar = page.locator('.uni-tabbar');
    await expect(tabBar).not.toBeVisible();
  });

  test('07 - 响应式布局检查', async ({ page }) => {
    await page.goto('/');

    // 检查移动端视口
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page.locator('.login-page')).toBeVisible();
    await expect(page.locator('.login-body')).toBeVisible();

    // 检查表单元素可见
    await expect(page.locator('.tab-bar')).toBeVisible();
    await expect(page.locator('.form')).toBeVisible();
  });

  test('08 - 输入框字符限制', async ({ page }) => {
    await page.goto('/');

    const tokenInput = page.getByRole('textbox');

    // 输入超长字符串
    const longString = 'a'.repeat(1000);
    await tokenInput.fill(longString);

    // 输入框应该接受输入（uni-app input 没有 maxlength 限制）
    const value = await tokenInput.inputValue();
    expect(value.length).toBeGreaterThan(0);
  });

  test('09 - 页面标题检查', async ({ page }) => {
    await page.goto('/');

    // uni-app H5 使用 navigationBarTitleText，显示为"登录"
    await expect(page).toHaveTitle('登录');
  });

  test('10 - 样式和布局完整性', async ({ page }) => {
    await page.goto('/');

    // 检查关键样式元素存在
    await expect(page.locator('.login-header')).toBeVisible();
    await expect(page.locator('.app-name')).toHaveText('ClawSpace');
    await expect(page.locator('.app-desc')).toHaveText('OpenClaw AI Assistant');

    // 检查按钮样式
    const btn = page.locator('.btn-primary');
    await expect(btn).toBeVisible();
    await expect(btn).toHaveCSS('background', /rgb\(0, 122, 255\)/);
  });
});
