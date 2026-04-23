import type { WorkflowNode } from '../../types/workflow.types';
import type { NodeData } from '../../types/node.types';
import { StartNodeForm } from './StartNodeForm';
import { TaskNodeForm } from './TaskNodeForm';
import { ApprovalNodeForm } from './ApprovalNodeForm';
import { AutomatedStepNodeForm } from './AutomatedStepNodeForm';
import { EndNodeForm } from './EndNodeForm';
import type { StartNodeData, TaskNodeData, ApprovalNodeData, AutomatedStepNodeData, EndNodeData } from '../../types/node.types';

interface Props {
  selectedNode: WorkflowNode | null;
  onUpdateNode: (id: string, data: Partial<NodeData>) => void;
  onDeleteNode: (id: string) => void;
}

const nodeTypeLabel: Record<string, string> = {
  start: 'Start Node',
  task: 'Task Node',
  approval: 'Approval Node',
  automated: 'Automated Step',
  end: 'End Node',
};

const nodeTypeColor: Record<string, string> = {
  start: '#22c55e',
  task: '#3b82f6',
  approval: '#f59e0b',
  automated: '#8b5cf6',
  end: '#f43f5e',
};

const nodeTypeIcon: Record<string, string> = {
  start: '▶', task: '✓', approval: '⚖', automated: '⚡', end: '■',
};

export function NodeFormPanel({ selectedNode, onUpdateNode, onDeleteNode }: Props) {
  if (!selectedNode) {
    return (
      <aside style={panelStyle}>
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 12, padding: 24,
        }}>
          <div style={{ fontSize: 40, opacity: 0.12 }}>⚙</div>
          <div style={{ fontSize: 13, color: '#334155', textAlign: 'center', lineHeight: 1.6 }}>
            Select a node on the canvas to configure its properties
          </div>
        </div>
      </aside>
    );
  }

  const { id, data } = selectedNode;
  const type = data.type;
  const color = nodeTypeColor[type] ?? '#6366f1';
  const icon = nodeTypeIcon[type] ?? '?';
  const label = nodeTypeLabel[type] ?? type;

  const handleChange = (patch: Partial<NodeData>) => {
    onUpdateNode(id, patch);
  };

  return (
    <aside style={panelStyle}>
      {/* Node header */}
      <div style={{
        padding: '16px 16px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', gap: 10,
        flexShrink: 0,
      }}>
        <div style={{
          width: 34, height: 34, borderRadius: type === 'start' || type === 'end' ? '50%' : 9,
          background: `linear-gradient(135deg,${color}cc,${color}88)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, flexShrink: 0,
          boxShadow: `0 2px 10px ${color}44`,
        }}>
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {label}
          </div>
          <div style={{ fontSize: 11, color: '#334155', fontFamily: 'monospace', marginTop: 2 }}>
            {id}
          </div>
        </div>
        <button
          onClick={() => onDeleteNode(id)}
          title="Delete node"
          style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 7, padding: '5px 9px', color: '#f87171', fontSize: 13,
            cursor: 'pointer', flexShrink: 0, transition: 'background 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.2)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'rgba(239,68,68,0.1)')}
        >
          🗑
        </button>
      </div>

      {/* Form body */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {type === 'start' && (
          <StartNodeForm
            data={data as StartNodeData}
            onChange={handleChange}
          />
        )}
        {type === 'task' && (
          <TaskNodeForm
            data={data as TaskNodeData}
            onChange={handleChange}
          />
        )}
        {type === 'approval' && (
          <ApprovalNodeForm
            data={data as ApprovalNodeData}
            onChange={handleChange}
          />
        )}
        {type === 'automated' && (
          <AutomatedStepNodeForm
            data={data as AutomatedStepNodeData}
            onChange={handleChange}
          />
        )}
        {type === 'end' && (
          <EndNodeForm
            data={data as EndNodeData}
            onChange={handleChange}
          />
        )}
      </div>
    </aside>
  );
}

const panelStyle: React.CSSProperties = {
  width: 300,
  background: '#0d1117',
  borderLeft: '1px solid rgba(255,255,255,0.07)',
  display: 'flex',
  flexDirection: 'column',
  flexShrink: 0,
  overflow: 'hidden',
};
