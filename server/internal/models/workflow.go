package models

import "time"

// Workflow represents a workflow
type Workflow struct {
	ID          string    `json:"id" db:"id"`
	Name        string    `json:"name" db:"name"`
	Description string    `json:"description,omitempty" db:"description"`
	XML         string    `json:"xml" db:"xml"`
	Version     string    `json:"version" db:"version"`
	Status      string    `json:"status" db:"status"`
	CreatedBy   string    `json:"createdBy,omitempty" db:"created_by"`
	CreatedAt   time.Time `json:"createdAt" db:"created_at"`
	UpdatedAt   time.Time `json:"updatedAt" db:"updated_at"`
}

// WorkflowStatus constants
const (
	StatusDraft    = "draft"
	StatusActive   = "active"
	StatusInactive = "inactive"
	StatusArchived = "archived"
)

// ============================================================================
// 节点相关类型定义
// ============================================================================

// Node 节点（基类，对应 BaseElement）
type Node struct {
	ID                      string   `json:"id" db:"id"`
	ParentID                string   `json:"parentId,omitempty" db:"parent_id"`
	Name                    string   `json:"name" db:"name"`
	Type                    uint32   `json:"type" db:"type"`
	IncomingSequenceFlowIDs []string `json:"incomingSequenceFlowIds" db:"incoming_sequence_flow_ids"`
	OutgoingSequenceFlowIDs []string `json:"outgoingSequenceFlowIds" db:"outgoing_sequence_flow_ids"`
}

// SequenceFlow 序列流
type SequenceFlow struct {
	ID                string `json:"id" db:"id"`
	Name              string `json:"name" db:"name"`
	SourceNodeID      string `json:"sourceNodeId" db:"source_node_id"`
	TargetNodeID      string `json:"targetNodeId" db:"target_node_id"`
	ConditionExpression string `json:"conditionExpression,omitempty" db:"condition_expression"`
	Priority          uint32 `json:"priority" db:"priority"`
}

// Message 消息元素（用于流程定义中的消息元素）
type Message struct {
	ID   string `json:"id" db:"id"`
	Name string `json:"name" db:"name"`
}

// VariableDeclaration 变量声明
type VariableDeclaration struct {
	// Name 变量名
	Name string `json:"name,omitempty" db:"name"`
	// Type 类型，定义在google/protobuf/descriptor.h的FieldDescriptor::CppType
	Type uint32 `json:"type,omitempty" db:"type"`
}

// ============================================================================
// WorkflowDefinition 流程定义
// ============================================================================

// WorkflowDefinition 流程定义结构体
type WorkflowDefinition struct {
	// ============================================================================
	// 全局实体映射（用于 O(1) 查询）
	// ============================================================================

	// 节点映射：node_id -> Node
	Nodes map[string]Node `json:"nodes" db:"nodes"`

	// 流程元素列表
	StartEvents []string `json:"startEvents" db:"start_events"`
	EndEvents   []string   `json:"endEvents" db:"end_events"`

	// 序列流映射：flow_id -> SequenceFlow
	SequenceFlows map[string]SequenceFlow `json:"sequenceFlows" db:"sequence_flows"`

	// 消息定义：message_id -> Message
	Messages map[string]Message `json:"messages" db:"messages"`
	// ============================================================================
	// 变量声明
	// ============================================================================

	// 变量声明列表
	VariableDeclarations []VariableDeclaration `json:"variableDeclarations" db:"variable_declarations"`

	// ============================================================================
	// 全局邻接表（包含跨流程边界的穿越边，用于跨流程 BFS 遍历）
	// ============================================================================

	// 全局邻接表：source_node_id -> [target_node_ids]
	// 包含：
	//   1. 所有节点（包括主流程和子流程）的邻接关系
	//   2. 跨流程穿越边：subProcess -> 内部 startEvent
	//   3. 跨流程穿越边：内部 endNode -> subProcess 后继
	//   4. 边界事件穿越边：用户节点 -> 依附的边界事件
	AdjacencyList map[string][]string `json:"adjacencyList" db:"adjacency_list"`

	// 全局反向邻接表：target_node_id -> [source_node_ids]
	ReverseAdjacencyList map[string][]string `json:"reverseAdjacencyList" db:"reverse_adjacency_list"`
}
