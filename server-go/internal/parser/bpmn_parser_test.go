package parser

import (
	"testing"
)

func TestParseBPMN(t *testing.T) {
	// 使用内联 BPMN XML 进行测试
	bpmnXML := `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_1" name="User Onboarding">
    <bpmn:startEvent id="StartNode_Register" name="Start Registration">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="UserNode_ProductTour" name="Product Tour">
      <bpmn:incoming>Flow_1</bpmn:incoming>
    </bpmn:userTask>
    <bpmn:boundaryEvent id="BoundaryEvent_TourComplete" name="Tour Complete" attachedToRef="UserNode_ProductTour">
      <bpmn:outgoing>Flow_4</bpmn:outgoing>
    </bpmn:boundaryEvent>
    <bpmn:endEvent id="EndNode_Complete" name="Onboarding Complete">
      <bpmn:incoming>Flow_4</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartNode_Register" targetRef="UserNode_ProductTour" />
    <bpmn:sequenceFlow id="Flow_4" sourceRef="BoundaryEvent_TourComplete" targetRef="EndNode_Complete" />
  </bpmn:process>
</bpmn:definitions>`

	// 解析 BPMN
	wd, err := ParseBPMN(bpmnXML)
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
	if len(startNode.OutgoingSequenceFlowIds) == 0 {
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
    </bpmn:userTask>
    <bpmn:boundaryEvent id="Boundary_1" attachedToRef="Task_1">
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:boundaryEvent>
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
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Boundary_1" targetRef="Service_1" />
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
	if wd.Nodes["Boundary_1"].Type != NodeTypeBoundaryEvent {
		t.Errorf("Expected boundary event type, got %d", wd.Nodes["Boundary_1"].Type)
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

// TestValidateUserTaskConstraints_Valid 测试符合约束的 UserTask（通过 BoundaryEvent 连接）
func TestValidateUserTaskConstraints_Valid(t *testing.T) {
	bpmnXML := `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_1">
    <bpmn:startEvent id="Start_1">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="UserTask_1" name="Approve">
      <bpmn:incoming>Flow_1</bpmn:incoming>
    </bpmn:userTask>
    <bpmn:boundaryEvent id="BoundaryEvent_1" name="Approved" attachedToRef="UserTask_1" cancelActivity="true">
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:boundaryEvent>
    <bpmn:endEvent id="End_1">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="UserTask_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="BoundaryEvent_1" targetRef="End_1" />
  </bpmn:process>
</bpmn:definitions>`

	wd, err := ParseBPMN(bpmnXML)
	if err != nil {
		t.Fatalf("Expected no error for valid UserTask with BoundaryEvent, got: %v", err)
	}

	// 验证解析成功
	if wd == nil {
		t.Fatal("WorkflowDefinition should not be nil")
	}

	// 验证 BoundaryEvent 存在且正确附加
	boundaryNode := wd.Nodes["BoundaryEvent_1"]
	if boundaryNode.AttachedNodeId != "UserTask_1" {
		t.Errorf("Expected BoundaryEvent attached to UserTask_1, got %s", boundaryNode.AttachedNodeId)
	}
}

// TestValidateUserTaskConstraints_DirectOutgoing 测试违反约束：UserTask 直接有 outgoing
func TestValidateUserTaskConstraints_DirectOutgoing(t *testing.T) {
	bpmnXML := `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_1">
    <bpmn:startEvent id="Start_1">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="UserTask_1" name="Approve">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:userTask>
    <bpmn:endEvent id="End_1">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="UserTask_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="UserTask_1" targetRef="End_1" />
  </bpmn:process>
</bpmn:definitions>`

	_, err := ParseBPMN(bpmnXML)
	if err == nil {
		t.Fatal("Expected error for UserTask with direct outgoing flow, got nil")
	}

	expectedErrMsg := "UserTask UserTask_1 has direct outgoing flow Flow_2"
	if !contains(err.Error(), expectedErrMsg) {
		t.Errorf("Expected error message to contain '%s', got: %s", expectedErrMsg, err.Error())
	}
}


// TestValidateUserTaskConstraints_BoundaryEventMissingAttachedToRef 测试 BoundaryEvent 缺少 attachedToRef
func TestValidateUserTaskConstraints_BoundaryEventMissingAttachedToRef(t *testing.T) {
	bpmnXML := `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_1">
    <bpmn:startEvent id="Start_1">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="UserTask_1" name="Approve">
      <bpmn:incoming>Flow_1</bpmn:incoming>
    </bpmn:userTask>
    <bpmn:boundaryEvent id="BoundaryEvent_1" name="Approved" cancelActivity="true">
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:boundaryEvent>
    <bpmn:endEvent id="End_1">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="UserTask_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="BoundaryEvent_1" targetRef="End_1" />
  </bpmn:process>
</bpmn:definitions>`

	_, err := ParseBPMN(bpmnXML)
	if err == nil {
		t.Fatal("Expected error for BoundaryEvent missing attachedToRef, got nil")
	}

	expectedErrMsg := "BoundaryEvent BoundaryEvent_1 missing attachedToRef"
	if !contains(err.Error(), expectedErrMsg) {
		t.Errorf("Expected error message to contain '%s', got: %s", expectedErrMsg, err.Error())
	}
}

// TestValidateUserTaskConstraints_UserTaskNoOutgoing 测试 UserTask 没有 outgoing（允许）
func TestValidateUserTaskConstraints_UserTaskNoOutgoing(t *testing.T) {
	bpmnXML := `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_1">
    <bpmn:startEvent id="Start_1">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="UserTask_1" name="Approve">
      <bpmn:incoming>Flow_1</bpmn:incoming>
    </bpmn:userTask>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="UserTask_1" />
  </bpmn:process>
</bpmn:definitions>`

	wd, err := ParseBPMN(bpmnXML)
	if err != nil {
		t.Fatalf("Expected no error for UserTask without outgoing, got: %v", err)
	}

	// 验证解析成功
	if wd == nil {
		t.Fatal("WorkflowDefinition should not be nil")
	}

	// 验证 UserTask 存在且没有 outgoing
	userTask := wd.Nodes["UserTask_1"]
	if len(userTask.OutgoingSequenceFlowIds) != 0 {
		t.Errorf("Expected no outgoing flows, got %d", len(userTask.OutgoingSequenceFlowIds))
	}
}

// TestValidateUserTaskConstraints_MultipleBoundaryEvents 测试同一 UserTask 上有多个 BoundaryEvent
func TestValidateUserTaskConstraints_MultipleBoundaryEvents(t *testing.T) {
	bpmnXML := `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
  <bpmn:process id="Process_1">
    <bpmn:startEvent id="Start_1">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:userTask id="UserTask_1" name="Approve">
      <bpmn:incoming>Flow_1</bpmn:incoming>
    </bpmn:userTask>
    <bpmn:boundaryEvent id="BoundaryEvent_Approved" name="Approved" attachedToRef="UserTask_1" cancelActivity="true">
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:boundaryEvent>
    <bpmn:boundaryEvent id="BoundaryEvent_Rejected" name="Rejected" attachedToRef="UserTask_1" cancelActivity="true">
      <bpmn:outgoing>Flow_3</bpmn:outgoing>
    </bpmn:boundaryEvent>
    <bpmn:endEvent id="End_Success">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:endEvent id="End_Failure">
      <bpmn:incoming>Flow_3</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="Start_1" targetRef="UserTask_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="BoundaryEvent_Approved" targetRef="End_Success" />
    <bpmn:sequenceFlow id="Flow_3" sourceRef="BoundaryEvent_Rejected" targetRef="End_Failure" />
  </bpmn:process>
</bpmn:definitions>`

	wd, err := ParseBPMN(bpmnXML)
	if err != nil {
		t.Fatalf("Expected no error for UserTask with multiple BoundaryEvents, got: %v", err)
	}

	// 验证解析成功
	if wd == nil {
		t.Fatal("WorkflowDefinition should not be nil")
	}

	// 验证两个 BoundaryEvent 都存在且正确附加
	boundaryApproved := wd.Nodes["BoundaryEvent_Approved"]
	if boundaryApproved.AttachedNodeId != "UserTask_1" {
		t.Errorf("Expected BoundaryEvent_Approved attached to UserTask_1, got %s", boundaryApproved.AttachedNodeId)
	}

	boundaryRejected := wd.Nodes["BoundaryEvent_Rejected"]
	if boundaryRejected.AttachedNodeId != "UserTask_1" {
		t.Errorf("Expected BoundaryEvent_Rejected attached to UserTask_1, got %s", boundaryRejected.AttachedNodeId)
	}
}

// contains 是一个辅助函数，用于检查字符串是否包含子字符串
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr) &&
		(s[:len(substr)] == substr || s[len(s)-len(substr):] == substr ||
		findSubstring(s, substr)))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}

