import type { WorkflowEdge, WorkflowNode } from './workflow.types';

export type Role = 'admin' | 'hrbp' | 'manager' | 'director' | 'employee';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: Role;
  department: string;
}

export interface DemoAccount {
  email: string;
  full_name: string;
  role: Role;
  password: string;
}

export interface WorkflowSummary {
  id: number;
  name: string;
  description: string;
  version: number;
  updated_at: string;
  node_count: number;
  form_fields: string[];
}

export interface WorkflowDetail extends WorkflowSummary {
  graph: { nodes: WorkflowNode[]; edges: WorkflowEdge[] };
  created_at: string;
}

export type InstanceStatus = 'running' | 'waiting' | 'completed' | 'rejected' | 'failed';

export interface InstanceSummary {
  id: number;
  workflow_id: number;
  workflow_version: number;
  title: string;
  status: InstanceStatus;
  started_by: User;
  variables: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface PendingAction {
  id: number;
  instance_id: number;
  node_id: string;
  title: string;
  kind: 'task' | 'approval';
  status: 'open' | 'completed' | 'approved' | 'rejected' | 'cancelled';
  assignee_role: Role | null;
  assignee_user: User | null;
  decided_by: User | null;
  comment: string;
  due_at: string | null;
  auto_approve_on_due: boolean;
  created_at: string;
  decided_at: string | null;
}

export interface AuditEvent {
  id: number;
  node_id: string | null;
  node_type: string | null;
  event_type: string;
  message: string;
  actor: User | null;
  data: Record<string, unknown>;
  created_at: string;
}

export interface InstanceDetail extends InstanceSummary {
  graph: { nodes: WorkflowNode[]; edges: WorkflowEdge[] };
  actions: PendingAction[];
  events: AuditEvent[];
}

export interface InboxItem extends PendingAction {
  instance: InstanceSummary;
}

export interface Stats {
  total: number;
  by_status: Partial<Record<InstanceStatus, number>>;
  open_actions: number;
  avg_completion_hours: number | null;
  by_workflow: { workflow_id: number; name: string; requests: number }[];
}

export type Decision = 'approve' | 'reject' | 'complete';
