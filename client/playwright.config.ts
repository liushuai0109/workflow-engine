import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 配置
 * 用于 E2E 测试和 Headless Browser 验证
 */
export default defineConfig({
  testDir: './tests/e2e',
  
  // 测试超时设置
  timeout: 30 * 1000, // 默认超时 30 秒
  expect: {
    timeout: 5000, // 断言超时 5 秒
  },
  
  // 全局测试超时（可在项目级别覆盖）
  globalTimeout: process.env.CI ? 60 * 60 * 1000 : 30 * 60 * 1000, // CI: 1小时，本地: 30分钟
  
  // 失败重试策略
  retries: process.env.CI ? 2 : 0,
  
  // 并行执行
  // CI 环境：1 个 worker（避免资源竞争）
  // 本地环境：根据 CPU 核心数自动调整（默认）
  workers: process.env.CI ? 1 : undefined,
  
  // 最大失败测试数（超过此数量后停止运行）
  maxFailures: process.env.CI ? undefined : 10,
  
  // 报告配置
  reporter: [
    ['html', { outputFolder: '../reports/playwright-report', open: 'never' }],
    ['json', { outputFile: '../reports/playwright-report/results.json' }],
    ['junit', { outputFile: '../reports/playwright-report/junit.xml' }],
    ['list'],
  ],
  
  // 共享测试配置
  use: {
    // 基础 URL（开发服务器）
    baseURL: process.env.FRONTEND_URL || 'http://localhost:8000',
    
    // 后端 API URL
    extraHTTPHeaders: {
      'Accept': 'application/json',
    },
    
    // 截图和视频（仅在失败时）
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    
    // 追踪（仅在失败时）
    trace: 'retain-on-failure',
    
    // 测试环境变量
    // 可以通过 process.env.BACKEND_URL 访问后端URL
  },

  // 全局测试设置
  // 当设置了 AUTO_START_BACKEND 或 E2E_SETUP 时启用
  globalSetup: (process.env.AUTO_START_BACKEND || process.env.E2E_SETUP) 
    ? './tests/e2e/global-setup.ts' 
    : undefined,
  globalTeardown: (process.env.AUTO_START_BACKEND || process.env.E2E_TEARDOWN)
    ? './tests/e2e/global-teardown.ts'
    : undefined,

  // 测试项目配置
  projects: [
    // Headless Browser 验证项目（快速验证，< 1分钟）
    {
      name: 'headless-verification',
      use: { 
        ...devices['Desktop Chrome'],
        headless: true,
      },
      testMatch: '**/headless-verification.spec.ts',
      timeout: 10 * 1000,
    },
    
    // 快速测试模式（核心功能，< 2分钟）
    {
      name: 'quick',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/*.spec.ts'],
      grep: /@quick/,
      timeout: 20 * 1000, // 增加超时时间以适应更多测试
    },
    
    // API 测试模式（仅 API 相关测试，< 5分钟）
    {
      name: 'api',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/api-integration.spec.ts', '**/workflow-operations.spec.ts', '**/mock-debug.spec.ts', '**/chat.spec.ts'],
      grep: /@api|API|接口/,
      timeout: 30 * 1000,
    },
    
    // 性能测试模式（性能相关测试，< 5分钟）
    {
      name: 'performance',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/performance.spec.ts'],
      timeout: 60 * 1000, // 性能测试可能需要更长时间
    },
    
    // UI 测试模式（前端交互测试，< 10分钟）
    {
      name: 'ui',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/core-features.spec.ts', '**/workflow-operations.spec.ts', '**/mock-debug.spec.ts', '**/chat.spec.ts'],
      grep: /@ui|界面|交互/,
      timeout: 30 * 1000,
    },
    
    // 完整测试模式（核心功能 + 接口集成 + 回归测试，< 10分钟）
    {
      name: 'full',
      use: { ...devices['Desktop Chrome'] },
      testMatch: [
        '**/core-features.spec.ts',
        '**/api-integration.spec.ts',
        '**/regression.spec.ts',
        '**/workflow-operations.spec.ts',
        '**/mock-debug.spec.ts',
        '**/chat.spec.ts',
      ],
      timeout: 30 * 1000,
    },
    
    // 错误场景测试模式（错误处理测试，< 5分钟）
    {
      name: 'error-scenarios',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/error-scenarios.spec.ts', '**/regression.spec.ts'],
      timeout: 30 * 1000,
    },
    
    // 完整测试套件（所有测试，< 30分钟）
    {
      name: 'e2e',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/*.spec.ts',
      testIgnore: '**/headless-verification.spec.ts',
      timeout: 60 * 1000, // 完整测试套件需要更长的超时时间
    },
  ],

  // Web 服务器配置（用于启动开发服务器）
  // 注意：Playwright只支持单个webServer配置，所以只能管理前端服务
  // 后端服务由 global-setup.ts 管理（设置 AUTO_START_BACKEND=true 或 START_BACKEND=true）
  webServer: {
    command: 'npm run start',
    url: 'http://localhost:8000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'ignore',
    stderr: 'pipe',
    cwd: process.cwd(),
  },
});

