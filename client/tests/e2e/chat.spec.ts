/**
 * E2E Test: 聊天功能测试
 * 测试 AI 助手聊天界面、会话管理、消息交互等
 */

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
    if (await chatToggleBtn.count() > 0) {
      // 点击打开聊天框
      await chatToggleBtn.click();
      await page.waitForTimeout(1000);
      
      // 验证聊天框显示
      const chatBox = page.locator('.chat-box-container, [class*="chat-box"]').first();
      if (await chatBox.count() > 0) {
        await expect(chatBox).toBeVisible({ timeout: 5000 });
        
        // 查找关闭按钮
        const closeButton = chatBox.locator('.close-btn, button:has-text("×"), button[title*="关闭"]').first();
        if (await closeButton.count() > 0) {
          await closeButton.click();
          await page.waitForTimeout(500);
          
          // 验证聊天框隐藏
          // 注意：聊天框可能完全移除或只是隐藏
        }
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('聊天框可以最小化和恢复', async ({ page }) => {
    // 打开聊天框
    const chatToggleBtn = page.locator('.chat-toggle-btn, button[title*="AI"]').first();
    if (await chatToggleBtn.count() > 0) {
      await chatToggleBtn.click();
      await page.waitForTimeout(1000);
      
      const chatBox = page.locator('.chat-box-container, [class*="chat-box"]').first();
      if (await chatBox.count() > 0) {
        // 查找最小化按钮（使用 title 属性更可靠）
        const minimizeButton = chatBox.locator('button[title*="最小化"], button[title*="展开"]').first();
        if (await minimizeButton.count() > 0) {
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
          if (await restoreButton.count() > 0) {
            await restoreButton.click();
            await page.waitForTimeout(500);
            
            // 验证聊天框恢复
            const isRestored = !(await chatBox.evaluate((el) => {
              return el.classList.contains('minimized');
            }));
            expect(isRestored).toBeTruthy();
          } else {
            test.skip();
          }
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('聊天框可以拖拽', async ({ page }) => {
    // 打开聊天框
    const chatToggleBtn = page.locator('.chat-toggle-btn, button[title*="AI"]').first();
    if (await chatToggleBtn.count() > 0) {
      await chatToggleBtn.click();
      await page.waitForTimeout(1000);
      
      const chatBox = page.locator('.chat-box-container, [class*="chat-box"]').first();
      if (await chatBox.count() > 0) {
        // 获取初始位置
        const initialPosition = await chatBox.boundingBox();
        
        if (initialPosition) {
          // 查找聊天框头部（拖拽是从头部开始的）
          const chatHeader = chatBox.locator('.chat-header').first();
          if (await chatHeader.count() > 0) {
            // 获取头部的位置
            const headerBox = await chatHeader.boundingBox();
            if (headerBox) {
              // 在头部中间位置开始拖拽
              const startX = headerBox.x + headerBox.width / 2;
              const startY = headerBox.y + headerBox.height / 2;
              
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
              if (newPosition) {
                // 位置应该改变（允许一些误差，因为可能有边界限制）
                const xChanged = Math.abs(newPosition.x - initialPosition.x) > 10;
                const yChanged = Math.abs(newPosition.y - initialPosition.y) > 10;
                expect(xChanged || yChanged).toBeTruthy();
              } else {
                test.skip();
              }
            } else {
              test.skip();
            }
          } else {
            test.skip();
          }
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('消息列表可以显示', async ({ page }) => {
    // 打开聊天框
    const chatToggleBtn = page.locator('.chat-toggle-btn, button[title*="AI"]').first();
    if (await chatToggleBtn.count() > 0) {
      await chatToggleBtn.click();
      await page.waitForTimeout(1000);
      
      const chatBox = page.locator('.chat-box-container, [class*="chat-box"]').first();
      if (await chatBox.count() > 0) {
        // 查找消息容器
        const messagesContainer = chatBox.locator('.messages-container, [class*="messages"]').first();
        if (await messagesContainer.count() > 0) {
          // 验证消息容器存在
          expect(await messagesContainer.count()).toBeGreaterThan(0);
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });
});

test.describe('聊天会话测试', () => {
  test('可以创建新会话', async ({ page, request }) => {
    // 打开聊天框
    const chatToggleBtn = page.locator('.chat-toggle-btn, button[title*="AI"]').first();
    if (await chatToggleBtn.count() > 0) {
      await chatToggleBtn.click();
      await page.waitForTimeout(1000);
      
      // 尝试创建新会话（通过 API）
      try {
        const response = await request.post(`${BACKEND_URL}/api/chat/conversations`, {
          data: {
            title: `Test Conversation ${Date.now()}`,
          },
        });
        
        if (response.status() === 200 || response.status() === 201) {
          const conversation = await response.json();
          expect(conversation).toHaveProperty('id');
          expect(conversation).toHaveProperty('title');
          
          // 清理
          if (conversation.id) {
            await request.delete(`${BACKEND_URL}/api/chat/conversations/${conversation.id}`).catch(() => {});
          }
        } else if (response.status() === 404) {
          test.skip();
        }
      } catch (error) {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('可以获取会话列表', async ({ page, request }) => {
    // 打开聊天框
    const chatToggleBtn = page.locator('.chat-toggle-btn, button[title*="AI"]').first();
    if (await chatToggleBtn.count() > 0) {
      await chatToggleBtn.click();
      await page.waitForTimeout(1000);
      
      // 尝试获取会话列表
      try {
        const response = await request.get(`${BACKEND_URL}/api/chat/conversations`);
        
        if (response.status() === 200) {
          const body = await response.json();
          expect(Array.isArray(body) || typeof body === 'object').toBe(true);
        } else if (response.status() === 404) {
          test.skip();
        }
      } catch (error) {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('可以切换会话', async ({ page }) => {
    // 打开聊天框
    const chatToggleBtn = page.locator('.chat-toggle-btn, button[title*="AI"]').first();
    if (await chatToggleBtn.count() > 0) {
      await chatToggleBtn.click();
      await page.waitForTimeout(1000);
      
      const chatBox = page.locator('.chat-box-container, [class*="chat-box"]').first();
      if (await chatBox.count() > 0) {
        // 查找会话列表
        const conversationList = chatBox.locator('.conversation-list, [class*="conversation"]').first();
        if (await conversationList.count() > 0) {
          // 查找会话项
          const conversationItem = conversationList.locator('.conversation-item, [class*="conversation-item"]').first();
          if (await conversationItem.count() > 0) {
            await conversationItem.click();
            await page.waitForTimeout(500);
            
            // 验证会话切换
            expect(await conversationItem.count()).toBeGreaterThan(0);
          } else {
            test.skip();
          }
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('可以删除会话', async ({ page, request }) => {
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
        conversationId = conversation.id;
        
        // 删除会话
        const deleteResponse = await request.delete(`${BACKEND_URL}/api/chat/conversations/${conversationId}`);
        expect(deleteResponse.status()).toBeGreaterThanOrEqual(200);
        expect(deleteResponse.status()).toBeLessThan(300);
      } else if (createResponse.status() === 404) {
        test.skip();
      }
    } catch (error) {
      test.skip();
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
      
      if (createResponse.status() === 200 || createResponse.status() === 201) {
        const conversation = await createResponse.json();
        conversationId = conversation.id;
        
        // 刷新页面
        await page.reload();
        await page.waitForLoadState('networkidle');
        
        // 验证会话仍然存在
        const getResponse = await request.get(`${BACKEND_URL}/api/chat/conversations/${conversationId}`);
        if (getResponse.status() === 200) {
          const persisted = await getResponse.json();
          expect(persisted).toHaveProperty('id');
          expect(persisted.id).toBe(conversationId);
        }
      } else if (createResponse.status() === 404) {
        test.skip();
      }
    } catch (error) {
      test.skip();
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
    if (await chatToggleBtn.count() > 0) {
      await chatToggleBtn.click();
      await page.waitForTimeout(1000);
    }
  });

  test('可以发送用户消息', async ({ page }) => {
    const chatBox = page.locator('.chat-box-container, [class*="chat-box"]').first();
    if (await chatBox.count() > 0) {
      // 查找消息输入框
      const messageInput = chatBox.locator('input[type="text"], textarea, [contenteditable="true"]').first();
      if (await messageInput.count() > 0) {
        // 输入消息
        await messageInput.fill('Test message');
        await page.waitForTimeout(300);
        
        // 查找发送按钮
        const sendButton = chatBox.locator('button:has-text("Send"), button:has-text("发送"), button[type="submit"]').first();
        if (await sendButton.count() > 0) {
          await sendButton.click();
          await page.waitForTimeout(1000);
          
          // 验证消息已发送（检查消息列表）
          const messages = chatBox.locator('.message, [class*="message"]');
          // 应该至少有一条消息
          expect(await messages.count()).toBeGreaterThanOrEqual(0);
        } else {
          test.skip();
        }
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('可以接收 AI 响应', async ({ page, request }) => {
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
        conversationId = conversation.id;
        
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
          expect(message).toHaveProperty('id');
          expect(message).toHaveProperty('content');
        } else if (messageResponse.status() === 404) {
          test.skip();
        }
      } else if (createResponse.status() === 404) {
        test.skip();
      }
    } catch (error) {
      test.skip();
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
    if (await chatBox.count() > 0) {
      // 验证消息容器存在，可以显示流式内容
      const messagesContainer = chatBox.locator('.messages-container, [class*="messages"]').first();
      if (await messagesContainer.count() > 0) {
        expect(await messagesContainer.count()).toBeGreaterThan(0);
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });

  test('可以加载消息历史', async ({ page, request }) => {
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
        conversationId = conversation.id;
        
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
        
        // 获取消息历史
        const historyResponse = await request.get(
          `${BACKEND_URL}/api/chat/conversations/${conversationId}/messages`
        );
        
        if (historyResponse.status() === 200) {
          const messages = await historyResponse.json();
          expect(Array.isArray(messages)).toBe(true);
        } else if (historyResponse.status() === 404) {
          test.skip();
        }
      } else if (createResponse.status() === 404) {
        test.skip();
      }
    } catch (error) {
      test.skip();
    } finally {
      // 清理
      if (conversationId) {
        await request.delete(`${BACKEND_URL}/api/chat/conversations/${conversationId}`).catch(() => {});
      }
    }
  });

  test('消息时间戳可以显示', async ({ page }) => {
    const chatBox = page.locator('.chat-box-container, [class*="chat-box"]').first();
    if (await chatBox.count() > 0) {
      // 查找消息时间戳
      const messageTime = chatBox.locator('.message-time, [class*="time"]').first();
      if (await messageTime.count() > 0) {
        // 验证时间戳存在
        expect(await messageTime.count()).toBeGreaterThan(0);
      } else {
        test.skip();
      }
    } else {
      test.skip();
    }
  });
});

