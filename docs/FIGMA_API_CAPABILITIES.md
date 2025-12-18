# Figma API 能力说明

> 本文档介绍 Figma REST API 的核心能力，帮助你了解可以做什么，不能做什么。

## 官方资源

- **API 文档**: https://developers.figma.com/docs/rest-api/
- **OpenAPI 规范**: https://github.com/figma/rest-api-spec
- **Embed Kit 2.0**: https://www.figma.com/developers/embed

---

## 核心 API 能力

### 1. 文件操作 (File Operations)

#### 1.1 获取文件信息
```
GET /v1/files/:key
```
**能力**:
- ✅ 获取文件的基本信息（名称、版本、最后修改时间等）
- ✅ 获取文件的完整结构（所有节点、层级关系）
- ✅ 获取文件中的组件、样式、变量等资源

**限制**:
- ❌ 不能修改文件内容（只读）
- ❌ 不能创建新文件
- ❌ 需要文件有访问权限（Public 或已分享）

**返回数据示例**:
```json
{
  "document": {
    "id": "...",
    "name": "Design File",
    "type": "DOCUMENT",
    "children": [...]
  },
  "components": {...},
  "styles": {...},
  "name": "Design File",
  "lastModified": "2024-12-11T10:00:00Z",
  "version": "1234567890"
}
```

#### 1.2 获取特定节点
```
GET /v1/files/:key/nodes?ids=node-id-1,node-id-2
```
**能力**:
- ✅ 只获取指定节点的信息（不需要下载整个文件）
- ✅ 支持批量查询多个节点
- ✅ 返回节点的详细属性（位置、尺寸、样式等）

**使用场景**:
- 只关心特定设计稿节点时，比获取整个文件更高效
- 适合在 BPMN 节点中关联特定 Figma 节点

---

### 2. 图片导出 (Image Export)

#### 2.1 导出节点为图片
```
GET /v1/images/:key?ids=node-id&format=png&scale=2
```
**能力**:
- ✅ 将 Figma 节点渲染为图片（PNG、JPG、SVG、PDF）
- ✅ 支持缩放（0.01x - 4x）
- ✅ 支持批量导出多个节点
- ✅ 返回临时图片 URL（30 天有效期）

**参数**:
- `ids`: 节点 ID（逗号分隔）
- `format`: `png` | `jpg` | `svg` | `pdf`
- `scale`: 缩放比例（1 = 原始尺寸，2 = 2倍）
- `svg_outline_text`: SVG 中文本是否转为轮廓

**返回示例**:
```json
{
  "images": {
    "1:2": "https://figma-alpha-api.s3.us-west-2.amazonaws.com/images/..."
  },
  "status": 200
}
```

**使用场景**:
- 在 BPMN 属性面板中显示设计稿缩略图
- 导出设计稿用于文档或演示
- 生成设计稿预览图

**限制**:
- ❌ 图片 URL 30 天后过期（需要重新请求）
- ❌ 大文件导出可能需要较长时间
- ❌ 不支持导出整个文件（只能导出节点）

---

### 3. 用户和团队 (Users & Teams)

#### 3.1 获取用户信息
```
GET /v1/me
```
**能力**:
- ✅ 获取当前认证用户的信息
- ✅ 获取用户的团队列表

#### 3.2 获取团队信息
```
GET /v1/teams/:team_id
```
**能力**:
- ✅ 获取团队基本信息
- ✅ 获取团队项目列表

---

### 4. 评论 (Comments)

#### 4.1 获取文件评论
```
GET /v1/files/:key/comments
```
**能力**:
- ✅ 读取文件中的所有评论
- ✅ 获取评论的回复

#### 4.2 创建评论
```
POST /v1/files/:key/comments
```
**能力**:
- ✅ 在文件或特定节点上创建评论
- ✅ 支持 @ 提及用户

**使用场景**:
- 在设计稿上添加反馈
- 关联 BPMN 节点和 Figma 评论

---

### 5. 组件和样式 (Components & Styles)

#### 5.1 获取组件信息
```
GET /v1/files/:key
```
**能力**:
- ✅ 获取文件中定义的所有组件
- ✅ 获取组件的使用情况
- ✅ 获取组件的属性定义

**使用场景**:
- 了解设计系统中的组件
- 检查组件使用情况

---

### 6. 变量 (Variables)

#### 6.1 获取变量
```
GET /v1/files/:key/variables/local
```
**能力**:
- ✅ 获取文件中定义的变量（设计令牌）
- ✅ 获取变量的值和模式（light/dark 等）

**使用场景**:
- 同步设计令牌到代码
- 检查设计一致性

---

### 7. Webhooks（事件监听）

#### 7.1 创建 Webhook
```
POST /v1/webhooks
```
**能力**:
- ✅ 监听文件变更事件
- ✅ 监听评论事件
- ✅ 监听版本发布事件

**使用场景**:
- 当 Figma 设计稿更新时，通知 BPMN 编辑器
- 实现设计稿变更检测

**事件类型**:
- `FILE_UPDATE`: 文件被修改
- `FILE_COMMENT`: 新增评论
- `FILE_VERSION_UPDATE`: 发布新版本

---

### 8. 嵌入 (Embedding)

#### 8.1 Embed Kit 2.0
**能力**:
- ✅ 在网页中嵌入 Figma 文件或原型
- ✅ 支持指定显示特定节点
- ✅ 支持主题切换（light/dark）
- ✅ 支持交互式原型播放

**URL 格式**:
```
https://embed.figma.com/file/{file-key}?node-id={node-id}&theme=light
```

**特点**:
- ✅ 不需要 API Token（基于文件权限）
- ✅ 支持响应式嵌入
- ✅ 支持全屏模式
- ✅ 支持键盘快捷键

**限制**:
- ❌ 需要文件设置为可查看（Public 或已分享）
- ❌ 不能通过 API 生成嵌入代码（需要手动构建 URL）

---

## API 认证

### Personal Access Token
- **获取方式**: Figma 设置 → Account → Personal Access Tokens
- **权限**: 读取/写入（取决于 Token 权限）
- **使用**: 在请求头中添加 `X-Figma-Token: your-token`

### OAuth 2.0
- **适用场景**: 需要代表用户操作
- **流程**: 标准 OAuth 2.0 授权流程
- **文档**: https://www.figma.com/developers/api#oauth2

---

## 重要限制

### ❌ 不能做的事情

1. **修改文件内容**
   - 不能通过 API 创建、删除、修改节点
   - 不能修改文件结构
   - 只能读取文件信息

2. **实时协作**
   - 不能获取实时编辑状态
   - 不能监听实时变更（只能通过 Webhooks 监听已保存的变更）

3. **批量操作**
   - 某些操作不支持批量（如评论）
   - 需要逐个处理

4. **文件创建**
   - 不能通过 API 创建新文件
   - 文件必须在 Figma 中手动创建

### ✅ 可以做的事情

1. **读取所有信息**
   - 文件结构、节点属性、组件、样式等

2. **导出资源**
   - 图片、SVG、PDF 等

3. **嵌入查看**
   - 通过 Embed Kit 嵌入到网页

4. **事件监听**
   - 通过 Webhooks 监听变更

5. **评论管理**
   - 读取和创建评论

---

## 针对 BPMN 节点的使用场景

### 场景 1: 关联设计稿（基础）
**需求**: 在 BPMN 节点上关联 Figma 设计稿链接

**可用 API**:
- ❌ 不需要 API（直接存储 URL）
- ✅ 使用 Embed Kit 2.0 嵌入查看

**实现方式**:
- 存储 Figma URL（file-key + node-id）
- 使用 Embed Kit 生成嵌入 URL
- 在新窗口或 iframe 中显示

---

### 场景 2: 显示设计稿缩略图
**需求**: 在属性面板中显示设计稿预览图

**可用 API**:
- ✅ `GET /v1/images/:key` - 导出节点为图片

**实现方式**:
1. 从 BPMN 节点读取 Figma 关联信息（file-key, node-id）
2. 调用 API 获取图片 URL
3. 在属性面板中显示图片
4. 缓存图片 URL（30 天有效期）

**注意事项**:
- 需要配置 Figma API Token
- 图片 URL 会过期，需要定期刷新
- 首次加载可能需要等待图片生成

---

### 场景 3: 设计稿变更检测
**需求**: 当 Figma 设计稿更新时，在 BPMN 编辑器中提示

**可用 API**:
- ✅ Webhooks - 监听文件变更事件

**实现方式**:
1. 注册 Webhook 监听文件变更
2. 当收到 `FILE_UPDATE` 事件时，检查关联的 BPMN 节点
3. 在节点上显示"设计稿已更新"提示

**注意事项**:
- 需要后端服务接收 Webhook 回调
- 需要维护 Webhook 注册状态

---

### 场景 4: 获取设计稿详细信息
**需求**: 显示设计稿的节点名称、尺寸、最后修改时间等

**可用 API**:
- ✅ `GET /v1/files/:key/nodes` - 获取节点详细信息

**实现方式**:
1. 从 BPMN 节点读取 Figma 关联信息
2. 调用 API 获取节点详细信息
3. 在属性面板中显示详细信息

**返回数据示例**:
```json
{
  "nodes": {
    "1:2": {
      "document": {
        "id": "1:2",
        "name": "Login Page",
        "type": "FRAME",
        "absoluteBoundingBox": {
          "x": 0,
          "y": 0,
          "width": 375,
          "height": 812
        }
      }
    }
  }
}
```

---

## 推荐方案

### 最小化方案（无需 API Token）
1. **存储 Figma URL**: 在 BPMN 节点中存储 Figma 文件 URL 和节点 ID
2. **嵌入查看**: 使用 Embed Kit 2.0 在新窗口打开设计稿
3. **优点**: 简单、无需配置、无需后端
4. **缺点**: 无法显示缩略图、无法检测变更

### 完整方案（需要 API Token）
1. **存储 Figma URL**: 同上
2. **嵌入查看**: 同上
3. **缩略图预览**: 使用 `/v1/images` API 获取预览图
4. **详细信息**: 使用 `/v1/files/:key/nodes` 获取节点信息
5. **变更检测**: 使用 Webhooks（需要后端支持）
6. **优点**: 功能完整、用户体验好
7. **缺点**: 需要配置 API Token、图片 URL 会过期

---

## API 速率限制

- **免费版**: 2000 请求/小时
- **专业版**: 更高限制（具体查看官方文档）
- **建议**: 实现请求缓存，避免频繁调用

---

## 总结

### 核心能力
1. ✅ **读取文件信息** - 获取文件结构和节点详情
2. ✅ **导出图片** - 将节点渲染为图片
3. ✅ **嵌入查看** - 通过 Embed Kit 嵌入设计稿
4. ✅ **事件监听** - 通过 Webhooks 监听变更
5. ✅ **评论管理** - 读取和创建评论

### 主要限制
1. ❌ **只读 API** - 不能修改文件内容
2. ❌ **不能创建文件** - 文件必须手动创建
3. ❌ **图片 URL 过期** - 30 天后需要重新请求

### 针对你的需求
- **关联节点和设计稿**: ✅ 完全支持（使用 Embed Kit）
- **显示设计稿预览**: ✅ 支持（需要 API Token）
- **检测设计稿变更**: ✅ 支持（需要 Webhooks + 后端）

---

**参考文档**:
- REST API: https://developers.figma.com/docs/rest-api/
- Embed Kit: https://www.figma.com/developers/embed
- Webhooks: https://www.figma.com/developers/api#webhooks
