import { useId, useState } from 'react';
import type { WorkflowEdge, WorkflowNode } from '../../types/workflow.types';
import { buttonStyle, colors, inputStyle, labelStyle } from '../ui/styles';

interface Props {
  edge: WorkflowEdge;
  nodes: WorkflowNode[];
  onChange: (condition: string) => void;
  onDelete: () => void;
}

function nodeLabel(node: WorkflowNode | undefined): string {
  if (!node) return '?';
  const d = node.data as { title?: string; endMessage?: string };
  return d.title || d.endMessage || node.id;
}

export function EdgeConditionForm({ edge, nodes, onChange, onDelete }: Props) {
  const id = useId();
  const current = String((edge.data as { condition?: string } | undefined)?.condition ?? '');
  // Local draft so typing doesn't re-render the canvas on every keystroke; commit on blur/Enter.
  const [draft, setDraft] = useState(current);

  const source = nodes.find(n => n.id === edge.source);
  const target = nodes.find(n => n.id === edge.target);
  const start = nodes.find(n => n.data.type === 'start');
  const metadata = ((start?.data as { metadata?: { key: string; value: string }[] } | undefined)?.metadata ?? [])
    .filter(m => m.key.trim());
  const fields = metadata.map(m => m.key.trim());
  // Suggest a numeric comparison for a numeric field, an equality check otherwise.
  const numeric = metadata.find(m => m.value.trim() !== '' && !Number.isNaN(Number(m.value)));
  const textual = metadata.find(m => m.value.trim() !== '' && Number.isNaN(Number(m.value)));
  const fromApproval = source?.data.type === 'approval';

  const commit = (value: string) => {
    setDraft(value);
    onChange(value);
  };

  const suggestions = [
    ...(numeric ? [`${numeric.key.trim()} > ${numeric.value.trim()}`] : []),
    ...(textual ? [`${textual.key.trim()} == "${textual.value.trim()}"`] : []),
    'else',
    ...(fromApproval ? ['outcome == "rejected"'] : []),
  ];

  return (
    <aside style={panelStyle}>
      <div style={{ padding: '16px 16px 12px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#6366f1cc,#6366f188)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
        }}>⑂</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: colors.accentSoft, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Connection
          </div>
          <div style={{ fontSize: 12, color: colors.textDim, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {nodeLabel(source)} → {nodeLabel(target)}
          </div>
        </div>
        <button onClick={onDelete} title="Delete connection" style={buttonStyle('danger')}>🗑</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label htmlFor={`${id}-cond`} style={labelStyle}>Branch condition</label>
          <input
            id={`${id}-cond`}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={() => commit(draft)}
            onKeyDown={e => { if (e.key === 'Enter') commit(draft); }}
            placeholder="Always follow this path"
            style={{ ...inputStyle, fontFamily: 'ui-monospace, monospace' }}
          />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {suggestions.map(s => (
              <button key={s} onClick={() => commit(s)} style={{ ...buttonStyle('ghost'), padding: '3px 8px', fontSize: 11, fontFamily: 'ui-monospace, monospace' }}>
                {s}
              </button>
            ))}
            {current && (
              <button onClick={() => commit('')} style={{ ...buttonStyle('ghost'), padding: '3px 8px', fontSize: 11 }}>Clear</button>
            )}
          </div>
        </div>

        <div style={{ fontSize: 12, color: colors.textMuted, lineHeight: 1.65 }}>
          <p style={{ marginBottom: 8 }}>
            Leave blank to always follow this path. Otherwise it's followed only when the condition is true for the request.
          </p>
          <p style={{ marginBottom: 8 }}>
            Use <code style={codeStyle}>else</code> for the path taken when no other condition matches.
          </p>
          {fromApproval && (
            <p style={{ marginBottom: 8 }}>
              Use <code style={codeStyle}>outcome == "rejected"</code> for what happens on rejection. Without one, a rejection ends the request.
            </p>
          )}
          <p>
            Operators: <code style={codeStyle}>== != &gt; &gt;= &lt; &lt;= in and or not</code>
          </p>
        </div>

        {fields.length > 0 && (
          <div>
            <div style={labelStyle}>Request fields</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {fields.map(f => <code key={f} style={codeStyle}>{f}</code>)}
            </div>
            <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>
              Defined as metadata keys on the Start node.
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}

const codeStyle: React.CSSProperties = {
  fontFamily: 'ui-monospace, monospace', fontSize: 11, color: '#c7d2fe',
  background: 'rgba(99,102,241,0.12)', borderRadius: 4, padding: '1px 5px',
};

const panelStyle: React.CSSProperties = {
  width: 300, background: colors.panel, borderLeft: `1px solid ${colors.border}`,
  display: 'flex', flexDirection: 'column', flexShrink: 0, overflow: 'hidden',
};
