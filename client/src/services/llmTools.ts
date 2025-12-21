/**
 * LLM 工具定义 - 用于 Function Calling
 * 定义 LLM 可以调用的编辑器操作工具
 */

import { convertFunctionsToTools } from './claude/toolAdapter'
import type { ClaudeTool } from './claude/ClaudeAPIClient'

export interface FunctionDeclaration {
  name: string
  description: string
  parameters: {
    type: string
    properties: Record<string, any>
    required: string[]
  }
}

/**
 * 创建节点工具
 */
export const createNodeTool: FunctionDeclaration = {
  name: 'createNode',
  description: '在流程图编辑器中创建一个新节点。支持多种节点类型：开始节点(startEvent)、结束节点(endEvent)、用户任务(userTask)、服务任务(serviceTask)、排他网关(exclusiveGateway)、并行网关(parallelGateway)。建议为每个节点添加documentation来说明其业务含义。\n\n🚨 重要约束：如果创建的是 userTask 类型节点，创建后必须立即调用 createBoundaryEvent 工具为其创建边界事件，否则无法保存流程图！',
  parameters: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: '节点的唯一标识符，格式如 StartEvent_1, UserTask_1, Gateway_1 等'
      },
      name: {
        type: 'string',
        description: '节点的显示名称，如"提交申请"、"经理审批"等'
      },
      type: {
        type: 'string',
        description: 'BPMN 节点类型。注意：如果是 bpmn:UserTask，创建后必须立即创建 BoundaryEvent！其他类型：bpmn:StartEvent（开始事件）、bpmn:EndEvent（结束事件）、bpmn:ServiceTask（服务任务）、bpmn:ExclusiveGateway（排他网关）、bpmn:ParallelGateway（并行网关）'
      },
      x: {
        type: 'number',
        description: '节点的 X 坐标位置，建议起始位置 200，每个节点间隔约 200-300'
      },
      y: {
        type: 'number',
        description: '节点的 Y 坐标位置，建议起始位置 100，垂直方向每个节点间隔约 150'
      },
      documentation: {
        type: 'string',
        description: '节点的文档说明，描述该节点的业务含义、作用或处理逻辑。例如："用户填写注册信息包括用户名、密码、邮箱"'
      }
    },
    required: ['id', 'type', 'x', 'y']
  }
}

/**
 * 创建连线工具
 */
export const createFlowTool: FunctionDeclaration = {
  name: 'createFlow',
  description: '在两个节点之间创建一条顺序流连线。必须在创建节点之后调用。可选提供waypoints参数来自定义连线路径，避免遮挡其他节点。\n\n🚨 关键约束：严禁将 sourceId 设置为 UserTask 节点的 ID！如果连线从 UserTask 出发，sourceId 必须是附加在该 UserTask 上的 BoundaryEvent 的 ID，否则保存时会报错！',
  parameters: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: '连线的唯一标识符，格式如 Flow_1, Flow_2 等'
      },
      sourceId: {
        type: 'string',
        description: '源节点的 ID，必须是已存在的节点。🚨 警告：如果连线从 UserTask 出发，这里必须填写 BoundaryEvent 的 ID，不能填写 UserTask 的 ID！'
      },
      targetId: {
        type: 'string',
        description: '目标节点的 ID，必须是已存在的节点'
      },
      name: {
        type: 'string',
        description: '连线的显示名称，通常用于条件分支，如"审批通过"、"金额>1000"'
      },
      condition: {
        type: 'string',
        description: '条件表达式，用于网关分支判断，如"amount > 1000"'
      },
      waypoints: {
        type: 'array',
        description: '自定义路径点数组，用于创建绕过节点的连线路径。每个点包含x和y坐标。示例：[{x:100,y:200},{x:100,y:350},{x:300,y:350}]。回路连线建议使用此参数避免遮挡中间节点',
        items: {
          type: 'object',
          properties: {
            x: {
              type: 'number',
              description: '路径点的X坐标'
            },
            y: {
              type: 'number',
              description: '路径点的Y坐标'
            }
          },
          required: ['x', 'y']
        }
      }
    },
    required: ['id', 'sourceId', 'targetId']
  }
}

/**
 * 创建边界事件工具
 */
export const createBoundaryEventTool: FunctionDeclaration = {
  name: 'createBoundaryEvent',
  description: '在节点（通常是 UserTask）边缘创建边界事件。边界事件用于处理节点执行过程中的异常或特殊情况。🚨 关键约束：(1) UserTask 的所有 outgoing 连线必须从 BoundaryEvent 出发 (2) 每个 BoundaryEvent 创建后必须立即添加 outgoing 连线，不允许孤立的 BoundaryEvent。',
  parameters: {
    type: 'object',
    properties: {
      id: {
        type: 'string',
        description: '边界事件的唯一标识符，格式如 BoundaryEvent_1, BoundaryEvent_Timeout_1, BoundaryEvent_Approved 等'
      },
      name: {
        type: 'string',
        description: '边界事件的显示名称，如"超时"、"审批通过"、"审批拒绝"、"取消"等'
      },
      attachedToRef: {
        type: 'string',
        description: '附加到的节点 ID，必须是已存在的节点（通常是 UserTask）'
      },
      cancelActivity: {
        type: 'boolean',
        description: '是否中断当前活动。true=中断型边界事件（触发后终止主任务），false=非中断型（主任务继续执行）。默认 true。审批通过/拒绝通常用 true，通知/提醒通常用 false'
      },
      position: {
        type: 'string',
        description: '边界事件在节点边缘的位置：bottom（底部，默认）、top（顶部）、left（左侧）、right（右侧）',
        enum: ['top', 'bottom', 'left', 'right']
      },
      documentation: {
        type: 'string',
        description: '边界事件的文档说明，描述触发条件和处理逻辑'
      }
    },
    required: ['id', 'attachedToRef']
  }
}

/**
 * 删除节点工具
 */
export const deleteNodeTool: FunctionDeclaration = {
  name: 'deleteNode',
  description: '删除流程图中的一个节点及其相关连线。',
  parameters: {
    type: 'object',
    properties: {
      nodeId: {
        type: 'string',
        description: '要删除的节点 ID'
      }
    },
    required: ['nodeId']
  }
}

/**
 * 更新节点工具
 */
export const updateNodeTool: FunctionDeclaration = {
  name: 'updateNode',
  description: '更新节点的属性，如名称、属性等。',
  parameters: {
    type: 'object',
    properties: {
      nodeId: {
        type: 'string',
        description: '要更新的节点 ID'
      },
      name: {
        type: 'string',
        description: '新的节点名称'
      },
      properties: {
        type: 'object',
        description: '其他要更新的属性'
      }
    },
    required: ['nodeId']
  }
}

/**
 * 清空画布工具
 */
export const clearCanvasTool: FunctionDeclaration = {
  name: 'clearCanvas',
  description: '清空画布上的所有节点和连线，用于创建全新的流程图。会保留开始节点。',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  }
}

/**
 * 获取当前节点列表工具
 */
export const getNodesTool: FunctionDeclaration = {
  name: 'getNodes',
  description: '获取画布上所有节点的信息，包括 ID、类型、名称和位置。用于了解当前流程图的结构。',
  parameters: {
    type: 'object',
    properties: {},
    required: []
  }
}

/**
 * 所有可用工具 (Gemini 格式)
 */
export const availableTools: FunctionDeclaration[] = [
  createNodeTool,
  createFlowTool,
  createBoundaryEventTool,
  deleteNodeTool,
  updateNodeTool,
  clearCanvasTool,
  getNodesTool
]

/**
 * 获取 Claude 格式的工具定义
 * 将 Gemini Function Declarations 转换为 Claude Tool Use 格式
 */
export function getClaudeTools(): ClaudeTool[] {
  return convertFunctionsToTools(availableTools)
}

/**
 * 工具使用示例（供系统提示词参考）
 */
export const toolUsageExample = `
## 工具使用示例

创建一个简单的请假流程：

1. 首先清空画布（如果需要）：
   clearCanvas()

2. 创建开始节点：
   createNode({
     id: "StartEvent_1",
     name: "开始",
     type: "startEvent",
     x: 200,
     y: 100
   })

3. 创建用户任务：
   createNode({
     id: "UserTask_1",
     name: "提交请假申请",
     type: "userTask",
     x: 200,
     y: 250
   })

4. 创建连线连接节点：
   createFlow({
     id: "Flow_1",
     sourceId: "StartEvent_1",
     targetId: "UserTask_1"
   })

5. 继续添加更多节点和连线...
`
