import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { TaskNodeData } from '../../../types/node.types';

export const TaskNode = memo(({ data, selected }: NodeProps) => {
  const d = data as unknown as TaskNodeData;
  return (
    <div
      style={{
        background: selected
          ? 'linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 100%)'
          : 'linear-gradient(135deg,#0f1f3d 0%,#1e3a5f 100%)',
        border: selected ? '2px solid #60a5fa' : '1.5px solid #2563eb',
        borderRadius: 12,
        minWidth: 200,
        boxShadow: selected
          ? '0 0 0 2px #60a5fa55, 0 8px 32px #00000066'
          : '0 4px 20px #00000044',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
    >
      <Handle type="target" position={Position.Top}
        style={{ background: '#3b82f6', border: '2px solid #0f1f3d', width: 10, height: 10 }} />
      <div style={{ padding: '10px 14px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0, boxShadow: '0 2px 8px #3b82f644'
        }}>✓</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: '#93c5fd', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Task</div>
          <div style={{ fontSize: 13, color: '#eff6ff', fontWeight: 600, marginTop: 1, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {d?.title || 'New Task'}
          </div>
        </div>
      </div>
      <div style={{ borderTop: '1px solid #2563eb33', padding: '4px 14px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {d?.assignee && (
          <div style={{ fontSize: 10, color: '#93c5fd', display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ opacity: 0.6 }}>👤</span>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.assignee}</span>
          </div>
        )}
        {d?.dueDate && (
          <div style={{ fontSize: 10, color: '#93c5fd', display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{ opacity: 0.6 }}>📅</span><span>{d.dueDate}</span>
          </div>
        )}
        {!d?.assignee && !d?.dueDate && (
          <div style={{ fontSize: 10, color: '#3b82f688', fontStyle: 'italic' }}>Click to configure</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom}
        style={{ background: '#3b82f6', border: '2px solid #0f1f3d', width: 10, height: 10 }} />
    </div>
  );
});
TaskNode.displayName = 'TaskNode';
