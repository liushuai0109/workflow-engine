/**
 * Playwright 测试 Fixtures
 * 定义可复用的测试工具和辅助函数
 */

import { test as base, expect, Page, APIRequestContext } from '@playwright/test';

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

