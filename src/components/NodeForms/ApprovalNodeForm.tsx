import { useId } from 'react';
import type { ApprovalNodeData, ApproverRole } from '../../types/node.types';

interface Props {
  data: ApprovalNodeData;
  onChange: (data: Partial<ApprovalNodeData>) => void;
}

const ROLES: ApproverRole[] = ['Manager', 'HRBP', 'Director'];

export function ApprovalNodeForm({ data, onChange }: Props) {
  const id = useId();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label htmlFor={`${id}-title`} style={labelStyle}>Title</label>
        <input
          id={`${id}-title`}
          value={data.title}
          onChange={e => onChange({ title: e.target.value })}
          placeholder="e.g. Manager Approval"
          style={inputStyle}
        />
      </div>

      <div>
        <label htmlFor={`${id}-role`} style={labelStyle}>Approver Role</label>
        <select
          id={`${id}-role`}
          value={data.approverRole}
          onChange={e => onChange({ approverRole: e.target.value as ApproverRole })}
          style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' }}
        >
          {ROLES.map(r => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`${id}-threshold`} style={labelStyle}>
          Auto-approve Threshold
          <span style={{ color: '#475569', fontWeight: 400, marginLeft: 4, textTransform: 'none', fontSize: 10 }}>
            (days, 0 = disabled)
          </span>
        </label>
        <input
          id={`${id}-threshold`}
          type="number"
          min={0}
          max={90}
          value={data.autoApproveThreshold}
          onChange={e => onChange({ autoApproveThreshold: Number(e.target.value) })}
          style={inputStyle}
        />
        {data.autoApproveThreshold > 0 && (
          <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>
            ⚡ Will auto-approve after {data.autoApproveThreshold} day{data.autoApproveThreshold !== 1 ? 's' : ''}
          </div>
        )}
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, color: '#94a3b8', fontWeight: 600,
  letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: '100%', background: '#0d1117', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 7, padding: '8px 10px', color: '#f1f5f9', fontSize: 13,
  outline: 'none', transition: 'border-color 0.15s',
};
