# 删除 Node.js Server 并重命名 Go Server 技术设计

## 上下文

项目最初只有一个 Node.js/Express 后端实现。后来添加了 Go 实现（server-go）以提供更好的性能和并发处理能力。现在两个实现都完整实现了所有核心功能，但维护两套代码增加了复杂性。

经过评估，决定：
1. 删除 Node.js 实现（server-nodejs）
2. 将 Go 实现（server-go）重命名为 server，作为唯一的后端实现

## 目标 / 非目标

### 目标
- 简化架构，只维护单一后端实现
- 保留 Go 实现的性能优势
- 确保所有功能正常工作
- 更新所有配置和文档引用

### 非目标
- 不改变 API 接口（保持兼容）
- 不改变功能（仅删除 Node.js 实现）
- 不改变数据库 schema
- 不改变前端代码（前端通过 API 调用，不受影响）

## 决策

### 决策 1: 选择保留 Go 而非 Node.js

**选择**：保留 Go 实现，删除 Node.js 实现。

**理由**：
- Go 在处理并发请求方面性能更好
- Go 编译为单一二进制文件，部署更简单
- Go 的内存占用更小
- Go 的启动速度更快
- Go 实现已经完整实现了所有功能

**考虑的替代方案**：
- 保留 Node.js：团队可能更熟悉 JavaScript/TypeScript，但性能劣势明显
- 同时保留两者：增加维护成本，不符合简化目标

### 决策 2: 重命名策略

**选择**：将 `server-go` 重命名为 `server`，移除语言后缀。

**理由**：
- 简化命名，因为现在只有一个实现
- 符合常见的项目结构（server）
- 减少命名歧义

**考虑的替代方案**：
- 保持 `server-go` 名称：如果未来可能添加其他语言实现，但当前没有计划

### 决策 3: Go Module 路径变更

**选择**：将 Go module 从 `github.com/bpmn-explorer/server-go` 改为 `github.com/bpmn-explorer/server`。

**理由**：
- 与目录名称保持一致
- 简化导入路径
- 符合 Go 项目命名规范

**风险**：
- 需要更新所有内部导入
- 如果项目被外部引用，可能造成破坏性变更

**缓解措施**：
- 这是内部项目，没有外部依赖
- 一次性更新所有导入路径

## 技术实施

### 重命名步骤

1. **目录重命名**
   ```bash
   mv server-go server
   ```

2. **Go Module 更新**
   - 更新 `go.mod` 中的 module 名称
   - 运行 `go mod tidy` 更新依赖

3. **导入路径更新**
   - 使用 `find` 和 `sed` 批量替换所有 `.go` 文件中的导入路径
   - 或者使用 IDE 的重构功能

4. **配置文件更新**
   - `package.json` 中的脚本
   - `README.md` 中的文档
   - `openspec/project.md` 中的技术栈说明

5. **删除 Node.js Server**
   - 删除 `server-nodejs` 目录
   - 清理相关依赖和配置

### 验证步骤

1. **编译验证**
   ```bash
   cd server
   go build ./...
   go test ./...
   ```

2. **启动验证**
   ```bash
   pnpm run start:server
   # 或
   cd server && make run
   ```

3. **API 测试**
   - 测试所有 API 端点
   - 验证前端可以正常连接

## 风险 / 权衡

### 风险 1: 导入路径更新遗漏

**风险**：可能遗漏某些文件的导入路径更新，导致编译失败。

**缓解措施**：
- 使用 `grep -r "server-go" server` 搜索所有引用
- 使用 IDE 的全局搜索和替换功能
- 运行 `go build ./...` 验证编译

### 风险 2: 配置文件引用遗漏

**风险**：可能遗漏某些配置文件中的路径引用。

**缓解措施**：
- 使用 `grep -r "server-go\|server-nodejs" .` 全局搜索
- 检查所有文档和配置文件
- 特别检查 CI/CD 配置（如果有）

### 风险 3: 其他变更提案的引用

**风险**：其他未完成的变更提案可能引用了 `server-nodejs` 或 `server-go`。

**缓解措施**：
- 检查 `openspec/changes/` 下的所有变更提案
- 更新相关引用
- 特别检查 `add-workflow-related-systems` 和 `add-workflow-mock-debug`

### 风险 4: 前端 API 调用

**风险**：前端代码可能硬编码了后端路径。

**缓解措施**：
- 检查前端代码中的 API 调用
- 确保使用环境变量或配置，而非硬编码路径
- 前端通过 HTTP 调用，不受后端目录结构影响

## 迁移计划

### Phase 1: 重命名 Go Server（1-2 天）
1. 重命名目录
2. 更新 Go module
3. 更新所有导入路径
4. 验证编译

### Phase 2: 更新配置（2-3 天）
1. 更新 package.json 脚本
2. 更新文档
3. 更新其他配置文件
4. 验证启动

### Phase 3: 删除 Node.js Server（1 天）
1. 删除目录
2. 清理依赖
3. 更新其他变更提案
4. 最终验证

## 回滚计划

如果出现问题，可以：
1. 从 Git 历史恢复 `server-nodejs`
2. 恢复 `server-go` 目录
3. 恢复所有配置文件
4. 重新运行 `pnpm install`

## 未决问题

- [ ] 是否需要更新 CI/CD 配置？
- [ ] 是否需要通知团队成员？
- [ ] 是否需要更新部署文档？

