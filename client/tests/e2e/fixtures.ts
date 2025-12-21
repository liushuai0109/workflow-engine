/**
 * Playwright 测试 Fixtures
 * 定义可复用的测试工具和辅助函数
 */

import { test as base, expect, Page, APIRequestContext } from '@playwright/test';

// 确保 process 类型可用
declare const process: {
  env: {
    BACKEND_URL?: string;
    FRONTEND_URL?: string;
  };
};

// 扩展测试类型，添加自定义 fixtures
type TestFixtures = {
  backendUrl: string;
  frontendUrl: string;
  authenticatedRequest: APIRequestContext;
};

// 导出扩展后的 test
export const test = base.extend<TestFixtures>({
  // 后端 URL fixture
  backendUrl: async ({}, use) => {
    const url = process.env.BACKEND_URL || 'http://localhost:8080';
    await use(url);
  },

  // 前端 URL fixture
  frontendUrl: async ({}, use) => {
    const url = process.env.FRONTEND_URL || 'http://localhost:8000';
    await use(url);
  },

  // 认证请求 fixture（如果需要认证）
  authenticatedRequest: async ({ request, backendUrl }, use) => {
    // 这里可以添加认证逻辑
    // 例如：获取 token、设置 headers 等
    await use(request);
  },
});

// 导出 expect
export { expect };

// 辅助函数：等待元素可见
export async function waitForElement(
  page: Page,
  selector: string,
  timeout = 5000
): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

// 辅助函数：等待 API 响应
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout = 10000
): Promise<void> {
  await page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );
}

// 辅助函数：检查后端健康状态
export async function checkBackendHealth(
  request: APIRequestContext,
  backendUrl: string
): Promise<boolean> {
  try {
    const response = await request.get(`${backendUrl}/health`, {
      timeout: 5000,
    });
    return response.ok();
  } catch (error) {
    return false;
  }
}

// 辅助函数：创建测试数据
export async function createTestData(
  request: APIRequestContext,
  backendUrl: string,
  endpoint: string,
  data: any
): Promise<any> {
  const response = await request.post(`${backendUrl}${endpoint}`, {
    data,
  });

  if (!response.ok()) {
    throw new Error(`Failed to create test data: ${response.status()}`);
  }

  return await response.json();
}

// 辅助函数：清理测试数据
export async function cleanupTestData(
  request: APIRequestContext,
  backendUrl: string,
  endpoint: string,
  id: string
): Promise<void> {
  try {
    await request.delete(`${backendUrl}${endpoint}/${id}`);
  } catch (error) {
    // 忽略清理错误，可能数据已经不存在
  }
}

// 辅助函数：等待页面完全加载
export async function waitForPageLoad(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

// 辅助函数：截图（用于调试）
export async function takeScreenshot(
  page: Page,
  name: string
): Promise<void> {
  await page.screenshot({
    path: `test-results/screenshots/${name}-${Date.now()}.png`,
    fullPage: true,
  });
}

// 辅助函数：获取控制台错误
export async function getConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });

  page.on('pageerror', (error) => {
    errors.push(error.message);
  });

  return errors;
}

// 辅助函数：模拟用户操作延迟
export async function userDelay(ms: number = 500): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 辅助函数：等待编辑器加载完成
export async function waitForEditorLoad(page: Page, timeout = 10000): Promise<void> {
  // 等待编辑器容器出现
  await page.waitForSelector('.bpmn-container, .editor-container, [class*="bpmn"]', {
    state: 'visible',
    timeout,
  });
  // 等待一小段时间确保编辑器完全初始化
  await page.waitForTimeout(1000);
}

// 辅助函数：创建新图表
export async function createNewDiagram(page: Page): Promise<void> {
  const newButton = page.locator('button:has-text("New"), button:has-text("新建"), button:has-text("新")').first();
  if (await newButton.count() > 0) {
    await newButton.click();
    await waitForEditorLoad(page);
  }
}

// 辅助函数：打开文件
export async function openBpmnFile(page: Page, filePath: string): Promise<void> {
  const openButton = page.locator('button:has-text("Open"), button:has-text("打开")').first();
  if (await openButton.count() > 0) {
    const fileChooserPromise = page.waitForEvent('filechooser');
    await openButton.click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(filePath);
    await waitForEditorLoad(page);
  }
}

// 辅助函数：点击缩放控制按钮
export async function clickZoomControl(page: Page, control: 'in' | 'out' | 'fit' | 'reset' | 'properties' | 'palette'): Promise<void> {
  const selectors = {
    in: '.io-zoom-control:has-text("+")',
    out: '.io-zoom-control:has-text("−")',
    fit: '.io-zoom-control:has-text("⌂")',
    reset: '.io-zoom-control:has-text("1:1")',
    properties: '.io-zoom-control:has-text("◄"), .io-zoom-control:has-text("►")',
    palette: '.io-zoom-control:has-text("◄"), .io-zoom-control:has-text("►")',
  };
  
  const selector = selectors[control];
  const button = page.locator(selector).first();
  if (await button.count() > 0) {
    await button.click();
    await userDelay(300);
  }
}

// 辅助函数：等待元素在画布上出现
export async function waitForElementOnCanvas(page: Page, elementType: string, timeout = 5000): Promise<void> {
  // BPMN 元素通常在画布上，通过检查 SVG 或 canvas 中的元素
  await page.waitForSelector(`[data-element-id*="${elementType}"], [class*="${elementType}"]`, {
    timeout,
  });
}

// 辅助函数：获取编辑器画布
export async function getEditorCanvas(page: Page): Promise<any> {
  return page.locator('.bpmn-container, .editor-container, [class*="canvas"]').first();
}

// 辅助函数：检查属性面板是否可见
export async function isPropertiesPanelVisible(page: Page): Promise<boolean> {
  const panel = page.locator('#properties-panel, .properties-panel').first();
  if (await panel.count() === 0) {
    return false;
  }
  return await panel.isVisible();
}

// 辅助函数：创建工作流测试数据
export async function createWorkflowTestData(
  request: APIRequestContext,
  backendUrl: string,
  workflowData: { name?: string; xml?: string }
): Promise<any> {
  const defaultXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn2:definitions xmlns:bpmn2="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" id="sample-diagram" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn2:process id="Process_1" isExecutable="true">
    <bpmn2:startEvent id="StartEvent_1"/>
    <bpmn2:endEvent id="EndEvent_1"/>
  </bpmn2:process>
</bpmn2:definitions>`;

  const data = {
    name: workflowData.name || `Test Workflow ${Date.now()}`,
    xml: workflowData.xml || defaultXml,
  };

  return createTestData(request, backendUrl, '/api/workflows', data);
}

