#!/usr/bin/env node

/**
 * 修复 BPMN XML 文件 - 添加缺失的 incoming/outgoing 元素
 *
 * 用法: node fix-bpmn.js <input.bpmn> [output.bpmn]
 */

const fs = require('fs');
const path = require('path');

// 获取命令行参数
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('用法: node fix-bpmn.js <input.bpmn> [output.bpmn]');
  process.exit(1);
}

const inputFile = args[0];
const outputFile = args[1] || inputFile.replace('.bpmn', '-fixed.bpmn');

// 读取文件
console.log(`读取文件: ${inputFile}`);
const xml = fs.readFileSync(inputFile, 'utf-8');

// 解析 sequenceFlow 关系
const flowMap = new Map(); // elementId -> { incoming: [], outgoing: [] }

// 提取所有 sequenceFlow
const flowRegex = /<bpmn:sequenceFlow[^>]+id="([^"]+)"[^>]+sourceRef="([^"]+)"[^>]+targetRef="([^"]+)"/g;
let match;

while ((match = flowRegex.exec(xml)) !== null) {
  const [, flowId, sourceRef, targetRef] = match;

  // 初始化映射
  if (!flowMap.has(sourceRef)) {
    flowMap.set(sourceRef, { incoming: [], outgoing: [] });
  }
  if (!flowMap.has(targetRef)) {
    flowMap.set(targetRef, { incoming: [], outgoing: [] });
  }

  // 添加关系
  flowMap.get(sourceRef).outgoing.push(flowId);
  flowMap.get(targetRef).incoming.push(flowId);
}

console.log(`解析到 ${flowMap.size} 个元素的连接关系`);

// 修复 XML
let fixedXml = xml;

// 处理每个元素
flowMap.forEach((flows, elementId) => {
  // 匹配元素标签（支持多种元素类型）
  const elementTypes = [
    'startEvent', 'endEvent', 'task', 'userTask', 'serviceTask',
    'exclusiveGateway', 'parallelGateway', 'inclusiveGateway', 'complexGateway',
    'intermediateCatchEvent', 'intermediateThrowEvent', 'boundaryEvent'
  ];

  for (const type of elementTypes) {
    // 匹配开始标签到结束标签（包括自闭合）
    const elementRegex = new RegExp(
      `(<bpmn:${type}[^>]+id="${elementId}"[^>]*>)([\\s\\S]*?)(<\\/bpmn:${type}>)`,
      'g'
    );

    fixedXml = fixedXml.replace(elementRegex, (fullMatch, openTag, content, closeTag) => {
      // 检查是否已有 incoming/outgoing
      const hasIncoming = /<bpmn:incoming>/.test(content);
      const hasOutgoing = /<bpmn:outgoing>/.test(content);

      if (hasIncoming && hasOutgoing) {
        return fullMatch; // 已经有了，不需要修复
      }

      // 构建新的内容
      let newContent = '';

      // 添加 incoming
      if (!hasIncoming && flows.incoming.length > 0) {
        flows.incoming.forEach(flowId => {
          newContent += `\n      <bpmn:incoming>${flowId}</bpmn:incoming>`;
        });
      }

      // 添加 outgoing
      if (!hasOutgoing && flows.outgoing.length > 0) {
        flows.outgoing.forEach(flowId => {
          newContent += `\n      <bpmn:outgoing>${flowId}</bpmn:outgoing>`;
        });
      }

      // 保留原有内容（如 documentation）
      const trimmedContent = content.trim();
      if (trimmedContent) {
        newContent += '\n      ' + trimmedContent + '\n    ';
      } else {
        newContent += '\n    ';
      }

      console.log(`✓ 修复元素: ${elementId} (${type})`);
      console.log(`  - incoming: ${flows.incoming.join(', ')}`);
      console.log(`  - outgoing: ${flows.outgoing.join(', ')}`);

      return openTag + newContent + closeTag;
    });
  }
});

// 写入文件
console.log(`\n写入文件: ${outputFile}`);
fs.writeFileSync(outputFile, fixedXml, 'utf-8');

console.log('\n✅ 修复完成！');
console.log(`\n现在可以：`);
console.log(`1. 在编辑器中打开: ${outputFile}`);
console.log(`2. 选中 ExclusiveGateway`);
console.log(`3. 在属性面板中应该能看到条件表达式输入框了`);
