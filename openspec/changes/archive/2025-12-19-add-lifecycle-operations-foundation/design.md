# 设计文档: 用户生命周期运营基础

## 背景

当前的 XPMN Explorer 是一个客户端 BPMN 图表编辑器。业务愿景要求将其转变为全栈用户生命周期运营平台。此设计为 Phase 1 建立基础架构:在维持当前编辑器功能的同时,为工作流添加生命周期上下文。

### 当前架构
- **Frontend**: Vue 3 SPA with bpmn-js, 仅客户端
- **State**: 内存存储,使用 localStorage 持久化
- **Format**: BPMN/XPMN XML with custom XFlow extensions
- **Scope**: 技术工作流建模

### 目标架构 (Phase 1)
- **Frontend**: 增强的编辑器,包含生命周期运营上下文
- **Data Model**: 结构化的生命周期、分段和触发器定义
- **Format**: 扩展的 BPMN/XPMN with lifecycle metadata namespace
- **Scope**: 面向业务的用户旅程工作流

### 约束条件
- 必须保持与现有工作流的向后兼容性
- Phase 1 保持客户端实现(后端实现在未来阶段)
- 更改不得破坏现有的 BpmnAdapter 转换逻辑

## 目标 / 非目标

### 目标
1. ✅ 为工作流元素添加 AARRR 生命周期阶段支持
2. ✅ 启用用户分段定向配置
3. ✅ 支持触发条件定义
4. ✅ 建立数据模型以供未来后端集成
5. ✅ 维持现有 BPMN 编辑器功能
6. ✅ 为现有工作流提供迁移路径

### 非目标
1. ❌ 后端实现 (计划在 Phase 2+)
2. ❌ 实时数据集成 (计划在 Phase 2+)
3. ❌ 数据可视化仪表板 (计划在 Phase 2)
4. ❌ AI Agent 自动化 (计划在 Phase 3)
5. ❌ 终端用户个性化界面 (计划在 Phase 5)

## 决策

### 决策 1: 扩展 XFlow Extension Format

**选择**: 在现有 XFlow extension namespace 中添加生命周期元数据,而不是创建新的 namespace。

**理由**:
- 利用现有的扩展基础设施
- 最小化对 BpmnAdapter 的更改
- 将生命周期数据保留在 `bpmn:extensionElements` 结构内
- 维持 BPMN 2.0 标准合规性

**结构**:
```xml
<bpmn:extensionElements>
  <xflow:lifecycle stage="Activation" />
  <xflow:segment type="demographic">
    <xflow:condition field="age" operator="between" value="18,35" />
  </xflow:segment>
  <xflow:trigger type="event" event="user_signup" />
  <xflow:metrics>
    <xflow:metric name="conversion_rate" target="0.25" />
  </xflow:metrics>
</bpmn:extensionElements>
```

**考虑的替代方案**:
- 创建单独的 `lifecycle:` namespace → 拒绝(太复杂,需要新的 adapter 逻辑)
- 在单独的 JSON 文件中存储生命周期数据 → 拒绝(破坏单文件工作流的可移植性)
- 使用 BPMN documentation 字段 → 拒绝(非结构化,难以解析)

### 决策 2: TypeScript-First Data Models

**选择**: 首先将所有数据结构定义为 TypeScript interfaces,从中生成 JSON schemas。

**理由**:
- 整个代码库的类型安全
- IDE 自动完成和验证
- 数据结构的单一真实来源
- 可以从类型生成 OpenAPI specs

**实现**:
```typescript
// src/types/lifecycle.ts
export enum LifecycleStage {
  Acquisition = 'Acquisition',
  Activation = 'Activation',
  Retention = 'Retention',
  Revenue = 'Revenue',
  Referral = 'Referral'
}

export interface UserSegment {
  id: string
  name: string
  type: 'demographic' | 'behavioral' | 'lifecycle' | 'value'
  conditions: SegmentCondition[]
  operator: 'AND' | 'OR'
}

export interface SegmentCondition {
  field: string
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'between' | 'contains' | 'in'
  value: string | number | string[]
}
```

**考虑的替代方案**:
- JSON Schema first → 拒绝(对开发者不够友好,无编译时检查)
- Protocol Buffers → 拒绝(对客户端来说过度设计,浏览器支持差)

### 决策 3: Configuration-Driven UI Components

**选择**: 为生命周期阶段、分段和触发器使用 JSON 配置文件,由 Vue 组件从配置渲染。

**理由**:
- 无需代码更改即可轻松添加新阶段/分段
- 可由运营人员配置(未来:管理界面修改配置)
- 通过配置支持国际化
- 支持不同生命周期模型的 A/B 测试

**配置文件**:
- `src/config/lifecycle-stages.json` - AARRR 阶段定义,包含颜色、图标、描述
- `src/config/user-segments.json` - 预定义的分段模板
- `src/config/trigger-templates.json` - 常见触发器模式

**组件模式**:
```vue
<LifecycleStageSelector
  :stages="lifecycleConfig.stages"
  :value="currentStage"
  @update="handleStageChange"
/>
```

**考虑的替代方案**:
- 在组件中硬编码 → 拒绝(不灵活,需要代码更改)
- 数据库驱动 → 拒绝(尚无后端,对 Phase 1 太复杂)

### 决策 4: 通过 Migration Layer 实现向后兼容

**选择**: 在 BpmnAdapter 中为没有生命周期元数据的工作流实现自动迁移。

**理由**:
- 现有工作流必须无错误加载
- 对在此更改之前创建的工作流进行优雅降级
- 用户无需手动迁移
- 迁移逻辑集中在一处

**迁移策略**:
```typescript
// In BpmnAdapter.convertFromXPMNToBPMN()
function migrateToLifecycleFormat(element: Element): void {
  if (!hasLifecycleMetadata(element)) {
    // Assign default lifecycle stage based on element type
    const defaultStage = inferLifecycleStage(element.type)
    addLifecycleMetadata(element, { stage: defaultStage })
  }
}
```

**默认映射**:
- StartEvent → Acquisition
- UserTask → Activation (如果在流程早期) or Retention (如果在后期)
- ServiceTask → Retention (用于参与的 API 调用)
- Gateway → Retention (决策点)
- EndEvent → Referral (旅程完成)

**考虑的替代方案**:
- 需要手动迁移 → 拒绝(用户体验差)
- 无向后兼容性 → 拒绝(破坏现有工作流)
- 单独的迁移脚本 → 拒绝(增加摩擦,用户可能忘记运行)

### 决策 5: Properties Panel Extension Architecture

**选择**: 使用自定义 property providers 扩展现有的 bpmn-js properties panel,而不是替换它。

**理由**:
- 保留标准 BPMN properties
- 在标准属性旁添加生命周期属性
- 使用 bpmn-js extension 机制(文档完善)
- 维持与 bpmn-js 更新的兼容性

**实现**:
```typescript
// src/extensions/xflow/LifecyclePropertiesProvider.ts
export class LifecyclePropertiesProvider {
  getGroups(element: any) {
    return [
      createLifecycleGroup(element),
      createSegmentGroup(element),
      createTriggerGroup(element),
      createMetricsGroup(element)
    ]
  }
}
```

**考虑的替代方案**:
- 从头创建自定义 properties panel → 拒绝(工作量大,重新发明轮子)
- 使用模态对话框处理生命周期属性 → 拒绝(用户体验不一致)

## 风险 / 权衡

### 风险: 大型工作流的性能
**影响**: 中等
**可能性**: 低
**缓解措施**:
- 生命周期元数据将 XML 文件大小增加约 10-20%
- 对 properties panel 组件使用懒加载
- 为分段/触发器列表实现虚拟滚动
- 使用包含 100+ 元素的工作流进行基准测试

### 风险: XFlow Format 的破坏性更改
**影响**: 高
**可能性**: 中等
**缓解措施**:
- 对 XFlow extension format 进行版本控制 (`<xflow:lifecycle version="1.0">`)
- 永久维持对 v1.0 格式的 adapter 支持
- 在控制台为旧格式提供迁移警告
- 在 CHANGELOG 中记录格式更改

### 风险: Frontend 和 Backend 之间的类型漂移
**影响**: 高
**可能性**: 高(未来阶段)
**缓解措施**:
- 通过 npm package 共享类型定义(未来)
- 从 TypeScript interfaces 生成 OpenAPI spec
- 添加验证双方的集成测试
- 在 BpmnAdapter 中使用 JSON Schema 验证

### 风险: 用户对新概念的困惑
**影响**: 中等
**可能性**: 中等
**缓解措施**:
- 添加解释生命周期阶段的工具提示
- 提供"开箱即用"的默认配置
- 创建应用内生命周期概念教程
- 在 README 中使用示例进行记录

### 权衡: 功能完整性 vs. 时间表
**决策**: 在 Phase 1 实现基础功能,推迟高级功能

**理由**:
- Phase 1 提供即时价值(生命周期上下文)
- 能够从运营人员获得迭代反馈
- 降低过度工程的风险
- 未来阶段基于经验证的基础构建

**推迟的内容**:
- 实时分段成员资格计算 → Phase 2
- AI 驱动的分段建议 → Phase 3
- 多渠道触发器编排 → Phase 4
- 终端用户个性化界面 → Phase 5

## 迁移计划

### 对于现有工作流

1. **加载时自动迁移**:
   - 解析工作流 XML 时,BpmnAdapter 检测缺失的生命周期元数据
   - 基于元素类型启发式分配默认生命周期阶段
   - 将迁移日志写入控制台以提高可见性

2. **用户通知**:
   - 显示通知横幅:"此工作流在生命周期功能之前创建。已分配默认阶段。请在属性面板中查看和自定义。"
   - 提供"查看生命周期"按钮,突出显示需要查看的元素

3. **验证**:
   - 所有迁移的工作流通过现有测试
   - 手动抽查示例工作流
   - 提供回滚选项(在 localStorage 中保留原始 XML)

### 对于开发团队

1. **更新开发工作流**:
   - 运行 `npm install` 获取更新的依赖项
   - 查看 `src/types/lifecycle.ts` 中的新类型定义
   - 阅读设计文档和架构图

2. **测试更新的代码**:
   - 运行 `npm test` 执行更新的测试套件
   - 使用 `client/resources/` 中的示例工作流测试迁移
   - 验证与旧工作流的向后兼容性

3. **文档**:
   - 使用生命周期功能部分更新 README
   - 为新类型和服务添加 JSDoc 注释
   - 创建显示新组件的架构图

## 待解决问题

1. **Q: 生命周期阶段应该可自定义还是固定为 AARRR?**
   **A**: Phase 1 固定为 AARRR。Phase 2+ 允许通过管理配置自定义阶段。

2. **Q: 我们应该提供多少个预定义的分段模板?**
   **A**: 从 10 个常见模板开始。根据用户反馈扩展。

3. **Q: 触发条件是否应支持 JavaScript 表达式?**
   **A**: Phase 1 不支持(安全考虑)。仅使用声明式条件。在后端阶段使用沙箱评估重新审视。

4. **Q: 如何处理跨越多个生命周期阶段的工作流?**
   **A**: 元素可以有不同的阶段。工作流级元数据显示主要阶段。分析跨所有阶段聚合。

5. **Q: 如果用户在工作流执行中途更改阶段会发生什么(未来)?**
   **A**: 推迟到 Phase 2(存在执行引擎时)。设计执行状态为每个实例不可变。

## 成功指标

### 技术指标
- [ ] 迁移后所有现有工作流无错误加载
- [ ] 生命周期元数据使 XML 大小增加 < 20%
- [ ] Properties panel 在 < 100ms 内渲染生命周期字段
- [ ] 零 TypeScript 编译错误
- [ ] 测试覆盖率保持 > 80%

### 产品指标 (发布后)
- [ ] 30 天内 50%+ 的工作流使用生命周期阶段标记
- [ ] 30 天内 30%+ 的工作流使用分段定向
- [ ] 每月 < 5 个与生命周期功能相关的支持工单
- [ ] 90%+ 的用户对生命周期界面满意(调查)

## 未来架构 (Phases 2-5)

此基础支持:

**Phase 2: Data & Analytics**
- 后端工作流执行引擎
- 用户配置文件数据库
- 事件流管道
- 分析仪表板(ECharts 集成)

**Phase 3: AI Automation**
- 用于工作流优化的 AI Agent
- 智能分段推荐
- 预测性生命周期进展
- 自动化内容生成

**Phase 4: Multi-Channel Operations**
- Email/SMS/Push notification 集成
- 活动管理
- A/B 测试框架
- 归因跟踪

**Phase 5: End-User Personalization**
- 面向客户的个性化界面
- 实时推荐引擎
- 动态内容交付
- 用户偏好管理
