import XFlowRenderer from './XFlowRenderer'
import XFlowPropertiesProvider from './XFlowPropertiesProvider'
import CustomContextPad from './CustomContextPad'
import CustomPalette from './CustomPalette'

console.log('XFlowExtensionModule loaded')
console.log('XFlowPropertiesProvider:', XFlowPropertiesProvider)

export default {
  __init__: [
    'xflowRenderer',
    'xflowPropertiesProvider',
    'customContextPad',
    'customPalette'
  ],
  __depends__: [],
  xflowRenderer: ['type', XFlowRenderer],
  xflowPropertiesProvider: ['type', XFlowPropertiesProvider],
  customContextPad: ['type', CustomContextPad],
  customPalette: ['type', CustomPalette]
}
