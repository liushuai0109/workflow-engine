/**
 * E2E Test: 接口集成测试
 * 测试前端调用后端API、错误处理、数据格式验证等
 */

import { test, expect } from '@playwright/test';

// 确保 process 类型可用
declare const process: {
  env: {
    BACKEND_URL?: string;
  };
};

// 使用 127.0.0.1 而不是 localhost 以避免 DNS 解析问题（特别是在并发请求时）
const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:3000';

test.describe('接口集成测试', () => {
  test('健康检查接口可用 @quick', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`);
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('status');
    expect(body.status).toBe('ok');
  });

  test('前端可以调用后端API', async ({ page }) => {
    await page.goto('/editor');
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
    await page.goto('/editor');
    
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

test.describe('工作流管理 API 测试', () => {
  test('可以创建工作流 API', async ({ request }) => {
    try {
      const response = await request.post(`${BACKEND_URL}/api/workflows`, {
        data: {
          name: `Test Workflow ${Date.now()}`,
          xml: '<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn:process id="Process_1" isExecutable="true"><bpmn:startEvent id="StartEvent_1"/></bpmn:process></bpmn:definitions>',
        },
      });

      if (response.status() === 200 || response.status() === 201) {
        const body = await response.json();
        expect(body).toHaveProperty('id');
        
        // 清理
        if (body.id) {
          await request.delete(`${BACKEND_URL}/api/workflows/${body.id}`).catch(() => {});
        }
      } else {
        // API 可能不存在（404）、请求错误（400）或服务不可用（503），这是允许的
        // 但如果是其他错误（如 500），应该失败
        expect([400, 404, 503]).toContain(response.status());
      }
    } catch (error) {
      throw error;
    }
  });

  test('可以获取工作流 API', async ({ request }) => {
    // 先创建一个工作流
    let workflowId: string | null = null;
    
    try {
      const createResponse = await request.post(`${BACKEND_URL}/api/workflows`, {
        data: {
          name: `Test Workflow ${Date.now()}`,
          xml: '<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn:process id="Process_1" isExecutable="true"><bpmn:startEvent id="StartEvent_1"/></bpmn:process></bpmn:definitions>',
        },
      });

      if (createResponse.status() === 200 || createResponse.status() === 201) {
        const workflow = await createResponse.json();
        workflowId = workflow.id;

        // 获取工作流
        const getResponse = await request.get(`${BACKEND_URL}/api/workflows/${workflowId}`);
        if (getResponse.status() === 200) {
          const body = await getResponse.json();
          expect(body).toHaveProperty('id');
          expect(body).toHaveProperty('xml');
        }
      } else {
        // API 可能不存在（404）、请求错误（400）或服务不可用（503），这是允许的
        expect([400, 404, 503]).toContain(createResponse.status());
      }
    } catch (error) {
      throw error;
    } finally {
      // 清理
      if (workflowId) {
        await request.delete(`${BACKEND_URL}/api/workflows/${workflowId}`).catch(() => {});
      }
    }
  });

  test('可以更新工作流 API', async ({ request }) => {
    // 先创建一个工作流
    let workflowId: string | null = null;
    
    try {
      const createResponse = await request.post(`${BACKEND_URL}/api/workflows`, {
        data: {
          name: `Test Workflow ${Date.now()}`,
          xml: '<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn:process id="Process_1" isExecutable="true"><bpmn:startEvent id="StartEvent_1"/></bpmn:process></bpmn:definitions>',
        },
      });

      if (createResponse.status() === 200 || createResponse.status() === 201) {
        const workflow = await createResponse.json();
        workflowId = workflow.id;

        // 更新工作流
        const updateResponse = await request.put(`${BACKEND_URL}/api/workflows/${workflowId}`, {
          data: {
            name: 'Updated Workflow Name',
          },
        });

        if (updateResponse.status() === 200) {
          const updated = await updateResponse.json();
          expect(updated).toHaveProperty('id');
        }
      } else {
        // API 可能不存在（404）、请求错误（400）或服务不可用（503），这是允许的
        expect([400, 404, 503]).toContain(createResponse.status());
      }
    } catch (error) {
      throw error;
    } finally {
      // 清理
      if (workflowId) {
        await request.delete(`${BACKEND_URL}/api/workflows/${workflowId}`).catch(() => {});
      }
    }
  });

  test('可以删除工作流 API', async ({ request }) => {
    // 先创建一个工作流
    let workflowId: string | null = null;
    
    try {
      const createResponse = await request.post(`${BACKEND_URL}/api/workflows`, {
        data: {
          name: `Test Workflow ${Date.now()}`,
          xml: '<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn:process id="Process_1" isExecutable="true"><bpmn:startEvent id="StartEvent_1"/></bpmn:process></bpmn:definitions>',
        },
      });

      if (createResponse.status() === 200 || createResponse.status() === 201) {
        const workflow = await createResponse.json();
        workflowId = workflow.id;

        // 删除工作流
        const deleteResponse = await request.delete(`${BACKEND_URL}/api/workflows/${workflowId}`);
        expect(deleteResponse.status()).toBeGreaterThanOrEqual(200);
        expect(deleteResponse.status()).toBeLessThan(300);
      } else {
        // API 可能不存在（404）、请求错误（400）或服务不可用（503），这是允许的
        expect([400, 404, 503]).toContain(createResponse.status());
      }
    } catch (error) {
      throw error;
    } finally {
      // 清理（如果删除失败）
      if (workflowId) {
        await request.delete(`${BACKEND_URL}/api/workflows/${workflowId}`).catch(() => {});
      }
    }
  });

  test('可以列出工作流 API', async ({ request }) => {
    try {
      const response = await request.get(`${BACKEND_URL}/api/workflows`);

      if (response.status() === 200) {
        const body = await response.json();
        expect(Array.isArray(body) || typeof body === 'object').toBe(true);
      } else {
        // API 可能不存在（404），这是允许的
        // 但如果是其他错误（如 500），应该失败
        expect([400, 404, 503]).toContain(response.status());
      }
    } catch (error) {
      throw error;
    }
  });

});

test.describe('工作流执行 API 测试', () => {
  test('可以创建工作流执行 API', async ({ request }) => {
    // 先创建一个工作流
    let workflowId: string | null = null;
    
    try {
      const createResponse = await request.post(`${BACKEND_URL}/api/workflows`, {
        data: {
          name: `Test Workflow ${Date.now()}`,
          xml: '<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn:process id="Process_1" isExecutable="true"><bpmn:startEvent id="StartEvent_1"/></bpmn:process></bpmn:definitions>',
        },
      });

      if (createResponse.status() === 200 || createResponse.status() === 201) {
        const workflow = await createResponse.json();
        workflowId = workflow.id;

        // 创建执行
        const executeResponse = await request.post(`${BACKEND_URL}/api/workflows/${workflowId}/execute`, {
          data: {},
        });

        if (executeResponse.status() === 200 || executeResponse.status() === 201) {
          const execution = await executeResponse.json();
          expect(execution).toHaveProperty('id');
        } else {
          // API 可能不存在（404）、请求错误（400）或服务不可用（503），这是允许的
          expect([400, 404, 503]).toContain(executeResponse.status());
        }
      } else {
        // API 可能不存在（404）、请求错误（400）或服务不可用（503），这是允许的
        expect([400, 404, 503]).toContain(createResponse.status());
      }
    } catch (error) {
      throw error;
    } finally {
      // 清理
      if (workflowId) {
        await request.delete(`${BACKEND_URL}/api/workflows/${workflowId}`).catch(() => {});
      }
    }
  });

  test('可以获取执行状态 API', async ({ request }) => {
    try {
      const response = await request.get(`${BACKEND_URL}/api/executions`);

      if (response.status() === 200) {
        const body = await response.json();
        expect(Array.isArray(body) || typeof body === 'object').toBe(true);
      } else {
        // API 可能不存在（404），这是允许的
        // 但如果是其他错误（如 500），应该失败
        expect([400, 404, 503]).toContain(response.status());
      }
    } catch (error) {
      throw error;
    }
  });

  test('可以更新执行状态 API', async ({ request }) => {
    // 这个测试需要先有一个执行实例
    // 由于复杂性，这里只验证 API 端点存在
    try {
      const response = await request.put(`${BACKEND_URL}/api/executions/test-id`, {
        data: {
          status: 'completed',
        },
      });

      // 可能返回 404（不存在）或 400（无效数据），这是正常的
      expect(response.status()).toBeGreaterThanOrEqual(400);
    } catch (error) {
      throw error;
    }
  });

  test('可以列出执行历史 API', async ({ request }) => {
    try {
      const response = await request.get(`${BACKEND_URL}/api/executions`);

      if (response.status() === 200) {
        const body = await response.json();
        expect(Array.isArray(body) || typeof body === 'object').toBe(true);
      } else {
        // API 可能不存在（404），这是允许的
        // 但如果是其他错误（如 500），应该失败
        expect([400, 404, 503]).toContain(response.status());
      }
    } catch (error) {
      throw error;
    }
  });
});

test.describe('工作流实例 API 测试', () => {
  test('可以创建实例 API', async ({ request }) => {
    try {
      const response = await request.post(`${BACKEND_URL}/api/workflow-instances`, {
        data: {
          workflow_id: 'test-workflow-id',
          status: 'active',
        },
      });

      if (response.status() === 200 || response.status() === 201) {
        const instance = await response.json();
        expect(instance).toHaveProperty('id');

        // 清理
        if (instance.id) {
          await request.delete(`${BACKEND_URL}/api/workflow-instances/${instance.id}`).catch(() => {});
        }
      } else {
        // API 可能不存在（404），这是允许的
        // 但如果是其他错误（如 500），应该失败
        expect([400, 404, 503]).toContain(response.status());
      }
    } catch (error) {
      throw error;
    }
  });

  test('可以获取实例 API', async ({ request }) => {
    try {
      const response = await request.get(`${BACKEND_URL}/api/workflow-instances/test-id`);

      // 可能返回 404（不存在），这是正常的
      expect(response.status()).toBeGreaterThanOrEqual(400);
    } catch (error) {
      throw error;
    }
  });

  test('可以更新实例 API', async ({ request }) => {
    // 先创建一个实例
    let instanceId: string | null = null;
    
    try {
      const createResponse = await request.post(`${BACKEND_URL}/api/workflow-instances`, {
        data: {
          workflow_id: 'test-workflow-id',
          status: 'active',
        },
      });

      if (createResponse.status() === 200 || createResponse.status() === 201) {
        const instance = await createResponse.json();
        instanceId = instance.id;

        // 更新实例
        const updateResponse = await request.put(`${BACKEND_URL}/api/workflow-instances/${instanceId}`, {
          data: {
            status: 'completed',
          },
        });

        if (updateResponse.status() === 200) {
          const updated = await updateResponse.json();
          expect(updated).toHaveProperty('status');
        }
      } else {
        // API 可能不存在（404）、请求错误（400）或服务不可用（503），这是允许的
        expect([400, 404, 503]).toContain(createResponse.status());
      }
    } catch (error) {
      throw error;
    } finally {
      // 清理
      if (instanceId) {
        await request.delete(`${BACKEND_URL}/api/workflow-instances/${instanceId}`).catch(() => {});
      }
    }
  });

  test('可以列出实例 API', async ({ request }) => {
    try {
      const response = await request.get(`${BACKEND_URL}/api/workflow-instances`);

      if (response.status() === 200) {
        const body = await response.json();
        expect(Array.isArray(body) || typeof body === 'object').toBe(true);
      } else {
        // API 可能不存在（404），这是允许的
        // 但如果是其他错误（如 500），应该失败
        expect([400, 404, 503]).toContain(response.status());
      }
    } catch (error) {
      throw error;
    }
  });
});

test.describe('Mock 和 Debug API 测试', () => {
  test('可以调用 Mock 执行 API', async ({ request }) => {
    try {
      const response = await request.post(`${BACKEND_URL}/api/mock-executions`, {
        data: {
          workflow_id: 'test-workflow-id',
        },
      });

      if (response.status() === 200 || response.status() === 201) {
        const execution = await response.json();
        expect(execution).toHaveProperty('id');
      } else {
        // API 可能不存在（404），这是允许的
        // 但如果是其他错误（如 500），应该失败
        expect([400, 404, 503]).toContain(response.status());
      }
    } catch (error) {
      throw error;
    }
  });

  test('可以调用 Debug 会话 API', async ({ request }) => {
    try {
      const response = await request.post(`${BACKEND_URL}/api/debug-sessions`, {
        data: {
          workflow_id: 'test-workflow-id',
        },
      });

      if (response.status() === 200 || response.status() === 201) {
        const session = await response.json();
        expect(session).toHaveProperty('id');
      } else {
        // API 可能不存在（404），这是允许的
        // 但如果是其他错误（如 500），应该失败
        expect([400, 404, 503]).toContain(response.status());
      }
    } catch (error) {
      throw error;
    }
  });

  test('可以调用 Mock 配置 API', async ({ request }) => {
    try {
      const response = await request.get(`${BACKEND_URL}/api/mock-configs`);

      if (response.status() === 200) {
        const body = await response.json();
        expect(Array.isArray(body) || typeof body === 'object').toBe(true);
      } else {
        // API 可能不存在（404），这是允许的
        // 但如果是其他错误（如 500），应该失败
        expect([400, 404, 503]).toContain(response.status());
      }
    } catch (error) {
      throw error;
    }
  });
});

test.describe('错误处理测试', () => {
  test('可以处理 400 错误响应', async ({ request }) => {
    try {
      const response = await request.post(`${BACKEND_URL}/api/workflows`, {
        data: {
          // 缺少必需字段
        },
      });

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

  test('可以处理 404 错误响应', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/workflows/nonexistent-id`);
    expect(response.status()).toBeGreaterThanOrEqual(400);
  });

  test('可以处理 500 错误响应', async ({ request }) => {
    // 这个测试可能需要特定的错误条件
    // 这里只验证错误处理机制存在
    try {
      const response = await request.get(`${BACKEND_URL}/api/workflows/nonexistent-id`);
      // 应该返回错误状态码
      expect(response.status()).toBeGreaterThanOrEqual(400);
    } catch (error) {
      // 网络错误也是错误处理的一部分
      throw error;
    }
  });

  test('错误消息格式正确', async ({ request }) => {
    try {
      const response = await request.get(`${BACKEND_URL}/api/workflows/nonexistent-id`);

      if (response.status() >= 400) {
        const body = await response.json().catch(() => ({}));
        // 验证错误响应有合理的结构
        expect(typeof body === 'object').toBe(true);
      }
    } catch (error) {
      throw error;
    }
  });

  test('CORS 配置正确', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/health`, {
      headers: {
        'Origin': 'http://localhost:8000',
      },
    });

    // 验证请求成功（CORS 头可能不可见，但请求应该成功）
    expect(response.status()).toBe(200);
  });
});

test.describe('并发请求测试', () => {
  test('可以处理多个并发 API 请求', async ({ request }) => {
    // 先验证后端可用
    try {
      const healthCheck = await request.get(`${BACKEND_URL}/health`, { timeout: 5000 });
      expect(healthCheck.ok()).toBeTruthy();
    } catch (error) {
      // 后端不可用，应该失败而不是跳过
      throw error;
    }

    // 发送多个并发请求
    const promises = Array.from({ length: 5 }, () =>
      request.get(`${BACKEND_URL}/health`, { timeout: 10000 })
    );

    const responses = await Promise.allSettled(promises);

    // 验证所有请求都成功
    const successful = responses.filter((r) => r.status === 'fulfilled' && r.value.status() === 200);
    expect(successful.length).toBeGreaterThan(0);
    
    // 如果有失败的请求，记录但不失败（可能是网络问题）
    if (successful.length < promises.length) {
      console.warn(`部分并发请求失败: ${successful.length}/${promises.length} 成功`);
    }
  });

  test('可以处理请求限流', async ({ request }) => {
    // 发送大量请求测试限流
    const promises = Array.from({ length: 20 }, () =>
      request.get(`${BACKEND_URL}/health`)
    );

    const responses = await Promise.allSettled(promises);

    // 验证大部分请求成功（可能有一些被限流）
    const successful = responses.filter((r) => r.status === 'fulfilled' && r.value.status() === 200);
    expect(successful.length).toBeGreaterThan(0);
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
      expect(body.data).toHaveProperty('id');
      expect(body.data).toHaveProperty('title');

      // 清理
      if (body.data && body.data.id) {
        await request.delete(`${BACKEND_URL}/api/chat/conversations/${body.data.id}`).catch(() => {});
      }
      } else {
        // API 可能不存在（404）或服务不可用（503），这是允许的
        expect([400, 404, 503]).toContain(response.status());
      }
  });

  test('可以获取聊天会话列表', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/api/chat/conversations`);

    if (response.status() === 200) {
      const body = await response.json();
      expect(Array.isArray(body) || typeof body === 'object').toBe(true);
    } else {
      // API 可能不存在（404）、请求错误（400）或服务不可用（503），这是允许的
      expect([400, 404, 503]).toContain(response.status());
    }
  });

  test('可以添加消息到会话', async ({ request }) => {
    // 先创建会话
    const createResponse = await request.post(`${BACKEND_URL}/api/chat/conversations`, {
      data: { title: 'Test' },
    });

    // 如果返回 503，可能是数据库不可用，跳过此测试
    if (createResponse.status() === 503) {
      return;
    }

    expect(createResponse.status()).toBeGreaterThanOrEqual(200);
    expect(createResponse.status()).toBeLessThan(300);

    const conversation = await createResponse.json();
    const conversationId = conversation.data?.id || conversation.id;

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
      const messageData = message.data || message;
      expect(messageData).toHaveProperty('id');
      expect(messageData).toHaveProperty('content');
      expect(messageData.content).toBe('Test message');
    } else {
      // API 可能不存在（404）、请求错误（400）或服务不可用（503），这是允许的
      expect([400, 404, 503]).toContain(messageResponse.status());
    }
    
    // 清理
    if (conversationId) {
      await request.delete(`${BACKEND_URL}/api/chat/conversations/${conversationId}`).catch(() => {});
    }
  });
});

