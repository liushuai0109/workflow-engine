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
  import { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule, useService } from 'bpmn-js-properties-panel'
  export { BpmnPropertiesPanelModule, BpmnPropertiesProviderModule, useService }
  export const TextFieldEntry: any
  export const isTextFieldEntryEdited: (element: any) => boolean
}

declare module '@bpmn-io/properties-panel' {
  import { PropertiesPanelModule, PropertiesProviderModule } from '@bpmn-io/properties-panel'
  export { PropertiesPanelModule, PropertiesProviderModule }
  
  // Entry Components
  export const TextFieldEntry: any
  export const SelectEntry: any
  export const NumberFieldEntry: any
  export const TextAreaEntry: any
  export const CheckboxEntry: any
  export const ToggleSwitchEntry: any
  export const FeelEntry: any
  export const FeelNumberEntry: any
  export const FeelTextAreaEntry: any
  export const FeelCheckboxEntry: any
  export const FeelToggleSwitchEntry: any
  export const TemplatingEntry: any
  export const FeelTemplatingEntry: any
  export const DescriptionEntry: any
  export const ListEntry: any
  export const SimpleEntry: any
  
  // Entry Edited Checkers
  export const isTextFieldEntryEdited: (element: any) => boolean
  export const isSelectEntryEdited: (element: any) => boolean
  export const isNumberFieldEntryEdited: (element: any) => boolean
  export const isTextAreaEntryEdited: (element: any) => boolean
  export const isCheckboxEntryEdited: (element: any) => boolean
  export const isToggleSwitchEntryEdited: (element: any) => boolean
  export const isFeelEntryEdited: (element: any) => boolean
  export const isTemplatingEntryEdited: (element: any) => boolean
  export const isSimpleEntryEdited: (element: any) => boolean
  
  // Icons
  export const ArrowIcon: any
  export const CloseIcon: any
  export const CreateIcon: any
  export const DeleteIcon: any
  export const DragIcon: any
  export const ExternalLinkIcon: any
  export const FeelIcon: any
  export const LaunchIcon: any
  export const OpenPopupIcon: any
  
  // Components
  export const CollapsibleEntry: any
  export const DropdownButton: any
  export const Group: any
  export const Header: any
  export const HeaderButton: any
  export const ListGroup: any
  export const ListItem: any
  export const Placeholder: any
  export const PropertiesPanel: any
  export const TooltipEntry: any
  
  // Contexts
  export const DescriptionContext: any
  export const ErrorsContext: any
  export const EventContext: any
  export const FeelLanguageContext: any
  export const LayoutContext: any
  export const PropertiesPanelContext: any
  export const TooltipContext: any
  
  // Modules
  export const DebounceInputModule: any
  export const FeelPopupModule: any
  
  // Hooks
  export const useDebounce: any
  export const useDescriptionContext: any
  export const useElementVisible: any
  export const useError: any
  export const useErrors: any
  export const useEvent: any
  export const useKeyFactory: any
  export const useLayoutState: any
  export const usePrevious: any
  export const useShowEntryEvent: any
  export const useStaticCallback: any
  export const useStickyIntersectionObserver: any
  export const useTooltipContext: any
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

declare module 'bpmn-js/lib/util/ModelUtil' {
  export function getBusinessObject(element: any): any
  export function is(element: any, type: string): boolean
}

declare module 'diagram-js/lib/draw/BaseRenderer' {
  class BaseRenderer {
    constructor(eventBus: any, priority: number)
    canRender(element: any): boolean
    drawShape(parentNode: SVGElement, element: any): SVGElement
  }
  export default BaseRenderer
}