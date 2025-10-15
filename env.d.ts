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
