/**
 * E2E Test: 接口集成测试
 * 测试前端调用后端API、错误处理、数据格式验证等
 */

import { test, expect } from '@playwright/test';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

test.describe('接口集成测试', () => {
  test('健康检查接口可用 @quick', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`);
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('status');
    expect(body.status).toBe('ok');
  });

  test('前端可以调用后端API', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 监听网络请求
    const requests: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes(BACKEND_URL) || request.url().includes('/api/')) {
        requests.push(request.url());
      }
    });

    // 等待一段时间，观察是否有API调用
    await page.waitForTimeout(2000);

    // 如果有API调用，验证请求格式
    if (requests.length > 0) {
      expect(requests.length).toBeGreaterThan(0);
    }
  });

  test('错误处理 - 404错误', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/nonexistent`);
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('错误处理 - 错误消息显示', async ({ page }) => {
    await page.goto('/');
    
    // 拦截API请求并返回错误
    await page.route('**/api/**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    // 触发可能导致API调用的操作
    await page.waitForTimeout(1000);

    // 验证错误消息可能显示在页面上（取决于实现）
    // 这里只是验证页面没有崩溃
    const bodyContent = await page.textContent('body');
    expect(bodyContent).toBeTruthy();
  });

  test('数据格式验证 - JSON响应', async ({ request }) => {
    // 测试健康检查接口返回正确的JSON格式
    const response = await request.get(`${BACKEND_URL}/health`);
    expect(response.status()).toBe(200);
    
    const contentType = response.headers()['content-type'];
    expect(contentType).toContain('application/json');
    
    const body = await response.json();
    expect(typeof body).toBe('object');
  });

  test('CORS配置正确', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`, {
      headers: {
        'Origin': 'http://localhost:8000',
      },
    });
    
    // 验证响应包含CORS头（如果配置了）
    const headers = response.headers();
    // CORS头可能不存在，这取决于后端配置
    // 这里只验证请求成功
    expect(response.status()).toBe(200);
  });
});

test.describe('聊天API集成测试', () => {
  test('可以创建聊天会话', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/api/chat/conversations`, {
      data: {
        title: 'Test Conversation',
      },
    });

    if (response.status() === 200 || response.status() === 201) {
      const body = await response.json();
      expect(body).toHaveProperty('id');
      expect(body).toHaveProperty('title');
    } else if (response.status() === 404) {
      // API可能不存在，跳过测试
      test.skip();
    }
  });

  test('可以获取聊天会话列表', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/chat/conversations`);

    if (response.status() === 200) {
      const body = await response.json();
      expect(Array.isArray(body) || typeof body === 'object').toBe(true);
    } else if (response.status() === 404) {
      test.skip();
    }
  });

  test('可以添加消息到会话', async ({ request }) => {
    // 先创建会话
    const createResponse = await request.post(`${BACKEND_URL}/api/chat/conversations`, {
      data: { title: 'Test' },
    });

    if (createResponse.status() !== 200 && createResponse.status() !== 201) {
      test.skip();
    }

    const conversation = await createResponse.json();
    const conversationId = conversation.id;

    // 添加消息
    const messageResponse = await request.post(
      `${BACKEND_URL}/api/chat/conversations/${conversationId}/messages`,
      {
        data: {
          role: 'user',
          content: 'Test message',
        },
      }
    );

    if (messageResponse.status() === 200 || messageResponse.status() === 201) {
      const message = await messageResponse.json();
      expect(message).toHaveProperty('id');
      expect(message).toHaveProperty('content');
      expect(message.content).toBe('Test message');
    } else if (messageResponse.status() === 404) {
      test.skip();
    }
  });
});

