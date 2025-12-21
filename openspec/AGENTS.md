# OpenSpec 指令

面向使用 OpenSpec 进行规范驱动开发的 AI 编程助手的指令。

## TL;DR 快速检查清单

- 搜索现有工作：`openspec spec list --long`、`openspec list`（仅用于全文搜索时使用 `rg`）
- 确定范围：新功能 vs 修改现有功能
- 选择唯一的 `change-id`：kebab-case，动词开头（`add-`、`update-`、`remove-`、`refactor-`）
- 搭建结构：`proposal.md`、`tasks.md`、`design.md`（仅在需要时），以及每个受影响能力的增量规范
- 编写增量：使用 `## ADDED|MODIFIED|REMOVED|RENAMED Requirements`；每个需求至少包含一个 `#### Scenario:`
- 验证：`openspec validate [change-id] --strict` 并修复问题
- 请求批准：在提案获得批准之前不要开始实施

## 三阶段工作流

### 阶段 1：创建变更

在以下情况下创建提案：
- 添加特性或功能
- 进行破坏性变更（API、模式）
- 更改架构或模式
- 优化性能（改变行为）
- 更新安全模式

触发条件（示例）：
- "帮我创建变更提案"
- "帮我规划变更"
- "帮我创建提案"
- "我想创建规范提案"
- "我想创建规范"

宽松匹配指导：
- 包含以下之一：`proposal`、`change`、`spec`
- 以及以下之一：`create`、`plan`、`make`、`start`、`help`

跳过提案的情况：
- Bug 修复（恢复预期行为）
- 拼写错误、格式、注释
- 依赖更新（非破坏性）
- 配置更改
- 现有行为的测试

**工作流**
1. 查看 `openspec/project.md`、`openspec list` 和 `openspec list --specs` 以了解当前上下文。
2. 选择唯一的动词开头的 `change-id`，并在 `openspec/changes/<id>/` 下搭建 `proposal.md`、`tasks.md`、可选的 `design.md` 和规范增量。
3. 使用 `## ADDED|MODIFIED|REMOVED Requirements` 起草规范增量，每个需求至少包含一个 `#### Scenario:`。
4. 运行 `openspec validate <id> --strict` 并在分享提案前解决任何问题。

### 阶段 2：实施变更

将这些步骤作为待办事项跟踪，并逐一完成。
1. **阅读 proposal.md** - 了解正在构建什么
2. **阅读 design.md**（如果存在）- 查看技术决策
3. **阅读 tasks.md** - 获取实施检查清单
4. **按顺序实施任务** - 按顺序完成
5. **确认完成** - 在更新状态之前确保 `tasks.md` 中的每一项都已完成
6. **更新检查清单** - 所有工作完成后，将每个任务设置为 `- [x]`，使列表反映实际情况
7. **追踪实际时间** - 每个 Phase 完成后，统计实际花费的时间，更新到 `tasks.md` 的 `## 时间估算` 章节表格中的"实际时间"列，格式为"X 天"或"X-Y 天"
8. **批准关卡** - 在提案审查和批准之前不要开始实施

**时间追踪指南：**
- 在每个 Phase 开始时记录开始日期
- 在每个 Phase 完成时记录完成日期
- 计算实际花费天数并更新到 `tasks.md` 的时间估算表格
- 如果实际时间与预计时间差异超过 20%，在表格下方添加说明原因
- 示例更新：
  ```markdown
  | Phase | 任务数 | 预计时间 | 实际时间 | 依赖 |
  |-------|-------|---------|---------|------|
  | Phase 1 | 8 | 5-6 天 | 7 天 | 无 |
  ```

### 阶段 3：归档变更

部署后，创建单独的 PR 以：
- 移动 `changes/[name]/` → `changes/archive/YYYY-MM-DD-[name]/`
- 如果功能发生变化，更新 `specs/`
- 对于仅工具变更使用 `openspec archive <change-id> --skip-specs --yes`（始终明确传递 change ID）
- 运行 `openspec validate --strict` 以确认归档的变更通过检查

## 代码质量保障：TDD 和验证流程

### 强制验证检查清单（遵循TDD原则）

在AI进行任何代码修改前，必须遵循TDD（测试驱动开发）原则：

**修改代码前（TDD Red阶段）：**
- [ ] 为新功能创建或更新对应的测试用例
  - [ ] 单元测试（必须）
  - [ ] 集成测试（如涉及多模块交互）
  - [ ] E2E测试（如涉及用户可见功能或关键业务流程）
- [ ] 运行测试确认测试失败（Red阶段验证）
- [ ] 确认测试用例覆盖了所有需求场景

**前端代码修改后（TDD Green阶段）：**
- [ ] 运行 `cd client && npm run type-check` 进行类型检查
- [ ] 运行 `cd client && npm run build` 确保代码可以编译
- [ ] 运行 `cd client && npm run test` 确保所有单元测试通过（包括新创建的测试）
- [ ] 运行 `cd client && npm run test:e2e:headless` 进行headless browser验证（如果已配置）
- [ ] 验证前端服务可以正常启动（至少启动5秒无错误）
- [ ] 确认所有测试用例通过（Green阶段验证）

**后端代码修改后（TDD Green阶段）：**
- [ ] 运行 `cd server && go build ./cmd/server/main.go` 确保代码可以编译
- [ ] 运行 `cd server && make test` 确保所有单元测试通过（包括新创建的测试）
- [ ] 验证后端服务可以正常启动（至少启动5秒无错误）
- [ ] 运行健康检查接口验证服务可用性
- [ ] 确认所有测试用例通过（Green阶段验证）

**接口修改后：**
- [ ] 运行完整的E2E测试套件（包括新创建的E2E测试）
- [ ] 验证前端可以正常调用后端接口
- [ ] 验证错误处理逻辑正确
- [ ] 确认所有测试用例通过

**代码重构后（TDD Refactor阶段，可选）：**
- [ ] 运行所有测试确保重构未破坏功能
- [ ] 验证代码质量和可读性提升

### 代码修改工作流（遵循TDD测试驱动开发）

AI在修改代码时必须遵循TDD（Test-Driven Development）开发范式，工作流如下：

```
1. 创建或修改测试用例（Red阶段）
   ├─ 新功能：创建对应的单元测试、集成测试、E2E测试
   ├─ 修改功能：更新现有测试用例以反映新需求
   └─ 运行测试确认失败（Red）→ 继续
   
2. 修改代码实现功能（Green阶段）
   ├─ 实现最小化代码让测试通过
   ├─ 运行基础验证（编译/类型检查）
   │  ├─ 失败 → 修复问题 → 重新验证
   │  └─ 成功 → 继续
   └─ 运行测试确认通过（Green）→ 继续
   
3. 运行完整测试套件
   ├─ 运行单元测试
   │  ├─ 失败 → 修复问题 → 重新运行
   │  └─ 成功 → 继续
   ├─ 运行集成测试（如果涉及）
   │  ├─ 失败 → 修复问题 → 重新运行
   │  └─ 成功 → 继续
   └─ 运行E2E测试（如果涉及接口或关键功能）
      ├─ 失败 → 修复问题 → 重新运行
      └─ 成功 → 继续
   
4. 运行集成验证（启动服务/headless browser）
   ├─ 启动前端服务验证
   │  ├─ 失败 → 修复问题 → 重新验证
   │  └─ 成功 → 继续
   ├─ 启动后端服务验证
   │  ├─ 失败 → 修复问题 → 重新验证
   │  └─ 成功 → 继续
   └─ Headless browser验证（前端，如果已配置）
      ├─ 失败 → 修复问题 → 重新验证
      └─ 成功 → 继续
   
5. 重构代码（Refactor阶段，可选）
   ├─ 优化代码结构
   ├─ 提升代码可读性
   ├─ 运行所有测试确保重构未破坏功能
   └─ 成功 → 完成
```

**TDD原则说明：**
- **Red（红）**：先写测试，测试应该失败（因为功能还未实现）
- **Green（绿）**：写最小化代码让测试通过
- **Refactor（重构）**：优化代码，保持测试通过

**测试用例优先级：**
1. **单元测试**：必须为所有新功能/修改创建单元测试
2. **集成测试**：涉及多个模块交互时创建集成测试
3. **E2E测试**：涉及用户可见功能或关键业务流程时创建E2E测试

### 验证失败处理

如果验证失败，AI必须：
1. **立即停止**进一步的代码修改
2. **分析错误信息**，定位问题根源
3. **修复问题**，而不是继续添加新功能
4. **重新运行验证**，确保问题已解决
5. **报告验证结果**，包括：
   - 验证步骤
   - 失败原因
   - 修复方案
   - 验证通过确认

## 任何任务之前

**上下文检查清单：**
- [ ] 阅读 `specs/[capability]/spec.md` 中的相关规范
- [ ] 检查 `changes/` 中的待处理变更是否存在冲突
- [ ] 阅读 `openspec/project.md` 了解约定
- [ ] 运行 `openspec list` 查看活跃的变更
- [ ] 运行 `openspec list --specs` 查看现有功能

**创建规范之前：**
- 始终检查功能是否已存在
- 优先修改现有规范而不是创建重复项
- 使用 `openspec show [spec]` 查看当前状态
- 如果请求不明确，在搭建结构之前提出 1-2 个澄清问题

### 搜索指南
- 列举规范：`openspec spec list --long`（或用于脚本的 `--json`）
- 列举变更：`openspec list`（或 `openspec change list --json` - 已弃用但可用）
- 显示详情：
  - 规范：`openspec show <spec-id> --type spec`（使用 `--json` 进行过滤）
  - 变更：`openspec show <change-id> --json --deltas-only`
- 全文搜索（使用 ripgrep）：`rg -n "Requirement:|Scenario:" openspec/specs`

## 快速入门

### CLI 命令

```bash
# 基本命令
openspec list                  # 列出活跃的变更
openspec list --specs          # 列出规范
openspec show [item]           # 显示变更或规范
openspec validate [item]       # 验证变更或规范
openspec archive <change-id> [--yes|-y]   # 部署后归档（添加 --yes 用于非交互式运行）

# 项目管理
openspec init [path]           # 初始化 OpenSpec
openspec update [path]         # 更新指令文件

# 交互模式
openspec show                  # 提示选择
openspec validate              # 批量验证模式

# 调试
openspec show [change] --json --deltas-only
openspec validate [change] --strict
```

### 命令标志

- `--json` - 机器可读输出
- `--type change|spec` - 消除项目歧义
- `--strict` - 全面验证
- `--no-interactive` - 禁用提示
- `--skip-specs` - 归档时不更新规范
- `--yes`/`-y` - 跳过确认提示（非交互式归档）

## 目录结构

```
openspec/
├── project.md              # 项目约定
├── specs/                  # 当前真相 - 已构建的内容
│   └── [capability]/       # 单一聚焦的功能
│       ├── spec.md         # 需求和场景
│       └── design.md       # 技术模式
├── changes/                # 提案 - 应该改变的内容
│   ├── [change-name]/
│   │   ├── proposal.md     # 为什么、什么、影响
│   │   ├── tasks.md        # 实施检查清单
│   │   ├── design.md       # 技术决策（可选；参见标准）
│   │   └── specs/          # 增量变更
│   │       └── [capability]/
│   │           └── spec.md # ADDED/MODIFIED/REMOVED
│   └── archive/            # 已完成的变更
```

## 创建变更提案

### 决策树

```
新请求？
├─ Bug 修复恢复规范行为？ → 直接修复
├─ 拼写错误/格式/注释？ → 直接修复
├─ 新特性/功能？ → 创建提案
├─ 破坏性变更？ → 创建提案
├─ 架构变更？ → 创建提案
└─ 不清楚？ → 创建提案（更安全）
```

### 提案结构

1. **创建目录：** `changes/[change-id]/`（kebab-case，动词开头，唯一）

2. **编写 proposal.md：**
```markdown
# 变更：[变更的简要描述]

## Why
[1-2 句关于问题/机会的说明]

## What Changes
- [变更的项目符号列表]
- [用 **BREAKING** 标记破坏性变更]

## Impact
- 受影响的规范：[列出功能]
- 受影响的代码：[关键文件/系统]
```

**重要**：proposal.md 的章节标题必须使用英文（`## Why`、`## What Changes`、`## Impact`），以确保 OpenSpec CLI 能够正确解析。章节内容可以使用中文描述。

3. **创建规范增量：** `specs/[capability]/spec.md`
```markdown
## ADDED Requirements
### Requirement: 新功能
系统应该提供...

#### Scenario: 成功案例
- **WHEN** 用户执行操作
- **THEN** 预期结果

## MODIFIED Requirements
### Requirement: 现有功能
[完整的修改后需求]

## REMOVED Requirements
### Requirement: 旧功能
**原因**：[为什么移除]
**迁移**：[如何处理]
```
如果影响多个功能，在 `changes/[change-id]/specs/<capability>/spec.md` 下创建多个增量文件——每个功能一个。

4. **创建 tasks.md：**
```markdown
## 1. 实施
- [ ] 1.1 创建数据库模式
- [ ] 1.2 实现 API 端点
- [ ] 1.3 添加前端组件
- [ ] 1.4 编写测试
```

5. **需要时创建 design.md：**
如果满足以下任何条件，创建 `design.md`；否则省略：
- 跨领域变更（多个服务/模块）或新的架构模式
- 新的外部依赖或重大数据模型变更
- 安全、性能或迁移复杂性
- 在编码前需要技术决策的模糊性

最小 `design.md` 框架：
```markdown
## 上下文
[背景、约束、利益相关者]

## 目标 / 非目标
- 目标：[...]
- 非目标：[...]

## 决策
- 决策：[什么和为什么]
- 考虑的替代方案：[选项 + 理由]

## 风险 / 权衡
- [风险] → 缓解措施

## 迁移计划
[步骤、回滚]

## 未决问题
- [...]
```

## 规范文件格式

### 重要：OpenSpec 文件格式语言要求

**所有 OpenSpec 文件中的结构化关键字和标题必须使用英文**，以确保 OpenSpec CLI 工具能够正确解析和验证。

**必须使用英文的部分：**
- `proposal.md` 中的章节标题：
  - `## Why`（不是 "## 为什么"）
  - `## What Changes`（不是 "## 变更内容"）
  - `## Impact`（不是 "## 影响"）
- 规范增量文件中的操作标题：
  - `## ADDED Requirements`
  - `## MODIFIED Requirements`
  - `## REMOVED Requirements`
  - `## RENAMED Requirements`
- 场景格式：
  - `#### Scenario: ...`
  - `- **WHEN** ...`
  - `- **THEN** ...`
  - `- **AND** ...`

**可以使用中文的部分：**
- 文件内容描述（Why、What Changes、Impact 等章节的正文内容）
- 需求描述和场景描述
- 任务列表内容
- 设计文档内容

**示例：**
```markdown
# 变更：建立代码质量保障体系

## Why
当前项目存在严重的代码质量问题...

## What Changes
- **ADDED**: AI预设提示词层面的强制验证机制
- **ADDED**: 前端测试架构增强
...

## Impact
- **受影响的规范**：新增 `code-quality` 规范能力领域
...
```

### 关键：场景格式

**正确**（使用 #### 标题）：
```markdown
#### Scenario: 用户登录成功
- **WHEN** 提供有效凭据
- **THEN** 返回 JWT 令牌
```

**错误**（不要使用项目符号或粗体）：
```markdown
- **Scenario: 用户登录**  ❌
**Scenario**: 用户登录     ❌
### Scenario: 用户登录      ❌
```

每个需求必须至少有一个场景。

### 需求措辞
- 使用 SHALL/MUST 表示规范性需求（除非有意为非规范性，否则避免使用 should/may）

### 增量操作

- `## ADDED Requirements` - 新功能
- `## MODIFIED Requirements` - 变更的行为
- `## REMOVED Requirements` - 弃用的功能
- `## RENAMED Requirements` - 名称变更

使用 `trim(header)` 匹配标题 - 忽略空格。

#### 何时使用 ADDED vs MODIFIED
- ADDED：引入可以作为需求独立存在的新功能或子功能。当变更是正交的（例如，添加"斜杠命令配置"）而不是改变现有需求的语义时，优先使用 ADDED。
- MODIFIED：更改现有需求的行为、范围或验收标准。始终粘贴完整、更新的需求内容（标题 + 所有场景）。归档器将用你在此处提供的内容替换整个需求；部分增量将丢失先前的详细信息。
- RENAMED：仅在名称变更时使用。如果你也更改行为，使用 RENAMED（名称）加上引用新名称的 MODIFIED（内容）。

常见陷阱：使用 MODIFIED 添加新关注点而不包括先前的文本。这会导致归档时详细信息丢失。如果你没有明确更改现有需求，请在 ADDED 下添加新需求。

正确编写 MODIFIED 需求：
1) 在 `openspec/specs/<capability>/spec.md` 中找到现有需求。
2) 复制整个需求块（从 `### Requirement: ...` 到其场景）。
3) 将其粘贴到 `## MODIFIED Requirements` 下并编辑以反映新行为。
4) 确保标题文本完全匹配（不区分空格）并保留至少一个 `#### Scenario:`。

RENAMED 示例：
```markdown
## RENAMED Requirements
- FROM: `### Requirement: 登录`
- TO: `### Requirement: 用户认证`
```

## 故障排除

### 常见错误

**"变更必须至少有一个增量"**
- 检查 `changes/[name]/specs/` 是否存在且包含 .md 文件
- 验证文件是否有操作前缀（## ADDED Requirements）

**"需求必须至少有一个场景"**
- 检查场景是否使用 `#### Scenario:` 格式（4 个井号）
- 不要为场景标题使用项目符号或粗体

**场景解析失败无提示**
- 需要精确格式：`#### Scenario: 名称`
- 调试：`openspec show [change] --json --deltas-only`

### 验证技巧

```bash
# 始终使用严格模式进行全面检查
openspec validate [change] --strict

# 调试增量解析
openspec show [change] --json | jq '.deltas'

# 检查特定需求
openspec show [spec] --json -r 1
```

## 快乐路径脚本

```bash
# 1) 探索当前状态
openspec spec list --long
openspec list
# 可选的全文搜索：
# rg -n "Requirement:|Scenario:" openspec/specs
# rg -n "^#|Requirement:" openspec/changes

# 2) 选择 change id 并搭建结构
CHANGE=add-two-factor-auth
mkdir -p openspec/changes/$CHANGE/{specs/auth}
printf "## 为什么\n...\n\n## 变更内容\n- ...\n\n## 影响\n- ...\n" > openspec/changes/$CHANGE/proposal.md
printf "## 1. 实施\n- [ ] 1.1 ...\n" > openspec/changes/$CHANGE/tasks.md

# 3) 添加增量（示例）
cat > openspec/changes/$CHANGE/specs/auth/spec.md << 'EOF'
## ADDED Requirements
### Requirement: 双因素认证
用户必须在登录时提供第二因素。

#### Scenario: 需要 OTP
- **WHEN** 提供有效凭据
- **THEN** 需要 OTP 挑战
EOF

# 4) 验证
openspec validate $CHANGE --strict
```

## 多功能示例

```
openspec/changes/add-2fa-notify/
├── proposal.md
├── tasks.md
└── specs/
    ├── auth/
    │   └── spec.md   # ADDED: 双因素认证
    └── notifications/
        └── spec.md   # ADDED: OTP 邮件通知
```

auth/spec.md
```markdown
## ADDED Requirements
### Requirement: 双因素认证
...
```

notifications/spec.md
```markdown
## ADDED Requirements
### Requirement: OTP 邮件通知
...
```

## 最佳实践

### 简单优先
- 默认少于 100 行新代码
- 单文件实现，直到证明不足
- 避免没有明确理由的框架
- 选择无聊、经过验证的模式

### 复杂性触发器
仅在以下情况下添加复杂性：
- 性能数据显示当前解决方案太慢
- 具体的规模要求（>1000 用户，>100MB 数据）
- 需要抽象的多个经过验证的用例

### 清晰的引用
- 使用 `file.ts:42` 格式表示代码位置
- 将规范引用为 `specs/auth/spec.md`
- 链接相关的变更和 PR

### 功能命名
- 使用动词-名词：`user-auth`、`payment-capture`
- 每个功能单一目的
- 10 分钟可理解性规则
- 如果描述需要"AND"则拆分

### 变更 ID 命名
- 使用 kebab-case，简短且描述性：`add-two-factor-auth`
- 优先使用动词开头的前缀：`add-`、`update-`、`remove-`、`refactor-`
- 确保唯一性；如果已占用，追加 `-2`、`-3` 等

## 工具选择指南

| 任务 | 工具 | 原因 |
|------|------|-----|
| 按模式查找文件 | Glob | 快速模式匹配 |
| 搜索代码内容 | Grep | 优化的正则搜索 |
| 读取特定文件 | Read | 直接文件访问 |
| 探索未知范围 | Task | 多步骤调查 |

## 错误恢复

### 变更冲突
1. 运行 `openspec list` 查看活跃的变更
2. 检查重叠的规范
3. 与变更所有者协调
4. 考虑合并提案

### 验证失败
1. 使用 `--strict` 标志运行
2. 检查 JSON 输出以获取详细信息
3. 验证规范文件格式
4. 确保场景格式正确

### 缺少上下文
1. 首先阅读 project.md
2. 检查相关规范
3. 查看最近的归档
4. 要求澄清

## 快速参考

### 阶段指示器
- `changes/` - 提议的，尚未构建
- `specs/` - 已构建和部署
- `archive/` - 已完成的变更

### 文件目的
- `proposal.md` - 为什么和什么
- `tasks.md` - 实施步骤
- `design.md` - 技术决策
- `spec.md` - 需求和行为

### CLI 要点
```bash
openspec list              # 正在进行什么？
openspec show [item]       # 查看详情
openspec validate --strict # 是否正确？
openspec archive <change-id> [--yes|-y]  # 标记完成（添加 --yes 用于自动化）
```

记住：规范是真相。变更是提案。保持它们同步。
