import UserTaskRenderer from './UserTaskRenderer'
import UserTaskPropertiesProvider from './UserTaskPropertiesProvider'
import CustomFieldsEntry from './CustomFieldsEntry'

export default {
  __init__: [
    'userTaskRenderer',
    'userTaskPropertiesProvider',
    'customFieldsEntry'
  ],
  __depends__: [],
  userTaskRenderer: ['type', UserTaskRenderer],
  userTaskPropertiesProvider: ['type', UserTaskPropertiesProvider],
  customFieldsEntry: ['type', CustomFieldsEntry]
}
