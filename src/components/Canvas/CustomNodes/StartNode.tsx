import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { StartNodeData } from '../../../types/node.types';

export const StartNode = memo(({ data, selected }: NodeProps) => {
  const d = data as unknown as StartNodeData;
  return (
    <div
      style={{
        background: selected
          ? 'linear-gradient(135deg,#14532d 0%,#166534 100%)'
          : 'linear-gradient(135deg,#052e16 0%,#14532d 100%)',
        border: selected ? '2px solid #4ade80' : '1.5px solid #16a34a',
        borderRadius: 12,
        minWidth: 180,
        boxShadow: selected
          ? '0 0 0 2px #4ade8055, 0 8px 32px #00000066'
          : '0 4px 20px #00000044',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
    >
      <div style={{ padding: '10px 14px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg,#22c55e,#16a34a)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0,
          boxShadow: '0 2px 8px #22c55e44'
        }}>▶</div>
        <div>
          <div style={{ fontSize: 10, color: '#86efac', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Start</div>
          <div style={{ fontSize: 13, color: '#f0fdf4', fontWeight: 600, marginTop: 1, lineHeight: 1.2 }}>
            {d?.title || 'Workflow Start'}
          </div>
        </div>
      </div>
      {d?.metadata && d.metadata.length > 0 && (
        <div style={{ borderTop: '1px solid #16a34a33', padding: '4px 14px 8px' }}>
          {d.metadata.slice(0, 2).map((m) => (
            <div key={m.id} style={{ fontSize: 10, color: '#86efac', display: 'flex', gap: 4 }}>
              <span style={{ opacity: 0.6 }}>{m.key}:</span>
              <span>{m.value}</span>
            </div>
          ))}
        </div>
      )}
      <Handle type="source" position={Position.Bottom}
        style={{ background: '#22c55e', border: '2px solid #052e16', width: 10, height: 10 }} />
    </div>
  );
});
StartNode.displayName = 'StartNode';
