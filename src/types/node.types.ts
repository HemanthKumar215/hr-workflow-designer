export type NodeType = 'start' | 'task' | 'approval' | 'automated' | 'end';

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
}

export interface StartNodeData {
  type: 'start';
  title: string;
  metadata: KeyValuePair[];
}

export interface TaskNodeData {
  type: 'task';
  title: string;
  description: string;
  assignee: string;
  dueDate: string;
  customFields: KeyValuePair[];
}

export type ApproverRole = 'Manager' | 'HRBP' | 'Director';

export interface ApprovalNodeData {
  type: 'approval';
  title: string;
  approverRole: ApproverRole;
  autoApproveThreshold: number;
}

export interface AutomatedStepNodeData {
  type: 'automated';
  title: string;
  actionId: string;
  actionParams: Record<string, string>;
}

export interface EndNodeData {
  type: 'end';
  endMessage: string;
  includeSummary: boolean;
}

export type NodeData =
  | StartNodeData
  | TaskNodeData
  | ApprovalNodeData
  | AutomatedStepNodeData
  | EndNodeData;

export const NODE_DEFAULTS: Record<NodeType, NodeData> = {
  start: {
    type: 'start',
    title: 'Workflow Start',
    metadata: [],
  },
  task: {
    type: 'task',
    title: 'New Task',
    description: '',
    assignee: '',
    dueDate: '',
    customFields: [],
  },
  approval: {
    type: 'approval',
    title: 'Approval Required',
    approverRole: 'Manager',
    autoApproveThreshold: 0,
  },
  automated: {
    type: 'automated',
    title: 'Automated Step',
    actionId: '',
    actionParams: {},
  },
  end: {
    type: 'end',
    endMessage: 'Workflow completed successfully.',
    includeSummary: true,
  },
};
