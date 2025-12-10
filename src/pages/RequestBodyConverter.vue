<template>
  <div class="request-body-converter">
    <div class="converter-header">
      <h1>RequestBody Converter</h1>
    </div>
    <div class="converter-container">
      <div class="input-panel">
        <div class="panel-header">
          <h2>源数据</h2>
        </div>
        <textarea
          v-model="sourceData"
          class="input-textarea"
          placeholder="请输入源数据..."
        ></textarea>
      </div>
      <div class="output-panel">
        <div class="panel-header">
          <h2>转化后的数据</h2>
          <button
            @click="copyToClipboard"
            class="copy-btn"
            :disabled="!convertedData"
            :title="copySuccess ? '已复制！' : '复制到剪贴板'"
          >
            <span class="copy-icon">{{ copySuccess ? '✓' : '📋' }}</span>
            {{ copySuccess ? '已复制' : '复制' }}
          </button>
        </div>
        <textarea
          v-model="convertedData"
          class="output-textarea"
          placeholder="转化后的数据将显示在这里..."
          readonly
        ></textarea>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const sourceData = ref<string>('')
const convertedData = ref<string>('')
const copySuccess = ref<boolean>(false)

// 去掉 @b64() 包装，保留内部内容
const removeB64Wrapper = (value: string): string => {
  if (typeof value !== 'string') {
    return value
  }
  // 匹配 @b64(xxxx) 格式，保留内部内容
  return value.replace(/@b64\(([^)]+)\)/g, '$1')
}

// 递归处理对象，去掉所有字段值中的 @b64() 包装
const processObject = (obj: any): any => {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(item => processObject(item))
  }

  if (typeof obj === 'object') {
    const result: any = {}
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key]
        if (typeof value === 'string') {
          result[key] = removeB64Wrapper(value)
        } else if (typeof value === 'object') {
          result[key] = processObject(value)
        } else {
          result[key] = value
        }
      }
    }
    return result
  }

  if (typeof obj === 'string') {
    return removeB64Wrapper(obj)
  }

  return obj
}

// 递归查找并修改指定字段的值
const updateFieldRecursively = (obj: any, fieldName: string, newValue: string): void => {
  if (obj === null || obj === undefined) {
    return
  }

  if (Array.isArray(obj)) {
    obj.forEach(item => updateFieldRecursively(item, fieldName, newValue))
    return
  }

  if (typeof obj === 'object') {
    // 如果当前对象有这个字段，就修改它
    if (Object.prototype.hasOwnProperty.call(obj, fieldName)) {
      obj[fieldName] = newValue
    }
    // 递归处理所有属性
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key]
        if (typeof value === 'object') {
          updateFieldRecursively(value, fieldName, newValue)
        }
      }
    }
  }
}

// 转化逻辑
const convertData = (): void => {
  if (!sourceData.value.trim()) {
    convertedData.value = ''
    return
  }

  try {
    // 解析 JSON
    const parsed = JSON.parse(sourceData.value)

    // 1. 去掉所有字段值中的 @b64() 包装
    let converted = processObject(parsed)

    // 2. 递归查找并修改 DeviceType 的值（如果存在）
    updateFieldRecursively(converted, 'DeviceType', 'aU9TMTguNy4x')

    // 3. 递归查找并修改 SessionKey 的值（如果存在）
    updateFieldRecursively(converted, 'SessionKey', 'OTc2ODUxMzcxMC0zMTU4MTItNDE1MjItMTExMjEyMTQtMTE0NzEwMTExNTE4MDE1Mjg=')

    // 4. 一级base_request下的"uin"字段的值去掉双引号
    if (converted.base_request && typeof converted.base_request === 'object') {
      if (converted.base_request.uin !== undefined) {
        if (typeof converted.base_request.uin === 'string') {
          // 去掉字符串中的所有双引号字符（包括转义的 \"）
          let uinValue = converted.base_request.uin.replace(/\\?"/g, '')
          // 如果去掉双引号后是纯数字，转换为数字类型
          if (/^\d+$/.test(uinValue)) {
            converted.base_request.uin = parseInt(uinValue, 10)
          } else {
            converted.base_request.uin = uinValue
          }
        }
      }
    }

    // 格式化输出
    convertedData.value = JSON.stringify(converted, null, 2)
  } catch (error) {
    // 如果解析失败，显示错误信息
    convertedData.value = `错误: ${error instanceof Error ? error.message : '无效的 JSON 格式'}`
  }
}

// 复制到剪贴板
const copyToClipboard = async (): Promise<void> => {
  if (!convertedData.value) {
    return
  }

  try {
    await navigator.clipboard.writeText(convertedData.value)
    copySuccess.value = true
    // 2秒后恢复按钮状态
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch (error) {
    console.error('复制失败:', error)
    // 降级方案：使用传统的复制方法
    try {
      const textarea = document.createElement('textarea')
      textarea.value = convertedData.value
      textarea.style.position = 'fixed'
      textarea.style.opacity = '0'
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand('copy')
      document.body.removeChild(textarea)
      copySuccess.value = true
      setTimeout(() => {
        copySuccess.value = false
      }, 2000)
    } catch (fallbackError) {
      console.error('降级复制也失败:', fallbackError)
    }
  }
}

// 监听源数据变化，自动转化
watch(sourceData, convertData, { immediate: true })
</script>

<style scoped>
.request-body-converter {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #f8f9fa;
}

.converter-header {
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.converter-header h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #374151;
}

.converter-container {
  display: flex;
  flex: 1;
  gap: 16px;
  padding: 16px;
  overflow: hidden;
}

.input-panel,
.output-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: white;
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.panel-header h2 {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: #374151;
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  border: 1px solid #10b981;
  border-radius: 6px;
  background: #10b981;
  color: white;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover:not(:disabled) {
  background: #059669;
  border-color: #059669;
}

.copy-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #9ca3af;
  border-color: #9ca3af;
}

.copy-btn:not(:disabled):active {
  transform: scale(0.98);
}

.copy-icon {
  font-size: 14px;
}

.input-textarea,
.output-textarea {
  flex: 1;
  width: 100%;
  padding: 16px;
  border: none;
  outline: none;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  font-size: 14px;
  line-height: 1.6;
  resize: none;
  background: white;
  color: #374151;
}

.output-textarea {
  background: #f9fafb;
  color: #6b7280;
}

.input-textarea:focus {
  background: #fefefe;
}

.input-textarea::placeholder,
.output-textarea::placeholder {
  color: #9ca3af;
}
</style>

