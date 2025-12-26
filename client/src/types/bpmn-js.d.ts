/**
 * Type declarations for bpmn-js NavigatedViewer
 */

declare module 'bpmn-js/lib/NavigatedViewer' {
  interface BpmnViewerOptions {
    container: HTMLElement
    keyboard?: {
      bindTo?: Document | HTMLElement
    }
  }

  interface Canvas {
    zoom(level: number | 'fit-viewport'): number
  }

  interface ImportResult {
    warnings: string[]
  }

  class NavigatedViewer {
    constructor(options: BpmnViewerOptions)
    importXML(xml: string): Promise<ImportResult>
    get(module: 'canvas'): Canvas
    destroy(): void
  }

  export default NavigatedViewer
}
