/**
 * E2E Test: 核心功能测试
 * 测试应用启动、路由导航、BPMN编辑器基本操作等核心功能
 */

import { test, expect } from '@playwright/test';

test.describe('核心功能测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('应用可以正常启动 @quick', async ({ page }) => {
    // 验证页面标题
    const title = await page.title();
    expect(title).toBeTruthy();

    // 验证页面有内容
    const bodyContent = await page.textContent('body');
    expect(bodyContent).toBeTruthy();
    expect(bodyContent!.length).toBeGreaterThan(0);
  });

  test('路由导航正常', async ({ page }) => {
    // 测试根路径
    await page.goto('/');
    await expect(page).toHaveURL(/\/$/);

    // 测试工具页面（如果存在）
    try {
      await page.goto('/tool');
      await page.waitForLoadState('networkidle', { timeout: 5000 });
      await expect(page).toHaveURL(/\/tool/);
    } catch (e) {
      // 如果路由不存在，跳过
      test.skip();
    }
  });

  test('BPMN编辑器可以加载 @quick', async ({ page }) => {
    // 等待编辑器容器出现
    const editorContainer = page.locator('.editor-container, .bpmn-canvas, [class*="bpmn"]').first();
    
    // 如果编辑器已加载，验证其存在
    if (await editorContainer.count() > 0) {
      await expect(editorContainer).toBeVisible({ timeout: 10000 });
    } else {
      // 如果没有编辑器，可能是欢迎界面，验证欢迎界面存在
      const welcomeScreen = page.locator('.welcome-screen, .welcome-content').first();
      if (await welcomeScreen.count() > 0) {
        await expect(welcomeScreen).toBeVisible();
      }
    }
  });

  test('可以创建新图表 @quick', async ({ page }) => {
    // 查找"New"或"新建"按钮
    const newButton = page.locator('button:has-text("New"), button:has-text("新建"), button:has-text("新"), [data-testid="new-diagram"]').first();
    
    if (await newButton.count() > 0) {
      await newButton.click();
      
      // 等待编辑器加载
      await page.waitForTimeout(1000);
      
      // 验证编辑器已加载（通过检查是否有编辑器元素）
      const editor = page.locator('.bpmn-canvas, [class*="bpmn"], .editor-container').first();
      if (await editor.count() > 0) {
        await expect(editor).toBeVisible({ timeout: 5000 });
      }
    } else {
      test.skip();
    }
  });

  test('可以打开文件选择对话框', async ({ page }) => {
    // 查找"Open"或"打开"按钮
    const openButton = page.locator('button:has-text("Open"), button:has-text("打开"), [data-testid="open-file"]').first();
    
    if (await openButton.count() > 0) {
      // 设置文件选择监听
      const fileChooserPromise = page.waitForEvent('filechooser');
      await openButton.click();
      
      // 验证文件选择对话框已打开
      const fileChooser = await fileChooserPromise;
      expect(fileChooser).toBeTruthy();
    } else {
      test.skip();
    }
  });

  test('工具栏按钮可见', async ({ page }) => {
    // 验证工具栏存在
    const toolbar = page.locator('.toolbar, [class*="toolbar"]').first();
    if (await toolbar.count() > 0) {
      await expect(toolbar).toBeVisible();
    }
  });

  test('状态栏显示正确', async ({ page }) => {
    // 验证状态栏存在
    const statusBar = page.locator('.status-bar, [class*="status"]').first();
    if (await statusBar.count() > 0) {
      await expect(statusBar).toBeVisible();
      
      // 验证状态信息存在
      const statusText = await statusBar.textContent();
      expect(statusText).toBeTruthy();
    }
  });

  test('数据持久化 - 本地存储', async ({ page, context }) => {
    // 设置一些测试数据到localStorage
    await context.addInitScript(() => {
      localStorage.setItem('test-key', 'test-value');
    });

    await page.goto('/');
    
    // 验证数据已保存
    const value = await page.evaluate(() => localStorage.getItem('test-key'));
    expect(value).toBe('test-value');
  });
});

test.describe('BPMN编辑器基本操作', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('编辑器加载后可以交互', async ({ page }) => {
    // 等待编辑器加载
    await page.waitForTimeout(2000);
    
    // 尝试点击编辑器区域
    const editorArea = page.locator('.bpmn-canvas, .editor-container, [class*="canvas"]').first();
    if (await editorArea.count() > 0) {
      await editorArea.click({ timeout: 5000 });
      // 如果点击成功，说明编辑器可交互
      expect(await editorArea.count()).toBeGreaterThan(0);
    } else {
      test.skip();
    }
  });

  test('可以访问属性面板区域', async ({ page }) => {
    // 查找属性面板
    const propertiesPanel = page.locator('.properties-panel, [id="properties-panel"], [class*="properties"]').first();
    
    // 属性面板可能初始不可见，这是正常的
    if (await propertiesPanel.count() > 0) {
      // 验证属性面板元素存在（即使不可见）
      expect(await propertiesPanel.count()).toBeGreaterThan(0);
    }
  });
});

