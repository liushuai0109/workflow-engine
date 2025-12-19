---
name: OpenSpec: Archive
description: 归档已部署的 OpenSpec 变更并更新规范。
category: OpenSpec
tags: [openspec, archive]
---
<!-- OPENSPEC:START -->
**防护栏**
- 优先采用直接、最小化的实现，仅在被要求或明确需要时添加复杂性。
- 保持变更紧密聚焦于请求的结果。
- 如果需要额外的 OpenSpec 约定或澄清，请参考 `openspec/AGENTS.md`（位于 `openspec/` 目录内——如果看不到，运行 `ls openspec` 或 `npx openspec update`）。

**步骤**
1. 确定要归档的变更 ID：
   - 如果此提示已包含特定的变更 ID（例如在由斜杠命令参数填充的 `<ChangeId>` 块内），则在修剪空格后使用该值。
   - 如果对话松散地引用变更（例如通过标题或摘要），运行 `npx openspec list` 以显示可能的 ID，分享相关候选者，并确认用户的意图。
   - 否则，查看对话，运行 `npx openspec list`，并询问用户要归档哪个变更；在继续之前等待确认的变更 ID。
   - 如果仍然无法识别单个变更 ID，停止并告诉用户你还不能归档任何内容。
2. 通过运行 `npx openspec list`（或 `npx openspec show <id>`）验证变更 ID，如果变更丢失、已归档或尚未准备好归档，则停止。
3. 运行 `npx openspec archive <id> --yes`，使 CLI 移动变更并应用规范更新而不提示（仅对纯工具工作使用 `--skip-specs`）。
4. 查看命令输出以确认目标规范已更新，变更已到达 `changes/archive/`。
5. 使用 `npx openspec validate --strict` 进行验证，如果有任何异常，使用 `npx openspec show <id>` 进行检查。

**参考**
- 在归档之前使用 `npx openspec list` 确认变更 ID。
- 使用 `npx openspec list --specs` 检查刷新的规范，并在交接之前解决任何验证问题。
<!-- OPENSPEC:END -->
