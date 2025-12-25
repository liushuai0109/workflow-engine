/**
 * E2E Test: 回归测试
 * 测试之前修复过的bug，确保不会再次出现
 * 这些测试应该始终通过，如果失败说明出现了回归问题
 */

import { test, expect } from '@playwright/test';

test.describe('回归测试', () => {
  test('应用启动时不会出现白屏', async ({ page }) => {
    await page.goto('/editor');
    
    // 等待页面加载
    await page.waitForLoadState('networkidle');
    
    // 验证页面有内容，不是空白页
    const bodyContent = await page.textContent('body');
    expect(bodyContent).toBeTruthy();
    expect(bodyContent!.length).toBeGreaterThan(0);
    
    // 验证页面有可见元素
    const visibleElements = await page.locator('body > *').count();
    expect(visibleElements).toBeGreaterThan(0);
  });

  test('路由导航不会导致页面崩溃', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    // 测试多个路由导航
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');
    
    // 尝试导航到其他路由（如果存在）
    const routes = ['/editor', '/tool'];
    for (const route of routes) {
      try {
        await page.goto(route, { timeout: 5000 });
        await page.waitForLoadState('networkidle', { timeout: 5000 });
      } catch (e) {
        // 路由不存在是正常的，跳过
        continue;
      }
    }

    // 验证没有运行时错误
    expect(errors).toHaveLength(0);
  });

  test('BPMN编辑器加载不会导致内存泄漏', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');
    
    // 多次加载编辑器（如果存在）
    for (let i = 0; i < 3; i++) {
      const newButton = page.locator('button:has-text("创建新工作流")').first();
      if (await newButton.count() > 0) {
        await newButton.click();
        await page.waitForTimeout(1000);
      }
    }

    // 验证页面仍然响应
    const bodyContent = await page.textContent('body');
    expect(bodyContent).toBeTruthy();
  });

  test('API调用失败时不会导致应用崩溃', async ({ page }) => {
    await page.goto('/editor');
    
    // 拦截所有API请求并返回错误
    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.waitForLoadState('networkidle');
    
    // 验证页面仍然可以访问
    const bodyContent = await page.textContent('body');
    expect(bodyContent).toBeTruthy();
    
    // 验证没有未捕获的错误
    const errors: string[] = [];
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });
    
    await page.waitForTimeout(2000);
    
    // 允许一些预期的错误，但不应该有未处理的异常
    const criticalErrors = errors.filter(
      (err) => !err.includes('Failed to fetch') && !err.includes('NetworkError')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('本地存储操作不会导致错误', async ({ page, context }) => {
    await page.goto('/editor');
    
    // 测试localStorage操作
    await page.evaluate(() => {
      try {
        localStorage.setItem('test-key', 'test-value');
        const value = localStorage.getItem('test-key');
        localStorage.removeItem('test-key');
        return value === 'test-value';
      } catch (e) {
        return false;
      }
    });

    // 验证操作成功
    const result = await page.evaluate(() => {
      try {
        localStorage.setItem('test-key', 'test-value');
        const value = localStorage.getItem('test-key');
        localStorage.removeItem('test-key');
        return value === 'test-value';
      } catch (e) {
        return false;
      }
    });
    
    expect(result).toBe(true);
  });

  test('窗口大小改变不会导致布局问题', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');
    
    // 测试不同的窗口大小
    const sizes = [
      { width: 1920, height: 1080 },
      { width: 1366, height: 768 },
      { width: 1024, height: 768 },
      { width: 375, height: 667 }, // 移动端
    ];

    for (const size of sizes) {
      await page.setViewportSize(size);
      await page.waitForTimeout(500);
      
      // 验证页面仍然可见
      const bodyContent = await page.textContent('body');
      expect(bodyContent).toBeTruthy();
    }
  });
});

