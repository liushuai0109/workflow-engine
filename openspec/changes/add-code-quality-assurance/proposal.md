# 变更：建立代码质量保障体系

## 为什么

当前项目存在严重的代码质量问题：
1. **AI修改代码后无法运行**：前端浏览器报错、后端服务启动失败、接口调用失败
2. **缺少自动化验证**：问题在交付前未被发现，导致用户体验差
3. **测试覆盖不足**：缺少系统化的测试策略和自动化测试流程
4. **缺少持续集成**：没有CI/CD流水线确保代码质量

这些问题导致：
- 开发效率低下（大量时间用于调试和修复）
- 代码质量不稳定（无法保证每次修改的正确性）
- 用户体验差（生产环境频繁出现bug）

根据 `docs/TESTING_AND_VALIDATION_STRATEGY.md` 文档的指导，需要建立完整的代码质量保障体系，从AI预设提示词、测试架构两个层面全面解决代码质量问题。CI/CD集成将在后续阶段实施。

## 变更内容

- **ADDED**: AI预设提示词层面的强制验证机制
  - 在 `openspec/AGENTS.md` 中添加强制验证检查清单
  - 实现TDD（测试驱动开发）工作流要求
  - 添加验证失败处理流程
  - 要求AI在修改代码前先创建测试用例

- **ADDED**: 前端测试架构增强
  - Headless Browser验证（使用Playwright）
  - 服务启动验证脚本
  - 构建验证自动化
  - 类型检查强制化
  - 单元测试覆盖率提升（目标 > 70%）

- **ADDED**: 后端测试架构增强
  - 服务启动验证脚本
  - 编译验证自动化
  - 单元测试覆盖率提升（目标 > 70%）
  - 集成测试增强

- **ADDED**: E2E测试框架完善
  - Playwright配置和测试环境
  - 核心功能E2E测试套件
  - 接口集成测试
  - 回归测试套件
  - 测试数据管理

- **ADDED**: 本地验证脚本
  - 完整验证脚本（`scripts/verify-all.sh`）
  - 前端验证脚本（`scripts/verify-frontend.sh`）
  - 后端验证脚本（`scripts/verify-backend.sh`）
  - 测试报告生成

- **FUTURE**: 持续集成/持续测试架构（暂不实施）
  - CI/CD流水线配置（GitHub Actions / GitLab CI）
  - 预提交钩子（可选，Husky + lint-staged）
  - 测试报告自动上传
  - 代码质量监控（测试通过率、执行时间、覆盖率趋势）

## 影响

- **受影响的规范**：
  - 新增 `code-quality` 规范能力领域
  - 可能影响 `backend-server` 规范（添加测试相关API）
  - 可能影响 `workflow-editor` 规范（添加测试相关功能）

- **受影响的代码**：
  - `openspec/AGENTS.md` - 添加验证要求
  - `client/package.json` - 添加测试脚本和依赖
  - `client/playwright.config.ts` - Playwright配置
  - `client/scripts/verify-start.sh` - 前端启动验证脚本
  - `server/Makefile` - 添加验证命令
  - `server/scripts/verify-start.sh` - 后端启动验证脚本
  - `scripts/verify-all.sh` - 完整验证脚本
  - `scripts/verify-frontend.sh` - 前端验证脚本
  - `scripts/verify-backend.sh` - 后端验证脚本
  - `tests/e2e/` - E2E测试套件

- **新增文件**：
  - 测试配置文件
  - 验证脚本
  - CI/CD配置文件
  - 测试报告目录

