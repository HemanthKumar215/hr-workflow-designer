import { useId } from 'react';
import type { EndNodeData } from '../../types/node.types';

interface Props {
  data: EndNodeData;
  onChange: (data: Partial<EndNodeData>) => void;
}

export function EndNodeForm({ data, onChange }: Props) {
  const id = useId();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label htmlFor={`${id}-msg`} style={labelStyle}>End Message</label>
        <textarea
          id={`${id}-msg`}
          value={data.endMessage}
          onChange={e => onChange({ endMessage: e.target.value })}
          placeholder="Workflow completed successfully."
          rows={4}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <label htmlFor={`${id}-summary`} style={{ ...labelStyle, marginBottom: 2, cursor: 'pointer' }}>
            Include Summary
          </label>
          <div style={{ fontSize: 11, color: '#334155' }}>
            Attach an execution report on completion
          </div>
        </div>
        <label htmlFor={`${id}-summary`} style={{ cursor: 'pointer' }}>
          <div
            style={{
              width: 44, height: 24, borderRadius: 12,
              background: data.includeSummary
                ? 'linear-gradient(135deg,#6366f1,#4f46e5)'
                : 'rgba(255,255,255,0.08)',
              border: data.includeSummary ? '1px solid #6366f1' : '1px solid rgba(255,255,255,0.1)',
              position: 'relative', transition: 'all 0.2s ease', flexShrink: 0,
            }}
          >
            <div style={{
              width: 18, height: 18, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 2,
              left: data.includeSummary ? 22 : 2,
              transition: 'left 0.2s ease',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
            }} />
          </div>
          <input
            id={`${id}-summary`}
            type="checkbox"
            checked={data.includeSummary}
            onChange={e => onChange({ includeSummary: e.target.checked })}
            style={{ display: 'none' }}
          />
        </label>
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
