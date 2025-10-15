/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

declare module 'bpmn-js/lib/Modeler' {
  import BpmnModeler from 'bpmn-js/lib/Modeler'
  export default BpmnModeler
}

declare module 'bpmn-js/lib/Viewer' {
  import BpmnViewer from 'bpmn-js/lib/Viewer'
  export default BpmnViewer
}

declare module 'bpmn-js-properties-panel' {
  import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule } from 'bpmn-js-properties-panel'
  export { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule }
}

declare module 'vue-bpmn' {
  import { DefineComponent } from 'vue'
  
  interface BpmnOptions {
    propertiesPanel?: Record<string, any>
    additionalModules?: any[]
    moddleExtensions?: any[]
  }
  
  interface VueBpmnProps {
    url?: string
    xml?: string
    options?: BpmnOptions
  }
  
  const VueBpmn: DefineComponent<VueBpmnProps>
  export default VueBpmn
}