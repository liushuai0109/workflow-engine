import { getBusinessObject } from 'bpmn-js/lib/util/ModelUtil';
import { without } from 'min-dash';
import type { BpmnElement, Injector } from '../../../shared/types';
import {
  createElement,
  getInputs,
  getOutputs,
  getInputOutputExtension,
  createInputOutput,
  nextId
} from './util';
import InputProps from './InputProps';
import OutputProps from './OutputProps';
import { TextFieldEntry } from '@bpmn-io/properties-panel';
import { createPropertyEntry } from '../../PropertyEntryFactory';

interface UserTaskPropsParams {
  element: BpmnElement;
  injector: Injector;
}

export default function UserTaskProps({ element, injector }: UserTaskPropsParams) {
  const inputs = getInputs(element) || [];
  const outputs = getOutputs(element) || [];

  const bpmnFactory = injector.get('bpmnFactory');
  const commandStack = injector.get('commandStack');

  // 创建 Input 项目
  const inputItems = inputs.map((input: any, index: number) => {
    const id = element.id + '-input-' + index;

    return {
      id,
      label: input.name || `Input ${index + 1}`,
      entries: InputProps({
        idPrefix: id,
        element,
        input
      }),
      autoFocusEntry: id + '-name',
      remove: createInputRemoveHandler({ commandStack, element, input })
    };
  });

  // 创建 Output 项目
  const outputItems = outputs.map((output: any, index: number) => {
    const id = element.id + '-output-' + index;

    return {
      id,
      label: output.name || `Output ${index + 1}`,
      entries: OutputProps({
        idPrefix: id,
        element,
        output
      }),
      autoFocusEntry: id + '-name',
      remove: createOutputRemoveHandler({ commandStack, element, output })
    };
  });

  return {
    items: [...inputItems, ...outputItems],
    add: createAddHandler({ element, bpmnFactory, commandStack })
  };
}

// 创建 Input 删除处理器
function createInputRemoveHandler({ commandStack, element, input }: {
  commandStack: any;
  element: BpmnElement;
  input: any;
}) {
  return function(event: Event) {
    event.stopPropagation();

    const extension = getInputOutputExtension(element);
    if (!extension) {
      return;
    }

    const inputs = without(extension.input || [], input);

    commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: extension,
      properties: {
        input: inputs
      }
    });
  };
}

// 创建 Output 删除处理器
function createOutputRemoveHandler({ commandStack, element, output }: {
  commandStack: any;
  element: BpmnElement;
  output: any;
}) {
  return function(event: Event) {
    event.stopPropagation();

    const extension = getInputOutputExtension(element);
    if (!extension) {
      return;
    }

    const outputs = without(extension.output || [], output);

    commandStack.execute('element.updateModdleProperties', {
      element,
      moddleElement: extension,
      properties: {
        output: outputs
      }
    });
  };
}

// 创建添加处理器
function createAddHandler({ element, bpmnFactory, commandStack }: {
  element: BpmnElement;
  bpmnFactory: any;
  commandStack: any;
}) {
  return function(event: Event) {
    event.stopPropagation();

    const commands: any[] = [];
    const businessObject = getBusinessObject(element);

    let extensionElements = businessObject.extensionElements;

    // (1) 确保扩展元素存在
    if (!extensionElements) {
      extensionElements = createElement(
        'bpmn:ExtensionElements',
        { values: [] },
        businessObject,
        bpmnFactory
      );

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element,
          moddleElement: businessObject,
          properties: { extensionElements }
        }
      });
    }

    // (2) 确保 InputOutput 扩展存在
    let extension = getInputOutputExtension(element);

    if (!extension) {
      extension = createInputOutput({
        input: [],
        output: []
      }, extensionElements, bpmnFactory);

      commands.push({
        cmd: 'element.updateModdleProperties',
        context: {
          element,
          moddleElement: extensionElements,
          properties: {
            values: [...(extensionElements.values || []), extension]
          }
        }
      });
    }

    // (3) 创建新的 Input
    const newInput = createElement('xflow:XFlowInput', {
      name: nextId('Input_'),
      variable: createElement('xflow:XFlowVariable', { name: '' }, null, bpmnFactory)
    }, extension, bpmnFactory);

    // (4) 添加 Input 到列表
    commands.push({
      cmd: 'element.updateModdleProperties',
      context: {
        element,
        moddleElement: extension,
        properties: {
          input: [...(extension.input || []), newInput]
        }
      }
    });

    commandStack.execute('properties-panel.multi-command-executor', commands);
  };
}
