import { useCallback, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  type NodeMouseHandler,
  type ReactFlowInstance,
} from '@xyflow/react';
import type { WorkflowNode, WorkflowEdge } from '../../types/workflow.types';
import type { NodeType } from '../../types/node.types';
import { StartNode } from './CustomNodes/StartNode';
import { TaskNode } from './CustomNodes/TaskNode';
import { ApprovalNode } from './CustomNodes/ApprovalNode';
import { AutomatedStepNode } from './CustomNodes/AutomatedStepNode';
import { EndNode } from './CustomNodes/EndNode';
import type { NodeChange, EdgeChange, Connection } from '@xyflow/react';
import { takeDraggedNodeType } from '../../utils/dragState';

const nodeTypes = {
  start: StartNode,
  task: TaskNode,
  approval: ApprovalNode,
  automated: AutomatedStepNode,
  end: EndNode,
};

interface WorkflowCanvasProps {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onNodeSelect: (id: string | null) => void;
  onAddNode: (type: NodeType, position: { x: number; y: number }) => void;
  onDeleteNode: (id: string) => void;
}


export function WorkflowCanvas({
  nodes,
  edges,
  selectedNodeId,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeSelect,
  onAddNode,
  onDeleteNode,
}: WorkflowCanvasProps) {
  const rfInstance = useRef<ReactFlowInstance<WorkflowNode, WorkflowEdge> | null>(null);

  const onNodeClick: NodeMouseHandler = useCallback(
    (_evt, node) => {
      onNodeSelect(node.id);
    },
    [onNodeSelect]
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  // Handle drop from sidebar
  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const type = takeDraggedNodeType();
      if (!type || !rfInstance.current) return;
      const bounds = (event.currentTarget as HTMLDivElement).getBoundingClientRect();
      const position = rfInstance.current.screenToFlowPosition({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });
      onAddNode(type, position);
    },
    [onAddNode]
  );

  const onDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Delete key handler
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedNodeId) {
        onDeleteNode(selectedNodeId);
      }
    },
    [selectedNodeId, onDeleteNode]
  );

  return (
    <div
      style={{ flex: 1, position: 'relative', background: '#0f1117' }}
      onDrop={onDrop}
      onDragOver={onDragOver}
      onKeyDown={onKeyDown}
      tabIndex={0}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        onInit={instance => { rfInstance.current = instance; }}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        deleteKeyCode={null} // we handle manually above
        proOptions={{ hideAttribution: true }}
        defaultEdgeOptions={{
          animated: true,
          style: { stroke: '#6366f1', strokeWidth: 2 },
        }}
        style={{ background: 'transparent' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.2}
          color="rgba(99,102,241,0.2)"
        />
        <Controls
          style={{ bottom: 16, left: 16 }}
          showFitView
          showInteractive
        />
        <MiniMap
          style={{ bottom: 16, right: 16, background: '#161b27' }}
          nodeColor={(node) => {
            const t = (node.data as { type?: string }).type;
            const map: Record<string, string> = {
              start: '#22c55e', task: '#3b82f6', approval: '#f59e0b',
              automated: '#8b5cf6', end: '#f43f5e',
            };
            return map[t ?? ''] ?? '#6366f1';
          }}
          maskColor="rgba(15,17,23,0.6)"
        />
      </ReactFlow>

      {/* Empty state hint */}
      {nodes.length === 0 && (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
          gap: 12,
        }}>
          <div style={{ fontSize: 48, opacity: 0.12 }}>⊕</div>
          <div style={{ fontSize: 16, color: '#334155', fontWeight: 500 }}>
            Drag nodes from the sidebar to get started
          </div>
          <div style={{ fontSize: 12, color: '#1e293b' }}>
            or click a node type to place it automatically
          </div>
        </div>
      )}
    </div>
  );
}
