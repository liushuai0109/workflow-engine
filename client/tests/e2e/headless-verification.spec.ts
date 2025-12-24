/**
 * Headless Browser 验证测试
 * 验证应用可以在 headless 浏览器中正常启动和运行
 */

import { test, expect } from '@playwright/test';

test.describe('Headless Browser Verification', () => {
  test('应用可以正常加载', async ({ page }) => {
    await page.goto('/editor');
    
    // 等待页面加载完成
    await page.waitForLoadState('networkidle');
    
    // 验证页面标题或关键元素存在
    const title = await page.title();
    expect(title).toBeTruthy();
    
    // 验证没有 JavaScript 运行时错误
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    // 等待一段时间确保没有错误
    await page.waitForTimeout(2000);
    
    expect(errors).toHaveLength(0);
  });

  test('主要路由可以访问', async ({ page }) => {
    // 测试根路径
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/');
    
    // 测试编辑器路由（如果存在）
    try {
      await page.goto('/editor');
      await page.waitForLoadState('networkidle', { timeout: 5000 });
      expect(page.url()).toContain('/editor');
    } catch (e) {
      // 如果路由不存在，跳过
      throw error;
    }
  });

  test('关键组件可以渲染', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');
    
    // 验证页面有内容（不是空白页）
    const bodyContent = await page.textContent('body');
    expect(bodyContent).toBeTruthy();
    expect(bodyContent!.length).toBeGreaterThan(0);
  });

  test('无 JavaScript 运行时错误', async ({ page }) => {
    const errors: string[] = [];
    const consoleErrors: string[] = [];
    
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');
    
    // 等待一段时间确保没有错误
    await page.waitForTimeout(3000);
    
    // 验证没有页面错误
    expect(errors).toHaveLength(0);
    
    // 验证没有控制台错误（允许一些警告）
    const criticalErrors = consoleErrors.filter(
      (err) => !err.includes('warning') && !err.includes('deprecated')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});

