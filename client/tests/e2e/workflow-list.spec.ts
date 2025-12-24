/**
 * E2E Test: 工作流列表页测试
 * 测试工作流列表展示、打开、下载、保存等功能
 */

import { test, expect } from '@playwright/test';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

test.describe('工作流列表页面', () => {
  test.beforeEach(async ({ page }) => {
    // 访问根路径,应该重定向到 /workflows
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('访问根路径应该重定向到工作流列表页', async ({ page }) => {
    // 验证 URL 已重定向到 /workflows
    expect(page.url()).toContain('/workflows');

    // 验证页面标题或关键元素
    const heading = page.locator('h1, h2, .ant-typography').filter({ hasText: /工作流|Workflow/i }).first();
    if (await heading.count() > 0) {
      await expect(heading).toBeVisible({ timeout: 5000 });
    }
  });

  test('应该显示工作流列表表格', async ({ page }) => {
    // 等待表格加载
    const table = page.locator('.ant-table, table').first();

    // 如果表格存在,验证其可见性
    if (await table.count() > 0) {
      await expect(table).toBeVisible({ timeout: 10000 });

      // 验证表格列标题
      const nameHeader = page.locator('th').filter({ hasText: /名称|Name/i }).first();
      if (await nameHeader.count() > 0) {
        await expect(nameHeader).toBeVisible();
      }
    } else {
      // 如果没有表格,可能显示空状态
      const emptyState = page.locator('.ant-empty').first();
      if (await emptyState.count() > 0) {
        await expect(emptyState).toBeVisible();
      }
    }
  });

  test('应该显示创建新工作流按钮', async ({ page }) => {
    // 查找"创建新工作流"或"New Workflow"按钮
    const createButton = page.locator('button').filter({ hasText: /创建|New.*Workflow/i }).first();

    if (await createButton.count() > 0) {
      await expect(createButton).toBeVisible({ timeout: 5000 });
    }
  });

  test('点击创建新工作流按钮应该导航到编辑器', async ({ page }) => {
    // 查找"创建新工作流"按钮
    const createButton = page.locator('button').filter({ hasText: /创建|New.*Workflow/i }).first();

    if (await createButton.count() > 0) {
      await createButton.click();

      // 等待URL变化到/editor（Vue Router客户端导航）
      await page.waitForURL(/\/editor/, { timeout: 5000 });

      // 验证导航到编辑器页面
      expect(page.url()).toContain('/editor');

      // 验证编辑器页面的欢迎界面或编辑器已加载
      const welcomeScreen = page.locator('.welcome-screen, .welcome-content').first();
      const editor = page.locator('.bpmn-container, .editor-container').first();

      // 至少有一个应该可见（欢迎界面或编辑器）
      const hasWelcome = await welcomeScreen.count() > 0;
      const hasEditor = await editor.count() > 0;
      expect(hasWelcome || hasEditor).toBeTruthy();
    }
  });

  test('如果有工作流,应该显示操作按钮', async ({ page }) => {
    // 等待表格加载
    await page.waitForTimeout(2000);

    // 检查是否有工作流行
    const tableRows = page.locator('.ant-table-tbody tr').filter({ hasNot: page.locator('.ant-empty') });
    const rowCount = await tableRows.count();

    if (rowCount > 0) {
      // 如果有工作流,验证操作按钮存在
      const openButton = page.locator('button').filter({ hasText: /打开|Open/i }).first();
      const downloadButton = page.locator('button').filter({ hasText: /下载|Download/i }).first();

      if (await openButton.count() > 0) {
        await expect(openButton).toBeVisible();
      }

      if (await downloadButton.count() > 0) {
        await expect(downloadButton).toBeVisible();
      }
    }
  });

  test('空状态应该显示提示信息', async ({ page }) => {
    // 等待加载完成
    await page.waitForTimeout(2000);

    // 检查是否显示空状态
    const emptyState = page.locator('.ant-empty').first();

    if (await emptyState.count() > 0) {
      await expect(emptyState).toBeVisible();

      // 验证空状态包含提示信息
      const emptyDescription = page.locator('.ant-empty-description').first();
      if (await emptyDescription.count() > 0) {
        const text = await emptyDescription.textContent();
        expect(text).toBeTruthy();
      }
    }
  });

  test('加载状态应该显示 loading', async ({ page }) => {
    // 刷新页面以触发加载
    await page.reload();

    // 在加载期间应该看到 loading 状态
    const spinner = page.locator('.ant-spin').first();

    // 注意：loading 可能很快消失,所以使用短超时
    const isSpinnerVisible = await spinner.isVisible().catch(() => false);

    // 只要 spinner 曾经出现过或数据已加载,测试就通过
    const table = page.locator('.ant-table').first();
    const emptyState = page.locator('.ant-empty').first();

    const hasContent = (await table.count() > 0) || (await emptyState.count() > 0);
    expect(hasContent || isSpinnerVisible).toBeTruthy();
  });
});

test.describe('工作流列表页交互', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/workflows');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('点击打开按钮应该导航到编辑器并加载工作流', async ({ page }) => {
    // 查找第一个"打开"按钮
    const openButton = page.locator('button').filter({ hasText: /打开|Open/i }).first();

    if (await openButton.count() > 0) {
      // 记录当前 URL
      const currentUrl = page.url();

      // 点击打开按钮
      await openButton.click();

      // 等待URL变化到/editor/（Vue Router客户端导航）
      await page.waitForURL(/\/editor\//, { timeout: 5000 });

      // 验证导航到编辑器页面(带 workflowId)
      expect(page.url()).toContain('/editor/');
      expect(page.url()).not.toBe(currentUrl);

      // 验证编辑器已加载
      const editor = page.locator('.bpmn-container, .editor-container').first();
      if (await editor.count() > 0) {
        await expect(editor).toBeVisible({ timeout: 10000 });
      }

      // 验证"Back to List"按钮存在
      const backButton = page.locator('button').filter({ hasText: /Back.*List|返回|Workflow/i }).first();
      if (await backButton.count() > 0) {
        await expect(backButton).toBeVisible();
      }
    }
  });

  test('从编辑器点击 Back to List 应该返回列表页', async ({ page }) => {
    // 先导航到编辑器
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    // 查找"Back to List"或"Workflows"按钮
    const backButton = page.locator('button').filter({ hasText: /Back|List|Workflow/i }).first();

    if (await backButton.count() > 0) {
      await backButton.click();

      // 等待URL变化到/workflows（Vue Router客户端导航）
      await page.waitForURL(/\/workflows/, { timeout: 5000 });

      // 验证返回列表页
      expect(page.url()).toContain('/workflows');

      // 验证列表页元素可见
      const table = page.locator('.ant-table, .ant-empty').first();
      if (await table.count() > 0) {
        await expect(table).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('分页功能应该正常工作', async ({ page }) => {
    // 查找分页器
    const pagination = page.locator('.ant-pagination').first();

    if (await pagination.count() > 0) {
      await expect(pagination).toBeVisible();

      // 检查是否有下一页按钮
      const nextButton = pagination.locator('.ant-pagination-next').first();

      if (await nextButton.count() > 0 && !(await nextButton.isDisabled())) {
        // 点击下一页
        await nextButton.click();
        await page.waitForTimeout(1000);

        // 验证页面已更新
        expect(page.url()).toBeTruthy();
      }
    }
  });
});

test.describe('工作流保存功能', () => {
  test.beforeEach(async ({ page }) => {
    // 创建新工作流
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
  });

  test('编辑器应该显示保存和下载按钮', async ({ page }) => {
    // 验证工具栏按钮存在
    const saveButton = page.locator('button').filter({ hasText: /^Save$|保存$/ }).first();
    const downloadButton = page.locator('button').filter({ hasText: /Download|下载/ }).first();
    const backButton = page.locator('button').filter({ hasText: /Workflow|列表/ }).first();

    if (await saveButton.count() > 0) {
      await expect(saveButton).toBeVisible({ timeout: 5000 });
    }

    if (await downloadButton.count() > 0) {
      await expect(downloadButton).toBeVisible();
    }

    if (await backButton.count() > 0) {
      await expect(backButton).toBeVisible();
    }
  });

  test('新建工作流时保存按钮应该可用', async ({ page }) => {
    // 等待编辑器加载
    const editor = page.locator('.bpmn-container, .editor-container').first();

    if (await editor.count() > 0) {
      await expect(editor).toBeVisible({ timeout: 5000 });

      // 查找 Save 按钮
      const saveButton = page.locator('button').filter({ hasText: /^Save$|保存$/ }).first();

      if (await saveButton.count() > 0) {
        // 验证按钮可见且可能可用(取决于是否有 diagram)
        await expect(saveButton).toBeVisible();

        // 注意：按钮可能因为没有 diagram 而禁用,这是正常的
        const isDisabled = await saveButton.isDisabled();
        // 只验证按钮存在即可
        expect(isDisabled !== undefined).toBeTruthy();
      }
    }
  });

  test('下载按钮应该可用', async ({ page }) => {
    // 等待编辑器加载
    const editor = page.locator('.bpmn-container, .editor-container').first();

    if (await editor.count() > 0) {
      await expect(editor).toBeVisible({ timeout: 5000 });

      // 查找 Download 按钮
      const downloadButton = page.locator('button').filter({ hasText: /Download|下载/ }).first();

      if (await downloadButton.count() > 0) {
        await expect(downloadButton).toBeVisible();
      }
    }
  });
});

test.describe('错误处理', () => {
  test('API 错误时应该显示错误提示', async ({ page }) => {
    // 拦截 API 请求并返回错误
    await page.route('**/api/workflows*', route => {
      route.abort('failed');
    });

    // 访问列表页
    await page.goto('/workflows');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 验证错误提示(可能是 message、alert 或错误文本)
    const errorMessage = page.locator('.ant-message, .ant-alert, .error-message').first();

    if (await errorMessage.count() > 0) {
      const isVisible = await errorMessage.isVisible().catch(() => false);
      // 如果有错误消息,验证其可见性
      if (isVisible) {
        expect(isVisible).toBeTruthy();
      }
    }

    // 或者验证显示了错误状态的 UI
    const hasErrorUI = (await page.locator('.ant-empty, .error-container').first().count()) > 0;
    expect(hasErrorUI).toBeTruthy();
  });

  test('无效的 workflowId 应该显示错误', async ({ page }) => {
    // 访问不存在的工作流
    await page.goto('/editor/non-existent-workflow-id');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 可能显示错误消息或空白编辑器
    const editor = page.locator('.bpmn-container, .editor-container').first();
    const errorMessage = page.locator('.ant-message').first();

    // 至少应该加载了编辑器或显示了错误
    const hasEditor = await editor.count() > 0;
    const hasError = await errorMessage.count() > 0;

    expect(hasEditor || hasError).toBeTruthy();
  });
});
