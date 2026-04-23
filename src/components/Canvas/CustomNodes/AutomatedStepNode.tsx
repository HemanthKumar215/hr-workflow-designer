import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { AutomatedStepNodeData } from '../../../types/node.types';

export const AutomatedStepNode = memo(({ data, selected }: NodeProps) => {
  const d = data as unknown as AutomatedStepNodeData;

  return (
    <div
      style={{
        background: selected
          ? 'linear-gradient(135deg,#2e1065 0%,#5b21b6 100%)'
          : 'linear-gradient(135deg,#0f0726 0%,#2e1065 100%)',
        border: selected ? '2px solid #a78bfa' : '1.5px solid #7c3aed',
        borderRadius: 12,
        minWidth: 200,
        boxShadow: selected
          ? '0 0 0 2px #a78bfa55, 0 8px 32px #00000066'
          : '0 4px 20px #00000044',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
    >
      <Handle type="target" position={Position.Top}
        style={{ background: '#8b5cf6', border: '2px solid #0f0726', width: 10, height: 10 }} />
      <div style={{ padding: '10px 14px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0, boxShadow: '0 2px 8px #8b5cf644'
        }}>⚡</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: '#c4b5fd', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Automated</div>
          <div style={{ fontSize: 13, color: '#faf5ff', fontWeight: 600, marginTop: 1, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {d?.title || 'Automated Step'}
          </div>
        </div>
      </div>
      <div style={{ borderTop: '1px solid #7c3aed33', padding: '4px 14px 8px' }}>
        {d?.actionId ? (
          <div style={{ fontSize: 10, display: 'flex', gap: 4, alignItems: 'center' }}>
            <span style={{
              background: '#8b5cf622', color: '#c4b5fd', fontWeight: 600,
              padding: '1px 7px', borderRadius: 4, fontSize: 10, border: '1px solid #7c3aed33'
            }}>{d.actionId}</span>
          </div>
        ) : (
          <div style={{ fontSize: 10, color: '#7c3aed88', fontStyle: 'italic' }}>No action selected</div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom}
        style={{ background: '#8b5cf6', border: '2px solid #0f0726', width: 10, height: 10 }} />
    </div>
  );
});
AutomatedStepNode.displayName = 'AutomatedStepNode';
