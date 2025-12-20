package parser

import (
	"os"
	"path/filepath"
	"testing"
)

func TestParseBPMN(t *testing.T) {
	// 读取示例 BPMN 文件
	// 从项目根目录查找文件
	bpmnPath := filepath.Join("../../../../examples/user-onboarding-with-lifecycle.bpmn")
	bpmnContent, err := os.ReadFile(bpmnPath)
	if err != nil {
		// 尝试从当前目录查找
		bpmnPath = filepath.Join("../../../examples/user-onboarding-with-lifecycle.bpmn")
		bpmnContent, err = os.ReadFile(bpmnPath)
		if err != nil {
			t.Fatalf("Failed to read BPMN file: %v", err)
		}
	}

	// 解析 BPMN
	wd, err := ParseBPMN(string(bpmnContent))
	if err != nil {
		t.Fatalf("Failed to parse BPMN: %v", err)
	}

	// 验证基本结构
	if wd == nil {
		t.Fatal("WorkflowDefinition is nil")
	}

	// 验证节点
	if len(wd.Nodes) == 0 {
		t.Error("Expected nodes, got none")
	}

	// 验证序列流
	if len(wd.SequenceFlows) == 0 {
		t.Error("Expected sequence flows, got none")
	}

	// 验证开始和结束事件
	if len(wd.StartEvents) == 0 {
		t.Error("Expected start events, got none")
	}
	if len(wd.EndEvents) == 0 {
		t.Error("Expected end events, got none")
	}

	// 验证邻接表
	if len(wd.AdjacencyList) == 0 {
		t.Error("Expected adjacency list, got empty")
	}
	if len(wd.ReverseAdjacencyList) == 0 {
		t.Error("Expected reverse adjacency list, got empty")
	}

	// 验证特定节点
	expectedStartNodeID := "StartNode_Register"
	if _, exists := wd.Nodes[expectedStartNodeID]; !exists {
		t.Errorf("Expected start node %s not found", expectedStartNodeID)
	}

	expectedEndNodeID := "EndNode_Complete"
	if _, exists := wd.Nodes[expectedEndNodeID]; !exists {
		t.Errorf("Expected end node %s not found", expectedEndNodeID)
	}

	// 验证序列流
	expectedFlowID := "Flow_1"
	if _, exists := wd.SequenceFlows[expectedFlowID]; !exists {
		t.Errorf("Expected sequence flow %s not found", expectedFlowID)
	}

	// 验证邻接表连接
	startNode := wd.Nodes[expectedStartNodeID]
	if len(startNode.OutgoingSequenceFlowIDs) == 0 {
		t.Error("Start node should have outgoing sequence flows")
	}

		// 验证邻接表构建
		flow := wd.SequenceFlows[expectedFlowID]
		if len(wd.AdjacencyList[flow.SourceNodeId]) == 0 {
			t.Error("Adjacency list should contain connections")
		}
		if len(wd.ReverseAdjacencyList[flow.TargetNodeId]) == 0 {
			t.Error("Reverse adjacency list should contain connections")
		}
}

func TestParseBPMN_EmptyContent(t *testing.T) {
	_, err := ParseBPMN("")
	if err == nil {
		t.Error("Expected error for empty content")
	}
}

func TestParseBPMN_InvalidXML(t *testing.T) {
	_, err := ParseBPMN("<invalid>")
	if err == nil {
		t.Error("Expected error for invalid XML")
	}
}

func TestParseBPMN_MissingProcess(t *testing.T) {
	invalidXML := `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
</bpmn:definitions>`
	_, err := ParseBPMN(invalidXML)
	if err == nil {
		t.Error("Expected error for missing process element")
	}
}

func TestParseBPMN_NodeTypes(t *testing.T) {
	bpmnXML := `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_1" name="Test Process">
    <bpmn:startEvent id="Start_1" name="Start">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="Task_1" name="User Task">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:serviceTask id="Service_1" name="Service Task">
      <bpmn:incoming>Flow_2</bpmn:incoming>
      <bpmn:outgoing>Flow_3</bpmn:outgoing>
    </bpmn:serviceTask>
    <bpmn:exclusiveGateway id="Gateway_1" name="Gateway">
      <bpmn:incoming>Flow_3</bpmn:incoming>
      <bpmn:outgoing>Flow_4</bpmn:outgoing>
    </bpmn:exclusiveGateway>
    <bpmn:endEvent id="End_1" name="End">
      <bpmn:incoming>Flow_4</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="Task_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="Service_1" />
    <bpmn:sequenceFlow id="Flow_3" sourceRef="Service_1" targetRef="Gateway_1" />
    <bpmn:sequenceFlow id="Flow_4" sourceRef="Gateway_1" targetRef="End_1" />
  </bpmn:process>
</bpmn:definitions>`

	wd, err := ParseBPMN(bpmnXML)
	if err != nil {
		t.Fatalf("Failed to parse BPMN: %v", err)
	}

	// 验证节点类型
	if wd.Nodes["Start_1"].Type != NodeTypeStartEvent {
		t.Errorf("Expected start event type, got %d", wd.Nodes["Start_1"].Type)
	}
	if wd.Nodes["Task_1"].Type != NodeTypeUserTask {
		t.Errorf("Expected user task type, got %d", wd.Nodes["Task_1"].Type)
	}
	if wd.Nodes["Service_1"].Type != NodeTypeServiceTask {
		t.Errorf("Expected service task type, got %d", wd.Nodes["Service_1"].Type)
	}
	if wd.Nodes["Gateway_1"].Type != NodeTypeExclusiveGateway {
		t.Errorf("Expected exclusive gateway type, got %d", wd.Nodes["Gateway_1"].Type)
	}
	if wd.Nodes["End_1"].Type != NodeTypeEndEvent {
		t.Errorf("Expected end event type, got %d", wd.Nodes["End_1"].Type)
	}
}

func TestParseBPMN_ConditionExpression(t *testing.T) {
	bpmnXML := `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_1">
    <bpmn:startEvent id="Start_1">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:endEvent id="End_1">
      <bpmn:incoming>Flow_1</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="End_1">
      <bpmn:conditionExpression type="tFormalExpression">approved == true</bpmn:conditionExpression>
    </bpmn:sequenceFlow>
  </bpmn:process>
</bpmn:definitions>`

	wd, err := ParseBPMN(bpmnXML)
	if err != nil {
		t.Fatalf("Failed to parse BPMN: %v", err)
	}

	flow := wd.SequenceFlows["Flow_1"]
	expectedCondition := "approved == true"
	if flow.ConditionExpression != expectedCondition {
		t.Errorf("Expected condition expression '%s', got '%s'", expectedCondition, flow.ConditionExpression)
	}
}

