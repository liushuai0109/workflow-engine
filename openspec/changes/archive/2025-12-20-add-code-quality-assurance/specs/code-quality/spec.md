## ADDED Requirements

### Requirement: AI代码修改验证机制

系统SHALL要求AI在修改代码前遵循TDD（测试驱动开发）原则，并在修改后执行完整的验证流程。

#### Scenario: TDD Red阶段验证
- **WHEN** AI准备修改代码实现新功能或修改现有功能
- **THEN** AI必须先创建或更新对应的测试用例（单元测试、集成测试、E2E测试）
- **AND** AI必须运行测试确认测试失败（Red阶段验证）
- **AND** AI必须确认测试用例覆盖了所有需求场景

#### Scenario: TDD Green阶段验证
- **WHEN** AI完成代码实现
- **THEN** AI必须运行基础验证（类型检查/编译）
- **AND** AI必须运行所有测试确认测试通过（Green阶段验证）
- **AND** AI必须运行服务启动验证
- **AND** AI必须运行集成验证（headless browser验证）

#### Scenario: 验证失败处理
- **WHEN** 任何验证步骤失败
- **THEN** AI必须立即停止进一步的代码修改
- **AND** AI必须分析错误信息并定位问题根源
- **AND** AI必须修复问题并重新运行验证
- **AND** AI必须报告验证结果（验证步骤、失败原因、修复方案、验证通过确认）

### Requirement: 前端测试架构

系统SHALL提供完整的前端测试基础设施，包括单元测试、类型检查、构建验证、headless browser验证和服务启动验证。

#### Scenario: 单元测试执行
- **WHEN** 运行 `npm run test`
- **THEN** 系统必须执行所有单元测试
- **AND** 系统必须生成测试覆盖率报告
- **AND** 单元测试覆盖率必须达到 > 70%

#### Scenario: 类型检查
- **WHEN** 运行 `npm run type-check`
- **THEN** 系统必须检查所有TypeScript类型错误
- **AND** 系统必须在发现类型错误时返回非零退出码
- **AND** 系统必须显示详细的类型错误信息

#### Scenario: 构建验证
- **WHEN** 运行 `npm run build`
- **THEN** 系统必须成功构建前端应用
- **AND** 系统必须在构建失败时返回非零退出码
- **AND** 系统必须生成构建产物到 `dist/` 目录

#### Scenario: Headless Browser验证
- **WHEN** 运行 `npm run test:e2e:headless`
- **THEN** 系统必须在headless浏览器中启动应用
- **AND** 系统必须验证应用可以正常加载
- **AND** 系统必须验证主要路由可以访问
- **AND** 系统必须验证关键组件可以渲染
- **AND** 系统必须验证无JavaScript运行时错误

#### Scenario: 服务启动验证
- **WHEN** 运行 `npm run verify:start`
- **THEN** 系统必须启动开发服务器
- **AND** 系统必须验证服务器在5秒内启动
- **AND** 系统必须验证无启动错误
- **AND** 系统必须验证可以访问根路径
- **AND** 系统必须验证可以访问主要路由

### Requirement: 后端测试架构

系统SHALL提供完整的后端测试基础设施，包括单元测试、编译验证、服务启动验证和集成测试。

#### Scenario: 单元测试执行
- **WHEN** 运行 `make test`
- **THEN** 系统必须执行所有单元测试
- **AND** 系统必须生成测试覆盖率报告
- **AND** 单元测试覆盖率必须达到 > 70%

#### Scenario: 编译验证
- **WHEN** 运行 `go build ./cmd/server/main.go`
- **THEN** 系统必须成功编译后端服务
- **AND** 系统必须在编译失败时返回非零退出码
- **AND** 系统必须生成可执行文件

#### Scenario: 服务启动验证
- **WHEN** 运行 `make verify:start`
- **THEN** 系统必须启动后端服务器
- **AND** 系统必须验证服务器在10秒内启动
- **AND** 系统必须验证无启动错误
- **AND** 系统必须验证健康检查接口返回200
- **AND** 系统必须验证数据库连接正常（如果配置了数据库）

#### Scenario: 集成测试执行
- **WHEN** 运行 `make test-integration` 且 `INTEGRATION_TEST=true`
- **THEN** 系统必须执行所有集成测试
- **AND** 系统必须使用测试数据库
- **AND** 系统必须在测试前后清理测试数据
- **AND** 系统必须验证所有集成测试通过

### Requirement: E2E测试框架

系统SHALL提供完整的E2E测试框架，包括测试配置、测试环境、核心功能测试、接口集成测试和回归测试。

#### Scenario: E2E测试环境配置
- **WHEN** 运行E2E测试
- **THEN** 系统必须启动前端开发服务器
- **AND** 系统必须启动后端测试服务器
- **AND** 系统必须配置测试数据库（可选）
- **AND** 系统必须等待服务就绪

#### Scenario: 核心功能E2E测试
- **WHEN** 运行核心功能E2E测试
- **THEN** 系统必须测试应用启动和路由导航
- **AND** 系统必须测试BPMN编辑器加载和基本操作
- **AND** 系统必须测试工作流创建、编辑、保存
- **AND** 系统必须测试工作流执行和状态跟踪
- **AND** 系统必须测试数据持久化

#### Scenario: 接口集成E2E测试
- **WHEN** 运行接口集成E2E测试
- **THEN** 系统必须测试前端调用后端API
- **AND** 系统必须测试错误处理和错误消息显示
- **AND** 系统必须测试数据格式验证
- **AND** 系统必须测试并发请求处理

#### Scenario: 回归测试
- **WHEN** 运行回归测试
- **THEN** 系统必须验证之前修复的bug不会重现
- **AND** 系统必须验证关键业务流程完整性
- **AND** 系统必须验证性能基准


### Requirement: 本地验证脚本

系统SHALL提供本地验证脚本，允许开发者在提交代码前执行完整验证。

#### Scenario: 完整验证脚本执行
- **WHEN** 运行 `scripts/verify-all.sh`
- **THEN** 系统必须执行前端验证（类型检查、构建、单元测试、headless browser验证）
- **AND** 系统必须执行后端验证（编译、单元测试、服务启动验证）
- **AND** 系统必须执行E2E测试（快速模式）
- **AND** 系统必须生成验证报告
- **AND** 系统必须在任何验证失败时返回非零退出码

#### Scenario: 前端验证脚本执行
- **WHEN** 运行 `scripts/verify-frontend.sh`
- **THEN** 系统必须执行前端类型检查
- **AND** 系统必须执行前端构建验证
- **AND** 系统必须执行前端单元测试
- **AND** 系统必须执行headless browser验证
- **AND** 系统必须生成前端验证报告

#### Scenario: 后端验证脚本执行
- **WHEN** 运行 `scripts/verify-backend.sh`
- **THEN** 系统必须执行后端编译验证
- **AND** 系统必须执行后端单元测试
- **AND** 系统必须执行后端服务启动验证
- **AND** 系统必须生成后端验证报告

### Requirement: 测试报告生成

系统SHALL在本地验证脚本执行后生成测试报告。

#### Scenario: 验证报告生成
- **WHEN** 本地验证脚本执行完成
- **THEN** 系统必须生成测试覆盖率报告
- **AND** 系统必须生成测试结果报告
- **AND** 系统必须在报告中显示测试通过率和失败原因
- **AND** 系统必须将报告保存到本地文件

