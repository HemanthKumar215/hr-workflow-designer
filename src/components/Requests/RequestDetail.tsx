import { useEffect, useState } from 'react';
import { cancelRequest, getRequest } from '../../services/api';
import type { InstanceDetail, User } from '../../types/api.types';
import { ActionControls } from './ActionControls';
import { WorkflowProgress } from './WorkflowProgress';
import { buttonStyle, cardStyle, colors, formatDate, labelStyle, pillStyle, roleLabels, statusColors } from '../ui/styles';

interface Props {
  instanceId: number;
  user: User;
  actionableIds: Set<number>;
  onChanged: () => void;
  onClose: () => void;
}

const eventIcon: Record<string, string> = {
  started: '📨', node_completed: '●', automation_run: '⚡', task_assigned: '📋', approval_requested: '⚖',
  approval_approved: '✓', approval_rejected: '✕', task_completed: '✓', branch_taken: '⑂', completed: '🏁',
  rejected: '⛔', failed: '⚠', cancelled: '⊘', node_skipped: '⊘', branch_ended: '■',
};

const HIDDEN_VARS = new Set(['requester_name', 'requester_email', 'requester_department']);

export function RequestDetail({ instanceId, user, actionableIds, onChanged, onClose }: Props) {
  const [inst, setInst] = useState<InstanceDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getRequest(instanceId)
      .then(d => { if (!cancelled) { setInst(d); setError(null); } })
      .catch(err => { if (!cancelled) setError((err as Error).message); });
    return () => { cancelled = true; };
  }, [instanceId]);

  const updated = (d: InstanceDetail) => {
    setInst(d);
    onChanged();
  };

  const cancel = async () => {
    if (!inst || !confirm('Cancel this request?')) return;
    try { updated(await cancelRequest(inst.id)); } catch (err) { setError((err as Error).message); }
  };

  const active = inst && (inst.status === 'waiting' || inst.status === 'running');
  const canCancel = active && (inst.started_by.id === user.id || user.role === 'admin');
  const vars = inst ? Object.entries(inst.variables).filter(([k]) => !HIDDEN_VARS.has(k)) : [];

  return (
    <aside style={{
      width: 460, maxWidth: '100%', flexShrink: 0, background: colors.panel, borderLeft: `1px solid ${colors.border}`,
      display: 'flex', flexDirection: 'column', overflow: 'hidden', animation: 'fadeInUp 0.2s ease',
    }}>
      <div style={{ padding: '14px 16px', borderBottom: `1px solid ${colors.border}`, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 11, color: colors.textMuted }}>Request #{instanceId}</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: colors.text, marginTop: 2 }}>{inst?.title ?? 'Loading…'}</div>
          {inst && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 6, flexWrap: 'wrap' }}>
              <span style={pillStyle(statusColors[inst.status])}>{inst.status}</span>
              <span style={{ fontSize: 11, color: colors.textMuted }}>
                by {inst.started_by.full_name} · {formatDate(inst.created_at)} · workflow v{inst.workflow_version}
              </span>
            </div>
          )}
        </div>
        <button onClick={onClose} aria-label="Close details" style={{ background: 'none', border: 'none', color: colors.textMuted, fontSize: 18, cursor: 'pointer' }}>✕</button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'grid', gap: 18, alignContent: 'start' }}>
        {error && <div role="alert" style={{ fontSize: 12, color: '#fda4af' }}>{error}</div>}
        {inst && (
          <>
            <WorkflowProgress instance={inst} />

            {inst.actions.filter(a => a.status === 'open' && actionableIds.has(a.id)).map(a => (
              <div key={a.id} style={{ ...cardStyle, padding: 12, borderColor: 'rgba(245,158,11,0.35)' }}>
                <div style={{ fontSize: 12, color: colors.amber, fontWeight: 700, marginBottom: 8 }}>
                  Waiting on you: {a.title}
                </div>
                <ActionControls action={a} onDone={updated} onError={setError} />
              </div>
            ))}

            {vars.length > 0 && (
              <div>
                <div style={labelStyle}>Request details</div>
                <div style={{ ...cardStyle, padding: '4px 12px' }}>
                  {vars.map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: 12, padding: '6px 0', fontSize: 12, borderBottom: `1px solid ${colors.border}` }}>
                      <span style={{ color: colors.textMuted, minWidth: 110, fontFamily: 'ui-monospace, monospace' }}>{k}</span>
                      <span style={{ color: colors.text, wordBreak: 'break-word' }}>{String(v) || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <div style={labelStyle}>Steps</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {inst.actions.length === 0 && <div style={{ fontSize: 12, color: colors.textMuted }}>No human steps.</div>}
                {inst.actions.map(a => (
                  <div key={a.id} style={{ ...cardStyle, padding: '8px 12px', display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span>{a.kind === 'approval' ? '⚖' : '📋'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: colors.text }}>{a.title}</div>
                      <div style={{ fontSize: 11, color: colors.textMuted }}>
                        {a.decided_by ? `${a.decided_by.full_name} · ${formatDate(a.decided_at)}`
                          : a.assignee_user ? `Assigned to ${a.assignee_user.full_name}`
                          : a.assignee_role ? `Any ${roleLabels[a.assignee_role]}` : ''}
                        {a.status === 'open' && a.auto_approve_on_due && a.due_at && ` · auto-approves ${formatDate(a.due_at)}`}
                      </div>
                      {a.comment && <div style={{ fontSize: 11, color: colors.textDim, marginTop: 2 }}>“{a.comment}”</div>}
                    </div>
                    <span style={pillStyle(statusColors[a.status] ?? colors.textMuted)}>{a.status}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div style={labelStyle}>Audit trail</div>
              <ol style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 0 }}>
                {inst.events.map((ev, i) => (
                  <li key={ev.id} style={{ display: 'flex', gap: 10, position: 'relative', paddingBottom: 10 }}>
                    {i < inst.events.length - 1 && (
                      <div style={{ position: 'absolute', left: 11, top: 22, bottom: 0, width: 1, background: colors.border }} />
                    )}
                    <div style={{
                      width: 23, height: 23, borderRadius: '50%', background: colors.card, border: `1px solid ${colors.borderStrong}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, flexShrink: 0, color: colors.textDim,
                    }}>{eventIcon[ev.event_type] ?? '●'}</div>
                    <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
                      <div style={{ fontSize: 12, color: colors.text, lineHeight: 1.5 }}>{ev.message}</div>
                      <div style={{ fontSize: 10, color: colors.textMuted }}>{formatDate(ev.created_at)}</div>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {canCancel && (
              <button onClick={cancel} style={{ ...buttonStyle('danger'), justifySelf: 'start' }}>Cancel request</button>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
