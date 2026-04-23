import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { ApprovalNodeData } from '../../../types/node.types';

const roleColors: Record<string, string> = {
  Manager: '#f59e0b',
  HRBP: '#fb923c',
  Director: '#ef4444',
};

export const ApprovalNode = memo(({ data, selected }: NodeProps) => {
  const d = data as unknown as ApprovalNodeData;
  const roleColor = roleColors[d?.approverRole] ?? '#f59e0b';

  return (
    <div
      style={{
        background: selected
          ? 'linear-gradient(135deg,#422006 0%,#78350f 100%)'
          : 'linear-gradient(135deg,#1c0d00 0%,#422006 100%)',
        border: selected ? `2px solid ${roleColor}` : `1.5px solid #b45309`,
        borderRadius: 12,
        minWidth: 200,
        boxShadow: selected
          ? `0 0 0 2px ${roleColor}55, 0 8px 32px #00000066`
          : '0 4px 20px #00000044',
        transition: 'all 0.2s ease',
        cursor: 'pointer',
      }}
    >
      <Handle type="target" position={Position.Top}
        style={{ background: '#f59e0b', border: '2px solid #1c0d00', width: 10, height: 10 }} />
      <div style={{ padding: '10px 14px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: 8,
          background: `linear-gradient(135deg,${roleColor},#b45309)`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, flexShrink: 0, boxShadow: `0 2px 8px ${roleColor}44`
        }}>⚖</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 10, color: '#fcd34d', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Approval</div>
          <div style={{ fontSize: 13, color: '#fffbeb', fontWeight: 600, marginTop: 1, lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {d?.title || 'Approval Required'}
          </div>
        </div>
      </div>
      <div style={{ borderTop: '1px solid #b4530933', padding: '4px 14px 8px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ fontSize: 10, display: 'flex', gap: 4, alignItems: 'center' }}>
          <span style={{ color: '#fcd34d88' }}>Role:</span>
          <span style={{
            background: `${roleColor}22`, color: roleColor, fontWeight: 600,
            padding: '0 6px', borderRadius: 4, fontSize: 10
          }}>{d?.approverRole || 'Manager'}</span>
        </div>
        {(d?.autoApproveThreshold ?? 0) > 0 && (
          <div style={{ fontSize: 10, color: '#fcd34d88', display: 'flex', gap: 4 }}>
            <span>Auto-approve:</span><span style={{ color: '#fcd34d' }}>{d.autoApproveThreshold} days</span>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom}
        style={{ background: '#f59e0b', border: '2px solid #1c0d00', width: 10, height: 10 }} />
    </div>
  );
});
ApprovalNode.displayName = 'ApprovalNode';
