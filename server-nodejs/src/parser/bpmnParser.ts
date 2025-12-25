import { XMLParser } from 'fast-xml-parser';
import { WorkflowDefinition, Node, SequenceFlow, NodeType } from '../services/workflowEngineService';

interface ExtensionValue {
  '@_value'?: string;
  '#text'?: string;
}

interface ExtensionElements {
  'xflow:url'?: ExtensionValue;
  'xflow:Url'?: ExtensionValue;
  url?: ExtensionValue;
  Url?: ExtensionValue;
}

interface BaseElement {
  '@_id': string;
  '@_name'?: string;
  'bpmn:incoming'?: string | string[];
  'bpmn:outgoing'?: string | string[];
}

interface ServiceTask extends BaseElement {
  'bpmn:extensionElements'?: ExtensionElements;
}

interface BoundaryEvent extends BaseElement {
  '@_attachedToRef': string;
  '@_cancelActivity'?: string;
}

interface SequenceFlowXML {
  '@_id': string;
  '@_name'?: string;
  '@_sourceRef': string;
  '@_targetRef': string;
  '@_priority'?: number;
  'bpmn:conditionExpression'?: {
    '@_type'?: string;
    '#text'?: string;
  };
}

interface Process {
  '@_id': string;
  '@_name'?: string;
  'bpmn:startEvent'?: BaseElement | BaseElement[];
  'bpmn:endEvent'?: BaseElement | BaseElement[];
  'bpmn:task'?: BaseElement | BaseElement[];
  'bpmn:userTask'?: BaseElement | BaseElement[];
  'bpmn:serviceTask'?: ServiceTask | ServiceTask[];
  'bpmn:exclusiveGateway'?: BaseElement | BaseElement[];
  'bpmn:parallelGateway'?: BaseElement | BaseElement[];
  'bpmn:subProcess'?: BaseElement | BaseElement[];
  'bpmn:intermediateCatchEvent'?: BaseElement | BaseElement[];
  'bpmn:eventBasedGateway'?: BaseElement | BaseElement[];
  'bpmn:boundaryEvent'?: BoundaryEvent | BoundaryEvent[];
  'bpmn:sequenceFlow'?: SequenceFlowXML | SequenceFlowXML[];
  'bpmn:message'?: { '@_id': string; '@_name'?: string } | { '@_id': string; '@_name'?: string }[];
}

interface Definitions {
  'bpmn:definitions': {
    'bpmn:process': Process | Process[];
  };
}

/**
 * Parse BPMN XML content and return WorkflowDefinition
 */
export function parseBPMN(bpmnContent: string): WorkflowDefinition {
  if (!bpmnContent || bpmnContent.trim() === '') {
    throw new Error('BPMN content is empty');
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseAttributeValue: true,
    trimValues: true,
  });

  const result = parser.parse(bpmnContent) as Definitions;

  // Check if process element exists
  const processData = result['bpmn:definitions']?.['bpmn:process'];
  if (!processData) {
    throw new Error('Missing required element: process');
  }

  // Handle single or multiple processes (take first one)
  const process = Array.isArray(processData) ? processData[0] : processData;

  if (!process['@_id']) {
    throw new Error('Process element missing id attribute');
  }

  const wd: WorkflowDefinition = {
    processId: process['@_id'],
    nodes: {},
    sequenceFlows: {},
    startEvents: [],
    adjacencyList: {},
    reverseAdjacencyList: {},
  };

  // Parse nodes
  parseNodes(process, wd);

  // Parse sequence flows
  parseSequenceFlows(process, wd);

  // Build adjacency lists
  buildAdjacencyLists(wd);

  // Validate UserTask constraints
  validateUserTaskConstraints(wd);

  // Identify start and end events
  identifyStartAndEndEvents(wd);

  return wd;
}

/**
 * Convert element data to array if single element
 */
function toArray<T>(data: T | T[] | undefined): T[] {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

/**
 * Convert incoming/outgoing to string array
 */
function toStringArray(data: string | string[] | undefined): string[] {
  if (!data) return [];
  return Array.isArray(data) ? data : [data];
}

/**
 * Parse all nodes from process
 */
function parseNodes(process: Process, wd: WorkflowDefinition): void {
  // Parse start events
  toArray(process['bpmn:startEvent']).forEach((se) => {
    const node: Node = {
      id: se['@_id'],
      name: se['@_name'] || '',
      type: NodeType.START_EVENT,
      incomingSequenceFlowIds: toStringArray(se['bpmn:incoming']),
      outgoingSequenceFlowIds: toStringArray(se['bpmn:outgoing']),
      canFallback: true,
    };
    wd.nodes[node.id] = node;
  });

  // Parse end events
  toArray(process['bpmn:endEvent']).forEach((ee) => {
    const node: Node = {
      id: ee['@_id'],
      name: ee['@_name'] || '',
      type: NodeType.END_EVENT,
      incomingSequenceFlowIds: toStringArray(ee['bpmn:incoming']),
      outgoingSequenceFlowIds: toStringArray(ee['bpmn:outgoing']),
      canFallback: true,
    };
    wd.nodes[node.id] = node;
  });

  // Parse tasks
  toArray(process['bpmn:task']).forEach((t) => {
    const node: Node = {
      id: t['@_id'],
      name: t['@_name'] || '',
      type: NodeType.TASK,
      incomingSequenceFlowIds: toStringArray(t['bpmn:incoming']),
      outgoingSequenceFlowIds: toStringArray(t['bpmn:outgoing']),
      canFallback: true,
    };
    wd.nodes[node.id] = node;
  });

  // Parse user tasks
  toArray(process['bpmn:userTask']).forEach((ut) => {
    const node: Node = {
      id: ut['@_id'],
      name: ut['@_name'] || '',
      type: NodeType.USER_TASK,
      incomingSequenceFlowIds: toStringArray(ut['bpmn:incoming']),
      outgoingSequenceFlowIds: toStringArray(ut['bpmn:outgoing']),
      canFallback: true,
    };
    wd.nodes[node.id] = node;
  });

  // Parse service tasks
  toArray(process['bpmn:serviceTask']).forEach((st) => {
    const node: Node = {
      id: st['@_id'],
      name: st['@_name'] || '',
      type: NodeType.SERVICE_TASK,
      incomingSequenceFlowIds: toStringArray(st['bpmn:incoming']),
      outgoingSequenceFlowIds: toStringArray(st['bpmn:outgoing']),
      canFallback: true,
    };

    // Extract business API URL from extension elements
    if (st['bpmn:extensionElements']) {
      const ext = st['bpmn:extensionElements'];
      const urlExt = ext['xflow:url'] || ext['xflow:Url'] || ext['url'] || ext['Url'];
      if (urlExt) {
        node.businessApiUrl = urlExt['@_value'] || urlExt['#text'] || '';
      }
    }

    wd.nodes[node.id] = node;
  });

  // Parse exclusive gateways
  toArray(process['bpmn:exclusiveGateway']).forEach((eg) => {
    const node: Node = {
      id: eg['@_id'],
      name: eg['@_name'] || '',
      type: NodeType.EXCLUSIVE_GATEWAY,
      incomingSequenceFlowIds: toStringArray(eg['bpmn:incoming']),
      outgoingSequenceFlowIds: toStringArray(eg['bpmn:outgoing']),
      canFallback: true,
    };
    wd.nodes[node.id] = node;
  });

  // Parse parallel gateways
  toArray(process['bpmn:parallelGateway']).forEach((pg) => {
    const node: Node = {
      id: pg['@_id'],
      name: pg['@_name'] || '',
      type: NodeType.PARALLEL_GATEWAY,
      incomingSequenceFlowIds: toStringArray(pg['bpmn:incoming']),
      outgoingSequenceFlowIds: toStringArray(pg['bpmn:outgoing']),
      canFallback: true,
    };
    wd.nodes[node.id] = node;
  });

  // Parse intermediate catch events
  toArray(process['bpmn:intermediateCatchEvent']).forEach((ice) => {
    const node: Node = {
      id: ice['@_id'],
      name: ice['@_name'] || '',
      type: NodeType.INTERMEDIATE_CATCH_EVENT,
      incomingSequenceFlowIds: toStringArray(ice['bpmn:incoming']),
      outgoingSequenceFlowIds: toStringArray(ice['bpmn:outgoing']),
      canFallback: true,
    };
    wd.nodes[node.id] = node;
  });

  // Parse event-based gateways
  toArray(process['bpmn:eventBasedGateway']).forEach((ebg) => {
    const node: Node = {
      id: ebg['@_id'],
      name: ebg['@_name'] || '',
      type: NodeType.EVENT_BASED_GATEWAY,
      incomingSequenceFlowIds: toStringArray(ebg['bpmn:incoming']),
      outgoingSequenceFlowIds: toStringArray(ebg['bpmn:outgoing']),
      canFallback: true,
    };
    wd.nodes[node.id] = node;
  });

  // Parse boundary events
  toArray(process['bpmn:boundaryEvent']).forEach((be) => {
    const node: Node = {
      id: be['@_id'],
      name: be['@_name'] || '',
      type: NodeType.BOUNDARY_EVENT,
      incomingSequenceFlowIds: toStringArray(be['bpmn:incoming']),
      outgoingSequenceFlowIds: toStringArray(be['bpmn:outgoing']),
      attachedNodeId: be['@_attachedToRef'],
      canFallback: true,
    };
    wd.nodes[node.id] = node;
  });
}

/**
 * Parse sequence flows
 */
function parseSequenceFlows(process: Process, wd: WorkflowDefinition): void {
  toArray(process['bpmn:sequenceFlow']).forEach((sf) => {
    const flow: SequenceFlow = {
      id: sf['@_id'],
      sourceNodeId: sf['@_sourceRef'],
      targetNodeId: sf['@_targetRef'],
      conditionExpression: sf['bpmn:conditionExpression']?.['#text']?.trim() || '',
    };
    wd.sequenceFlows[flow.id] = flow;
  });
}

/**
 * Build adjacency lists for graph traversal
 */
function buildAdjacencyLists(wd: WorkflowDefinition): void {
  // Initialize adjacency lists
  Object.keys(wd.nodes).forEach((nodeId) => {
    wd.adjacencyList[nodeId] = [];
    wd.reverseAdjacencyList[nodeId] = [];
  });

  // Build adjacency lists from sequence flows
  Object.values(wd.sequenceFlows).forEach((flow) => {
    const sourceId = flow.sourceNodeId;
    const targetId = flow.targetNodeId;

    // Check if source and target nodes exist
    if (!wd.nodes[sourceId] || !wd.nodes[targetId]) {
      return;
    }

    // Add to forward adjacency list
    wd.adjacencyList[sourceId].push(targetId);

    // Add to reverse adjacency list
    wd.reverseAdjacencyList[targetId].push(sourceId);
  });
}

/**
 * Validate UserTask constraints
 * Ensures all UserTask outgoing flows originate from BoundaryEvent
 */
function validateUserTaskConstraints(wd: WorkflowDefinition): void {
  // Build BoundaryEvent index: attachedNodeId -> boundaryEventIds
  const boundaryEvents: Record<string, string[]> = {};
  Object.entries(wd.nodes).forEach(([nodeId, node]) => {
    if (node.type === NodeType.BOUNDARY_EVENT) {
      if (!node.attachedNodeId) {
        throw new Error(`BoundaryEvent ${nodeId} missing attachedToRef`);
      }
      if (!boundaryEvents[node.attachedNodeId]) {
        boundaryEvents[node.attachedNodeId] = [];
      }
      boundaryEvents[node.attachedNodeId].push(nodeId);
    }
  });

  // Validate each UserTask
  Object.entries(wd.nodes).forEach(([nodeId, node]) => {
    if (node.type !== NodeType.USER_TASK) {
      return;
    }

    if (node.outgoingSequenceFlowIds.length === 0) {
      return; // No outgoing flows, skip
    }

    // Check each outgoing flow's sourceRef
    node.outgoingSequenceFlowIds.forEach((flowId) => {
      const flow = wd.sequenceFlows[flowId];
      if (!flow) {
        throw new Error(`SequenceFlow ${flowId} not found`);
      }

      // Validation fails: flow originates directly from UserTask
      if (flow.sourceNodeId === nodeId) {
        throw new Error(
          `UserTask ${nodeId} has direct outgoing flow ${flowId}. ` +
            `All outgoing flows from UserTask must originate from BoundaryEvent`
        );
      }
    });

    // Check if BoundaryEvent exists
    if (!boundaryEvents[nodeId] || boundaryEvents[nodeId].length === 0) {
      throw new Error(
        `UserTask ${nodeId} has outgoing flows but no BoundaryEvent attached`
      );
    }
  });
}

/**
 * Identify start and end events
 */
function identifyStartAndEndEvents(wd: WorkflowDefinition): void {
  Object.entries(wd.nodes).forEach(([nodeId, node]) => {
    if (node.type === NodeType.START_EVENT) {
      wd.startEvents.push(nodeId);
    }
  });
}
