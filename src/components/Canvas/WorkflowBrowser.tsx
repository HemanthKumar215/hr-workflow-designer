import { useEffect, useState } from 'react';
import { deleteWorkflow, listWorkflows } from '../../services/api';
import type { WorkflowSummary } from '../../types/api.types';
import { buttonStyle, cardStyle, colors, timeAgo } from '../ui/styles';

interface Props {
  canEdit: boolean;
  currentId: number | null;
  onOpen: (id: number) => void;
  onClose: () => void;
}

export function WorkflowBrowser({ canEdit, currentId, onOpen, onClose }: Props) {
  const [items, setItems] = useState<WorkflowSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listWorkflows().then(setItems).catch(err => setError((err as Error).message));
  }, []);

  const remove = async (wf: WorkflowSummary) => {
    if (!confirm(`Delete "${wf.name}"? Its requests will be deleted too.`)) return;
    try {
      await deleteWorkflow(wf.id);
      setItems(prev => prev?.filter(w => w.id !== wf.id) ?? null);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div role="dialog" aria-label="Open workflow" style={{
        ...cardStyle, background: '#111827', width: '100%', maxWidth: 560, maxHeight: '80vh',
        display: 'flex', flexDirection: 'column', animation: 'fadeInUp 0.2s ease',
      }}>
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'center' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: colors.text }}>Saved workflows</div>
          <button onClick={onClose} aria-label="Close" style={{ marginLeft: 'auto', background: 'none', border: 'none', color: colors.textMuted, fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {error && <div style={{ color: '#fda4af', fontSize: 12, padding: 8 }}>{error}</div>}
          {!items && !error && <div style={{ color: colors.textMuted, fontSize: 13, padding: 16 }}>Loading…</div>}
          {items?.length === 0 && <div style={{ color: colors.textMuted, fontSize: 13, padding: 16 }}>No saved workflows yet.</div>}
          {items?.map(wf => (
            <div key={wf.id} style={{
              ...cardStyle, padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12,
              borderColor: wf.id === currentId ? 'rgba(99,102,241,0.5)' : colors.border,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                  {wf.name} <span style={{ fontSize: 11, color: colors.textMuted, fontWeight: 500 }}>v{wf.version}</span>
                </div>
                {wf.description && <div style={{ fontSize: 12, color: colors.textDim, marginTop: 2 }}>{wf.description}</div>}
                <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                  {wf.node_count} nodes · updated {timeAgo(wf.updated_at)}
                </div>
              </div>
              <button onClick={() => onOpen(wf.id)} style={buttonStyle('primary')}>Open</button>
              {canEdit && <button onClick={() => remove(wf)} aria-label={`Delete ${wf.name}`} style={buttonStyle('danger')}>🗑</button>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
