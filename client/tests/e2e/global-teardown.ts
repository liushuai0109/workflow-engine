/**
 * Playwright 全局清理
 * 在所有测试运行后执行，用于清理测试环境
 * 
 * 按照 Playwright 规范，此文件负责：
 * 1. 停止后端服务（如果由 globalSetup 启动，且原本不在运行）
 * 2. 清理测试数据
 * 3. 生成测试报告摘要
 * 
 * 使用方式：
 * 设置环境变量 E2E_TEARDOWN=true 来启用全局清理
 * export E2E_TEARDOWN=true && npm run test:e2e
 * 
 * 或者使用 npm run test:e2e:auto* 命令（已自动设置）
 */

import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import { existsSync, readFileSync, unlinkSync } from 'fs';

const BACKEND_PID_FILE = '/tmp/workflow-engine-backend.pid';
const BACKEND_WAS_RUNNING_FILE = '/tmp/workflow-engine-backend-was-running';

/**
 * 停止后端服务
 */
function stopBackend(): void {
  // 检查后端是否原本在运行
  if (existsSync(BACKEND_WAS_RUNNING_FILE)) {
    try {
      const wasRunning = readFileSync(BACKEND_WAS_RUNNING_FILE, 'utf-8').trim() === 'true';
      if (wasRunning) {
        console.log('ℹ️  后端服务原本就在运行，不停止它');
        // 清理标记文件
        try {
          unlinkSync(BACKEND_WAS_RUNNING_FILE);
        } catch {
          // 忽略删除错误
        }
        return;
      }
    } catch {
      // 忽略读取错误，继续停止流程
    }
  }

  if (!existsSync(BACKEND_PID_FILE)) {
    // 即使没有 PID 文件，也尝试杀掉所有相关进程
    console.log('🛑 清理所有后端相关进程...');
    try {
      execSync('pkill -f "go run cmd/server/main.go" || true', { stdio: 'ignore' });
      console.log('✅ 后端进程已清理');
    } catch {
      // 忽略错误
    }
    return;
  }

  try {
    const pid = readFileSync(BACKEND_PID_FILE, 'utf-8').trim();

    console.log(`🛑 停止后端服务 (PID: ${pid})...`);

    // 停止所有相关的 go run 进程
    try {
      // 先尝试优雅停止主进程
      execSync(`kill ${pid} 2>/dev/null || true`, { stdio: 'ignore' });
      // 等待 2 秒
      execSync('sleep 2', { stdio: 'ignore' });

      // 强制清理所有相关进程
      execSync('pkill -f "go run cmd/server/main.go" 2>/dev/null || true', { stdio: 'ignore' });
      execSync('pkill -f "cmd/server/main.go" 2>/dev/null || true', { stdio: 'ignore' });

      console.log('✅ 后端服务已停止');
    } catch (error) {
      console.warn('⚠️  停止后端服务时出错:', error);
    }

    // 删除 PID 文件和标记文件
    try {
      unlinkSync(BACKEND_PID_FILE);
      if (existsSync(BACKEND_WAS_RUNNING_FILE)) {
        unlinkSync(BACKEND_WAS_RUNNING_FILE);
      }
    } catch {
      // 忽略删除错误
    }
  } catch (error) {
    console.warn('⚠️  读取 PID 文件失败:', error);
  }
}

async function globalTeardown(config: FullConfig) {
  console.log('');
  console.log('🧹 开始全局测试环境清理...');
  console.log('');

  // 停止后端服务（如果由 globalSetup 启动，且原本不在运行）
  const startBackend = process.env.START_BACKEND === 'true' || process.env.AUTO_START_BACKEND === 'true';
  const skipBackend = process.env.SKIP_BACKEND === 'true';
  if (startBackend && !skipBackend) {
    stopBackend();
  }

  // 清理测试数据
  console.log('🧹 清理测试数据...');
  // TODO: 在这里添加测试数据清理逻辑
  // 例如：
  // - 删除测试创建的数据库记录
  // - 清理临时文件
  // - 重置测试配置

  // 生成测试报告摘要
  console.log('');
  console.log('📊 测试执行完成');
  console.log('   查看详细报告: npm run test:e2e:report');
  console.log('');

  console.log('✅ 全局测试环境清理完成');
}

export default globalTeardown;

