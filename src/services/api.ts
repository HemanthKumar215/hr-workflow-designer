import type { AutomationAction, SimulationResult, WorkflowNode, WorkflowEdge } from '../types/workflow.types';
import type {
  DemoAccount, Decision, InboxItem, InstanceDetail, InstanceSummary, Stats, User,
  WorkflowDetail, WorkflowSummary,
} from '../types/api.types';
import { mockGetAutomations, mockPostSimulate } from './mockApi';
import { isBackendEnabled, request, setToken } from './http';

export { isBackendEnabled };

// ─── Designer (works offline with the mock, or against the real engine) ──────

export async function fetchAutomations(): Promise<AutomationAction[]> {
  return isBackendEnabled ? request('/api/automations') : mockGetAutomations();
}

/** Dry-run a workflow. With the backend this uses the real engine, including branch conditions. */
export async function simulateWorkflow(
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  variables: Record<string, string> = {},
): Promise<SimulationResult> {
  if (!isBackendEnabled) return mockPostSimulate(nodes, edges);
  return request('/api/simulate', { method: 'POST', body: { nodes, edges, variables } });
}

// ─── Auth ──────────────────────────────────────────────────────────────────────

export async function login(email: string, password: string): Promise<User> {
  const res = await request<{ access_token: string; user: User }>('/api/auth/login', {
    method: 'POST', body: { email, password },
  });
  setToken(res.access_token);
  return res.user;
}

export function logout(): void {
  setToken(null);
}

export const fetchMe = () => request<User>('/api/auth/me');
export const fetchDemoAccounts = () => request<DemoAccount[]>('/api/auth/demo-accounts');

// ─── Workflows ─────────────────────────────────────────────────────────────────

export const listWorkflows = () => request<WorkflowSummary[]>('/api/workflows');
export const getWorkflow = (id: number) => request<WorkflowDetail>(`/api/workflows/${id}`);

export function saveWorkflow(
  id: number | null,
  name: string,
  nodes: WorkflowNode[],
  edges: WorkflowEdge[],
  description = '',
): Promise<WorkflowDetail> {
  const body = { name, description, graph: { nodes, edges } };
  return id == null
    ? request('/api/workflows', { method: 'POST', body })
    : request(`/api/workflows/${id}`, { method: 'PUT', body });
}

export const deleteWorkflow = (id: number) => request<void>(`/api/workflows/${id}`, { method: 'DELETE' });

// ─── Requests (workflow instances) ─────────────────────────────────────────────

export const startRequest = (workflowId: number, variables: Record<string, string>, title?: string) =>
  request<InstanceDetail>('/api/instances', {
    method: 'POST', body: { workflow_id: workflowId, variables, title: title || undefined },
  });

export const listRequests = (scope: 'mine' | 'all') => request<InstanceSummary[]>(`/api/instances?scope=${scope}`);
export const getRequest = (id: number) => request<InstanceDetail>(`/api/instances/${id}`);
export const cancelRequest = (id: number) => request<InstanceDetail>(`/api/instances/${id}/cancel`, { method: 'POST' });

export const fetchInbox = () => request<InboxItem[]>('/api/inbox');
export const decideAction = (actionId: number, decision: Decision, comment = '') =>
  request<InstanceDetail>(`/api/actions/${actionId}/decide`, { method: 'POST', body: { decision, comment } });

export const fetchStats = () => request<Stats>('/api/stats');
