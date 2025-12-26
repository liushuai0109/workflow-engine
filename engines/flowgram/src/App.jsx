import { useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './App.css';

const initialNodes = [
  {
    id: '1',
    type: 'input',
    data: { label: '开始节点' },
    position: { x: 250, y: 25 },
  },
  {
    id: '2',
    data: { label: 'LLM 处理节点' },
    position: { x: 250, y: 125 },
  },
  {
    id: '3',
    data: { label: '条件判断节点' },
    position: { x: 250, y: 225 },
  },
  {
    id: '4',
    data: { label: '成功输出' },
    position: { x: 100, y: 325 },
  },
  {
    id: '5',
    data: { label: '失败输出' },
    position: { x: 400, y: 325 },
  },
  {
    id: '6',
    type: 'output',
    data: { label: '结束节点' },
    position: { x: 250, y: 425 },
  },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', label: '输入' },
  { id: 'e2-3', source: '2', target: '3', label: '处理结果' },
  { id: 'e3-4', source: '3', target: '4', label: '成功分支' },
  { id: 'e3-5', source: '3', target: '5', label: '失败分支' },
  { id: 'e4-6', source: '4', target: '6' },
  { id: 'e5-6', source: '5', target: '6' },
];

function App() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params) => setEdges((eds) => addEdge(params, eds)),
    [setEdges],
  );

  return (
    <div style={{ width: '100vw', height: '100vh' }}>
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 4,
        background: 'white',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ margin: '0 0 10px 0', fontSize: '18px' }}>FlowGram 工作流示例</h2>
        <p style={{ margin: '5px 0', fontSize: '14px' }}>
          这是一个简单的AI工作流演示
        </p>
        <p style={{ margin: '5px 0', fontSize: '12px', color: '#666' }}>
          拖拽节点来移动，点击连接点创建新连接
        </p>
      </div>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
      >
        <Controls />
        <MiniMap />
        <Background variant="dots" gap={12} size={1} />
      </ReactFlow>
    </div>
  );
}

export default App;
