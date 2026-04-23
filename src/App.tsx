import { ReactFlowProvider } from '@xyflow/react';
import { useWorkflowState } from './hooks/useWorkflowState';
import { NodeSidebar } from './components/Canvas/NodeSidebar';
import { WorkflowCanvas, setDraggedNodeType } from './components/Canvas/WorkflowCanvas';
import { NodeFormPanel } from './components/NodeForms/NodeFormPanel';
import { WorkflowSimulator } from './components/Sandbox/WorkflowSimulator';
import type { NodeType } from './types/node.types';
import type { NodeData } from './types/node.types';
import type { WorkflowNode, WorkflowEdge } from './types/workflow.types';


export default function App() {
  const {
    nodes, edges, selectedNodeId,
    onNodesChange, onEdgesChange, onConnect,
    addNode, deleteNode, updateNodeData,
    selectNode, clearCanvas, setNodesAndEdges,
  } = useWorkflowState();

  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null;

  const handleAddNode = (type: NodeType, position: { x: number; y: number }) => {
    addNode(type, position);
  };

  const handleSidebarDragStart = (type: NodeType) => {
    canvasSetDrag(type);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: '#0f1117' }}>
      {/* Top navbar */}
      <header style={{
        height: 52, background: '#0a0d14', borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', padding: '0 20px', gap: 16, flexShrink: 0,
        zIndex: 10,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 15, boxShadow: '0 2px 10px rgba(99,102,241,0.4)',
          }}>⬡</div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.01em' }}>
              HR Workflow Designer
            </div>
            <div style={{ fontSize: 10, color: '#334155', letterSpacing: '0.04em' }}>
              Tredence Analytics
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 24, background: 'rgba(255,255,255,0.08)', margin: '0 4px' }} />

        {/* Workflow name pill */}
        <div style={{
          fontSize: 12, color: '#6366f1', background: 'rgba(99,102,241,0.1)',
          border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20,
          padding: '3px 12px', fontWeight: 500,
        }}>
          Untitled Workflow
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Node count badge */}
        <div style={{ fontSize: 12, color: '#475569' }}>
          {nodes.length} node{nodes.length !== 1 ? 's' : ''} · {edges.length} connection{edges.length !== 1 ? 's' : ''}
        </div>

        {/* Help hint */}
        <div style={{
          fontSize: 11, color: '#1e293b', background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6,
          padding: '3px 10px',
        }}>
          Del key removes selected node
        </div>
      </header>

      {/* Main 3-panel layout */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left: Node palette sidebar */}
        <NodeSidebar onAddNode={handleAddNode} />

        {/* Center: Canvas */}
        <ReactFlowProvider>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <WorkflowCanvas
              nodes={nodes}
              edges={edges}
              selectedNodeId={selectedNodeId}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeSelect={selectNode}
              onAddNode={handleAddNode}
              onDeleteNode={deleteNode}
            />

            {/* Bottom toolbar / simulator */}
            <WorkflowSimulator
              nodes={nodes}
              edges={edges}
              onImport={(n, e) => setNodesAndEdges(n as WorkflowNode[], e as WorkflowEdge[])}
              onClear={clearCanvas}
            />
          </div>
        </ReactFlowProvider>

        {/* Right: Node config panel */}
        <NodeFormPanel
          selectedNode={selectedNode}
          onUpdateNode={(id, data) => updateNodeData(id, data as Partial<NodeData>)}
          onDeleteNode={deleteNode}
        />
      </div>
    </div>
  );
}
