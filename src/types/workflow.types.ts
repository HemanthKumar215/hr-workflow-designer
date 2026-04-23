import type { Node, Edge } from '@xyflow/react';
import type { NodeData } from './node.types';

export type WorkflowNode = Node<NodeData>;
export type WorkflowEdge = Edge;

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  metadata: {
    name: string;
    version: string;
    exportedAt: string;
  };
}

export interface SimulationStep {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  status: 'completed' | 'pending' | 'skipped' | 'error';
  message: string;
  assignee?: string;
  timestamp: string;
}

export interface SimulationResult {
  status: 'success' | 'failure' | 'partial';
  steps: SimulationStep[];
  validationErrors: ValidationError[];
  executionTimeMs: number;
}

export interface ValidationError {
  nodeId?: string;
  type: 'missing_start' | 'missing_end' | 'isolated_node' | 'cycle_detected' | 'missing_connection' | 'invalid_config';
  message: string;
  severity: 'error' | 'warning';
}

export interface AutomationAction {
  id: string;
  label: string;
  params: string[];
}
