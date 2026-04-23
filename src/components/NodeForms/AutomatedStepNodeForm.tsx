import { useId } from 'react';
import type { AutomatedStepNodeData } from '../../types/node.types';
import { useAutomations } from '../../hooks/useAutomations';

interface Props {
  data: AutomatedStepNodeData;
  onChange: (data: Partial<AutomatedStepNodeData>) => void;
}

export function AutomatedStepNodeForm({ data, onChange }: Props) {
  const id = useId();
  const { automations, loading, getActionById } = useAutomations();
  const selectedAction = getActionById(data.actionId);

  const handleActionChange = (actionId: string) => {
    // Reset params when action changes
    onChange({ actionId, actionParams: {} });
  };

  const handleParamChange = (param: string, value: string) => {
    onChange({
      actionParams: { ...(data.actionParams ?? {}), [param]: value },
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label htmlFor={`${id}-title`} style={labelStyle}>Title</label>
        <input
          id={`${id}-title`}
          value={data.title}
          onChange={e => onChange({ title: e.target.value })}
          placeholder="e.g. Send Welcome Email"
          style={inputStyle}
        />
      </div>

      <div>
        <label htmlFor={`${id}-action`} style={labelStyle}>Action</label>
        {loading ? (
          <div style={{ fontSize: 12, color: '#475569', padding: '8px 0' }}>Loading actions…</div>
        ) : (
          <select
            id={`${id}-action`}
            value={data.actionId}
            onChange={e => handleActionChange(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer', appearance: 'none' }}
          >
            <option value="">— Select an action —</option>
            {automations.map(a => (
              <option key={a.id} value={a.id}>{a.label}</option>
            ))}
          </select>
        )}
      </div>

      {selectedAction && selectedAction.params.length > 0 && (
        <div>
          <div style={{ ...labelStyle, display: 'block', marginBottom: 8 }}>Action Parameters</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedAction.params.map(param => (
              <div key={param}>
                <label style={{ ...labelStyle, textTransform: 'none', fontSize: 11 }}>{param}</label>
                <input
                  value={data.actionParams?.[param] ?? ''}
                  onChange={e => handleParamChange(param, e.target.value)}
                  placeholder={`Enter ${param}…`}
                  style={inputStyle}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {!data.actionId && (
        <div style={{
          background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.15)',
          borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#7c3aed',
        }}>
          ⚡ Select an action to configure its parameters
        </div>
      )}
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
