/**
 * Playwright 全局设置
 * 在所有测试运行前执行，用于准备测试环境
 * 
 * 按照 Playwright 规范，此文件负责：
 * 1. 检查数据库可用性
 * 2. 启动后端服务（如果需要）
 * 3. 验证服务健康状态
 * 4. 准备测试数据环境
 * 
 * 使用方式：
 * 设置环境变量 AUTO_START_BACKEND=true 来自动启动后端
 * export AUTO_START_BACKEND=true && npm run test:e2e
 * 
 * 或者使用 npm run test:e2e:auto* 命令（已自动设置）
 */

import { FullConfig } from '@playwright/test';
import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const BACKEND_PID_FILE = '/tmp/workflow-engine-backend.pid';
const BACKEND_WAS_RUNNING_FILE = '/tmp/workflow-engine-backend-was-running';
const BACKEND_PORT = process.env.BACKEND_PORT || '3000';
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${BACKEND_PORT}`;
const MAX_WAIT_TIME = 30; // 秒
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);

/**
 * 检查端口是否被占用
 */
function isPortInUse(port: number): boolean {
  try {
    execSync(`lsof -i :${port} -sTCP:LISTEN -t`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/**
 * 等待服务健康检查
 */
async function waitForService(url: string, serviceName: string, maxWait: number): Promise<boolean> {
  console.log(`⏳ 等待 ${serviceName} 服务就绪...`);
  
  const startTime = Date.now();
  const healthUrl = `${url}/health`;
  
  while (Date.now() - startTime < maxWait * 1000) {
    try {
      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      });
      
      if (response.ok) {
        console.log(`✅ ${serviceName} 服务已就绪`);
        return true;
      }
    } catch (error) {
      // 服务还未就绪，继续等待
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    process.stdout.write(`\r⏳ 等待中... ${elapsed}/${maxWait}s`);
  }
  
  console.log('');
  return false;
}

/**
 * 检查 PostgreSQL 数据库是否可用
 */
function checkDatabase(): boolean {
  console.log('📊 检查 PostgreSQL 数据库可用性...');
  
  const projectRoot = join(__dirname, '../../..');
  const serverDir = join(projectRoot, 'server');
  const envFile = join(serverDir, '.env');
  
  // 读取数据库配置
  let dbName = 'lifecycle_ops';
  let dbUser = 'postgres';
  let dbPassword = '';
  
  if (existsSync(envFile)) {
    try {
      const envContent = readFileSync(envFile, 'utf-8');
      const dbNameMatch = envContent.match(/^DB_NAME=(.+)$/m);
      const dbUserMatch = envContent.match(/^DB_USER=(.+)$/m);
      const dbPasswordMatch = envContent.match(/^DB_PASSWORD=(.+)$/m);
      
      if (dbNameMatch) dbName = dbNameMatch[1].trim();
      if (dbUserMatch) dbUser = dbUserMatch[1].trim();
      if (dbPasswordMatch) dbPassword = dbPasswordMatch[1].trim();
    } catch {
      // 忽略读取错误，使用默认值
    }
  }
  
  // 检查端口是否开放
  let portOpen = false;
  try {
    // 尝试使用 nc (netcat)
    execSync(`timeout 2 nc -z localhost ${DB_PORT}`, { stdio: 'ignore' });
    portOpen = true;
  } catch {
    try {
      // 尝试使用 telnet
      execSync(`echo "quit" | timeout 2 telnet localhost ${DB_PORT}`, { stdio: 'ignore' });
      portOpen = true;
    } catch {
      // 端口未开放
    }
  }
  
  if (!portOpen) {
    console.log(`⚠️  PostgreSQL 端口 ${DB_PORT} 不可访问`);
    return false;
  }
  
  // 尝试连接数据库
  try {
    // 检查 psql 是否可用
    execSync('which psql', { stdio: 'ignore' });
    const passwordEnv = dbPassword ? `PGPASSWORD="${dbPassword}" ` : '';
    execSync(
      `${passwordEnv}timeout 3 psql -h localhost -p ${DB_PORT} -U ${dbUser} -d ${dbName} -c '\\q'`,
      { stdio: 'ignore' }
    );
    console.log(`✅ PostgreSQL 数据库 '${dbName}' 可访问`);
    return true;
  } catch {
    // psql 不可用或连接失败
  }
  
  console.log(`⚠️  PostgreSQL 运行中但数据库 '${dbName}' 不可访问`);
  console.log(`   可能原因：数据库不存在、凭据错误或认证问题`);
  return false;
}

/**
 * 启动后端服务
 */
async function startBackend(): Promise<void> {
  const projectRoot = join(__dirname, '../../..');
  const serverDir = join(projectRoot, 'server');
  
  // 检查服务是否已运行
  const wasRunning = isPortInUse(Number(BACKEND_PORT));
  if (wasRunning) {
    console.log(`⚠️  后端服务已在端口 ${BACKEND_PORT} 运行`);
    // 记录后端原本在运行，teardown 时不会停止它
    writeFileSync(BACKEND_WAS_RUNNING_FILE, 'true');
    return;
  }
  
  // 检查服务器目录
  if (!existsSync(serverDir)) {
    throw new Error(`服务器目录不存在: ${serverDir}`);
  }
  
  // 检查 Go 环境
  try {
    execSync('go version', { stdio: 'ignore' });
  } catch {
    throw new Error('Go 未安装或不在 PATH 中');
  }
  
  // 检查数据库可用性
  const dbAvailable = checkDatabase();
  if (!dbAvailable) {
    console.log('⚠️  数据库不可用 - 后端将以 DB_DISABLED=true 模式启动');
    console.log('   注意：需要数据库的 API 测试可能会被跳过');
    process.env.DB_DISABLED = 'true';
  } else {
    console.log('✅ 数据库可用 - 后端将正常连接数据库');
  }
  
  console.log('🚀 启动后端服务...');
  
  // 启动后端服务（后台运行）
  // 使用 bash -c 确保正确执行后台命令并获取 PID
  const startCommand = `cd ${serverDir} && make run > /tmp/workflow-backend.log 2>&1 & echo $!`;
  const pidOutput = execSync(
    `bash -c "${startCommand}"`,
    { encoding: 'utf-8', cwd: serverDir }
  );
  
  const pid = pidOutput.trim();
  if (!pid || isNaN(Number(pid))) {
    throw new Error('无法获取后端服务 PID');
  }
  
  writeFileSync(BACKEND_PID_FILE, pid);
  // 记录后端不是原本在运行的
  writeFileSync(BACKEND_WAS_RUNNING_FILE, 'false');
  console.log(`📝 后端服务 PID: ${pid}`);
  console.log(`📋 日志文件: /tmp/workflow-backend.log`);
  
  // 等待服务就绪
  if (!(await waitForService(BACKEND_URL, '后端', MAX_WAIT_TIME))) {
    // 读取日志以便调试
    try {
      const log = readFileSync('/tmp/workflow-backend.log', 'utf-8');
      console.error('后端启动失败，日志：');
      console.error(log);
    } catch {
      // 忽略日志读取错误
    }
    throw new Error('后端服务启动失败或超时');
  }
}

async function globalSetup(config: FullConfig) {
  console.log('🔧 开始全局测试环境设置...');
  console.log('');

  const shouldStartBackend = process.env.START_BACKEND === 'true' || process.env.AUTO_START_BACKEND === 'true';
  const skipBackend = process.env.SKIP_BACKEND === 'true';

  // 启动后端服务（如果需要）
  if (shouldStartBackend && !skipBackend) {
    try {
      await startBackend();
    } catch (error) {
      console.error('❌ 后端服务启动失败:', error);
      // 如果设置了必须启动后端，则抛出错误
      if (process.env.REQUIRE_BACKEND === 'true') {
        throw error;
      }
      console.warn('⚠️  继续测试，但某些 API 测试可能会失败');
    }
  } else if (skipBackend) {
    console.log('⏭️  跳过后端启动 (SKIP_BACKEND=true)');
  } else {
    // 仅检查后端服务是否运行
    console.log('📦 检查后端服务状态...');
    try {
      const response = await fetch(`${BACKEND_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });
      
      if (response.ok) {
        console.log('✅ 后端服务已运行');
      } else {
        console.log('⚠️  后端服务响应异常，但继续测试');
      }
    } catch (error) {
      console.log('⚠️  后端服务未运行，某些API测试可能会跳过');
      console.log('   提示：设置 AUTO_START_BACKEND=true 自动启动后端服务');
    }
  }

  // 前端服务由 Playwright webServer 配置自动启动
  console.log('🌐 前端服务将由 Playwright webServer 自动启动');
  console.log('');

  // 清理之前的测试数据（如果需要）
  console.log('🧹 准备测试环境...');
  // TODO: 在这里添加测试数据清理逻辑
  // 例如：
  // - 清理测试数据库
  // - 删除临时文件
  // - 重置测试配置

  console.log('✅ 全局测试环境设置完成');
  console.log('');
}

export default globalSetup;

