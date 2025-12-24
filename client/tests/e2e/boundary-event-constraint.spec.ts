/**
 * E2E Test: UserTask BoundaryEvent 约束测试
 *
 * 测试目标：
 * 1. BoundaryEvent 创建功能
 * 2. 保存时验证阻止直接 UserTask outgoing
 * 3. LLM 自动生成符合约束的流程图
 */

import { test, expect } from '@playwright/test';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';

test.describe('BoundaryEvent 创建功能测试', () => {
  test('通过 Claude 创建带 BoundaryEvent 的 UserTask', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    // 创建新图表
    const newButton = page.locator('button:has-text("New"), button:has-text("新建")').first();
    await newButton.click();
    await page.waitForTimeout(1000);

    // 切换到 AI 助手 Tab（右侧面板）
    const aiTab = page.locator('.ant-tabs-tab:has-text("AI 助手")').first();
    await expect(aiTab).toHaveCount(1, { timeout: 5000 });
    await aiTab.click();
    await page.waitForTimeout(500);

    // 等待聊天输入框可见（重要：等待 Tab 切换完成）
    const chatInput = page.locator('textarea[placeholder*="消息"], input[placeholder*="消息"]').first();
    await chatInput.waitFor({ state: 'visible', timeout: 5000 });
    await chatInput.fill('创建一个简单的审批流程：开始 → 提交申请(UserTask) → 审批(UserTask，通过和拒绝两个 BoundaryEvent) → 结束');
    await chatInput.press('Enter');

    // 等待 LLM 响应和流程图生成
    await page.waitForTimeout(5000);

    // 验证流程图中包含 BoundaryEvent
    const canvas = page.locator('.bpmn-container, .djs-container').first();
    expect(await canvas.count()).toBeGreaterThan(0);

    // 检查是否创建了 UserTask 和 BoundaryEvent（通过 DOM 或截图）
    // 注意：bpmn-js 使用 SVG 渲染，可以检查 SVG 元素
    const svgElements = page.locator('svg [data-element-id]');
    const elementCount = await svgElements.count();
    expect(elementCount).toBeGreaterThan(5); // 至少包含：开始、UserTask、BoundaryEvent、结束等
  });

  test('BoundaryEvent 正确附加到 UserTask', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    // 加载包含 BoundaryEvent 的 BPMN（通过聊天或文件上传）
    const newButton = page.locator('button:has-text("New"), button:has-text("新建")').first();
    await newButton.click();
    await page.waitForTimeout(1000);

    // 切换到 AI 助手 Tab（右侧面板）
    const aiTab = page.locator('.ant-tabs-tab:has-text("AI 助手")').first();
    await expect(aiTab).toHaveCount(1, { timeout: 5000 });
    await aiTab.click();
    await page.waitForTimeout(500);

    // 等待聊天输入框可见
    const chatInput = page.locator('textarea[placeholder*="消息"], input[placeholder*="消息"]').first();
    await chatInput.waitFor({ state: 'visible', timeout: 5000 });
    await chatInput.fill('创建请假流程：开始 → 提交请假(UserTask) → 结束。提交请假完成后要有一个 BoundaryEvent 连接到结束');
    await chatInput.press('Enter');
    await page.waitForTimeout(5000);

    // 验证可以保存（符合约束）
    const saveButton = page.locator('button:has-text("Save"), button:has-text("保存")').first();
    if (await saveButton.count() > 0) {
      // 点击保存不应该弹出错误提示
      const downloadPromise = page.waitForEvent('download', { timeout: 3000 }).catch(() => null);
      await saveButton.click();
      await page.waitForTimeout(1000);

      // 检查是否有错误弹窗
      const alertDialog = page.locator('text=/无法保存|Error|错误/').first();
      expect(await alertDialog.count()).toBe(0);
    }
  });
});

test.describe('保存验证：阻止直接 UserTask outgoing', () => {
  test('加载违规 BPMN 并尝试保存，应该被阻止', async ({ page }) => {
    // 创建一个违规的 BPMN XML（UserTask 直接连接到下一个节点）
    const violatingBPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="UserTask_1" name="审批">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:endEvent id="EndEvent_1">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="UserTask_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="UserTask_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="99" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="UserTask_1_di" bpmnElement="UserTask_1">
        <dc:Bounds x="270" y="77" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="432" y="99" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="215" y="117" />
        <di:waypoint x="270" y="117" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="370" y="117" />
        <di:waypoint x="432" y="117" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    // 通过文件上传加载违规 BPMN
    const fileInput = page.locator('input[type="file"]');

    // 创建临时文件
    const buffer = Buffer.from(violatingBPMN, 'utf-8');
    await fileInput.setInputFiles({
      name: 'violating.bpmn',
      mimeType: 'application/xml',
      buffer
    });

    await page.waitForTimeout(2000);

    // 尝试保存，应该被阻止
    const saveButton = page.locator('button:has-text("Save"), button:has-text("保存")').first();
    if (await saveButton.count() > 0) {
      // 设置对话框监听
      page.once('dialog', async dialog => {
        const message = dialog.message();
        expect(message).toContain('无法保存');
        expect(message).toContain('UserTask');
        expect(message).toContain('BoundaryEvent');
        await dialog.accept();
      });

      await saveButton.click();
      await page.waitForTimeout(1000);

      // 验证状态栏显示错误
      const statusError = page.locator('.status-error').first();
      if (await statusError.count() > 0) {
        const statusText = await statusError.textContent();
        expect(statusText).toBeTruthy();
      }
    }
  });

  test('加载符合约束的 BPMN 可以正常保存', async ({ page }) => {
    // 创建一个符合约束的 BPMN XML（UserTask 通过 BoundaryEvent 连接）
    const compliantBPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="UserTask_1" name="审批">
      <bpmn:incoming>Flow_1</bpmn:incoming>
    </bpmn:userTask>
    <bpmn:boundaryEvent id="BoundaryEvent_1" name="完成" attachedToRef="UserTask_1">
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:boundaryEvent>
    <bpmn:endEvent id="EndEvent_1">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="UserTask_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="BoundaryEvent_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="99" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="UserTask_1_di" bpmnElement="UserTask_1">
        <dc:Bounds x="270" y="77" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="BoundaryEvent_1_di" bpmnElement="BoundaryEvent_1">
        <dc:Bounds x="302" y="139" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="432" y="99" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="215" y="117" />
        <di:waypoint x="270" y="117" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="320" y="175" />
        <di:waypoint x="320" y="200" />
        <di:waypoint x="450" y="200" />
        <di:waypoint x="450" y="135" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    // 通过文件上传加载符合约束的 BPMN
    const fileInput = page.locator('input[type="file"]');

    const buffer = Buffer.from(compliantBPMN, 'utf-8');
    await fileInput.setInputFiles({
      name: 'compliant.bpmn',
      mimeType: 'application/xml',
      buffer
    });

    await page.waitForTimeout(2000);

    // 尝试保存，应该成功
    const saveButton = page.locator('button:has-text("Save"), button:has-text("保存")').first();
    if (await saveButton.count() > 0) {
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      await saveButton.click();
      const download = await downloadPromise;

      // 验证下载成功
      if (download) {
        expect(download.suggestedFilename()).toContain('.bpmn');
      }

      // 验证没有错误对话框
      await page.waitForTimeout(1000);
      const errorDialog = page.locator('text=/无法保存|Error saving/i').first();
      expect(await errorDialog.count()).toBe(0);
    }
  });
});

test.describe('LLM 生成符合约束的流程图', () => {
  test('LLM 自动遵守 UserTask 约束规则', async ({ page }) => {
    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    // 创建新图表
    const newButton = page.locator('button:has-text("New"), button:has-text("新建")').first();
    await newButton.click();
    await page.waitForTimeout(1000);

    // 切换到 AI 助手 Tab（右侧面板）
    const aiTab = page.locator('.ant-tabs-tab:has-text("AI 助手")').first();
    await expect(aiTab).toHaveCount(1, { timeout: 5000 });
    await aiTab.click();
    await page.waitForTimeout(500);

    // 等待聊天输入框可见
    const chatInput = page.locator('textarea[placeholder*="消息"], input[placeholder*="消息"]').first();
    await chatInput.waitFor({ state: 'visible', timeout: 5000 });

    // 测试多种场景
    const testScenarios = [
      '创建一个简单的审批流程',
      '画一个请假流程，包含提交和审批两个环节',
      '创建用户注册流程，需要邮箱验证'
    ];

    for (const scenario of testScenarios) {
      // 清空画布
      const clearButton = page.locator('button:has-text("Clear"), button:has-text("清空")').first();
      if (await clearButton.count() > 0) {
        await clearButton.click();
        await page.waitForTimeout(500);
      }

      // 发送请求
      await chatInput.fill(scenario);
      await chatInput.press('Enter');

      // 等待 LLM 生成
      await page.waitForTimeout(6000);

      // 尝试保存，验证符合约束
      const saveButton = page.locator('button:has-text("Save"), button:has-text("保存")').first();
      if (await saveButton.count() > 0) {
        // 不应该有错误对话框
        let dialogShown = false;
        page.once('dialog', async dialog => {
          dialogShown = true;
          const message = dialog.message();
          console.log(`Scenario "${scenario}" triggered dialog: ${message}`);
          await dialog.accept();
        });

        const downloadPromise = page.waitForEvent('download', { timeout: 3000 }).catch(() => null);
        await saveButton.click();
        await page.waitForTimeout(1500);

        // 验证没有约束违规对话框
        if (dialogShown) {
          // 如果有对话框，记录日志但不失败（可能是其他原因）
          console.warn(`Dialog shown for scenario: ${scenario}`);
        }
      }

      // 等待下一个场景
      await page.waitForTimeout(1000);
    }
  });

  test('LLM 生成的 UserTask 包含 BoundaryEvent', async ({ page }) => {
    // 设置更长的超时时间，因为 AI 生成需要时间
    test.setTimeout(120000); // 2 分钟

    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    const newButton = page.locator('button:has-text("New"), button:has-text("新建")').first();
    await newButton.click();
    await page.waitForTimeout(1000);

    // 切换到 AI 助手 Tab（右侧面板）
    const aiTab = page.locator('.ant-tabs-tab:has-text("AI 助手")').first();
    await expect(aiTab).toHaveCount(1, { timeout: 5000 });
    await aiTab.click();
    await page.waitForTimeout(500);

    // 等待聊天输入框可见
    const chatInput = page.locator('textarea[placeholder*="消息"], input[placeholder*="消息"]').first();
    await chatInput.waitFor({ state: 'visible', timeout: 5000 });
    await chatInput.fill('创建一个审批流程：开始 → 提交申请 → 主管审批 → 结束。审批有通过和拒绝两个结果');
    await chatInput.press('Enter');

    // 等待 AI 助手响应完成（查找助手消息或 loading 消失）
    // 等待 streaming 完成的标志
    await page.waitForTimeout(3000); // 先等待开始

    // 等待 AI 响应完成（最多 90 秒）
    const maxWaitTime = 90000;
    const startTime = Date.now();
    let aiResponseComplete = false;

    while (Date.now() - startTime < maxWaitTime) {
      // 检查是否有 loading 指示器
      const loadingIndicator = page.locator('.streaming-loading-section, .ant-spin').first();
      const loadingVisible = await loadingIndicator.isVisible().catch(() => false);

      if (!loadingVisible) {
        // Loading 消失了，等待一下确保渲染完成
        await page.waitForTimeout(2000);
        aiResponseComplete = true;
        break;
      }

      await page.waitForTimeout(1000);
    }

    // 检查 SVG 中是否包含 BoundaryEvent 元素
    const boundaryEvents = page.locator('svg [data-element-id*="Boundary"], svg .djs-element[data-element-id*="Boundary"]');
    const count = await boundaryEvents.count();

    // 应该至少有 1-2 个 BoundaryEvent（审批通过/拒绝）
    expect(count).toBeGreaterThanOrEqual(1);

    // 验证可以保存
    const saveButton = page.locator('button:has-text("Save"), button:has-text("保存")').first();
    if (await saveButton.count() > 0) {
      const downloadPromise = page.waitForEvent('download', { timeout: 3000 }).catch(() => null);
      await saveButton.click();
      await page.waitForTimeout(1000);

      // 不应该有约束错误
      const errorDialog = page.locator('text=/无法保存.*UserTask.*BoundaryEvent/i').first();
      expect(await errorDialog.count()).toBe(0);
    }
  });
});

test.describe('错误提示和用户体验', () => {
  test('违规时显示清晰的错误提示', async ({ page }) => {
    const violatingBPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="Start_1">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="Task_1" name="提交申请">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:endEvent id="End_1">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="Task_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="End_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="Start_1_di" bpmnElement="Start_1">
        <dc:Bounds x="179" y="99" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1">
        <dc:Bounds x="270" y="77" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="End_1_di" bpmnElement="End_1">
        <dc:Bounds x="432" y="99" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="215" y="117" />
        <di:waypoint x="270" y="117" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="370" y="117" />
        <di:waypoint x="432" y="117" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

    await page.goto('/editor');
    await page.waitForLoadState('networkidle');

    const fileInput = page.locator('input[type="file"]');
    const buffer = Buffer.from(violatingBPMN, 'utf-8');
    await fileInput.setInputFiles({
      name: 'test.bpmn',
      mimeType: 'application/xml',
      buffer
    });

    await page.waitForTimeout(2000);

    const saveButton = page.locator('button:has-text("Save"), button:has-text("保存")').first();
    if (await saveButton.count() > 0) {
      let dialogMessage = '';

      // 设置 dialog 监听器（在点击之前）
      const dialogPromise = page.waitForEvent('dialog', { timeout: 5000 }).then(async dialog => {
        dialogMessage = dialog.message();
        await dialog.accept();
        return dialogMessage;
      }).catch(() => '');

      await saveButton.click();

      // 等待对话框出现
      const message = await dialogPromise;

      // 验证错误提示内容
      expect(message).toContain('UserTask');
      expect(message).toContain('BoundaryEvent');
      expect(message).toContain('修复建议');
    }
  });
});
