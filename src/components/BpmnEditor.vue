<template>
  <div class="bpmn-editor">
    <div ref="container" class="bpmn-container"></div>
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

// 暴露方法
defineExpose({
  getXml,
  getSvg,
  getModeler,
  triggerChanged
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
</style>
