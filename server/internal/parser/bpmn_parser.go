package parser

import (
	"encoding/xml"
	"fmt"
	"strings"

	"github.com/bpmn-explorer/server/internal/models"
)

const (
	bpmnNamespace = "http://www.omg.org/spec/BPMN/20100524/MODEL"
)

// NodeType 节点类型枚举
const (
	NodeTypeStartEvent        uint32 = 1
	NodeTypeEndEvent          uint32 = 2
	NodeTypeUserTask          uint32 = 3
	NodeTypeServiceTask       uint32 = 4
	NodeTypeExclusiveGateway  uint32 = 5
	NodeTypeParallelGateway   uint32 = 6
	NodeTypeSubProcess        uint32 = 7
	NodeTypeIntermediateEvent uint32 = 8
)

// XML 结构体定义，用于解析 BPMN XML
// 注意：encoding/xml 使用本地名称（不带前缀），命名空间通过 XMLName 的 Space 字段处理

type definitions struct {
	XMLName xml.Name `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL definitions"`
	Process process  `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL process"`
}

type process struct {
	XMLName xml.Name `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL process"`
	ID      string   `xml:"id,attr"`
	Name    string   `xml:"name,attr"`
	// 支持多种节点类型
	StartEvents       []startEvent       `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL startEvent"`
	EndEvents         []endEvent         `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL endEvent"`
	UserTasks         []userTask         `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL userTask"`
	ServiceTasks      []serviceTask      `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL serviceTask"`
	ExclusiveGateways []exclusiveGateway `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL exclusiveGateway"`
	ParallelGateways  []parallelGateway  `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL parallelGateway"`
	SubProcesses      []subProcess       `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL subProcess"`
	SequenceFlows     []sequenceFlow     `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL sequenceFlow"`
	Messages          []message          `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL message"`
}

type baseElement struct {
	ID       string   `xml:"id,attr"`
	Name     string   `xml:"name,attr"`
	Incoming []string `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL incoming"`
	Outgoing []string `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL outgoing"`
}

type startEvent struct {
	baseElement
}

type endEvent struct {
	baseElement
}

type userTask struct {
	baseElement
}

type serviceTask struct {
	baseElement
}

type exclusiveGateway struct {
	baseElement
}

type parallelGateway struct {
	baseElement
}

type subProcess struct {
	baseElement
}

type sequenceFlow struct {
	XMLName            xml.Name `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL sequenceFlow"`
	ID                 string    `xml:"id,attr"`
	Name               string    `xml:"name,attr"`
	SourceRef          string    `xml:"sourceRef,attr"`
	TargetRef          string    `xml:"targetRef,attr"`
	ConditionExpression conditionExpression `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL conditionExpression"`
	Priority           uint32    `xml:"priority,attr"`
}

type conditionExpression struct {
	XMLName xml.Name `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL conditionExpression"`
	Type    string   `xml:"type,attr"`
	Content string   `xml:",chardata"`
}

type message struct {
	XMLName xml.Name `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL message"`
	ID      string   `xml:"id,attr"`
	Name    string   `xml:"name,attr"`
}

// ParseBPMN 解析 BPMN XML 内容并返回 WorkflowDefinition
func ParseBPMN(bpmnContent string) (*models.WorkflowDefinition, error) {
	if strings.TrimSpace(bpmnContent) == "" {
		return nil, fmt.Errorf("BPMN content is empty")
	}

	var def definitions
	if err := xml.Unmarshal([]byte(bpmnContent), &def); err != nil {
		return nil, fmt.Errorf("failed to parse XML: %w", err)
	}

	// 检查是否有 process 元素
	if def.Process.ID == "" {
		return nil, fmt.Errorf("missing required element: process")
	}

	wd := &models.WorkflowDefinition{
		Nodes:              make(map[string]models.Node),
		SequenceFlows:      make(map[string]models.SequenceFlow),
		Messages:           make(map[string]models.Message),
		StartEvents:        []string{},
		EndEvents:          []string{},
		VariableDeclarations: []models.VariableDeclaration{},
		AdjacencyList:      make(map[string][]string),
		ReverseAdjacencyList: make(map[string][]string),
	}

	// 解析节点
	parseNodes(&def.Process, wd)

	// 解析序列流
	parseSequenceFlows(&def.Process, wd)

	// 解析消息
	parseMessages(&def.Process, wd)

	// 构建邻接表
	buildAdjacencyLists(wd)

	// 识别开始和结束事件
	identifyStartAndEndEvents(wd)

	return wd, nil
}

// parseNodes 解析所有节点
func parseNodes(proc *process, wd *models.WorkflowDefinition) {
	// 解析开始事件
	for _, se := range proc.StartEvents {
		node := models.Node{
			ID:                      se.ID,
			Name:                    se.Name,
			Type:                    NodeTypeStartEvent,
			IncomingSequenceFlowIDs: se.Incoming,
			OutgoingSequenceFlowIDs: se.Outgoing,
		}
		wd.Nodes[node.ID] = node
	}

	// 解析结束事件
	for _, ee := range proc.EndEvents {
		node := models.Node{
			ID:                      ee.ID,
			Name:                    ee.Name,
			Type:                    NodeTypeEndEvent,
			IncomingSequenceFlowIDs: ee.Incoming,
			OutgoingSequenceFlowIDs: ee.Outgoing,
		}
		wd.Nodes[node.ID] = node
	}

	// 解析用户任务
	for _, ut := range proc.UserTasks {
		node := models.Node{
			ID:                      ut.ID,
			Name:                    ut.Name,
			Type:                    NodeTypeUserTask,
			IncomingSequenceFlowIDs: ut.Incoming,
			OutgoingSequenceFlowIDs: ut.Outgoing,
		}
		wd.Nodes[node.ID] = node
	}

	// 解析服务任务
	for _, st := range proc.ServiceTasks {
		node := models.Node{
			ID:                      st.ID,
			Name:                    st.Name,
			Type:                    NodeTypeServiceTask,
			IncomingSequenceFlowIDs: st.Incoming,
			OutgoingSequenceFlowIDs: st.Outgoing,
		}
		wd.Nodes[node.ID] = node
	}

	// 解析排他网关
	for _, eg := range proc.ExclusiveGateways {
		node := models.Node{
			ID:                      eg.ID,
			Name:                    eg.Name,
			Type:                    NodeTypeExclusiveGateway,
			IncomingSequenceFlowIDs: eg.Incoming,
			OutgoingSequenceFlowIDs: eg.Outgoing,
		}
		wd.Nodes[node.ID] = node
	}

	// 解析并行网关
	for _, pg := range proc.ParallelGateways {
		node := models.Node{
			ID:                      pg.ID,
			Name:                    pg.Name,
			Type:                    NodeTypeParallelGateway,
			IncomingSequenceFlowIDs: pg.Incoming,
			OutgoingSequenceFlowIDs: pg.Outgoing,
		}
		wd.Nodes[node.ID] = node
	}

	// 解析子流程
	for _, sp := range proc.SubProcesses {
		node := models.Node{
			ID:                      sp.ID,
			Name:                    sp.Name,
			Type:                    NodeTypeSubProcess,
			IncomingSequenceFlowIDs: sp.Incoming,
			OutgoingSequenceFlowIDs: sp.Outgoing,
		}
		wd.Nodes[node.ID] = node
	}
}

// parseSequenceFlows 解析序列流
func parseSequenceFlows(proc *process, wd *models.WorkflowDefinition) {
	for _, sf := range proc.SequenceFlows {
		flow := models.SequenceFlow{
			ID:                sf.ID,
			Name:              sf.Name,
			SourceNodeID:      sf.SourceRef,
			TargetNodeID:      sf.TargetRef,
			ConditionExpression: strings.TrimSpace(sf.ConditionExpression.Content),
			Priority:          sf.Priority,
		}
		wd.SequenceFlows[flow.ID] = flow
	}
}

// parseMessages 解析消息
func parseMessages(proc *process, wd *models.WorkflowDefinition) {
	for _, msg := range proc.Messages {
		message := models.Message{
			ID:   msg.ID,
			Name: msg.Name,
		}
		wd.Messages[message.ID] = message
	}
}

// buildAdjacencyLists 构建邻接表
func buildAdjacencyLists(wd *models.WorkflowDefinition) {
	// 初始化邻接表
	for nodeID := range wd.Nodes {
		wd.AdjacencyList[nodeID] = []string{}
		wd.ReverseAdjacencyList[nodeID] = []string{}
	}

	// 根据序列流构建邻接表
	for _, flow := range wd.SequenceFlows {
		sourceID := flow.SourceNodeID
		targetID := flow.TargetNodeID

		// 检查源节点和目标节点是否存在
		if _, exists := wd.Nodes[sourceID]; !exists {
			continue
		}
		if _, exists := wd.Nodes[targetID]; !exists {
			continue
		}

		// 添加到正向邻接表
		wd.AdjacencyList[sourceID] = append(wd.AdjacencyList[sourceID], targetID)

		// 添加到反向邻接表
		wd.ReverseAdjacencyList[targetID] = append(wd.ReverseAdjacencyList[targetID], sourceID)
	}
}

// identifyStartAndEndEvents 识别开始和结束事件
func identifyStartAndEndEvents(wd *models.WorkflowDefinition) {
	for nodeID, node := range wd.Nodes {
		switch node.Type {
		case NodeTypeStartEvent:
			wd.StartEvents = append(wd.StartEvents, nodeID)
		case NodeTypeEndEvent:
			wd.EndEvents = append(wd.EndEvents, nodeID)
		}
	}
}

