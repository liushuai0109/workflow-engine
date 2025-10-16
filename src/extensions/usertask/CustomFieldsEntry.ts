import type { CustomField } from './types'

// 简单的 DOM 创建工具函数
function create(tag: string, attrs: Record<string, string> = {}): HTMLElement {
  const element = document.createElement(tag)
  Object.keys(attrs).forEach(key => {
    const value = attrs[key]
    if (value !== undefined) {
      element.setAttribute(key, value)
    }
  })
  return element
}

export default class CustomFieldsEntry {
  private element: any
  private bpmnFactory: any
  private moddle: any
  private translate: any
  private debounce: any

  constructor(element: any, bpmnFactory: any, moddle: any, translate: any, debounce: any) {
    this.element = element
    this.bpmnFactory = bpmnFactory
    this.moddle = moddle
    this.translate = translate
    this.debounce = debounce
  }

  get(element: any): any {
    const businessObject = element.businessObject
    return businessObject.customFields || []
  }

  set(element: any, value: CustomField[]): void {
    const businessObject = element.businessObject
    
    if (!businessObject.customFields) {
      businessObject.customFields = this.moddle.create('usertaskext:CustomField', [])
    }
    
    // 清空现有字段
    businessObject.customFields.clear()
    
    // 添加新字段
    value.forEach(field => {
      const customField = this.moddle.create('usertaskext:CustomField', {
        name: field.name,
        value: field.value,
        type: field.type || 'text'
      })
      businessObject.customFields.push(customField)
    })
  }

  create(element: any): HTMLElement {
    const customFields = this.get(element)
    
    const container = create('div', {
      class: 'custom-fields-container'
    })
    
    // 渲染自定义字段列表
    this.renderCustomFields(container, customFields, element)
    
    return container
  }

  private renderCustomFields(container: HTMLElement, customFields: CustomField[], element: any): void {
    const fieldsContainer = create('div', {
      class: 'custom-fields-list'
    })
    
    // 渲染现有字段
    customFields.forEach((field, index) => {
      const fieldElement = this.createFieldElement(field, index, element)
      fieldsContainer.appendChild(fieldElement)
    })
    
    // 添加新字段按钮
    const addButton = create('button', {
      class: 'add-field-btn',
      type: 'button'
    })
    addButton.textContent = '+ Add Field'
    addButton.addEventListener('click', () => {
      this.addNewField(element)
    })
    
    container.appendChild(fieldsContainer)
    container.appendChild(addButton)
  }

  private createFieldElement(field: CustomField, index: number, element: any): HTMLElement {
    const fieldContainer = create('div', {
      class: 'custom-field-item'
    })
    
    // 字段名称输入
    const nameInput = create('input', {
      type: 'text',
      value: field.name,
      placeholder: 'Field Name',
      class: 'field-name-input'
    })
    nameInput.addEventListener('input', this.debounce((event: Event) => {
      const target = event.target as HTMLInputElement
      this.updateField(element, index, 'name', target.value)
    }, 300))
    
    // 字段值输入
    const valueInput = create('input', {
      type: 'text',
      value: field.value,
      placeholder: 'Field Value',
      class: 'field-value-input'
    })
    valueInput.addEventListener('input', this.debounce((event: Event) => {
      const target = event.target as HTMLInputElement
      this.updateField(element, index, 'value', target.value)
    }, 300))
    
    // 字段类型选择
    const typeSelect = create('select', {
      class: 'field-type-select'
    })
    
    const types = [
      { value: 'text', label: 'Text' },
      { value: 'number', label: 'Number' },
      { value: 'date', label: 'Date' },
      { value: 'boolean', label: 'Boolean' }
    ]
    
    types.forEach(type => {
      const option = create('option', {
        value: type.value
      })
      if (field.type === type.value) {
        option.setAttribute('selected', 'selected')
      }
      option.textContent = type.label
      typeSelect.appendChild(option)
    })
    
    typeSelect.addEventListener('change', (event: Event) => {
      const target = event.target as HTMLSelectElement
      this.updateField(element, index, 'type', target.value)
    })
    
    // 删除按钮
    const deleteButton = create('button', {
      type: 'button',
      class: 'delete-field-btn'
    })
    deleteButton.textContent = '×'
    deleteButton.addEventListener('click', () => {
      this.removeField(element, index)
    })
    
    fieldContainer.appendChild(nameInput)
    fieldContainer.appendChild(valueInput)
    fieldContainer.appendChild(typeSelect)
    fieldContainer.appendChild(deleteButton)
    
    return fieldContainer
  }

  private updateField(element: any, index: number, property: keyof CustomField, value: string): void {
    const customFields = this.get(element)
    if (customFields[index]) {
      customFields[index][property] = value
      this.set(element, customFields)
    }
  }

  private addNewField(element: any): void {
    const customFields = this.get(element)
    const newField: CustomField = {
      name: '',
      value: '',
      type: 'text'
    }
    
    customFields.push(newField)
    this.set(element, customFields)
    
    // 重新渲染
    const container = element.parentElement
    if (container) {
      container.innerHTML = ''
      this.renderCustomFields(container, customFields, element)
    }
  }

  private removeField(element: any, index: number): void {
    const customFields = this.get(element)
    customFields.splice(index, 1)
    this.set(element, customFields)
    
    // 重新渲染
    const container = element.parentElement
    if (container) {
      container.innerHTML = ''
      this.renderCustomFields(container, customFields, element)
    }
  }
}

CustomFieldsEntry.$inject = ['element', 'bpmnFactory', 'moddle', 'translate', 'debounce']
