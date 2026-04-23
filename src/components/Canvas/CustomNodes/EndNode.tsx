import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { EndNodeData } from '../../../types/node.types';

export const EndNode = memo(({ data, selected }: NodeProps) => {
  const d = data as unknown as EndNodeData;

  return (
    <div
      style={{
        background: selected
          ? 'linear-gradient(135deg,#4c0519 0%,#9f1239 100%)'
          : 'linear-gradient(135deg,#1a0009 0%,#4c0519 100%)',
        border: selected ? '2px solid #fb7185' : '1.5px solid #be123c',
        borderRadius: 12,
        minWidth: 180,
        boxShadow: selected
          ? '0 0 0 2px #fb718555, 0 8px 32px #00000066'
          : '0 4px 20px #00000044',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
    >
      <Handle type="target" position={Position.Top}
        style={{ background: '#f43f5e', border: '2px solid #1a0009', width: 10, height: 10 }} />
      <div style={{ padding: '10px 14px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'linear-gradient(135deg,#f43f5e,#be123c)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0, boxShadow: '0 2px 8px #f43f5e44'
        }}>■</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: '#fda4af', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>End</div>
          <div style={{ fontSize: 12, color: '#fff1f2', marginTop: 2, lineHeight: 1.3,
            overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
            {d?.endMessage || 'Workflow complete'}
          </div>
        </div>
      </div>
      {d?.includeSummary && (
        <div style={{ borderTop: '1px solid #be123c33', padding: '4px 14px 6px' }}>
          <span style={{
            fontSize: 10, background: '#f43f5e22', color: '#fda4af',
            padding: '1px 6px', borderRadius: 4, border: '1px solid #be123c33'
          }}>📋 Summary enabled</span>
        </div>
      )}
    </div>
  );
});
EndNode.displayName = 'EndNode';
