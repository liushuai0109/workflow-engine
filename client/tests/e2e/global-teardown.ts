/**
 * Playwright 全局清理
 * 在所有测试运行后执行，用于清理测试环境
 * 
 * 使用方式：
 * 设置环境变量 E2E_TEARDOWN=true 来启用全局清理
 * export E2E_TEARDOWN=true && npm run test:e2e
 */

import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('🧹 开始全局测试环境清理...');

  // 清理测试数据
  // 例如：
  // - 删除测试创建的数据库记录
  // - 清理临时文件
  // - 重置测试配置

  // 如果启动了后端服务，可以在这里停止它
  const startBackend = process.env.START_BACKEND === 'true';
  if (startBackend) {
    console.log('🛑 停止后端服务...');
    // 这里可以添加停止后端服务的逻辑
  }

  // 生成测试报告摘要
  console.log('📊 测试执行完成');
  console.log('   查看详细报告: npm run test:e2e:report');

  console.log('✅ 全局测试环境清理完成');
}

export default globalTeardown;

