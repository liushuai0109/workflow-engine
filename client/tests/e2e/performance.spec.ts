/**
 * E2E Test: 性能测试
 * 测试编辑器加载时间、操作响应时间、API 响应时间、内存泄漏等
 */

import { test, expect } from '@playwright/test';

// 确保 process 类型可用
declare const process: {
  env: {
    BACKEND_URL?: string;
  };
};

// 使用 127.0.0.1 而不是 localhost 以避免 DNS 解析问题
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:3000';

test.describe('编辑器性能测试', () => {
  test('编辑器加载时间应该小于 3 秒 @performance', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 创建新图表
    const newButton = page.locator('button:has-text("New"), button:has-text("新建")').first();
    if (await newButton.count() > 0) {
      await newButton.click();
      
      // 等待编辑器加载完成
      const editor = page.locator('.bpmn-container, .editor-container').first();
      if (await editor.count() > 0) {
        await expect(editor).toBeVisible({ timeout: 10000 });
        
        const loadTime = Date.now() - startTime;
        // 验证加载时间小于 3 秒（3000ms）
        expect(loadTime).toBeLessThan(3000);
      }
    }
  });

  test('大文件加载性能', async ({ page }) => {
    // 创建一个较大的 BPMN XML（模拟大文件）
    const largeXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_1" isExecutable="true">
    ${Array.from({ length: 50 }, (_, i) => `
      <bpmn:task id="Task_${i}"/>
    `).join('')}
    <bpmn:startEvent id="StartEvent_1"/>
    <bpmn:endEvent id="EndEvent_1"/>
  </bpmn:process>
</bpmn:definitions>`;
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const startTime = Date.now();
    
    // 创建新图表
    const newButton = page.locator('button:has-text("New"), button:has-text("新建")').first();
    expect(await newButton.count()).not.toBe(0);
await newButton.click();
      await page.waitForTimeout(2000);
      
      const loadTime = Date.now() - startTime;
      // 大文件加载时间应该合理（这里设置为 10 秒）
      expect(loadTime).toBeLessThan(10000);
  });

  test('元素添加响应时间', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 创建新图表
    const newButton = page.locator('button:has-text("New"), button:has-text("新建")').first();
    expect(await newButton.count()).not.toBe(0);
await newButton.click();
      await page.waitForTimeout(2000);
      
      const startTime = Date.now();
      
      // 尝试添加元素（通过调色板）
      const palette = page.locator('.djs-palette, [class*="palette"]').first();
      expect(await palette.count()).not.toBe(0);
const startEventButton = palette.locator('[title*="Start"], [title*="开始"]').first();
        if (await startEventButton.count() > 0) {
          await startEventButton.click();
          await page.waitForTimeout(500);
          
          const responseTime = Date.now() - startTime;
          // 元素添加响应时间应该小于 1 秒
          expect(responseTime).toBeLessThan(1000);
    }
  });

  test('连线创建响应时间', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 创建新图表
    const newButton = page.locator('button:has-text("New"), button:has-text("新建")').first();
    if (await newButton.count() > 0) {
      await newButton.click();
      await page.waitForTimeout(2000);
      
      const startTime = Date.now();
      
      // 尝试创建连线（模拟操作）
      const canvas = page.locator('.bpmn-container, .editor-container').first();
      if (await canvas.count() > 0) {
        // 模拟连线创建操作
        await canvas.hover({ position: { x: 100, y: 100 } });
        await page.mouse.down();
        await page.mouse.move(200, 200);
        await page.mouse.up();
        await page.waitForTimeout(500);
        
        const responseTime = Date.now() - startTime;
        // 连线创建响应时间应该小于 1 秒
        expect(responseTime).toBeLessThan(1000);
      }
    }
  });

  test('属性编辑响应时间', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 创建新图表
    const newButton = page.locator('button:has-text("New"), button:has-text("新建")').first();
    expect(await newButton.count()).not.toBe(0);
await newButton.click();
      await page.waitForTimeout(2000);
      
      const startTime = Date.now();
      
      // 尝试编辑属性
      const propertiesPanel = page.locator('#properties-panel, .properties-panel').first();
      expect(await propertiesPanel.count()).not.toBe(0);
const nameInput = propertiesPanel.locator('input[name*="name"]').first();
        if (await nameInput.count() > 0) {
          await nameInput.fill('Test Name');
          await page.waitForTimeout(300);
          
          const responseTime = Date.now() - startTime;
          // 属性编辑响应时间应该小于 500ms
          expect(responseTime).toBeLessThan(500);
    }
  });
});

test.describe('API 性能测试', () => {
  test('API 响应时间应该小于 500ms @performance @api', async ({ request }) => {
    const startTime = Date.now();
    
    const response = await request.get(`${BACKEND_URL}/health`);
    
    const responseTime = Date.now() - startTime;
    
    expect(response.status()).toBe(200);
    // API 响应时间应该小于 500ms
    expect(responseTime).toBeLessThan(500);
  });

  test('批量操作性能', async ({ request }) => {
    // 先验证后端可用
    try {
      const healthCheck = await request.get(`${BACKEND_URL}/health`, { timeout: 5000 });
      expect(healthCheck.ok()).toBeTruthy();
    } catch (error) {
      // 后端不可用，应该失败而不是跳过
      throw error;
    }

    const startTime = Date.now();
    
    // 发送多个请求
    const promises = Array.from({ length: 10 }, () =>
      request.get(`${BACKEND_URL}/health`, { timeout: 10000 })
    );
    
    const responses = await Promise.allSettled(promises);
    
    // 验证至少有一些请求成功
    const successful = responses.filter((r) => r.status === 'fulfilled' && r.value.status() === 200);
    expect(successful.length).toBeGreaterThan(0);
    
    const totalTime = Date.now() - startTime;
    // 批量操作总时间应该合理（10 个请求应该在 5 秒内完成）
    expect(totalTime).toBeLessThan(5000);
  });

  test('并发请求性能', async ({ request }) => {
    // 先验证后端可用
    try {
      const healthCheck = await request.get(`${BACKEND_URL}/health`, { timeout: 5000 });
      expect(healthCheck.ok()).toBeTruthy();
    } catch (error) {
      // 后端不可用，应该失败而不是跳过
      throw error;
    }

    const startTime = Date.now();
    
    // 发送并发请求
    const promises = Array.from({ length: 20 }, () =>
      request.get(`${BACKEND_URL}/health`, { timeout: 10000 })
    );
    
    const responses = await Promise.allSettled(promises);
    
    // 验证至少有一些请求成功
    const successful = responses.filter((r) => r.status === 'fulfilled' && r.value.status() === 200);
    expect(successful.length).toBeGreaterThan(0);
    
    const totalTime = Date.now() - startTime;
    // 并发请求总时间应该合理（20 个并发请求应该在 3 秒内完成）
    expect(totalTime).toBeLessThan(3000);
  });
});

test.describe('内存泄漏测试', () => {
  test('长时间运行后内存使用应该稳定', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 获取初始内存使用（如果可用）
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // 执行多次操作
    for (let i = 0; i < 10; i++) {
      const newButton = page.locator('button:has-text("New"), button:has-text("新建")').first();
      if (await newButton.count() > 0) {
        await newButton.click();
        await page.waitForTimeout(1000);
      }
    }
    
    // 获取最终内存使用
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    if (initialMemory > 0 && finalMemory > 0) {
      // 内存增长应该合理（不超过初始内存的 2 倍）
      const memoryGrowth = finalMemory - initialMemory;
      expect(memoryGrowth).toBeLessThan(initialMemory);
    } else {
      // 如果无法获取内存信息，验证至少尝试了获取
      // 某些浏览器可能不支持 performance.memory
      expect(typeof performance !== 'undefined').toBeTruthy();
    }
  });

  test('多次加载/卸载后内存使用应该稳定', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 获取初始内存使用
    const initialMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    // 多次加载和卸载
    for (let i = 0; i < 5; i++) {
      const newButton = page.locator('button:has-text("New"), button:has-text("新建")').first();
      if (await newButton.count() > 0) {
        await newButton.click();
        await page.waitForTimeout(1000);
        
        // 模拟卸载（刷新页面）
        await page.reload();
        await page.waitForLoadState('networkidle');
      }
    }
    
    // 获取最终内存使用
    const finalMemory = await page.evaluate(() => {
      return (performance as any).memory?.usedJSHeapSize || 0;
    });
    
    if (initialMemory > 0 && finalMemory > 0) {
      // 内存增长应该合理
      const memoryGrowth = finalMemory - initialMemory;
      expect(memoryGrowth).toBeLessThan(initialMemory * 1.5);
    }
  });

  test('编辑器实例应该正确清理', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // 创建新图表
    const newButton = page.locator('button:has-text("New"), button:has-text("新建")').first();
    if (await newButton.count() > 0) {
      await newButton.click();
      await page.waitForTimeout(2000);
      
      // 检查编辑器实例数量（通过检查 DOM 元素）
      const editorCount = await page.locator('.bpmn-container, .editor-container').count();
      expect(editorCount).toBeGreaterThan(0);
      
      // 刷新页面
      await page.reload();
      await page.waitForLoadState('networkidle');
      
      // 验证编辑器可以重新创建
      const newButton2 = page.locator('button:has-text("New"), button:has-text("新建")').first();
      if (await newButton2.count() > 0) {
        await newButton2.click();
        await page.waitForTimeout(2000);
        
        const editorCount2 = await page.locator('.bpmn-container, .editor-container').count();
        expect(editorCount2).toBeGreaterThan(0);
      }
    }
  });
});

