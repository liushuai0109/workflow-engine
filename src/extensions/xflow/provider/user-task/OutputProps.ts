import { TextFieldEntry } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';
import type { BpmnElement } from '../../../shared/types';

export default function OutputProps(props: {
  idPrefix: string;
  element: BpmnElement;
  output: any;
}): any[] {
  const { idPrefix, output } = props;

  const entries = [
    {
      id: idPrefix + '-name',
      component: Name,
      idPrefix,
      output
    },
    {
      id: idPrefix + '-variable',
      component: Variable,
      idPrefix,
      output
    },
    {
      id: idPrefix + '-source',
      component: Source,
      idPrefix,
      output
    }
  ];

  return entries;
}

function Name(props: {
  idPrefix: string;
  element: BpmnElement;
  output: any;
}) {
  const { idPrefix, output } = props;

  const commandStack = useService('commandStack');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const setValue = (value: string) => {
    commandStack.execute('element.updateModdleProperties', {
      element: props.element,
      moddleElement: output,
      properties: {
        name: value
      }
    });
  };

  const getValue = () => {
    return output.name || '';
  };

  return TextFieldEntry({
    element: output,
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
  output: any;
}) {
  const { idPrefix, output } = props;

  const commandStack = useService('commandStack');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const setValue = (value: string) => {
    const bpmnFactory = useService('bpmnFactory');
    
    if (!output.variable) {
      output.variable = bpmnFactory.create('xflow:XFlowVariable', { name: '' });
    }
    
    // 直接更新 variable 的 name 属性，而不是创建新对象
    output.variable.name = value;
    
    commandStack.execute('element.updateModdleProperties', {
      element: props.element,
      moddleElement: output,
      properties: {
        variable: output.variable
      }
    });
  };

  const getValue = () => {
    return output.variable ? output.variable.name || '' : '';
  };

  return TextFieldEntry({
    element: output,
    id: idPrefix + '-variable',
    label: translate('Variable'),
    getValue,
    setValue,
    debounce
  });
}

function Source(props: {
  idPrefix: string;
  element: BpmnElement;
  output: any;
}) {
  const { idPrefix, output } = props;

  const commandStack = useService('commandStack');
  const translate = useService('translate');
  const debounce = useService('debounceInput');

  const setValue = (value: string) => {
    const bpmnFactory = useService('bpmnFactory');
    
    if (!output.source) {
      output.source = bpmnFactory.create('xflow:XFlowSource', { value: '' });
    }
    
    // 直接更新 source 的 value 属性，而不是创建新对象
    output.source.value = value;
    
    commandStack.execute('element.updateModdleProperties', {
      element: props.element,
      moddleElement: output,
      properties: {
        source: output.source
      }
    });
  };

  const getValue = () => {
    return output.source ? output.source.value || '' : '';
  };

  return TextFieldEntry({
    element: output,
    id: idPrefix + '-source',
    label: translate('Source'),
    getValue,
    setValue,
    debounce
  });
}
