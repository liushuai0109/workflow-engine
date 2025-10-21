import XFlowRenderer from './XFlowRenderer'
import XFlowPropertiesProvider from './XFlowPropertiesProvider'

console.log('XFlowExtensionModule loaded')
console.log('XFlowPropertiesProvider:', XFlowPropertiesProvider)

export default {
  __init__: [
    'xflowRenderer',
    'xflowPropertiesProvider'
  ],
  __depends__: [],
  xflowRenderer: ['type', XFlowRenderer],
  xflowPropertiesProvider: ['type', XFlowPropertiesProvider]
}
