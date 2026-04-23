import type { WorkflowGraph, WorkflowNode, WorkflowEdge } from '../types/workflow.types';

/**
 * Serializes the current workflow graph to a portable JSON object.
 */
export function serializeWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  name = 'My Workflow'
): WorkflowGraph {
  return {
    nodes,
    edges,
    metadata: {
      name,
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
    },
  };
}

/**
 * Downloads the workflow as a JSON file.
 */
export function exportWorkflowAsJSON(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  name = 'workflow'
): void {
  const graph = serializeWorkflow(nodes, edges, name);
  const blob = new Blob([JSON.stringify(graph, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${name.replace(/\s+/g, '_').toLowerCase()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Parses an imported JSON file and returns nodes + edges.
 */
export async function importWorkflowFromFile(
  file: File
): Promise<{ nodes: WorkflowNode[]; edges: WorkflowEdge[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const graph: WorkflowGraph = JSON.parse(e.target?.result as string);
        resolve({ nodes: graph.nodes, edges: graph.edges });
      } catch {
        reject(new Error('Invalid workflow file format.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsText(file);
  });
}
