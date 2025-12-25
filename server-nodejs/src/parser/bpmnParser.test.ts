import { parseBPMN } from './bpmnParser';
import { NodeType } from '../services/workflowEngineService';

describe('BPMN Parser', () => {
  describe('parseBPMN', () => {
    it('should throw error for empty BPMN content', () => {
      expect(() => parseBPMN('')).toThrow('BPMN content is empty');
      expect(() => parseBPMN('   ')).toThrow('BPMN content is empty');
    });

    it('should throw error for missing process element', () => {
      const invalidXml = `<?xml version="1.0" encoding="UTF-8"?>
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
        </bpmn:definitions>`;

      expect(() => parseBPMN(invalidXml)).toThrow('Missing required element: process');
    });

    it('should parse simple workflow with start and end events', () => {
      const simpleWorkflow = `<?xml version="1.0" encoding="UTF-8"?>
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
          <bpmn:process id="Process_1" name="Simple Process">
            <bpmn:startEvent id="StartEvent_1" name="Start">
              <bpmn:outgoing>Flow_1</bpmn:outgoing>
            </bpmn:startEvent>
            <bpmn:endEvent id="EndEvent_1" name="End">
              <bpmn:incoming>Flow_1</bpmn:incoming>
            </bpmn:endEvent>
            <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="EndEvent_1" />
          </bpmn:process>
        </bpmn:definitions>`;

      const result = parseBPMN(simpleWorkflow);

      expect(result.processId).toBe('Process_1');
      expect(result.startEvents).toContain('StartEvent_1');
      expect(result.nodes['StartEvent_1']).toBeDefined();
      expect(result.nodes['StartEvent_1'].type).toBe(NodeType.START_EVENT);
      expect(result.nodes['EndEvent_1']).toBeDefined();
      expect(result.nodes['EndEvent_1'].type).toBe(NodeType.END_EVENT);
      expect(result.sequenceFlows['Flow_1']).toBeDefined();
      expect(result.sequenceFlows['Flow_1'].sourceNodeId).toBe('StartEvent_1');
      expect(result.sequenceFlows['Flow_1'].targetNodeId).toBe('EndEvent_1');
    });

    it('should parse service task with business API URL', () => {
      const serviceTaskWorkflow = `<?xml version="1.0" encoding="UTF-8"?>
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                         xmlns:xflow="http://example.com/bpmn/xflow-extension">
          <bpmn:process id="Process_1">
            <bpmn:serviceTask id="ServiceTask_1" name="Call API">
              <bpmn:extensionElements>
                <xflow:url>https://api.example.com/endpoint</xflow:url>
              </bpmn:extensionElements>
            </bpmn:serviceTask>
          </bpmn:process>
        </bpmn:definitions>`;

      const result = parseBPMN(serviceTaskWorkflow);

      expect(result.nodes['ServiceTask_1']).toBeDefined();
      expect(result.nodes['ServiceTask_1'].type).toBe(NodeType.SERVICE_TASK);
      expect(result.nodes['ServiceTask_1'].businessApiUrl).toBe('https://api.example.com/endpoint');
    });

    it('should parse exclusive gateway with condition expressions', () => {
      const gatewayWorkflow = `<?xml version="1.0" encoding="UTF-8"?>
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
          <bpmn:process id="Process_1">
            <bpmn:exclusiveGateway id="Gateway_1" name="Check Amount">
              <bpmn:incoming>Flow_1</bpmn:incoming>
              <bpmn:outgoing>Flow_2</bpmn:outgoing>
              <bpmn:outgoing>Flow_3</bpmn:outgoing>
            </bpmn:exclusiveGateway>
            <bpmn:sequenceFlow id="Flow_2" sourceRef="Gateway_1" targetRef="Task_1">
              <bpmn:conditionExpression>amount > 1000</bpmn:conditionExpression>
            </bpmn:sequenceFlow>
            <bpmn:sequenceFlow id="Flow_3" sourceRef="Gateway_1" targetRef="Task_2" />
          </bpmn:process>
        </bpmn:definitions>`;

      const result = parseBPMN(gatewayWorkflow);

      expect(result.nodes['Gateway_1']).toBeDefined();
      expect(result.nodes['Gateway_1'].type).toBe(NodeType.EXCLUSIVE_GATEWAY);
      expect(result.sequenceFlows['Flow_2'].conditionExpression).toBe('amount > 1000');
      expect(result.sequenceFlows['Flow_3'].conditionExpression).toBe('');
    });

    it('should build adjacency lists correctly', () => {
      const workflow = `<?xml version="1.0" encoding="UTF-8"?>
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
          <bpmn:process id="Process_1">
            <bpmn:startEvent id="Start">
              <bpmn:outgoing>Flow_1</bpmn:outgoing>
            </bpmn:startEvent>
            <bpmn:task id="Task_1">
              <bpmn:incoming>Flow_1</bpmn:incoming>
              <bpmn:outgoing>Flow_2</bpmn:outgoing>
            </bpmn:task>
            <bpmn:endEvent id="End">
              <bpmn:incoming>Flow_2</bpmn:incoming>
            </bpmn:endEvent>
            <bpmn:sequenceFlow id="Flow_1" sourceRef="Start" targetRef="Task_1" />
            <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="End" />
          </bpmn:process>
        </bpmn:definitions>`;

      const result = parseBPMN(workflow);

      expect(result.adjacencyList['Start']).toContain('Task_1');
      expect(result.adjacencyList['Task_1']).toContain('End');
      expect(result.reverseAdjacencyList['Task_1']).toContain('Start');
      expect(result.reverseAdjacencyList['End']).toContain('Task_1');
    });

    it('should parse boundary event with attachedToRef', () => {
      const boundaryEventWorkflow = `<?xml version="1.0" encoding="UTF-8"?>
        <bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL">
          <bpmn:process id="Process_1">
            <bpmn:userTask id="UserTask_1" name="User Task">
            </bpmn:userTask>
            <bpmn:boundaryEvent id="BoundaryEvent_1" name="Timeout" attachedToRef="UserTask_1">
              <bpmn:outgoing>Flow_1</bpmn:outgoing>
            </bpmn:boundaryEvent>
          </bpmn:process>
        </bpmn:definitions>`;

      const result = parseBPMN(boundaryEventWorkflow);

      expect(result.nodes['BoundaryEvent_1']).toBeDefined();
      expect(result.nodes['BoundaryEvent_1'].type).toBe(NodeType.BOUNDARY_EVENT);
      expect(result.nodes['BoundaryEvent_1'].attachedNodeId).toBe('UserTask_1');
    });

    it('should parse workflow XML and return nodes property', () => {
      // 测试用例来自原来的 e2e 测试
      const xml = '<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn:process id="Process_1" isExecutable="true"><bpmn:startEvent id="StartEvent_1"/></bpmn:process></bpmn:definitions>';

      const result = parseBPMN(xml);

      // 验证返回结果包含 nodes 属性
      expect(result).toHaveProperty('nodes');
      expect(typeof result.nodes).toBe('object');
      // 验证解析出了节点
      expect(result.nodes['StartEvent_1']).toBeDefined();
      expect(result.nodes['StartEvent_1'].type).toBe(NodeType.START_EVENT);
      expect(result.nodes['StartEvent_1'].id).toBe('StartEvent_1');
      // 验证 processId
      expect(result.processId).toBe('Process_1');
      // 验证 startEvents 数组包含该节点
      expect(result.startEvents).toContain('StartEvent_1');
    });
  });
});
