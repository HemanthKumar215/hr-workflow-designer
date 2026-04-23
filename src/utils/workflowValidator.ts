import type { WorkflowNode, WorkflowEdge, ValidationError } from '../types/workflow.types';

/**
 * Validates a workflow graph and returns all errors/warnings.
 */
export function validateWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // 1. Must have exactly one Start node
  const startNodes = nodes.filter(n => n.data.type === 'start');
  if (startNodes.length === 0) {
    errors.push({
      type: 'missing_start',
      message: 'Workflow must have a Start node.',
      severity: 'error',
    });
  } else if (startNodes.length > 1) {
    errors.push({
      type: 'missing_start',
      message: 'Workflow must have exactly one Start node.',
      severity: 'error',
    });
  }

  // 2. Must have at least one End node
  const endNodes = nodes.filter(n => n.data.type === 'end');
  if (endNodes.length === 0) {
    errors.push({
      type: 'missing_end',
      message: 'Workflow must have at least one End node.',
      severity: 'error',
    });
  }

  // 3. Isolated nodes (no edges)
  const connectedNodeIds = new Set<string>();
  for (const edge of edges) {
    connectedNodeIds.add(edge.source);
    connectedNodeIds.add(edge.target);
  }
  const nonStartEnd = nodes.filter(n => n.data.type !== 'start' && n.data.type !== 'end');
  for (const node of nonStartEnd) {
    if (!connectedNodeIds.has(node.id)) {
      errors.push({
        nodeId: node.id,
        type: 'isolated_node',
        message: `Node "${(node.data as { title?: string }).title ?? node.id}" is isolated (no connections).`,
        severity: 'warning',
      });
    }
  }

  // 4. Start node should have outgoing edges
  for (const sn of startNodes) {
    const hasOutgoing = edges.some(e => e.source === sn.id);
    if (!hasOutgoing) {
      errors.push({
        nodeId: sn.id,
        type: 'missing_connection',
        message: 'Start node has no outgoing connections.',
        severity: 'error',
      });
    }
  }

  // 5. End node should have incoming edges
  for (const en of endNodes) {
    const hasIncoming = edges.some(e => e.target === en.id);
    if (!hasIncoming) {
      errors.push({
        nodeId: en.id,
        type: 'missing_connection',
        message: 'End node has no incoming connections.',
        severity: 'warning',
      });
    }
  }

  // 6. Cycle detection (DFS)
  const adj: Record<string, string[]> = {};
  for (const node of nodes) adj[node.id] = [];
  for (const edge of edges) {
    if (adj[edge.source]) adj[edge.source].push(edge.target);
  }

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color: Record<string, number> = {};
  for (const node of nodes) color[node.id] = WHITE;

  let hasCycle = false;

  function dfs(u: string): void {
    if (hasCycle) return;
    color[u] = GRAY;
    for (const v of (adj[u] ?? [])) {
      if (color[v] === GRAY) {
        hasCycle = true;
        return;
      }
      if (color[v] === WHITE) dfs(v);
    }
    color[u] = BLACK;
  }

  for (const node of nodes) {
    if (color[node.id] === WHITE) dfs(node.id);
  }

  if (hasCycle) {
    errors.push({
      type: 'cycle_detected',
      message: 'Workflow contains a cycle. Execution loops are not allowed.',
      severity: 'error',
    });
  }

  return errors;
}
