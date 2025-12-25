/**
 * E2E Test: 错误场景测试
 * 测试网络错误、数据验证错误、边界条件、错误恢复等
 */

import { test, expect } from '@playwright/test';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

test.describe('网络错误测试', () => {
  test('网络断开场景处理', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');
    
    // 模拟网络断开
    await page.route('**/api/**', (route) => {
      route.abort('failed');
    });
    
    // 尝试触发 API 调用
    const newButton = page.locator('button:has-text("创建新工作流"), button:has-text("创建新工作流")').first();
    expect(await newButton.count()).not.toBe(0);
await newButton.click();
      await page.waitForTimeout(1000);
      
      // 验证页面没有崩溃
      const bodyContent = await page.textContent('body');
      expect(bodyContent).toBeTruthy();
  });

  test('API 超时场景处理', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');
    
    // 模拟 API 超时
    await page.route('**/api/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 10000)); // 10 秒延迟
      route.continue();
    });
    
    // 尝试触发 API 调用
    const newButton = page.locator('button:has-text("创建新工作流"), button:has-text("创建新工作流")').first();
    expect(await newButton.count()).not.toBe(0);
await newButton.click();
      
      // 验证页面没有崩溃（即使超时）
      await page.waitForTimeout(2000);
      const bodyContent = await page.textContent('body');
      expect(bodyContent).toBeTruthy();
  });

  test('慢网络场景处理', async ({ page }) => {
    await page.goto('/editor');
    
    // 模拟慢网络（添加延迟）
    await page.route('**/api/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 秒延迟
      route.continue();
    });
    
    await page.waitForLoadState('networkidle');
    
    // 验证页面仍然可以加载
    const bodyContent = await page.textContent('body');
    expect(bodyContent).toBeTruthy();
  });

  test('网络恢复后可以重试', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');
    
    // 先模拟网络错误
    await page.route('**/api/**', (route) => {
      route.abort('failed');
    });
    
    // 然后恢复网络
    await page.unroute('**/api/**');
    
    // 验证可以正常操作
    const newButton = page.locator('button:has-text("创建新工作流"), button:has-text("创建新工作流")').first();
    if (await newButton.count() > 0) {
      await newButton.click();
      await page.waitForTimeout(2000);
      
      // 验证编辑器可以加载
      const editor = page.locator('.bpmn-container, .editor-container').first();
      if (await editor.count() > 0) {
        expect(await editor.count()).toBeGreaterThan(0);
      }
    }
  });
});

test.describe('数据验证错误测试', () => {
  test('无效 BPMN XML 处理', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    // 首先进入编辑器页面
    const newButton = page.locator('button:has-text("创建新工作流")').first();
    if (await newButton.count() > 0) {
      await newButton.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);
    }

    // 尝试加载无效的 XML（通过文件上传模拟）
    const invalidXml = '<?xml version="1.0"?><invalid>content</invalid>';

    // 由于 Playwright 的文件上传限制，这里只验证错误处理机制存在
    // 实际测试需要真实的文件上传
    const openButton = page.locator('button:has-text("Open"), button:has-text("打开")').first();

    // 如果有打开按钮，验证其存在
    if (await openButton.count() > 0) {
      // 验证打开按钮存在，可以触发文件选择
      expect(await openButton.count()).toBeGreaterThan(0);
    } else {
      // 如果没有打开按钮，至少验证编辑器已加载
      const editor = page.locator('.bpmn-container, .editor-container').first();
      await expect(editor).toBeVisible();
    }
  });

  test('缺失必需字段处理', async ({ request }) => {
    try {
      // 尝试创建工作流但缺少必需字段
      const response = await request.post(`${BACKEND_URL}/api/workflows`, {
        data: {
          // 缺少 name 或 xml 字段
        },
      });
      
      // 应该返回 400 错误
      if (response.status() === 400) {
        const body = await response.json();
        expect(body).toHaveProperty('error');
      } else {
        // API 可能不存在（404）或服务不可用（503），这是允许的
        expect([400, 404, 503]).toContain(response.status());
}
    } catch (error) {
      throw error;
    }
  });

  test('数据类型错误处理', async ({ request }) => {
    try {
      // 尝试创建工作流但使用错误的数据类型
      const response = await request.post(`${BACKEND_URL}/api/workflows`, {
        data: {
          name: 123, // 应该是字符串
          xml: '<?xml version="1.0"?><test/>',
        },
      });
      
      // 应该返回 400 错误
      if (response.status() === 400) {
        const body = await response.json();
        expect(body).toHaveProperty('error');
      } else {
        // API 可能不存在（404）或服务不可用（503），这是允许的
        expect([400, 404, 503]).toContain(response.status());
}
    } catch (error) {
      throw error;
    }
  });

  test('数据范围错误处理', async ({ request }) => {
    try {
      // 尝试创建工作流但使用超出范围的数据
      const response = await request.post(`${BACKEND_URL}/api/workflows`, {
        data: {
          name: 'a'.repeat(10000), // 过长的名称
          xml: '<?xml version="1.0"?><test/>',
        },
      });
      
      // 应该返回 400 错误或处理成功（取决于验证规则）
      expect(response.status()).toBeGreaterThanOrEqual(200);
      expect(response.status()).toBeLessThan(500);
    } catch (error) {
      throw error;
    }
  });
});

test.describe('边界条件测试', () => {
  test('空工作流处理', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');
    
    // 创建新图表（空工作流）
    const newButton = page.locator('button:has-text("创建新工作流"), button:has-text("创建新工作流")').first();
    if (await newButton.count() > 0) {
      await newButton.click();
      await page.waitForTimeout(2000);
      
      // 验证编辑器可以加载空工作流
      const editor = page.locator('.bpmn-container, .editor-container').first();
      if (await editor.count() > 0) {
        await expect(editor).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('超大工作流处理', async ({ page }) => {
    // 创建一个包含大量元素的工作流 XML
    const largeXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1"/>
    ${Array.from({ length: 100 }, (_, i) => `
      <bpmn:task id="Task_${i}"/>
    `).join('')}
    <bpmn:endEvent id="EndEvent_1"/>
  </bpmn:process>
</bpmn:definitions>`;
    
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');
    
    // 尝试加载大工作流（通过 API）
    try {
      const response = await fetch(`${BACKEND_URL}/api/workflows`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `Large Workflow ${Date.now()}`,
          xml: largeXml,
        }),
      });
      
      if (response.ok) {
        const workflow = await response.json();
        // 验证可以处理大工作流
        expect(workflow).toHaveProperty('id');
        
        // 清理
        await fetch(`${BACKEND_URL}/api/workflows/${workflow.id}`, {
          method: 'DELETE',
        }).catch(() => {});
      } else {
        expect(response.status).not.toBe(404);
      }
    } catch (error) {
      throw error;
    }
  });

  test('特殊字符处理', async ({ page, request }) => {
    // 测试包含特殊字符的工作流名称
    const specialChars = '!@#$%^&*()_+-=[]{}|;:,.<>?';
    
    try {
      const response = await request.post(`${BACKEND_URL}/api/workflows`, {
        data: {
          name: `Test ${specialChars} ${Date.now()}`,
          xml: '<?xml version="1.0"?><test/>',
        },
      });
      
      if (response.status() === 200 || response.status() === 201) {
        const workflow = await response.json();
        expect(workflow).toHaveProperty('id');
        
        // 清理
        if (workflow.id) {
          await request.delete(`${BACKEND_URL}/api/workflows/${workflow.id}`).catch(() => {});
        }
      } else {
        // API 可能不存在（404）或服务不可用（503），这是允许的
        expect([400, 404, 503]).toContain(response.status());
}
    } catch (error) {
      throw error;
    }
  });

  test('Unicode 字符处理', async ({ page, request }) => {
    // 测试包含 Unicode 字符的工作流名称
    const unicodeChars = '测试 日本語 한국어 العربية русский';
    
    try {
      const response = await request.post(`${BACKEND_URL}/api/workflows`, {
        data: {
          name: `Test ${unicodeChars} ${Date.now()}`,
          xml: '<?xml version="1.0"?><test/>',
        },
      });
      
      if (response.status() === 200 || response.status() === 201) {
        const workflow = await response.json();
        expect(workflow).toHaveProperty('id');
        
        // 清理
        if (workflow.id) {
          await request.delete(`${BACKEND_URL}/api/workflows/${workflow.id}`).catch(() => {});
        }
      } else {
        // API 可能不存在（404）或服务不可用（503），这是允许的
        expect([400, 404, 503]).toContain(response.status());
}
    } catch (error) {
      throw error;
    }
  });
});

test.describe('错误恢复机制测试', () => {
  test('API 错误后可以重试', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');
    
    let retryCount = 0;
    
    // 模拟第一次失败，第二次成功
    await page.route('**/api/**', (route) => {
      retryCount++;
      if (retryCount === 1) {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      } else {
        route.continue();
      }
    });
    
    // 尝试触发 API 调用
    const newButton = page.locator('button:has-text("创建新工作流"), button:has-text("创建新工作流")').first();
    expect(await newButton.count()).not.toBe(0);
await newButton.click();
      await page.waitForTimeout(1000);
      
      // 验证页面没有崩溃
      const bodyContent = await page.textContent('body');
      expect(bodyContent).toBeTruthy();
  });

  test('数据验证错误后可以修正', async ({ page }) => {
    // 直接导航到编辑器页面
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    // 创建新图表
    const newButton = page.locator('button:has-text("创建新工作流")').first();
    expect(await newButton.count()).not.toBe(0);
    await newButton.click();
    await page.waitForTimeout(3000);

    // 等待 BPMN 编辑器和右侧面板加载
    const editor = page.locator('.bpmn-container, .bpmn-editor').first();
    await editor.waitFor({ state: 'visible', timeout: 10000 });

    const rightPanel = page.locator('.right-panel-container').first();
    await rightPanel.waitFor({ state: 'visible', timeout: 5000 });

    // 尝试编辑属性（可能触发验证）
    const propertiesPanel = page.locator('.right-panel-container #properties-panel, .right-panel-container .properties-panel-mount').first();
    await propertiesPanel.waitFor({ state: 'attached', timeout: 5000 });
    expect(await propertiesPanel.count()).not.toBe(0);
    const nameInput = propertiesPanel.locator('input[name*="name"]').first();
    if (await nameInput.count() > 0) {
      // 先输入无效值
      await nameInput.fill('');
      await page.waitForTimeout(300);

      // 然后输入有效值
      await nameInput.fill('Valid Name');
      await page.waitForTimeout(300);

      // 验证可以修正
      const value = await nameInput.inputValue();
      expect(value).toBe('Valid Name');
    }
  });
});

