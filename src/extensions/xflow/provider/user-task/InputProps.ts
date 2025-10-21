import { TextFieldEntry } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';
import type { BpmnElement } from '../../../shared/types';

export default function InputProps(props: {
  idPrefix: string;
  element: BpmnElement;
  input: any;
}): any[] {
  const { idPrefix, input } = props;

  const entries = [
    {
      id: idPrefix + '-name',
      component: Name,
      idPrefix,
      input
    },
    {
      id: idPrefix + '-variable',
      component: Variable,
      idPrefix,
      input
    }
  ];

  return entries;
}

function Name(props: {
  idPrefix: string;
  element: BpmnElement;
  input: any;
}) {
  const { idPrefix, input } = props;

  const commandStack = useService('commandStack');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const setValue = (value: string) => {
    commandStack.execute('element.updateModdleProperties', {
      element: props.element,
      moddleElement: input,
      properties: {
        name: value
      }
    });
  };

  const getValue = () => {
    return input.name || '';
  };

  return TextFieldEntry({
    element: input,
    id: idPrefix + '-name',
    label: translate('Name'),
    getValue,
    setValue,
    debounce
  });
}

function Variable(props: {
  idPrefix: string;
  element: BpmnElement;
  input: any;
}) {
  const { idPrefix, input } = props;

  const commandStack = useService('commandStack');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const setValue = (value: string) => {
    const bpmnFactory = useService('bpmnFactory');
    
    if (!input.variable) {
      input.variable = bpmnFactory.create('xflow:XFlowVariable', { name: '' });
    }
    
    // 直接更新 variable 的 name 属性，而不是创建新对象
    input.variable.name = value;
    
    commandStack.execute('element.updateModdleProperties', {
      element: props.element,
      moddleElement: input,
      properties: {
        variable: input.variable
      }
    });
  };

  const getValue = () => {
    return input.variable ? input.variable.name || '' : '';
  };

  return TextFieldEntry({
    element: input,
    id: idPrefix + '-variable',
    label: translate('Variable'),
    getValue,
    setValue,
    debounce
  });
}
