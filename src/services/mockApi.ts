import type { AutomationAction, SimulationResult, SimulationStep } from '../types/workflow.types';
import type { WorkflowNode, WorkflowEdge } from '../types/workflow.types';

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_AUTOMATIONS: AutomationAction[] = [
  { id: 'send_email',    label: 'Send Email',              params: ['to', 'subject', 'body'] },
  { id: 'generate_doc',  label: 'Generate Document',       params: ['template', 'recipient'] },
  { id: 'notify_slack',  label: 'Send Slack Notification', params: ['channel', 'message'] },
  { id: 'create_ticket', label: 'Create JIRA Ticket',      params: ['project', 'summary', 'assignee'] },
  { id: 'update_hris',   label: 'Update HRIS Record',      params: ['employee_id', 'field', 'value'] },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

function isoNow(): string {
  return new Date().toISOString();
}

function buildStepsFromGraph(nodes: WorkflowNode[], edges: WorkflowEdge[]): SimulationStep[] {
  // Topological ordering using BFS from start node
  const adj: Record<string, string[]> = {};
  for (const node of nodes) adj[node.id] = [];
  for (const edge of edges) {
    if (adj[edge.source]) adj[edge.source].push(edge.target);
  }

  const startNode = nodes.find(n => n.data.type === 'start');
  if (!startNode) return [];

  const visited = new Set<string>();
  const order: string[] = [];
  const queue: string[] = [startNode.id];

  while (queue.length > 0) {
    const id = queue.shift()!;
    if (visited.has(id)) continue;
    visited.add(id);
    order.push(id);
    for (const next of (adj[id] ?? [])) {
      if (!visited.has(next)) queue.push(next);
    }
  }

  const nodeMap: Record<string, WorkflowNode> = {};
  for (const n of nodes) nodeMap[n.id] = n;

  return order.map((id, idx): SimulationStep => {
    const node = nodeMap[id];
    const data = node?.data;
    const label = (data as { title?: string; endMessage?: string }).title
      ?? (data as { endMessage?: string }).endMessage
      ?? id;

    let status: SimulationStep['status'] = 'completed';
    let message = '';

    switch (data?.type) {
      case 'start':
        message = `Workflow "${label}" initiated.`;
        break;
      case 'task':
        status = idx === order.length - 1 ? 'pending' : 'completed';
        message = `Task assigned to "${(data as { assignee: string }).assignee || 'Unassigned'}".`;
        break;
      case 'approval':
        message = `Approval request sent to "${(data as { approverRole: string }).approverRole}".`;
        break;
      case 'automated':
        message = `Automated action "${(data as { actionId: string }).actionId || 'none'}" executed.`;
        break;
      case 'end':
        message = (data as { endMessage: string }).endMessage || 'Workflow completed.';
        break;
      default:
        message = 'Step processed.';
    }

    return {
      nodeId: id,
      nodeType: data?.type ?? 'unknown',
      nodeLabel: String(label),
      status,
      message,
      assignee: data?.type === 'task' ? (data as { assignee: string }).assignee : undefined,
      timestamp: new Date(Date.now() + idx * 1200).toISOString(),
    };
  });
}

// ─── Mock API Handlers ────────────────────────────────────────────────────────

export async function mockGetAutomations(): Promise<AutomationAction[]> {
  await delay(300);
  return MOCK_AUTOMATIONS;
}

export async function mockPostSimulate(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[]
): Promise<SimulationResult> {
  await delay(800);

  const steps = buildStepsFromGraph(nodes, edges);

  return {
    status: steps.length > 0 ? 'success' : 'failure',
    steps,
    validationErrors: [],
    executionTimeMs: 800,
  };
}
