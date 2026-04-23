import type { AutomationAction, SimulationResult, WorkflowNode, WorkflowEdge } from '../types/workflow.types';
import { mockGetAutomations, mockPostSimulate } from './mockApi';

/**
 * Fetch available automation actions.
 * Swap mockGetAutomations() with a real fetch() call to connect to a real backend.
 */
export async function fetchAutomations(): Promise<AutomationAction[]> {
  return mockGetAutomations();
}

/**
 * Simulate / validate a workflow graph.
 * Returns a step-by-step execution result.
 */
export async function simulateWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): Promise<SimulationResult> {
  return mockPostSimulate(nodes, edges);
}
