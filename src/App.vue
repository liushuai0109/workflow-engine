<template>
  <div class="app">
    <!-- Header -->
    <header class="header">
      <div class="header-content">
        <h1 class="logo">BPMN Explorer</h1>
        <div class="header-actions">
          <button 
            @click="togglePalette" 
            class="btn btn-secondary" 
            title="Toggle element palette"
          >
            <span class="icon">🎨</span>
            Palette
          </button>
          <button 
            @click="openFile" 
            class="btn btn-secondary" 
            title="Open diagram from local file system (Ctrl+O)"
          >
            <span class="icon">📁</span>
            Open
          </button>
          <button 
            @click="saveFile" 
            class="btn btn-primary" 
            title="Download BPMN 2.0 diagram (Ctrl+S)"
          >
            <span class="icon">💾</span>
            Save
          </button>
        </div>
        <div v-if="autoSaveStatus" class="auto-save-status" :class="autoSaveStatusClass">
          {{ autoSaveStatus }}
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="main">
      <!-- Canvas Container -->
      <div class="canvas-container">
        <BpmnModeler 
          ref="bpmnModeler"
          :xml="currentDiagram"
          @imported="onDiagramImported"
          @changed="onDiagramChanged"
          @error="onDiagramError"
          @dragover="handleDragOver"
          @drop="handleFileDrop"
        />
        
        <div v-if="showWelcome" class="canvas-overlay">
          <div class="welcome-message">
            <h2>Open or create a BPMN diagram</h2>
            <p>Use bpmn-js to view, create and edit BPMN 2.0 diagrams in your browser.</p>
            <p class="drag-hint">💡 You can also drag and drop BPMN files directly onto the canvas</p>
            <div class="welcome-actions">
              <button @click="createNewDiagram" class="btn btn-primary">Create New Diagram</button>
              <button @click="openFile" class="btn btn-secondary">Open from File</button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <!-- Hidden File Input -->
    <input 
      ref="fileInput"
      type="file" 
      accept=".bpmn,.xml,application/xml,text/xml" 
      style="display: none;"
      @change="handleFileSelect"
    >
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import BpmnModeler from './components/BpmnModeler.vue'
import type { AutoSaveData } from './types'

// 响应式数据
const currentDiagram = ref<string | null>(null)
const showWelcome = ref<boolean>(true)
const autoSaveEnabled = ref<boolean>(true)
const autoSaveTimeout = ref<NodeJS.Timeout | null>(null)
const autoSaveDelay = ref<number>(2000)
const storageKey = ref<string>('bpmn-explorer-autosave')
const autoSaveStatus = ref<string>('')
const autoSaveStatusClass = ref<string>('')

// 模板引用
const bpmnModeler = ref<InstanceType<typeof BpmnModeler> | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
// 事件处理函数
const onDiagramImported = () => {
  showWelcome.value = false
  triggerAutoSave()
}

const onDiagramChanged = () => {
  triggerAutoSave()
}

const onDiagramError = (error: Error) => {
  console.error('BPMN Error:', error)
  showError('Import Error', error.message)
}

// 文件操作函数
const createNewDiagram = async (): Promise<void> => {
  try {
    if (bpmnModeler.value) {
      await bpmnModeler.value.createNewDiagram()
      showWelcome.value = false
      clearAutoSave()
    }
  } catch (error) {
    console.error('Error creating new diagram:', error)
    showError('Error', 'Failed to create new diagram')
  }
}

const openFile = (): void => {
  if (fileInput.value) {
    fileInput.value.click()
  }
}

const handleFileSelect = (event: Event): void => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // 验证文件类型
  if (!isValidBpmnFile(file)) {
    showError('Invalid File', 'Please select a valid BPMN file (.bpmn or .xml)')
    target.value = ''
    return
  }

  // 验证文件大小 (限制为 10MB)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    showError('File Too Large', 'File size must be less than 10MB')
    target.value = ''
    return
  }

  // 显示加载状态
  updateAutoSaveStatus('Loading file...', 'info')

  const reader = new FileReader()
  
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string
      
      // 验证 XML 内容
      if (!isValidBpmnXml(content)) {
        showError('Invalid BPMN Content', 'The file does not contain valid BPMN 2.0 XML')
        updateAutoSaveStatus('')
        target.value = ''
        return
      }

      // 设置图表内容
      currentDiagram.value = content
      clearAutoSave()
      updateAutoSaveStatus(`File loaded: ${file.name}`, 'success')
      
      // 3秒后清除状态消息
      setTimeout(() => {
        updateAutoSaveStatus('')
      }, 3000)
      
    } catch (error) {
      console.error('Error processing file:', error)
      showError('File Processing Error', 'Failed to process the selected file')
      updateAutoSaveStatus('')
    }
    
    // Reset file input
    target.value = ''
  }

  reader.onerror = () => {
    showError('File Read Error', 'Failed to read the selected file')
    updateAutoSaveStatus('')
    target.value = ''
  }

  reader.readAsText(file, 'UTF-8')
}

const saveFile = async (): Promise<void> => {
  try {
    if (bpmnModeler.value) {
      const xml = await bpmnModeler.value.getXML()
      downloadFile(xml, 'diagram.bpmn', 'application/xml')
    }
  } catch (error) {
    console.error('Error saving diagram:', error)
    showError('Save Error', 'Failed to save diagram')
  }
}

const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const showError = (title: string, message: string): void => {
  alert(`${title}: ${message}`)
}

// 文件验证函数
const isValidBpmnFile = (file: File): boolean => {
  const validExtensions = ['.bpmn', '.xml']
  const fileName = file.name.toLowerCase()
  
  return validExtensions.some(ext => fileName.endsWith(ext))
}

const isValidBpmnXml = (content: string): boolean => {
  try {
    // 检查是否包含 BPMN 命名空间
    const bpmnNamespaceRegex = /xmlns:bpmn=["']http:\/\/www\.omg\.org\/spec\/BPMN\/20100524\/MODEL["']/
    const bpmnDefinitionsRegex = /<bpmn:definitions/
    
    return bpmnNamespaceRegex.test(content) && bpmnDefinitionsRegex.test(content)
  } catch (error) {
    console.error('XML validation error:', error)
    return false
  }
}

// Palette 控制
const togglePalette = (): void => {
  if (bpmnModeler.value) {
    bpmnModeler.value.togglePalette()
  }
}

// 拖拽文件处理
const handleDragOver = (event: DragEvent): void => {
  event.preventDefault()
  event.dataTransfer!.dropEffect = 'copy'
}

const handleFileDrop = (event: DragEvent): void => {
  event.preventDefault()
  
  const files = event.dataTransfer?.files
  if (!files || files.length === 0) return
  
  const file = files[0]
  if (!file) return
  
  // 验证文件类型
  if (!isValidBpmnFile(file)) {
    showError('Invalid File', 'Please drop a valid BPMN file (.bpmn or .xml)')
    return
  }

  // 验证文件大小
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    showError('File Too Large', 'File size must be less than 10MB')
    return
  }

  // 显示加载状态
  updateAutoSaveStatus('Loading dropped file...', 'info')

  const reader = new FileReader()
  
  reader.onload = (e) => {
    try {
      const content = e.target?.result as string
      
      // 验证 XML 内容
      if (!isValidBpmnXml(content)) {
        showError('Invalid BPMN Content', 'The dropped file does not contain valid BPMN 2.0 XML')
        updateAutoSaveStatus('')
        return
      }

      // 设置图表内容
      currentDiagram.value = content
      clearAutoSave()
      updateAutoSaveStatus(`File loaded: ${file.name}`, 'success')
      
      // 3秒后清除状态消息
      setTimeout(() => {
        updateAutoSaveStatus('')
      }, 3000)
      
    } catch (error) {
      console.error('Error processing dropped file:', error)
      showError('File Processing Error', 'Failed to process the dropped file')
      updateAutoSaveStatus('')
    }
  }

  reader.onerror = () => {
    showError('File Read Error', 'Failed to read the dropped file')
    updateAutoSaveStatus('')
  }

  reader.readAsText(file, 'UTF-8')
}

// 键盘快捷键
const setupKeyboardShortcuts = (): (() => void) => {
  const handleKeyDown = (event: KeyboardEvent) => {
    // Check if we're in an input field
    const target = event.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return
    }

    const isCtrl = event.ctrlKey || event.metaKey
    
    switch (event.key.toLowerCase()) {
      case 'o':
        if (isCtrl) {
          event.preventDefault()
          openFile()
        }
        break
      case 's':
        if (isCtrl) {
          event.preventDefault()
          saveFile()
        }
        break
      case 'n':
        if (isCtrl) {
          event.preventDefault()
          createNewDiagram()
        }
        break
          case 'delete':
          case 'backspace':
            if (isCtrl && event.shiftKey) {
              event.preventDefault()
              clearAutoSave()
            }
            break
          case 'p':
            if (isCtrl) {
              event.preventDefault()
              togglePalette()
            }
            break
    }
  }

  document.addEventListener('keydown', handleKeyDown)
  
  // 返回清理函数
  return () => {
    document.removeEventListener('keydown', handleKeyDown)
  }
}

// 自动保存功能
const initializeAutoSave = (): void => {
  if (typeof Storage === "undefined") {
    console.warn('localStorage is not available. Auto-save disabled.')
    autoSaveEnabled.value = false
    return
  }
  
  updateAutoSaveStatus('Auto-save enabled', 'success')
}

const triggerAutoSave = (): void => {
  if (!autoSaveEnabled.value || !bpmnModeler.value) {
    return
  }

  if (autoSaveTimeout.value) {
    clearTimeout(autoSaveTimeout.value)
  }

  autoSaveTimeout.value = setTimeout(() => {
    performAutoSave()
  }, autoSaveDelay.value)
}

const performAutoSave = async (): Promise<void> => {
  try {
    if (bpmnModeler.value) {
      const xml = await bpmnModeler.value.getXML()
      const autoSaveData: AutoSaveData = {
        xml: xml,
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
      
      localStorage.setItem(storageKey.value, JSON.stringify(autoSaveData))
      updateAutoSaveStatus('Auto-saved', 'success')
      console.log('Diagram auto-saved to localStorage')
    }
  } catch (error) {
    console.error('Auto-save failed:', error)
    updateAutoSaveStatus('Auto-save failed', 'error')
  }
}

const loadAutoSavedDiagram = (): void => {
  if (!autoSaveEnabled.value) {
    return
  }

  try {
    const savedData = localStorage.getItem(storageKey.value)
    if (savedData) {
      const autoSaveData: AutoSaveData = JSON.parse(savedData)
      const savedTime = new Date(autoSaveData.timestamp)
      const now = new Date()
      const timeDiff = now.getTime() - savedTime.getTime()
      
      // Only load if saved within last 24 hours
      if (timeDiff < 24 * 60 * 60 * 1000) {
        showAutoSaveDialog(autoSaveData)
      } else {
        localStorage.removeItem(storageKey.value)
      }
    }
  } catch (error) {
    console.error('Error loading auto-saved diagram:', error)
    localStorage.removeItem(storageKey.value)
  }
}

const showAutoSaveDialog = (autoSaveData: AutoSaveData): void => {
  const savedTime = new Date(autoSaveData.timestamp).toLocaleString()
  
  // Automatically restore the saved diagram
  currentDiagram.value = autoSaveData.xml
  updateAutoSaveStatus(`自动恢复图表 (保存时间: ${savedTime})`, 'success')
  
  // Clear auto-save data after successful restoration
  localStorage.removeItem(storageKey.value)
}

const updateAutoSaveStatus = (message: string, type: string = 'success'): void => {
  autoSaveStatus.value = message
  autoSaveStatusClass.value = type
  
  // Auto-hide success and info messages after 3 seconds
  if ((type === 'success' || type === 'info') && 
      (message.includes('saved') || message.includes('enabled') || message.includes('Restored') || message.includes('Loading'))) {
    setTimeout(() => {
      if (autoSaveStatus.value === message) {
        autoSaveStatus.value = ''
      }
    }, 3000)
  }
}

const clearAutoSave = (): void => {
  if (autoSaveTimeout.value) {
    clearTimeout(autoSaveTimeout.value)
  }
  localStorage.removeItem(storageKey.value)
  updateAutoSaveStatus('Auto-save cleared', 'success')
}

// 生命周期钩子
let cleanupKeyboardShortcuts: (() => void) | null = null

onMounted(() => {
  cleanupKeyboardShortcuts = setupKeyboardShortcuts()
  initializeAutoSave()
  loadAutoSavedDiagram()
})

onBeforeUnmount(() => {
  if (autoSaveTimeout.value) {
    clearTimeout(autoSaveTimeout.value)
  }
  if (cleanupKeyboardShortcuts) {
    cleanupKeyboardShortcuts()
  }
})
</script>
