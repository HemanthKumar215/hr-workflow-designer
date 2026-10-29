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
  return `${type}-${Date.now().toString(36)}-${nodeCounter++}`;
}

/** Visual styling for an edge label showing its branch condition. */
export function conditionLabelProps(condition: string): Partial<WorkflowEdge> {
  if (!condition) return { label: undefined };
  const isReject = condition.includes('rejected');
  const isElse = condition.trim().toLowerCase() === 'else';
  const color = isReject ? '#fda4af' : isElse ? '#94a3b8' : '#fcd34d';
  return {
    label: condition,
    labelStyle: { fill: color, fontSize: 11, fontWeight: 600, fontFamily: 'ui-monospace, monospace' },
    labelBgStyle: { fill: '#161b27', stroke: 'rgba(255,255,255,0.12)' },
    labelBgPadding: [6, 3] as [number, number],
    labelBgBorderRadius: 5,
  };
}

/** Re-apply label styling to edges loaded from a file or the server. */
export function decorateEdges(edges: WorkflowEdge[]): WorkflowEdge[] {
  return edges.map(e => {
    const cond = String((e.data as { condition?: string } | undefined)?.condition ?? '');
    return { ...e, ...conditionLabelProps(cond) };
  });
}

export interface WorkflowState {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  /** Increments whenever a whole graph is loaded, so the canvas can re-fit the view. */
  loadCount: number;
}

export interface WorkflowActions {
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  addNode: (type: NodeType, position: { x: number; y: number }) => void;
  deleteNode: (id: string) => void;
  updateNodeData: (id: string, data: Partial<NodeData>) => void;
  selectNode: (id: string | null) => void;
  selectEdge: (id: string | null) => void;
  updateEdgeCondition: (id: string, condition: string) => void;
  deleteEdge: (id: string) => void;
  clearCanvas: () => void;
  setNodesAndEdges: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
}

export function useWorkflowState(): WorkflowState & WorkflowActions {
  const [nodes, setNodes] = useState<WorkflowNode[]>([]);
  const [edges, setEdges] = useState<WorkflowEdge[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [loadCount, setLoadCount] = useState(0);

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
    if (id) setSelectedEdgeId(null);
  }, []);

  const selectEdge = useCallback((id: string | null) => {
    setSelectedEdgeId(id);
    if (id) setSelectedNodeId(null);
  }, []);

  const updateEdgeCondition = useCallback((id: string, condition: string) => {
    const trimmed = condition.trim();
    setEdges(eds =>
      eds.map(e =>
        e.id === id
          ? { ...e, data: { ...(e.data ?? {}), condition: trimmed }, ...conditionLabelProps(trimmed) }
          : e
      )
    );
  }, []);

  const deleteEdge = useCallback((id: string) => {
    setEdges(eds => eds.filter(e => e.id !== id));
    setSelectedEdgeId(prev => (prev === id ? null : prev));
  }, []);

  const clearCanvas = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  const setNodesAndEdges = useCallback(
    (newNodes: WorkflowNode[], newEdges: WorkflowEdge[]) => {
      setNodes(newNodes);
      setEdges(decorateEdges(newEdges));
      setLoadCount(c => c + 1);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    },
    []
  );

  return {
    nodes,
    edges,
    selectedNodeId,
    selectedEdgeId,
    loadCount,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    deleteNode,
    updateNodeData,
    selectNode,
    selectEdge,
    updateEdgeCondition,
    deleteEdge,
    clearCanvas,
    setNodesAndEdges,
  };
}
