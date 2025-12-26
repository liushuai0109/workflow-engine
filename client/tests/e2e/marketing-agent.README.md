# 营销智能体 E2E 测试文档

## 测试概述

本测试套件覆盖营销智能体聊天页面的完整功能，包括：

### 测试范围

1. **基础功能测试** (`@quick`)
   - 页面加载和布局验证
   - 会话列表显示
   - 欢迎消息和输入框状态

2. **会话管理测试** (`@ui`)
   - 创建新会话
   - 切换会话
   - 删除会话（带确认）

3. **多步骤对话流程测试** (`@ui @full`)
   - 发送消息 → 表单 → 人群选择 → 人群推荐
   - 表单字段编辑
   - 人群推荐标签编辑

4. **错误场景测试** (`@ui`)
   - 空消息验证
   - 未选择人群时按钮禁用

5. **状态持久化测试** (`@ui`)
   - 刷新页面后会话保持
   - 切换会话后数据正确加载

6. **性能测试** (`@performance`)
   - 页面加载性能
   - 消息发送响应时间

7. **响应式布局测试**
   - 移动端适配
   - 平板端适配

## 运行测试

### 前置条件

1. 确保前端和后端服务已启动：
   ```bash
   # 启动后端（在根目录）
   cd server-nodejs
   npm run dev

   # 启动前端（在 client 目录）
   cd client
   npm run dev
   ```

2. 确保数据库已运行并完成迁移

### 运行所有营销智能体测试

```bash
cd client
npx playwright test marketing-agent.spec.ts
```

### 运行特定测试模式

#### 快速测试（仅 @quick 标记的测试）
```bash
npx playwright test marketing-agent.spec.ts --grep @quick
```

#### UI 交互测试
```bash
npx playwright test --project=ui marketing-agent.spec.ts
```

#### 完整流程测试
```bash
npx playwright test --project=full marketing-agent.spec.ts
```

#### 性能测试
```bash
npx playwright test --project=performance marketing-agent.spec.ts
```

### 运行单个测试

```bash
# 运行特定的测试用例
npx playwright test marketing-agent.spec.ts -g "完整对话流程"
```

### 调试模式

```bash
# 使用调试模式运行（打开浏览器并暂停）
npx playwright test marketing-agent.spec.ts --debug

# 运行特定测试并显示浏览器
npx playwright test marketing-agent.spec.ts --headed --project=chromium
```

### 查看测试报告

```bash
# 运行测试后查看 HTML 报告
npx playwright show-report ../reports/playwright-report
```

## 测试结构

```
marketing-agent.spec.ts
├── 基础功能测试
│   ├── 页面加载成功并显示三栏布局 @quick
│   ├── 左侧会话列表显示正确 @quick
│   ├── 聊天区域显示欢迎消息 @quick
│   └── 输入框和发送按钮状态正确 @quick
│
├── 会话管理测试
│   ├── 创建新会话 @ui
│   ├── 切换会话 @ui
│   └── 删除会话（带确认） @ui
│
├── 多步骤对话流程测试
│   ├── 完整对话流程 @ui @full
│   ├── 表单字段可编辑 @ui
│   └── 人群推荐标签可编辑 @ui
│
├── 错误场景测试
│   ├── 未选择会话时输入框禁用 @ui
│   ├── 空消息无法发送 @quick
│   └── 未选择人群时按钮禁用 @ui
│
├── 状态持久化测试
│   ├── 刷新页面后会话保持 @ui
│   └── 切换会话后再切换回来 @ui
│
├── 性能测试
│   ├── 页面加载性能 @performance
│   └── 消息发送响应时间 @performance
│
└── 响应式布局测试
    ├── 移动端布局适配
    └── 平板端布局适配
```

## 测试标签说明

- `@quick`: 快速测试，通常 < 30 秒
- `@ui`: UI 交互测试
- `@full`: 完整流程测试
- `@performance`: 性能测试
- `@marketing`: 营销智能体相关测试

## 已知问题和待办

### 待实现功能
- ⏳ 右侧方案预览面板（T13）
- ⏳ 营销流程图生成（T23-T24）
- ⏳ 真实 Claude API 集成

### 测试覆盖待完善
- [ ] 后端 API 集成测试（待实现真实 API 后）
- [ ] 流程图生成测试（待功能实现）
- [ ] 方案预览面板测试（待功能实现）
- [ ] 网络错误场景测试
- [ ] 并发会话测试

## 辅助函数说明

### `navigateToMarketingAgent(page)`
导航到营销智能体页面，从首页点击入口卡片。

### `waitForMessages(page, timeout)`
等待消息容器加载完成，并等待加载动画消失。

### `sendMessage(page, message)`
发送聊天消息，填充输入框并点击发送按钮。

### `waitForAIResponse(page, timeout)`
等待 AI 响应完成，等待流式加载指示器消失。

## 故障排查

### 测试失败常见原因

1. **超时错误**
   - 确保前后端服务正常运行
   - 检查网络连接
   - 增加 timeout 配置

2. **元素未找到**
   - 检查选择器是否正确
   - 确认功能是否已实现
   - 查看测试截图和视频

3. **断言失败**
   - 检查测试数据是否正确
   - 验证后端 API 返回
   - 查看浏览器控制台错误

### 查看失败详情

```bash
# 测试失败后会生成截图和视频
ls -la ../reports/playwright-report/

# 查看详细的追踪信息
npx playwright show-trace path/to/trace.zip
```

## CI/CD 集成

测试可以在 CI/CD 环境中运行：

```yaml
# 示例 GitHub Actions 配置
- name: Run Marketing Agent E2E Tests
  run: |
    cd client
    npx playwright test marketing-agent.spec.ts --project=full
  env:
    CI: true
    BACKEND_URL: http://localhost:3000
    FRONTEND_URL: http://localhost:8000
```

## 贡献指南

添加新测试时，请遵循：

1. 使用描述性的测试名称
2. 添加适当的标签（@quick, @ui, @performance 等）
3. 使用辅助函数避免代码重复
4. 添加清晰的注释说明测试目的
5. 确保测试可独立运行
6. 清理测试数据（如果有）

## 联系方式

如有问题或建议，请联系开发团队或提交 Issue。
