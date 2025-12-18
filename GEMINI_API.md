---
title: Gemini API
description: 使用 Gemini API 进行代码调用
---

# Gemini API

通过我们的中转服务调用 Gemini 模型。

## 基本信息

| 项目 | 值 |
|-----|-----|
| API 地址 | `https://api.aicodewith.com/api` |
| 推荐模型 | `gemini-3-pro-preview` |
| 调用格式 | Gemini 原生格式 |

## 可用模型

| 模型名称 | 说明 |
|---------|------|
| `gemini-3-pro-preview` | Gemini 3 Pro 预览版，最新技术预览，推理能力强 |
| `gemini-2.5-pro` | Gemini 2.5 Pro 模型，质量高，适合复杂任务 |
| `gemini-2.5-flash` | 快速响应的 Flash 模型，速度快，性价比高 |

## 方法一：Google 官方 SDK（推荐）

使用 Google 官方的 `google-generativeai` SDK 调用。

### 安装依赖

```bash
pip install google-generativeai
```

### 代码示例

```python
import google.generativeai as genai

# 配置 API
genai.configure(
    api_key="YOUR_API_KEY",
    transport="rest",
    client_options={"api_endpoint": "api.aicodewith.com/api"}
)

# 创建模型
model = genai.GenerativeModel("gemini-3-pro-preview")

# 发送请求
response = model.generate_content("你好，请介绍一下你自己")
print(response.text)
```

### 关键配置说明

| 参数 | 说明 |
|-----|------|
| `api_key` | 你的 API 密钥 |
| `transport` | 必须设为 `"rest"` |
| `api_endpoint` | 中转服务地址（不带 `https://`） |

<Callout type="info">
将 `YOUR_API_KEY` 替换为你在 [控制台](https://aicodewith.com/dashboard/api-keys) 获取的 API 密钥。
</Callout>

<Callout type="warning">
我们不提供 OpenAI 格式转换。如需使用 OpenAI 兼容格式，请自行部署 [new-api](https://github.com/Calcium-Ion/new-api) 等格式转换项目。
</Callout>
