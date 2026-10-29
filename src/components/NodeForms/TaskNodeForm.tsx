import { useId } from 'react';
import type { TaskNodeData } from '../../types/node.types';

interface Props {
  data: TaskNodeData;
  onChange: (data: Partial<TaskNodeData>) => void;
}

function generateKvId() {
  return `kv-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function TaskNodeForm({ data, onChange }: Props) {
  const id = useId();

  const addCustomField = () => {
    onChange({ customFields: [...(data.customFields ?? []), { id: generateKvId(), key: '', value: '' }] });
  };

  const removeCustomField = (kvId: string) => {
    onChange({ customFields: data.customFields.filter(f => f.id !== kvId) });
  };

  const updateCustomField = (kvId: string, field: 'key' | 'value', val: string) => {
    onChange({
      customFields: data.customFields.map(f => f.id === kvId ? { ...f, [field]: val } : f),
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label htmlFor={`${id}-title`} style={labelStyle}>
          Title <span style={{ color: '#f87171' }}>*</span>
        </label>
        <input
          id={`${id}-title`}
          value={data.title}
          onChange={e => onChange({ title: e.target.value })}
          placeholder="e.g. Collect Documents"
          style={inputStyle}
          required
        />
        {!data.title && <div style={errorStyle}>Title is required</div>}
      </div>

      <div>
        <label htmlFor={`${id}-desc`} style={labelStyle}>Description</label>
        <textarea
          id={`${id}-desc`}
          value={data.description}
          onChange={e => onChange({ description: e.target.value })}
          placeholder="What does this task involve?"
          rows={3}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }}
        />
      </div>

      <div>
        <label htmlFor={`${id}-assignee`} style={labelStyle}>Assignee</label>
        <input
          id={`${id}-assignee`}
          value={data.assignee}
          onChange={e => onChange({ assignee: e.target.value })}
          placeholder="Email, name, role (hrbp) or blank = requester"
          style={inputStyle}
        />
      </div>

      <div>
        <label htmlFor={`${id}-due`} style={labelStyle}>Due Date</label>
        <input
          id={`${id}-due`}
          type="date"
          value={data.dueDate}
          onChange={e => onChange({ dueDate: e.target.value })}
          style={{ ...inputStyle, colorScheme: 'dark' }}
        />
      </div>

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={labelStyle}>Custom Fields</span>
          <button onClick={addCustomField} style={addBtnStyle}>+ Add</button>
        </div>
        {data.customFields?.map(f => (
          <div key={f.id} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
            <input
              value={f.key}
              onChange={e => updateCustomField(f.id, 'key', e.target.value)}
              placeholder="Field name"
              style={{ ...inputStyle, flex: 1 }}
            />
            <input
              value={f.value}
              onChange={e => updateCustomField(f.id, 'value', e.target.value)}
              placeholder="Value"
              style={{ ...inputStyle, flex: 1 }}
            />
            <button onClick={() => removeCustomField(f.id)} style={removeBtnStyle}>✕</button>
          </div>
        ))}
        {(!data.customFields || data.customFields.length === 0) && (
          <div style={{ fontSize: 11, color: '#334155', fontStyle: 'italic' }}>No custom fields</div>
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
const errorStyle: React.CSSProperties = {
  fontSize: 11, color: '#f87171', marginTop: 4,
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
