import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 配置
 * 用于 E2E 测试和 Headless Browser 验证
 */
export default defineConfig({
  testDir: '../tests/e2e',
  
  // 测试超时设置
  timeout: 30 * 1000,
  expect: {
    timeout: 5000,
  },
  
  // 失败重试策略
  retries: process.env.CI ? 2 : 0,
  
  // 并行执行
  workers: process.env.CI ? 1 : undefined,
  
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
  globalSetup: process.env.E2E_SETUP ? '../tests/e2e/global-setup.ts' : undefined,
  globalTeardown: process.env.E2E_TEARDOWN ? '../tests/e2e/global-teardown.ts' : undefined,

  // 测试项目配置
  projects: [
    // Headless Browser 验证项目（快速验证，< 2分钟）
    {
      name: 'headless-verification',
      use: { 
        ...devices['Desktop Chrome'],
        headless: true,
      },
      testMatch: '**/headless-verification.spec.ts',
      timeout: 10 * 1000, // 快速测试，超时时间更短
    },
    
    // 快速测试模式（核心功能，< 2分钟）
    {
      name: 'quick',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/core-features.spec.ts'],
      grep: /@quick/,
      timeout: 15 * 1000,
    },
    
    // 完整测试模式（核心功能 + 接口集成，< 10分钟）
    {
      name: 'full',
      use: { ...devices['Desktop Chrome'] },
      testMatch: ['**/core-features.spec.ts', '**/api-integration.spec.ts'],
      timeout: 30 * 1000,
    },
    
    // 完整测试套件（所有测试，< 30分钟）
    {
      name: 'e2e',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/*.spec.ts',
      testIgnore: '**/headless-verification.spec.ts',
      timeout: 30 * 1000,
    },
  ],

  // Web 服务器配置（用于启动开发服务器）
  // 注意：Playwright只支持单个webServer配置
  // 如果需要同时启动后端，使用环境变量 START_BACKEND=true 并在测试中手动启动
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

