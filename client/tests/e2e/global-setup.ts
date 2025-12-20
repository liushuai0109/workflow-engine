/**
 * Playwright 全局设置
 * 在所有测试运行前执行，用于准备测试环境
 * 
 * 使用方式：
 * 设置环境变量 E2E_SETUP=true 来启用全局设置
 * export E2E_SETUP=true && npm run test:e2e
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🔧 开始全局测试环境设置...');

  const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
  const startBackend = process.env.START_BACKEND === 'true';

  // 如果需要启动后端服务
  if (startBackend) {
    console.log('📦 检查后端服务状态...');
    
    try {
      const response = await fetch(`${backendUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      } as RequestInit);
      
      if (response.ok) {
        console.log('✅ 后端服务已运行');
      } else {
        console.log('⚠️  后端服务响应异常，但继续测试');
      }
    } catch (error) {
      console.log('⚠️  后端服务未运行，某些API测试可能会跳过');
      console.log('   提示：可以手动启动后端服务或设置 START_BACKEND=true');
    }
  }

  // 验证前端服务（由 Playwright webServer 自动启动）
  console.log('🌐 前端服务将由 Playwright 自动启动');

  // 清理之前的测试数据（如果需要）
  // 例如：清理测试数据库、删除临时文件等
  console.log('🧹 清理测试环境...');
  
  // 这里可以添加清理逻辑
  // 例如：
  // - 清理测试数据库
  // - 删除临时文件
  // - 重置测试配置

  console.log('✅ 全局测试环境设置完成');
}

export default globalSetup;

