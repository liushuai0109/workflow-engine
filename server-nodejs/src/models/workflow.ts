export interface Workflow {
  id: string;
  name: string;
  description?: string;
  bpmnXml: string;
  version: string;
  status: WorkflowStatus;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum WorkflowStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived',
}

export interface Node {
  id: string;
  parentId?: string;
  name: string;
  type: number;
  incomingSequenceFlowIds: string[];
  outgoingSequenceFlowIds: string[];
  businessApiUrl?: string;
  attachedNodeId?: string;
  canFallback: boolean;
}

export interface SequenceFlow {
  id: string;
  name: string;
  sourceNodeId: string;
  targetNodeId: string;
  conditionExpression?: string;
  priority: number;
}

export interface Message {
  id: string;
  name: string;
}

export interface VariableDeclaration {
  name: string;
  type: number;
}

export interface WorkflowDefinition {
  nodes: Record<string, Node>;
  startEvents: string[];
  endEvents: string[];
  sequenceFlows: Record<string, SequenceFlow>;
  messages: Record<string, Message>;
  variableDeclarations: VariableDeclaration[];
  adjacencyList: Record<string, string[]>;
  reverseAdjacencyList: Record<string, string[]>;
}
