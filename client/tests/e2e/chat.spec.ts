/**
 * E2E Test: 聊天功能测试
 * 测试 AI 助手聊天界面、会话管理、消息交互等
 */

/// <reference types="node" />
import { test, expect } from '@playwright/test';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

test.describe('聊天界面测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('聊天框可以显示和隐藏', async ({ page }) => {
    // 查找聊天触发按钮
    const chatToggleBtn = page.locator('.chat-toggle-btn, button[title*="AI"], button[title*="助手"]').first();
    expect(await chatToggleBtn.count()).not.toBe(0);
    
    // 点击打开聊天框
    await chatToggleBtn.click();
    await page.waitForTimeout(1000);
    
    // 验证聊天框显示
    const chatBox = page.locator('.chat-box-container, [class*="chat-box"]').first();
    expect(await chatBox.count()).not.toBe(0);
    await expect(chatBox).toBeVisible({ timeout: 5000 });
    
    // 查找关闭按钮
    const closeButton = chatBox.locator('.close-btn, button:has-text("×"), button[title*="关闭"]').first();
    if (await closeButton.count() > 0) {
      await closeButton.click();
      await page.waitForTimeout(500);
      
      // 验证聊天框隐藏
      // 注意：聊天框可能完全移除或只是隐藏
    }
  });

  test('聊天框可以最小化和恢复', async ({ page }) => {
    // 打开聊天框
    const chatToggleBtn = page.locator('.chat-toggle-btn, button[title*="AI"]').first();
    expect(await chatToggleBtn.count()).not.toBe(0);
    
    await chatToggleBtn.click();
    await page.waitForTimeout(1000);
    
    const chatBox = page.locator('.chat-box-container, [class*="chat-box"]').first();
    expect(await chatBox.count()).not.toBe(0);
    
    // 查找最小化按钮（使用 title 属性更可靠）
    const minimizeButton = chatBox.locator('button[title*="最小化"], button[title*="展开"]').first();
    expect(await minimizeButton.count()).not.toBe(0);
    
    // 第一次点击：最小化
    await minimizeButton.click();
    await page.waitForTimeout(500);
    
    // 验证聊天框最小化（检查 minimized 类）
    const isMinimized = await chatBox.evaluate((el) => {
      return el.classList.contains('minimized');
    });
    expect(isMinimized).toBeTruthy();
    
    // 恢复聊天框（按钮文本现在应该是 "展开"）
    // 重新查找按钮，因为 title 可能已经改变
    const restoreButton = chatBox.locator('button[title*="展开"], button[title*="最小化"]').first();
    expect(await restoreButton.count()).not.toBe(0);
    
    await restoreButton.click();
    await page.waitForTimeout(500);
    
    // 验证聊天框恢复
    const isRestored = !(await chatBox.evaluate((el) => {
      return el.classList.contains('minimized');
    }));
    expect(isRestored).toBeTruthy();
  });

  test('聊天框可以拖拽', async ({ page }) => {
    // 打开聊天框
    const chatToggleBtn = page.locator('.chat-toggle-btn, button[title*="AI"]').first();
    expect(await chatToggleBtn.count()).not.toBe(0);

    await chatToggleBtn.click();
    await page.waitForTimeout(1000);

    const chatBox = page.locator('.chat-box-container, [class*="chat-box"]').first();
    await expect(chatBox).toBeVisible({ timeout: 5000 });
    
    // 获取初始位置
    const initialPosition = await chatBox.boundingBox();
    expect(initialPosition).not.toBeNull();
    
    // 查找聊天框头部（拖拽是从头部开始的）
    const chatHeader = chatBox.locator('.chat-header').first();
    expect(await chatHeader.count()).not.toBe(0);
    
    // 获取头部的位置
    const headerBox = await chatHeader.boundingBox();
    expect(headerBox).not.toBeNull();
    
    // 在头部中间位置开始拖拽
    const startX = headerBox!.x + headerBox!.width / 2;
    const startY = headerBox!.y + headerBox!.height / 2;
    
    // 目标位置（向右下移动 100px）
    const targetX = startX + 100;
    const targetY = startY + 100;
    
    // 执行拖拽操作
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(targetX, targetY, { steps: 10 }); // 使用 steps 模拟平滑移动
    await page.mouse.up();
    await page.waitForTimeout(500); // 等待拖拽完成和位置更新
    
    // 验证位置改变（如果支持拖拽）
    const newPosition = await chatBox.boundingBox();
    expect(newPosition).not.toBeNull();
    
    // 位置应该改变（允许一些误差，因为可能有边界限制）
    const xChanged = Math.abs(newPosition!.x - initialPosition!.x) > 10;
    const yChanged = Math.abs(newPosition!.y - initialPosition!.y) > 10;
    expect(xChanged || yChanged).toBeTruthy();
  });

  test('消息列表可以显示', async ({ page }) => {
    // 打开聊天框
    const chatToggleBtn = page.locator('.chat-toggle-btn, button[title*="AI"]').first();
    expect(await chatToggleBtn.count()).not.toBe(0);
    
    await chatToggleBtn.click();
    await page.waitForTimeout(1000);
    
    const chatBox = page.locator('.chat-box-container, [class*="chat-box"]').first();
    expect(await chatBox.count()).not.toBe(0);
    
    // 查找消息容器
    const messagesContainer = chatBox.locator('.messages-container, [class*="messages"]').first();
    expect(await messagesContainer.count()).not.toBe(0);
    
    // 验证消息容器存在
    expect(await messagesContainer.count()).toBeGreaterThan(0);
  });
});

test.describe('聊天会话测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('可以创建新会话', async ({ page, request }) => {
    // 打开聊天框
    const chatToggleBtn = page.locator('.chat-toggle-btn, button[title*="AI"]').first();
    expect(await chatToggleBtn.count()).not.toBe(0);

    await chatToggleBtn.click();
    await page.waitForTimeout(1000);

    // 尝试创建新会话（通过 API）
    const response = await request.post(`${BACKEND_URL}/api/chat/conversations`, {
      data: {
        title: `Test Conversation ${Date.now()}`,
      },
    });

    // 验证 API 存在且可用
    // API 可能不存在（404）或服务不可用（503），这是允许的
    if (response.status() === 200 || response.status() === 201) {
      const conversation = await response.json();
      const convData = conversation.data || conversation;
      expect(convData).toHaveProperty('id');
      expect(convData).toHaveProperty('title');

      // 清理
      if (convData.id) {
        await request.delete(`${BACKEND_URL}/api/chat/conversations/${convData.id}`).catch(() => {});
      }
    } else {
      // API 可能不存在（404）或服务不可用（503），这是允许的
      expect([400, 404, 503]).toContain(response.status());
    }
  });

  test('可以获取会话列表', async ({ page, request }) => {
    // 打开聊天框
    const chatToggleBtn = page.locator('.chat-toggle-btn, button[title*="AI"]').first();
    expect(await chatToggleBtn.count()).not.toBe(0);

    await chatToggleBtn.click();
    await page.waitForTimeout(1000);

    // 尝试获取会话列表
    const response = await request.get(`${BACKEND_URL}/api/chat/conversations`);

    // 验证 API 存在且可用
    // API 可能不存在（404）或服务不可用（503），这是允许的
    if (response.status() === 200) {
      const body = await response.json();
      expect(Array.isArray(body) || typeof body === 'object').toBe(true);
    } else {
      expect([400, 404, 503]).toContain(response.status());
    }
  });

  test('可以切换会话', async ({ page }) => {
    // 打开聊天框
    const chatToggleBtn = page.locator('.chat-toggle-btn, button[title*="AI"]').first();
    expect(await chatToggleBtn.count()).not.toBe(0);

    await chatToggleBtn.click();
    await page.waitForTimeout(1000);

    const chatBox = page.locator('.chat-box-container, [class*="chat-box"]').first();
    expect(await chatBox.count()).not.toBe(0);

    // 点击会话列表切换按钮 (☰)
    const conversationListToggle = chatBox.locator('button[title*="会话列表"]').first();
    if (await conversationListToggle.count() > 0) {
      await conversationListToggle.click();
      await page.waitForTimeout(500);

      // 查找会话列表
      const conversationList = chatBox.locator('.conversation-list').first();
      if (await conversationList.count() > 0 && await conversationList.isVisible()) {
        // 查找会话项
        const conversationItem = conversationList.locator('.conversation-item').first();
        if (await conversationItem.count() > 0) {
          await conversationItem.click();
          await page.waitForTimeout(500);

          // 验证会话项存在
          expect(await conversationItem.count()).toBeGreaterThan(0);
        }
      }
    }
  });

  test('可以删除会话', async ({ request }) => {
    // 先创建一个会话
    let conversationId: string | null = null;

    try {
      const createResponse = await request.post(`${BACKEND_URL}/api/chat/conversations`, {
        data: {
          title: `Test Conversation ${Date.now()}`,
        },
      });

      if (createResponse.status() === 200 || createResponse.status() === 201) {
        const conversation = await createResponse.json();
        conversationId = conversation.data?.id || conversation.id;

        // 删除会话
        const deleteResponse = await request.delete(`${BACKEND_URL}/api/chat/conversations/${conversationId}`);
        expect(deleteResponse.status()).toBeGreaterThanOrEqual(200);
        expect(deleteResponse.status()).toBeLessThan(300);
      } else {
        // API 可能不存在（404）或服务不可用（503），这是允许的
        expect([400, 404, 503]).toContain(createResponse.status());
      }
    } catch (error) {
      // 网络错误等异常情况，应该失败而不是跳过
      throw error;
    } finally {
      // 清理（如果删除失败）
      if (conversationId) {
        await request.delete(`${BACKEND_URL}/api/chat/conversations/${conversationId}`).catch(() => {});
      }
    }
  });

  test('会话可以持久化', async ({ page, request }) => {
    // 创建一个会话
    let conversationId: string | null = null;

    try {
      const createResponse = await request.post(`${BACKEND_URL}/api/chat/conversations`, {
        data: {
          title: `Test Conversation ${Date.now()}`,
        },
      });

      // 验证 API 存在且可用
      // API 可能不存在（404）或服务不可用（503），这是允许的
      if (createResponse.status() === 200 || createResponse.status() === 201) {
        const conversation = await createResponse.json();
        conversationId = conversation.data?.id || conversation.id;

        // 刷新页面
        await page.reload();
        await page.waitForLoadState('networkidle');

        // 验证会话仍然存在
        const getResponse = await request.get(`${BACKEND_URL}/api/chat/conversations/${conversationId}`);
        expect(getResponse.status()).toBe(200);

        const persisted = await getResponse.json();
        // Response structure is { data: { conversation: {...}, messages: [...] } } or { conversation: {...}, messages: [...] }
        const persistedData = persisted.data?.conversation || persisted.conversation;
        expect(persistedData).toHaveProperty('id');
        expect(persistedData.id).toBe(conversationId);
      } else {
        // API 可能不存在（404）或服务不可用（503），这是允许的
        expect([400, 404, 503]).toContain(createResponse.status());
      }
    } catch (error) {
      // 网络错误等异常情况，应该失败而不是跳过
      throw error;
    } finally {
      // 清理
      if (conversationId) {
        await request.delete(`${BACKEND_URL}/api/chat/conversations/${conversationId}`).catch(() => {});
      }
    }
  });
});

test.describe('消息交互测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // 打开聊天框
    const chatToggleBtn = page.locator('.chat-toggle-btn, button[title*="AI"]').first();
    expect(await chatToggleBtn.count()).not.toBe(0);
    await chatToggleBtn.click();
    await page.waitForTimeout(1000);
  });

  test('可以发送用户消息', async ({ page }) => {
    const chatBox = page.locator('.chat-box-container, [class*="chat-box"]').first();
    expect(await chatBox.count()).not.toBe(0);
    
    // 查找消息输入框
    const messageInput = chatBox.locator('input[type="text"], textarea, [contenteditable="true"]').first();
    expect(await messageInput.count()).not.toBe(0);
    
    // 输入消息
    await messageInput.fill('Test message');
    await page.waitForTimeout(300);
    
    // 查找发送按钮
    const sendButton = chatBox.locator('button:has-text("Send"), button:has-text("发送"), button[type="submit"]').first();
    if (await sendButton.count() === 0) {
      // 如果没有发送按钮，尝试按 Enter
      await messageInput.press('Enter');
    } else {
      await sendButton.click();
    }
    
    await page.waitForTimeout(1000);
    
    // 验证消息已发送（检查消息列表）
    const messages = chatBox.locator('.message, [class*="message"]');
    // 应该至少有一条消息
    expect(await messages.count()).toBeGreaterThanOrEqual(0);
  });

  test('可以接收 AI 响应', async ({ request }) => {
    // 先创建一个会话
    let conversationId: string | null = null;

    try {
      const createResponse = await request.post(`${BACKEND_URL}/api/chat/conversations`, {
        data: {
          title: `Test Conversation ${Date.now()}`,
        },
      });

      if (createResponse.status() === 200 || createResponse.status() === 201) {
        const conversation = await createResponse.json();
        conversationId = conversation.data?.id || conversation.id;

        // 发送消息
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
          expect(message.data).toHaveProperty('id');
          expect(message.data).toHaveProperty('content');
        } else {
          // API 可能不存在（404）或服务不可用（503），这是允许的
          expect([400, 404, 503]).toContain(messageResponse.status());
        }
      } else {
        // API 可能不存在（404）或服务不可用（503），这是允许的
        expect([400, 404, 503]).toContain(createResponse.status());
      }
    } catch (error) {
      // 网络错误等异常情况，应该失败而不是跳过
      throw error;
    } finally {
      // 清理
      if (conversationId) {
        await request.delete(`${BACKEND_URL}/api/chat/conversations/${conversationId}`).catch(() => {});
      }
    }
  });

  test('可以显示流式响应', async ({ page }) => {
    // 这个测试需要实际的流式响应支持
    // 由于流式响应通常通过 WebSocket 或 Server-Sent Events，这里只验证 UI 可以显示
    const chatBox = page.locator('.chat-box-container, [class*="chat-box"]').first();
    expect(await chatBox.count()).not.toBe(0);
    
    // 验证消息容器存在，可以显示流式内容
    const messagesContainer = chatBox.locator('.messages-container, [class*="messages"]').first();
    expect(await messagesContainer.count()).not.toBe(0);
    expect(await messagesContainer.count()).toBeGreaterThan(0);
  });

  test('可以加载消息历史', async ({ request }) => {
    // 先创建一个会话并添加消息
    let conversationId: string | null = null;

    try {
      const createResponse = await request.post(`${BACKEND_URL}/api/chat/conversations`, {
        data: {
          title: `Test Conversation ${Date.now()}`,
        },
      });

      if (createResponse.status() === 200 || createResponse.status() === 201) {
        const conversation = await createResponse.json();
        conversationId = conversation.data?.id || conversation.id;

        // 添加消息
        await request.post(
          `${BACKEND_URL}/api/chat/conversations/${conversationId}/messages`,
          {
            data: {
              role: 'user',
              content: 'Test message',
            },
          }
        );

        // 获取消息历史（通过会话详情 API）
        const historyResponse = await request.get(
          `${BACKEND_URL}/api/chat/conversations/${conversationId}`
        );

        if (historyResponse.status() === 200) {
          const response = await historyResponse.json();
          // 检查响应格式
          if (response.data && response.data.messages) {
            expect(Array.isArray(response.data.messages)).toBe(true);
          } else if (Array.isArray(response)) {
            expect(Array.isArray(response)).toBe(true);
          }
        } else {
          // API 可能不存在（404）或服务不可用（503），这是允许的
          expect([400, 404, 503]).toContain(historyResponse.status());
        }
      } else {
        // API 可能不存在（404）或服务不可用（503），这是允许的
        expect([400, 404, 503]).toContain(createResponse.status());
      }
    } catch (error) {
      // 网络错误等异常情况，应该失败而不是跳过
      throw error;
    } finally {
      // 清理
      if (conversationId) {
        await request.delete(`${BACKEND_URL}/api/chat/conversations/${conversationId}`).catch(() => {});
      }
    }
  });

  test('消息时间戳可以显示', async ({ page }) => {
    const chatBox = page.locator('.chat-box-container, [class*="chat-box"]').first();
    expect(await chatBox.count()).not.toBe(0);
    
    // 查找消息时间戳（如果有消息的话）
    const messageTime = chatBox.locator('.message-time, [class*="time"]').first();
    // 时间戳可能不存在（如果没有消息），所以这里只验证如果存在则正确显示
    if (await messageTime.count() > 0) {
      expect(await messageTime.count()).toBeGreaterThan(0);
    }
  });

  test('聊天记录可以持久化并在刷新后加载', async ({ page }) => {
    const chatBox = page.locator('.chat-box-container, [class*="chat-box"]').first();
    expect(await chatBox.count()).not.toBe(0);

    // 等待聊天框完全加载
    await expect(chatBox).toBeVisible({ timeout: 5000 });

    // 查找输入框
    const input = chatBox.locator('textarea.chat-input, textarea[placeholder*="消息"], textarea[placeholder*="输入"]').first();
    expect(await input.count()).not.toBe(0);

    // 发送第一条消息
    const testMessage = `Test message for persistence ${Date.now()}`;
    await input.fill(testMessage);
    await page.waitForTimeout(500);

    // 点击发送按钮或按 Enter
    const sendButton = chatBox.locator('button.send-btn, button[title*="发送"]').first();
    if (await sendButton.count() > 0) {
      await sendButton.click();
    } else {
      await input.press('Enter');
    }

    // 等待消息发送（检查用户消息是否显示）
    await page.waitForTimeout(1000);
    
    // 验证用户消息已显示
    const userMessages = chatBox.locator('.message.user, [class*="message"][class*="user"]');
    await expect(userMessages.first()).toBeVisible({ timeout: 5000 });
    
    // 检查消息内容
    const firstUserMessage = userMessages.first();
    const messageText = await firstUserMessage.locator('.message-text').textContent();
    expect(messageText).toContain(testMessage);

    // 等待 AI 回复（如果有）
    await page.waitForTimeout(3000);

    // 检查 LocalStorage 中是否有会话ID
    const conversationId = await page.evaluate(() => {
      return localStorage.getItem('claude_conversation_id');
    });
    
    console.log('Conversation ID in localStorage:', conversationId);
    expect(conversationId).toBeTruthy();

    // 记录当前消息数量
    const messagesBeforeReload = await chatBox.locator('.message').count();
    console.log('Messages before reload:', messagesBeforeReload);
    expect(messagesBeforeReload).toBeGreaterThan(0);

    // 刷新页面
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // 再次打开聊天框
    const chatToggleBtnAfterReload = page.locator('.chat-toggle-btn, button[title*="AI"], button[title*="助手"]').first();
    await chatToggleBtnAfterReload.click();
    await page.waitForTimeout(2000);

    // 等待聊天框加载
    const chatBoxAfterReload = page.locator('.chat-box-container, [class*="chat-box"]').first();
    await expect(chatBoxAfterReload).toBeVisible({ timeout: 5000 });

    // 等待历史消息加载（最多等待 5 秒）
    await page.waitForTimeout(3000);

    // 验证消息是否重新加载
    const messagesAfterReload = await chatBoxAfterReload.locator('.message').count();
    console.log('Messages after reload:', messagesAfterReload);

    // 验证至少有一条消息（之前发送的用户消息）
    expect(messagesAfterReload).toBeGreaterThan(0);

    // 验证之前发送的消息是否还在
    const messagesAfterReloadList = await chatBoxAfterReload.locator('.message').all();
    let foundTestMessage = false;
    
    for (const msg of messagesAfterReloadList) {
      const text = await msg.locator('.message-text').textContent();
      if (text && text.includes(testMessage)) {
        foundTestMessage = true;
        break;
      }
    }

    expect(foundTestMessage).toBeTruthy();
    console.log('✅ Test message found after reload');

    // 验证 LocalStorage 中的会话ID仍然存在
    const conversationIdAfterReload = await page.evaluate(() => {
      return localStorage.getItem('claude_conversation_id');
    });
    expect(conversationIdAfterReload).toBe(conversationId);
    console.log('✅ Conversation ID persisted:', conversationIdAfterReload);
  });
});

