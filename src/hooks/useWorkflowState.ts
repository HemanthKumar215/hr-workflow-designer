import { useState, useCallback } from 'react';
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import type { WorkflowNode, WorkflowEdge } from '../types/workflow.types';
import type { NodeType, NodeData } from '../types/node.types';
import { NODE_DEFAULTS } from '../types/node.types';

let nodeCounter = 1;

function generateId(type: NodeType): string {
  return `${type}-${nodeCounter++}`;
}

export interface WorkflowState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
}

export interface WorkflowActions {
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (type: NodeType, position: { x: number; y: number }) => void;
  deleteNode: (id: string) => void;
  updateNodeData: (id: string, data: Partial<NodeData>) => void;
  selectNode: (id: string | null) => void;
  clearCanvas: () => void;
  setNodesAndEdges: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
}

export function useWorkflowState(): WorkflowState & WorkflowActions {
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => setNodes(nds => applyNodeChanges(changes, nds) as WorkflowNode[]),
    []
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => setEdges(eds => applyEdgeChanges(changes, eds)),
    []
  );

  const onConnect = useCallback(
    (connection: Connection) =>
      setEdges(eds =>
        addEdge(
          {
            ...connection,
            animated: true,
            style: { stroke: '#6366f1', strokeWidth: 2 },
          },
          eds
        )
      ),
    []
  );

  const addNode = useCallback((type: NodeType, position: { x: number; y: number }) => {
    const id = generateId(type);
    const newNode: WorkflowNode = {
      id,
      type,
      position,
      data: { ...NODE_DEFAULTS[type] } as NodeData,
    };
    setNodes(nds => [...nds, newNode]);
    setSelectedNodeId(id);
  }, []);

  const deleteNode = useCallback((id: string) => {
    setNodes(nds => nds.filter(n => n.id !== id));
    setEdges(eds => eds.filter(e => e.source !== id && e.target !== id));
    setSelectedNodeId(prev => (prev === id ? null : prev));
  }, []);

  const updateNodeData = useCallback((id: string, data: Partial<NodeData>) => {
    setNodes(nds =>
      nds.map(n =>
        n.id === id ? { ...n, data: { ...n.data, ...data } as NodeData } : n
      )
    );
  }, []);

  const selectNode = useCallback((id: string | null) => {
    setSelectedNodeId(id);
  }, []);

  const clearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
  }, []);

  const setNodesAndEdges = useCallback(
    (newNodes: WorkflowNode[], newEdges: WorkflowEdge[]) => {
      setNodes(newNodes);
      setEdges(newEdges);
      setSelectedNodeId(null);
    },
    []
  );

  return {
    nodes,
    edges,
    selectedNodeId,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    deleteNode,
    updateNodeData,
    selectNode,
    clearCanvas,
    setNodesAndEdges,
  };
}
