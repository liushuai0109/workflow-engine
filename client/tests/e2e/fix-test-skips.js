#!/usr/bin/env node

/**
 * 批量修复 E2E 测试文件中的 test.skip()
 * 将所有 test.skip() 改为严格的 expect 断言
 */

const fs = require('fs');
const path = require('path');

// 需要修复的文件列表
const testFiles = [
  'api-integration.spec.ts',
  'workflow-operations.spec.ts',
  'mock-debug.spec.ts',
  'performance.spec.ts',
  'error-scenarios.spec.ts',
  'headless-verification.spec.ts',
];

const testDir = __dirname;

/**
 * 修复单个文件
 */
function fixFile(fileName) {
  const filePath = path.join(testDir, fileName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  文件不存在: ${fileName}`);
    return { fixed: 0, skipped: true };
  }

  let content = fs.readFileSync(filePath, 'utf8');
  const originalContent = content;
  let fixedCount = 0;

  // 模式 1: 元素存在性检查
  // if (await element.count() === 0) { test.skip(); return; }
  // 或
  // if (await element.count() > 0) { ... } else { test.skip(); }
  const elementCheckPatterns = [
    // 模式: if (await element.count() === 0) { test.skip(); return; }
    {
      pattern: /if\s*\(\s*await\s+(\w+)\.count\(\)\s*===\s*0\s*\)\s*\{\s*test\.skip\(\);\s*return;\s*\}/g,
      replacement: (match, element) => {
        fixedCount++;
        return `expect(await ${element}.count()).not.toBe(0)`;
      }
    },
    // 模式: if (await element.count() > 0) { ... } else { test.skip(); }
    {
      pattern: /if\s*\(\s*await\s+(\w+)\.count\(\)\s*>\s*0\s*\)\s*\{([^}]+)\}\s*else\s*\{\s*test\.skip\(\);\s*\}/gs,
      replacement: (match, element, ifContent) => {
        fixedCount++;
        // 提取 if 块中的内容，移除条件检查
        const cleanContent = ifContent.trim();
        return `expect(await ${element}.count()).not.toBe(0);\n${cleanContent}`;
      }
    },
    // 模式: if (await element.count() > 0) { ... } else { test.skip(); return; }
    {
      pattern: /if\s*\(\s*await\s+(\w+)\.count\(\)\s*>\s*0\s*\)\s*\{([^}]+)\}\s*else\s*\{\s*test\.skip\(\);\s*return;\s*\}/gs,
      replacement: (match, element, ifContent) => {
        fixedCount++;
        const cleanContent = ifContent.trim();
        return `expect(await ${element}.count()).not.toBe(0);\n${cleanContent}`;
      }
    },
  ];

  // 模式 2: API 404 检查
  // if (response.status() === 404) { test.skip(); return; }
  const api404Patterns = [
    {
      pattern: /\/\/\s*如果\s+API\s+不存在[^]*?if\s*\(\s*(\w+)\.status\(\)\s*===\s*404\s*\)\s*\{\s*test\.skip\(\);\s*return;\s*\}/g,
      replacement: (match, response) => {
        fixedCount++;
        return `// 验证 API 存在且可用\nexpect(${response}.status()).not.toBe(404)`;
      }
    },
    {
      pattern: /if\s*\(\s*(\w+)\.status\(\)\s*===\s*404\s*\)\s*\{\s*test\.skip\(\);\s*return;\s*\}/g,
      replacement: (match, response) => {
        fixedCount++;
        return `expect(${response}.status()).not.toBe(404)`;
      }
    },
    {
      pattern: /} else if \(([^)]+\.status\(\)\s*===\s*404)\)\s*\{\s*test\.skip\(\);\s*\}/g,
      replacement: (match, condition) => {
        fixedCount++;
        return `} else {\nexpect(${condition}).not.toBe(true);\n}`;
      }
    },
  ];

  // 模式 3: catch 块中的 test.skip()
  // catch (error) { test.skip(); }
  const catchPatterns = [
    {
      pattern: /catch\s*\([^)]+\)\s*\{\s*\/\/\s*[^\n]*\n\s*test\.skip\(\);\s*\}/g,
      replacement: (match) => {
        fixedCount++;
        return match.replace(/test\.skip\(\);/g, 'throw error;');
      }
    },
    {
      pattern: /catch\s*\((\w+)\)\s*\{\s*test\.skip\(\);\s*\}/g,
      replacement: (match, errorVar) => {
        fixedCount++;
        return `catch (${errorVar}) {\n      throw ${errorVar};\n    }`;
      }
    },
  ];

  // 模式 4: else 块中的 test.skip()
  // } else { test.skip(); }
  const elsePatterns = [
    {
      pattern: /\}\s*else\s*\{\s*test\.skip\(\);\s*\}/g,
      replacement: () => {
        fixedCount++;
        // 移除 else 块，因为前面的 if 已经用 expect 验证了
        return '}';
      }
    },
    {
      pattern: /\}\s*else\s*if\s*\(([^)]+\.status\(\)\s*===\s*404)\)\s*\{\s*test\.skip\(\);\s*\}/g,
      replacement: (match, condition) => {
        fixedCount++;
        return `} else {\nexpect(${condition}).not.toBe(true);\n}`;
      }
    },
    {
      pattern: /\}\s*else\s*if\s*\(([^)]+\.status\(\)\s*===\s*404)\)\s*\{\s*test\.skip\(\);\s*return;\s*\}/g,
      replacement: (match, condition) => {
        fixedCount++;
        return `} else {\nexpect(${condition}).not.toBe(true);\n}`;
      }
    },
  ];

  // 模式 5: 嵌套的 if-else 结构
  // if (...) { ... } else { test.skip(); }
  const nestedPatterns = [
    {
      pattern: /if\s*\(await\s+(\w+)\.count\(\)\s*>\s*0\)\s*\{([^}]+)\}\s*else\s*\{\s*test\.skip\(\);\s*\}/gs,
      replacement: (match, element, ifContent) => {
        fixedCount++;
        const cleanContent = ifContent.trim();
        return `expect(await ${element}.count()).not.toBe(0);\n${cleanContent}`;
      }
    },
  ];

  // 应用所有模式
  for (const { pattern, replacement } of elementCheckPatterns) {
    content = content.replace(pattern, replacement);
  }

  for (const { pattern, replacement } of api404Patterns) {
    content = content.replace(pattern, replacement);
  }

  for (const { pattern, replacement } of catchPatterns) {
    content = content.replace(pattern, replacement);
  }

  for (const { pattern, replacement } of elsePatterns) {
    content = content.replace(pattern, replacement);
  }

  for (const { pattern, replacement } of nestedPatterns) {
    content = content.replace(pattern, replacement);
  }

  // 检查是否还有剩余的 test.skip()
  const remainingSkips = (content.match(/test\.skip\(\)/g) || []).length;

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ ${fileName}: 修复了 ${fixedCount} 处，剩余 ${remainingSkips} 处需要手动检查`);
    return { fixed: fixedCount, remaining: remainingSkips };
  } else if (remainingSkips > 0) {
    console.log(`⚠️  ${fileName}: 未自动修复，仍有 ${remainingSkips} 处需要手动检查`);
    return { fixed: 0, remaining: remainingSkips };
  } else {
    console.log(`✓  ${fileName}: 无需修复`);
    return { fixed: 0, remaining: 0 };
  }
}

/**
 * 主函数
 */
function main() {
  console.log('🔧 开始批量修复 test.skip()...\n');

  let totalFixed = 0;
  let totalRemaining = 0;

  for (const file of testFiles) {
    const result = fixFile(file);
    totalFixed += result.fixed || 0;
    totalRemaining += result.remaining || 0;
  }

  console.log(`\n📊 修复完成:`);
  console.log(`   - 自动修复: ${totalFixed} 处`);
  console.log(`   - 需要手动检查: ${totalRemaining} 处`);

  if (totalRemaining > 0) {
    console.log(`\n⚠️  请手动检查剩余的 test.skip()，确保它们都被替换为适当的 expect 断言`);
  }
}

// 运行脚本
main();

