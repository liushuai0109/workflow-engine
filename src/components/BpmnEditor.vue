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
} from 'bpmn-js-properties-panel';
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
const modeler = ref<BpmnModelerInstance>()

// 自定义 Context Pad 模块
const CustomContextPadModule = {
  __init__: ['contextPad'],
  contextPad: ['type', CustomContextPad]
}

function CustomContextPad(contextPad: any, eventBus: any, elementFactory: any, injector: any) {
  this.getContextPadEntries = function(element: any) {
    const entries = contextPad.getContextPadEntries(element)
    
    // 添加自定义的 Append Element 按钮
    entries['append-element'] = {
      group: 'edit',
      className: 'append-element',
      title: 'Append Element',
      action: {
        click: function(event: any, element: any) {
          // 创建新元素
          const newElement = elementFactory.createShape({
            type: 'bpmn:Task',
            businessObject: {
              name: 'New Task'
            }
          })
          
          // 添加到画布
          const canvas = injector.get('canvas')
          const elementRegistry = injector.get('elementRegistry')
          const modeling = injector.get('modeling')
          
          const newShape = canvas.addShape(newElement, {
            x: element.x + 100,
            y: element.y
          })
          
          // 创建连接
          modeling.connect(element, newShape, {
            type: 'bpmn:SequenceFlow'
          })
          
          // 触发变更事件
          eventBus.fire('commandStack.changed')
        }
      },
      html: '<div class="entry-icon">➕</div>'
    }
    
    return entries
  }
}

// 初始化 BPMN 编辑器
const initModeler = (): void => {
  if (!container.value) return

  try {
    modeler.value = new BpmnModeler({
      container: container.value,
      additionalModules: [
        BpmnPropertiesPanelModule,
        CustomContextPadModule
      ],
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
  if (!modeler.value) return

  modeler.value.on('import.done', (event: BpmnEvent) => {
    console.log('BPMN diagram imported successfully')
    emit('shown')
  })

  modeler.value.on('commandStack.changed', () => {
    if (modeler.value) {
      modeler.value.saveXML({ format: true }).then((result: any) => {
        emit('changed', result.xml)
      }).catch((error: Error) => {
        console.error('Failed to save XML:', error)
        emit('error', error)
      })
    }
  })

  modeler.value.on('error', (event: BpmnEvent) => {
    console.error('BPMN modeler error:', event)
    emit('error', new Error('BPMN modeler error'))
  })
}

// 加载 XML
const loadXml = async (xml: string): Promise<void> => {
  if (!modeler.value) return

  try {
    emit('loading')
    await modeler.value.importXML(xml)
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

// 监听 XML 变化
watch(() => props.xml, (newXml) => {
  if (newXml && modeler.value) {
    loadXml(newXml)
  }
})

// 暴露方法给父组件
const getXml = async (): Promise<string> => {
  if (!modeler.value) return ''
  
  try {
    const result = await modeler.value.saveXML({ format: true })
    return result.xml
  } catch (error) {
    console.error('Failed to get XML:', error)
    throw error
  }
}

const getSvg = async (): Promise<string> => {
  if (!modeler.value) return ''
  
  try {
    const result = await modeler.value.saveSVG()
    return result.svg
  } catch (error) {
    console.error('Failed to get SVG:', error)
    throw error
  }
}

// 暴露方法
defineExpose({
  getXml,
  getSvg,
  modeler: modeler.value
})

// 生命周期
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
