import ServiceTaskRenderer from './ServiceTaskRenderer'
import ServiceTaskPropertiesProvider from './ServiceTaskPropertiesProvider'

console.log('ServiceTaskExtensionModule loaded')
console.log('ServiceTaskPropertiesProvider:', ServiceTaskPropertiesProvider)

export default {
  __init__: [
    'serviceTaskRenderer',
    'serviceTaskPropertiesProvider'
  ],
  __depends__: [],
  serviceTaskRenderer: ['type', ServiceTaskRenderer],
  serviceTaskPropertiesProvider: ['type', ServiceTaskPropertiesProvider]
}
