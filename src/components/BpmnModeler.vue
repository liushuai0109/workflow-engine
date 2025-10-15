<template>
  <div 
    ref="container" 
    class="bpmn-modeler"
    @dragover="handleDragOver"
    @drop="handleDrop"
  ></div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import BpmnModeler from 'bpmn-js/lib/Modeler'
import type { BpmnModelerInstance, BpmnEvent } from '../types'

// Props
interface Props {
  xml?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  xml: null
})

// Emits
const emit = defineEmits<{
  imported: [event: BpmnEvent]
  changed: [event: BpmnEvent]
  error: [error: Error]
  drop: [event: DragEvent]
}>()

// 响应式数据
const container = ref<HTMLElement | null>(null)
const modeler = ref<BpmnModelerInstance | null>(null)
// 监听 props 变化
watch(() => props.xml, (newXml) => {
  if (newXml && modeler.value) {
    importXML(newXml)
  }
}, { immediate: false })

// 初始化模型器
const initModeler = (): void => {
  if (!container.value) return

  modeler.value = new BpmnModeler({
    container: container.value,
    keyboard: {
      bindTo: document
    },
    additionalModules: [
      // Add any additional modules here
    ],
    // 确保 Palette 可见
    palette: {
      open: true
    }
  }) as BpmnModelerInstance

  setupEventListeners()
  
  // Create default diagram if no XML is provided
  if (!props.xml) {
    createDefaultDiagram()
  }
}

// 设置事件监听器
const setupEventListeners = (): void => {
  if (!modeler.value) return

  // Listen for element changes
  modeler.value.on('element.changed', (event: BpmnEvent) => {
    emit('changed', event)
  })

  // Listen for command stack changes (undo/redo)
  modeler.value.on('commandStack.changed', (event: BpmnEvent) => {
    emit('changed', event)
  })

  // Listen for import errors
  modeler.value.on('import.done', (event: BpmnEvent) => {
    if (event.error) {
      emit('error', event.error)
    } else {
      emit('imported', event)
    }
  })

  // Listen for shape changes
  modeler.value.on('shape.added', () => emit('changed', {} as BpmnEvent))
  modeler.value.on('shape.removed', () => emit('changed', {} as BpmnEvent))
  modeler.value.on('shape.changed', () => emit('changed', {} as BpmnEvent))
  
  // Listen for connection changes
  modeler.value.on('connection.added', () => emit('changed', {} as BpmnEvent))
  modeler.value.on('connection.removed', () => emit('changed', {} as BpmnEvent))
  modeler.value.on('connection.changed', () => emit('changed', {} as BpmnEvent))
}

// 导入 XML
const importXML = async (xml: string): Promise<void> => {
  if (!modeler.value) return

  try {
    await modeler.value.importXML(xml)
  } catch (error) {
    console.error('Error importing diagram:', error)
    emit('error', error as Error)
  }
}

// 创建新图表
const createNewDiagram = async (): Promise<void> => {
  if (!modeler.value) return

  try {
    await modeler.value.createDiagram()
    emit('imported', {} as BpmnEvent)
  } catch (error) {
    console.error('Error creating new diagram:', error)
    emit('error', error as Error)
  }
}

// 获取 XML
const getXML = async (): Promise<string> => {
  if (!modeler.value) {
    throw new Error('Modeler not initialized')
  }

  try {
    const result = await modeler.value.saveXML({ format: true })
    return result.xml
  } catch (error) {
    console.error('Error getting XML:', error)
    throw error
  }
}

// 创建默认图表
const createDefaultDiagram = (): void => {
  const defaultBPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn" exporter="bpmn-js (https://demo.bpmn.io)" exporterVersion="9.4.0">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Task_1" name="What if you are hungry?">
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

  importXML(defaultBPMN)
}

// Palette 控制方法
const togglePalette = (): void => {
  if (!modeler.value) return
  
  const palette = modeler.value.get('palette')
  if (palette) {
    palette.toggle()
  }
}

const showPalette = (): void => {
  if (!modeler.value) return
  
  const palette = modeler.value.get('palette')
  if (palette) {
    palette.open()
  }
}

const hidePalette = (): void => {
  if (!modeler.value) return
  
  const palette = modeler.value.get('palette')
  if (palette) {
    palette.close()
  }
}

// 拖拽事件处理
const handleDragOver = (event: DragEvent): void => {
  event.preventDefault()
  event.dataTransfer!.dropEffect = 'copy'
}

const handleDrop = (event: DragEvent): void => {
  event.preventDefault()
  emit('drop', event)
}

// 暴露方法给父组件
defineExpose({
  createNewDiagram,
  getXML,
  togglePalette,
  showPalette,
  hidePalette
})

// 生命周期钩子
onMounted(() => {
  initModeler()
})

onBeforeUnmount(() => {
  if (modeler.value) {
    modeler.value.destroy()
  }
})
</script>

<style scoped>
.bpmn-modeler {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>
