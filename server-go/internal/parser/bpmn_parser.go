package parser

import (
	"encoding/xml"
	"fmt"
	"strings"

	"github.com/bpmn-explorer/server/internal/models"
)

const (
	bpmnNamespace = "http://www.omg.org/spec/BPMN/20100524/MODEL"
	xflowNamespace = "http://example.com/bpmn/xflow-extension"
)

// NodeType 节点类型枚举
const (
	NodeTypeStartEvent              uint32 = 1
	NodeTypeEndEvent                uint32 = 2
	NodeTypeUserTask                uint32 = 3
	NodeTypeServiceTask             uint32 = 4
	NodeTypeExclusiveGateway        uint32 = 5
	NodeTypeParallelGateway         uint32 = 6
	NodeTypeSubProcess              uint32 = 7
	NodeTypeIntermediateEvent       uint32 = 8
	NodeTypeIntermediateCatchEvent  uint32 = 9
	NodeTypeEventBasedGateway       uint32 = 10
	NodeTypeBoundaryEvent           uint32 = 11
	NodeTypeTask                    uint32 = 12 // 普通 Task（抽象任务）
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
	StartEvents              []startEvent              `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL startEvent"`
	EndEvents                []endEvent                `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL endEvent"`
	Tasks                    []task                    `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL task"`
	UserTasks                []userTask                `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL userTask"`
	ServiceTasks             []serviceTask             `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL serviceTask"`
	ExclusiveGateways        []exclusiveGateway        `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL exclusiveGateway"`
	ParallelGateways         []parallelGateway         `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL parallelGateway"`
	SubProcesses             []subProcess              `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL subProcess"`
	IntermediateCatchEvents  []intermediateCatchEvent  `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL intermediateCatchEvent"`
	EventBasedGateways       []eventBasedGateway       `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL eventBasedGateway"`
	BoundaryEvents           []boundaryEvent           `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL boundaryEvent"`
	SequenceFlows            []sequenceFlow            `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL sequenceFlow"`
	Messages                 []message                 `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL message"`
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

type task struct {
	baseElement
}

type userTask struct {
	baseElement
}

type serviceTask struct {
	baseElement
	ExtensionElements extensionElements `xml:"http://www.omg.org/spec/BPMN/20100524/MODEL extensionElements"`
}

type extensionElements struct {
	Values []extensionValue `xml:",any"`
}

type extensionValue struct {
	XMLName xml.Name
	Value   string `xml:"value,attr"`
	Content string `xml:",chardata"`
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

type intermediateCatchEvent struct {
	baseElement
}

type eventBasedGateway struct {
	baseElement
}

type boundaryEvent struct {
	baseElement
	AttachedToRef string `xml:"attachedToRef,attr"`
	CancelActivity bool   `xml:"cancelActivity,attr"`
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

	// 验证 UserTask 约束
	if err := validateUserTaskConstraints(wd); err != nil {
		return nil, err
	}

	// 识别开始和结束事件
	identifyStartAndEndEvents(wd)

	return wd, nil
}

// parseNodes 解析所有节点
func parseNodes(proc *process, wd *models.WorkflowDefinition) {
	// 解析开始事件
	for _, se := range proc.StartEvents {
		node := models.Node{
			Id:                      se.ID,
			Name:                    se.Name,
			Type:                    NodeTypeStartEvent,
			IncomingSequenceFlowIds: se.Incoming,
			OutgoingSequenceFlowIds: se.Outgoing,
			CanFallback:             true,
		}
		wd.Nodes[node.Id] = node
	}

	// 解析结束事件
	for _, ee := range proc.EndEvents {
		node := models.Node{
			Id:                      ee.ID,
			Name:                    ee.Name,
			Type:                    NodeTypeEndEvent,
			IncomingSequenceFlowIds: ee.Incoming,
			OutgoingSequenceFlowIds: ee.Outgoing,
			CanFallback:             true,
		}
		wd.Nodes[node.Id] = node
	}

	// 解析普通任务（Task）
	for _, t := range proc.Tasks {
		node := models.Node{
			Id:                      t.ID,
			Name:                    t.Name,
			Type:                    NodeTypeTask,
			IncomingSequenceFlowIds: t.Incoming,
			OutgoingSequenceFlowIds: t.Outgoing,
			CanFallback:             true,
		}
		wd.Nodes[node.Id] = node
	}

	// 解析用户任务
	for _, ut := range proc.UserTasks {
		node := models.Node{
			Id:                      ut.ID,
			Name:                    ut.Name,
			Type:                    NodeTypeUserTask,
			IncomingSequenceFlowIds: ut.Incoming,
			OutgoingSequenceFlowIds: ut.Outgoing,
			CanFallback:             true,
		}
		wd.Nodes[node.Id] = node
	}

	// 解析服务任务
	for _, st := range proc.ServiceTasks {
		node := models.Node{
			Id:                      st.ID,
			Name:                    st.Name,
			Type:                    NodeTypeServiceTask,
			IncomingSequenceFlowIds: st.Incoming,
			OutgoingSequenceFlowIds: st.Outgoing,
			CanFallback:             true,
		}
		// 从扩展属性中提取业务接口 URL
		if len(st.ExtensionElements.Values) > 0 {
			for _, ext := range st.ExtensionElements.Values {
				// 查找 xflow:Url 或 url 元素
				localName := ext.XMLName.Local
				if localName == "url" || localName == "Url" || strings.HasSuffix(ext.XMLName.Space, "xflow-extension") {
					// 优先使用 value 属性，如果没有则使用内容
					if ext.Value != "" {
						node.BusinessApiUrl = ext.Value
					} else if ext.Content != "" {
						node.BusinessApiUrl = strings.TrimSpace(ext.Content)
					}
					break
				}
			}
		}
		wd.Nodes[node.Id] = node
	}

	// 解析排他网关
	for _, eg := range proc.ExclusiveGateways {
		node := models.Node{
			Id:                      eg.ID,
			Name:                    eg.Name,
			Type:                    NodeTypeExclusiveGateway,
			IncomingSequenceFlowIds: eg.Incoming,
			OutgoingSequenceFlowIds: eg.Outgoing,
			CanFallback:             true,
		}
		wd.Nodes[node.Id] = node
	}

	// 解析并行网关
	for _, pg := range proc.ParallelGateways {
		node := models.Node{
			Id:                      pg.ID,
			Name:                    pg.Name,
			Type:                    NodeTypeParallelGateway,
			IncomingSequenceFlowIds: pg.Incoming,
			OutgoingSequenceFlowIds: pg.Outgoing,
			CanFallback:             true,
		}
		wd.Nodes[node.Id] = node
	}

	// 解析子流程
	for _, sp := range proc.SubProcesses {
		node := models.Node{
			Id:                      sp.ID,
			Name:                    sp.Name,
			Type:                    NodeTypeSubProcess,
			IncomingSequenceFlowIds: sp.Incoming,
			OutgoingSequenceFlowIds: sp.Outgoing,
			CanFallback:             true,
		}
		wd.Nodes[node.Id] = node
	}

	// 解析中间捕获事件
	for _, ice := range proc.IntermediateCatchEvents {
		node := models.Node{
			Id:                      ice.ID,
			Name:                    ice.Name,
			Type:                    NodeTypeIntermediateCatchEvent,
			IncomingSequenceFlowIds: ice.Incoming,
			OutgoingSequenceFlowIds: ice.Outgoing,
			CanFallback:             true,
		}
		wd.Nodes[node.Id] = node
	}

	// 解析事件网关
	for _, ebg := range proc.EventBasedGateways {
		node := models.Node{
			Id:                      ebg.ID,
			Name:                    ebg.Name,
			Type:                    NodeTypeEventBasedGateway,
			IncomingSequenceFlowIds: ebg.Incoming,
			OutgoingSequenceFlowIds: ebg.Outgoing,
			CanFallback:             true,
		}
		wd.Nodes[node.Id] = node
	}

	// 解析边界事件
	for _, be := range proc.BoundaryEvents {
		node := models.Node{
			Id:                      be.ID,
			Name:                    be.Name,
			Type:                    NodeTypeBoundaryEvent,
			IncomingSequenceFlowIds: be.Incoming,
			OutgoingSequenceFlowIds: be.Outgoing,
			AttachedNodeId:          be.AttachedToRef,
			CanFallback:             true,
		}
		wd.Nodes[node.Id] = node
	}
}

// parseSequenceFlows 解析序列流
func parseSequenceFlows(proc *process, wd *models.WorkflowDefinition) {
	for _, sf := range proc.SequenceFlows {
		flow := models.SequenceFlow{
			Id:                sf.ID,
			Name:              sf.Name,
			SourceNodeId:      sf.SourceRef,
			TargetNodeId:      sf.TargetRef,
			ConditionExpression: strings.TrimSpace(sf.ConditionExpression.Content),
			Priority:          sf.Priority,
		}
		wd.SequenceFlows[flow.Id] = flow
	}
}

// parseMessages 解析消息
func parseMessages(proc *process, wd *models.WorkflowDefinition) {
	for _, msg := range proc.Messages {
		message := models.Message{
			Id:   msg.ID,
			Name: msg.Name,
		}
		wd.Messages[message.Id] = message
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
		sourceID := flow.SourceNodeId
		targetID := flow.TargetNodeId

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

// validateUserTaskConstraints 验证 UserTask 的 outgoing 连线约束
// 确保所有 UserTask 的 outgoing 连线都从 BoundaryEvent 出发
func validateUserTaskConstraints(wd *models.WorkflowDefinition) error {
	// 1. 构建 BoundaryEvent 索引：attachedNodeId -> []boundaryEventIDs
	boundaryEvents := make(map[string][]string)
	for nodeID, node := range wd.Nodes {
		if node.Type == NodeTypeBoundaryEvent {
			if node.AttachedNodeId == "" {
				return fmt.Errorf("BoundaryEvent %s missing attachedToRef", nodeID)
			}
			boundaryEvents[node.AttachedNodeId] = append(
				boundaryEvents[node.AttachedNodeId], nodeID)
		}
	}

	// 2. 验证每个 UserTask
	for nodeID, node := range wd.Nodes {
		if node.Type != NodeTypeUserTask {
			continue
		}

		if len(node.OutgoingSequenceFlowIds) == 0 {
			continue // 没有 outgoing，跳过
		}

		// 检查每条 outgoing 连线的 sourceRef
		for _, flowID := range node.OutgoingSequenceFlowIds {
			flow, exists := wd.SequenceFlows[flowID]
			if !exists {
				return fmt.Errorf("SequenceFlow %s not found", flowID)
			}

			// 验证失败：连线直接从 UserTask 出发
			if flow.SourceNodeId == nodeID {
				return fmt.Errorf(
					"UserTask %s has direct outgoing flow %s. "+
						"All outgoing flows from UserTask must originate from BoundaryEvent",
					nodeID, flowID)
			}
		}

		// 检查是否有 BoundaryEvent
		if len(boundaryEvents[nodeID]) == 0 {
			return fmt.Errorf(
				"UserTask %s has outgoing flows but no BoundaryEvent attached",
				nodeID)
		}
	}

	return nil
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

