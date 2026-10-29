import { useId } from 'react';
import type { StartNodeData } from '../../types/node.types';

interface Props {
  data: StartNodeData;
  onChange: (data: Partial<StartNodeData>) => void;
}

function generateKvId() {
  return `kv-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function StartNodeForm({ data, onChange }: Props) {
  const id = useId();

  const addMetadata = () => {
    onChange({ metadata: [...(data.metadata ?? []), { id: generateKvId(), key: '', value: '' }] });
  };

  const removeMetadata = (kvId: string) => {
    onChange({ metadata: data.metadata.filter(m => m.id !== kvId) });
  };

  const updateMetadata = (kvId: string, field: 'key' | 'value', val: string) => {
    onChange({
      metadata: data.metadata.map(m => m.id === kvId ? { ...m, [field]: val } : m),
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label htmlFor={`${id}-title`} style={labelStyle}>Title</label>
        <input
          id={`${id}-title`}
          value={data.title}
          onChange={e => onChange({ title: e.target.value })}
          placeholder="Workflow Start"
          style={inputStyle}
        />
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={labelStyle}>Metadata (optional)</span>
          <button onClick={addMetadata} style={addBtnStyle}>+ Add</button>
        </div>
        {data.metadata?.map(m => (
          <div key={m.id} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input
              value={m.key}
              onChange={e => updateMetadata(m.id, 'key', e.target.value)}
              placeholder="Key"
              style={{ ...inputStyle, flex: 1 }}
            />
            <input
              value={m.value}
              onChange={e => updateMetadata(m.id, 'value', e.target.value)}
              placeholder="Value"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button onClick={() => removeMetadata(m.id)} style={removeBtnStyle}>✕</button>
          </div>
        ))}
        {(!data.metadata || data.metadata.length === 0) && (
          <div style={{ fontSize: 11, color: '#334155', fontStyle: 'italic' }}>No metadata added</div>
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
const addBtnStyle: React.CSSProperties = {
  background: 'rgba(99,102,241,0.15)', border: '1px solid rgba(99,102,241,0.3)',
  borderRadius: 6, padding: '3px 10px', color: '#818cf8', fontSize: 11,
  cursor: 'pointer', fontWeight: 600,
};
const removeBtnStyle: React.CSSProperties = {
  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
  borderRadius: 6, padding: '4px 8px', color: '#f87171', fontSize: 11,
  cursor: 'pointer', flexShrink: 0,
};
