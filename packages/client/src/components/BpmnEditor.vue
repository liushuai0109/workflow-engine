<template>
  <div class="bpmn-editor">
    <div ref="container" class="bpmn-container"></div>

    <!-- Lifecycle Panel (optional) -->
    <div v-if="showLifecyclePanel" class="lifecycle-panel-container">
      <LifecyclePanel
        :modeler="modeler"
        :selected-element="selectedElement"
        @close="showLifecyclePanel = false"
      />
    </div>

    <!-- 缩放控制 -->
    <div class="io-zoom-controls">
      <button 
        class="io-zoom-control" 
        @click="zoomIn" 
        title="放大"
      >
        <span class="entry-icon">+</span>
      </button>
      <button 
        class="io-zoom-control" 
        @click="zoomOut" 
        title="缩小"
      >
        <span class="entry-icon">−</span>
      </button>
      <button 
        class="io-zoom-control" 
        @click="zoomToFit" 
        title="适应画布"
      >
        <span class="entry-icon">⌂</span>
      </button>
      <button 
        class="io-zoom-control" 
        @click="zoomReset" 
        title="重置缩放"
      >
        <span class="entry-icon">1:1</span>
      </button>
      <button 
        class="io-zoom-control" 
        @click="togglePropertiesPanel" 
        :title="isPropertiesPanelVisible ? '隐藏属性面板' : '显示属性面板'"
      >
        <span class="entry-icon">{{ isPropertiesPanelVisible ? '◄' : '►' }}</span>
      </button>
      <button
        class="io-zoom-control"
        @click="togglePalette"
        :title="isPaletteVisible ? '隐藏工具栏' : '显示工具栏'"
      >
        <span class="entry-icon">{{ isPaletteVisible ? '◄' : '►' }}</span>
      </button>
      <button
        class="io-zoom-control"
        @click="toggleLifecyclePanel"
        :title="showLifecyclePanel ? '隐藏生命周期面板' : '显示生命周期面板'"
      >
        <span class="entry-icon">🎯</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import BpmnModeler from 'bpmn-js/lib/Modeler'
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
} from 'bpmn-js-properties-panel';
import XFlowExtensionModule from '../extensions/xflow/XFlowExtensionModule'
import xflowExtension from '../extensions/xflow/xflowExtension.json'
import { LocalStorageService } from '../services/localStorageService'
import type { BpmnModelerInstance, BpmnEvent } from '../types'
import LifecyclePanel from './lifecycle/LifecyclePanel.vue'

// Props
interface Props {
  xml?: string
  options?: any
}

const props = withDefaults(defineProps<Props>(), {
  xml: '',
  options: () => ({})
})

// Emits
const emit = defineEmits<{
  error: [error: Error]
  shown: []
  loading: []
  changed: [xml: string]
}>()

// Refs
const container = ref<HTMLElement>()
let modeler: BpmnModelerInstance;
const isPropertiesPanelVisible = ref<boolean>(true)
const isPaletteVisible = ref<boolean>(true)
const showLifecyclePanel = ref<boolean>(false)
const selectedElement = ref<any>(null)

// 防抖函数
let saveTimeout: NodeJS.Timeout | null = null
const debouncedSave = () => {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  saveTimeout = setTimeout(() => {
    if (modeler) {
      modeler.saveXML({ format: true }).then((result: any) => {
        // 自动保存到 localStorage
        if (LocalStorageService.isAvailable()) {
          LocalStorageService.saveDiagram(result.xml, 'Auto-saved Diagram')
        }
        
        // 注意：不在这里触发 changed 事件，避免在属性编辑时重新渲染
        // 只在用户主动保存时才更新父组件的 currentDiagram
        
        // 保存完成后恢复视口位置
        setTimeout(() => {
          // restoreViewbox()
        }, 50)
      }).catch((error: Error) => {
        console.error('Failed to save XML:', error)
        emit('error', error)
      })
    }
  }, 300) // 300ms 防抖
}

// 视口位置管理
let savedViewbox: any = null
const saveViewbox = () => {
  if (modeler) {
    const canvas = modeler.get('canvas')
    savedViewbox = canvas.viewbox()
  }
}

const restoreViewbox = () => {
  if (modeler && savedViewbox) {
    const canvas = modeler.get('canvas')
    canvas.viewbox(savedViewbox)
  }
}

// 缩放控制方法
const zoomIn = () => {
  if (!modeler) return
  const zoomScroll = modeler.get('zoomScroll')
  zoomScroll.stepZoom(1)
}

const zoomOut = () => {
  if (!modeler) return
  const zoomScroll = modeler.get('zoomScroll')
  zoomScroll.stepZoom(-1)
}

const zoomToFit = () => {
  if (!modeler) return
  const canvas = modeler.get('canvas')
  canvas.zoom('fit-viewport')
}

const zoomReset = () => {
  if (!modeler) return
  const canvas = modeler.get('canvas')
  canvas.zoom(1)
}

const togglePropertiesPanel = () => {
  isPropertiesPanelVisible.value = !isPropertiesPanelVisible.value
  // 通知父组件更新状态
  const event = new CustomEvent('toggle-properties-panel', { 
    detail: { visible: isPropertiesPanelVisible.value } 
  })
  window.dispatchEvent(event)
}

const toggleLifecyclePanel = () => {
  showLifecyclePanel.value = !showLifecyclePanel.value

  // Update selected element when panel opens
  if (showLifecyclePanel.value && modeler) {
    const selection = modeler.get('selection')
    const selected = selection.get()
    if (selected && selected.length > 0) {
      selectedElement.value = selected[0]
    }
  }
}

const togglePalette = () => {
  if (!modeler) return

  isPaletteVisible.value = !isPaletteVisible.value

  // 使用 CSS 方式控制 palette 显示/隐藏
  const paletteElement = document.querySelector('.djs-palette') as HTMLElement
  if (paletteElement) {
    if (isPaletteVisible.value) {
      paletteElement.style.display = ''
      paletteElement.style.transform = 'translateX(0)'
      paletteElement.style.opacity = '1'
    } else {
      paletteElement.style.display = 'none'
    }
  }
  
  // 尝试使用 API 方式（如果可用）
  try {
    const palette = modeler.get('palette')
    if (palette) {
      if (isPaletteVisible.value) {
        palette.open()
      } else {
        palette.close()
      }
    }
  } catch (error) {
    // API 方式失败时，CSS 方式已经处理了
  }
}

// 初始化 BPMN 编辑器
const initModeler = (): void => {
  if (!container.value) return

  try {
    modeler = new BpmnModeler({
      container: container.value,
      additionalModules: [
        BpmnPropertiesPanelModule,
        BpmnPropertiesProviderModule,
        XFlowExtensionModule,
      ],
      moddleExtensions: {
        xflow: xflowExtension,
      },
      propertiesPanel: {
        parent: '#properties-panel'
      },
      keyboard: {
        bindTo: document
      },
      ...props.options
    }) as BpmnModelerInstance

    setupEventListeners()

    // 如果有 XML 内容，加载它
    if (props.xml) {
      loadXml(props.xml)
    } else {
      createDefaultDiagram()
    }

  } catch (error) {
    console.error('Failed to initialize BPMN modeler:', error)
    emit('error', error as Error)
  }
}

// 设置事件监听器
const setupEventListeners = (): void => {
  if (!modeler) return

  modeler.on('import.done', (event: BpmnEvent) => {
    console.log('BPMN diagram imported successfully')
    // 确保 palette 状态正确
    setTimeout(() => {
      const paletteElement = document.querySelector('.djs-palette') as HTMLElement
      if (paletteElement) {
        if (isPaletteVisible.value) {
          paletteElement.style.display = ''
        } else {
          paletteElement.style.display = 'none'
        }
      }
    }, 100)
    emit('shown')
  })

  // 使用防抖函数避免频繁的 XML 保存
  modeler.on('commandStack.changed', () => {
    saveViewbox() // 保存当前视口位置
    debouncedSave()
  })

  modeler.on('error', (event: BpmnEvent) => {
    console.error('BPMN modeler error:', event)
    emit('error', new Error('BPMN modeler error'))
  })

  // Listen to selection changes for lifecycle panel
  const eventBus = modeler.get('eventBus')
  eventBus.on('selection.changed', (event: any) => {
    if (event.newSelection && event.newSelection.length > 0) {
      selectedElement.value = event.newSelection[0]
    } else {
      selectedElement.value = null
    }
  })
}

// 加载 XML
const loadXml = async (xml: string): Promise<void> => {
  if (!modeler) return

  try {
    emit('loading')
    // 保存当前视口位置
    saveViewbox()
    
    await modeler.importXML(xml)
    
    // 恢复视口位置
    setTimeout(() => {
      restoreViewbox()
    }, 100)
    
    emit('shown')
  } catch (error) {
    console.error('Failed to import XML:', error)
    emit('error', error as Error)
  }
}

// 创建默认图表
const createDefaultDiagram = async (): Promise<void> => {
  const defaultXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn" exporter="bpmn-js" exporterVersion="9.4.0">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Task_1" name="New Task">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="EndEvent_1">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="99" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Activity_1_di" bpmnElement="Task_1">
        <dc:Bounds x="270" y="77" width="100" height="80" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Event_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="432" y="99" width="36" height="36" />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="215" y="117" />
        <di:waypoint x="270" y="117" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="370" y="117" />
        <di:waypoint x="432" y="117" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`

  await loadXml(defaultXml)
}

// 暴露方法给父组件
const getXml = async (): Promise<string> => {
  if (!modeler) return ''
  
  try {
    const result = await modeler.saveXML({ format: true })
    return result.xml
  } catch (error) {
    console.error('Failed to get XML:', error)
    throw error
  }
}

// 手动触发 changed 事件（用于用户主动保存时）
const triggerChanged = async (): Promise<void> => {
  if (!modeler) return
  
  try {
    const result = await modeler.saveXML({ format: true })
    emit('changed', result.xml)
  } catch (error) {
    console.error('Failed to trigger changed event:', error)
    throw error
  }
}

const getSvg = async (): Promise<string> => {
  if (!modeler) return ''
  
  try {
    const result = await modeler.saveSVG()
    return result.svg
  } catch (error) {
    console.error('Failed to get SVG:', error)
    throw error
  }
}

const getModeler = (): BpmnModelerInstance => {
  return modeler
}

// 监听 XML 属性变化
watch(() => props.xml, (newXml, oldXml) => {
  // 只有当 XML 真正发生变化且 modeler 已初始化时才重新加载
  if (newXml !== oldXml && newXml && modeler) {
    console.log('XML changed, reloading diagram...')
    loadXml(newXml)
  }
}, { immediate: false })

// 暴露方法和状态
defineExpose({
  getXml,
  getSvg,
  getModeler,
  triggerChanged,
  isPropertiesPanelVisible
})

// 生命周期
onMounted(() => {
  initModeler()
})

onBeforeUnmount(() => {
  // 清理定时器
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }
  
  // 销毁模型器
  if (modeler) {
    modeler.destroy()
  }
})
</script>

<style scoped>
.bpmn-editor {
  width: 100%;
  height: 100%;
  position: relative;
}

.bpmn-container {
  width: 100%;
  height: 100%;
}

/* 缩放控制样式 */
.io-zoom-controls {
  position: absolute;
  top: 20px;
  right: 20px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  z-index: 1000;
}

/* 属性面板和工具栏切换按钮特殊样式 */
.io-zoom-control:nth-last-child(2) {
  margin-top: 4px;
  border-top: 2px solid #e5e7eb;
  padding-top: 6px;
}

.io-zoom-control:last-child {
  margin-top: 2px;
  border-top: 1px solid #e5e7eb;
  padding-top: 6px;
}

.io-zoom-control {
  width: 40px;
  height: 40px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.io-zoom-control:hover {
  background: #f5f5f5;
  border-color: #999;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.io-zoom-control:active {
  background: #e5e5e5;
  transform: translateY(1px);
}

.entry-icon {
  font-size: 16px !important;
  font-weight: bold !important;
}

/* 自定义 Context Pad 按钮样式 */
:deep(.append-element) {
  background: #10b981 !important;
  color: white !important;
  border-radius: 4px !important;
}

:deep(.append-element:hover) {
  background: #059669 !important;
}

:deep(.entry-icon) {
  font-size: 16px !important;
  font-weight: bold !important;
}

/* Palette 隐藏样式 */
:deep(.djs-palette.hidden) {
  display: none !important;
}
</style>
