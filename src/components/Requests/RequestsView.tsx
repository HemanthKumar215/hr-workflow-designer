import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchInbox, fetchStats, listRequests, listWorkflows, startRequest } from '../../services/api';
import type { InboxItem, InstanceSummary, Stats, User, WorkflowSummary } from '../../types/api.types';
import { ActionControls } from './ActionControls';
import { RequestDetail } from './RequestDetail';
import {
  buttonStyle, cardStyle, colors, formatDate, inputStyle, labelStyle, pillStyle, statusColors, timeAgo,
} from '../ui/styles';

interface Props {
  user: User;
}

const OVERSEER_ROLES = new Set(['admin', 'hrbp']);

export function RequestsView({ user }: Props) {
  const isOverseer = OVERSEER_ROLES.has(user.role);
  const [workflows, setWorkflows] = useState<WorkflowSummary[]>([]);
  const [inbox, setInbox] = useState<InboxItem[]>([]);
  const [requests, setRequests] = useState<InstanceSummary[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [scope, setScope] = useState<'mine' | 'all'>('mine');
  const [selected, setSelected] = useState<number | null>(null);
  const [detailVersion, setDetailVersion] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick(t => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      listWorkflows(),
      fetchInbox(),
      listRequests(scope),
      isOverseer ? fetchStats() : Promise.resolve(null),
    ])
      .then(([wfs, ib, reqs, st]) => {
        if (cancelled) return;
        setWorkflows(wfs);
        setInbox(ib);
        setRequests(reqs);
        setStats(st);
        setError(null);
      })
      .catch(err => { if (!cancelled) setError((err as Error).message); });
    return () => { cancelled = true; };
  }, [scope, isOverseer, tick]);

  // Light polling so approvals made by other users show up.
  useEffect(() => {
    const id = setInterval(refresh, 15000);
    return () => clearInterval(id);
  }, [refresh]);

  const actionableIds = useMemo(() => new Set(inbox.map(i => i.id)), [inbox]);

  const afterInboxDecision = () => {
    setDetailVersion(v => v + 1);
    refresh();
  };

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      {/* Left column: submit + inbox */}
      <div style={{
        width: 360, flexShrink: 0, borderRight: `1px solid ${colors.border}`, overflowY: 'auto',
        padding: 16, display: 'grid', gap: 20, alignContent: 'start', background: colors.panel,
      }}>
        <NewRequestForm
          workflows={workflows}
          onCreated={inst => { setSelected(inst); setScope('mine'); refresh(); }}
          onError={setError}
        />

        <section>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
            <h2 style={sectionTitle}>Your inbox</h2>
            {inbox.length > 0 && <span style={{ ...pillStyle(colors.amber), marginLeft: 8 }}>{inbox.length}</span>}
          </div>
          {inbox.length === 0 && (
            <div style={{ fontSize: 12, color: colors.textMuted, lineHeight: 1.6 }}>
              Nothing waiting on you. Tasks and approvals assigned to you or your role ({user.role}) show up here.
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {inbox.map(item => (
              <div key={item.id} style={{ ...cardStyle, padding: 12 }}>
                <button
                  onClick={() => setSelected(item.instance.id)}
                  style={{ background: 'none', border: 'none', padding: 0, textAlign: 'left', cursor: 'pointer', width: '100%', fontFamily: 'inherit' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{item.kind === 'approval' ? '⚖' : '📋'}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{item.title}</span>
                  </div>
                  <div style={{ fontSize: 12, color: colors.textDim, marginTop: 4 }}>{item.instance.title}</div>
                  <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                    {summarize(item.instance.variables)} · {timeAgo(item.created_at)}
                  </div>
                </button>
                <div style={{ marginTop: 10 }}>
                  <ActionControls action={item} onDone={afterInboxDecision} onError={setError} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Main column: stats + list */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto', padding: 20, display: 'grid', gap: 18, alignContent: 'start' }}>
        {error && (
          <div role="alert" style={{ ...cardStyle, padding: '10px 14px', fontSize: 12, color: '#fda4af', borderColor: 'rgba(244,63,94,0.3)', display: 'flex' }}>
            <span style={{ flex: 1 }}>{error}</span>
            <button onClick={() => setError(null)} style={{ background: 'none', border: 'none', color: '#fda4af', cursor: 'pointer' }}>✕</button>
          </div>
        )}

        {stats && <StatsStrip stats={stats} />}

        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <h2 style={sectionTitle}>{scope === 'mine' ? 'My requests' : 'All requests'}</h2>
            <div style={{ flex: 1 }} />
            {isOverseer && (
              <div role="tablist" style={{ display: 'flex', gap: 4 }}>
                {(['mine', 'all'] as const).map(s => (
                  <button key={s} role="tab" aria-selected={scope === s} onClick={() => setScope(s)}
                    style={{ ...buttonStyle(scope === s ? 'primary' : 'ghost'), padding: '4px 10px' }}>
                    {s === 'mine' ? 'Mine' : 'Everyone'}
                  </button>
                ))}
              </div>
            )}
            <button onClick={refresh} style={buttonStyle('ghost')} aria-label="Refresh">↻</button>
          </div>

          {requests.length === 0 ? (
            <div style={{ ...cardStyle, padding: 24, fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>
              No requests yet. Submit one from the panel on the left.
            </div>
          ) : (
            <div style={{ ...cardStyle, overflow: 'hidden' }}>
              {requests.map((r, i) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r.id)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px',
                    background: selected === r.id ? 'rgba(99,102,241,0.08)' : 'transparent', border: 'none',
                    borderTop: i ? `1px solid ${colors.border}` : 'none', cursor: 'pointer', textAlign: 'left',
                    fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: 11, color: colors.textMuted, width: 34 }}>#{r.id}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, color: colors.text, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {r.title}
                    </div>
                    <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                      {scope === 'all' ? `${r.started_by.full_name} · ` : ''}{summarize(r.variables)}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: colors.textMuted, whiteSpace: 'nowrap' }}>{formatDate(r.created_at)}</span>
                  <span style={{ ...pillStyle(statusColors[r.status]), minWidth: 78, justifyContent: 'center' }}>{r.status}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>

      {selected != null && (
        <RequestDetail
          key={`${selected}-${detailVersion}`}
          instanceId={selected}
          user={user}
          actionableIds={actionableIds}
          onChanged={refresh}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function NewRequestForm({ workflows, onCreated, onError }: {
  workflows: WorkflowSummary[];
  onCreated: (instanceId: number) => void;
  onError: (msg: string) => void;
}) {
  const [workflowId, setWorkflowId] = useState<number | ''>('');
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const wf = workflows.find(w => w.id === workflowId);

  const submit = async () => {
    if (!wf) return;
    setBusy(true);
    try {
      const inst = await startRequest(wf.id, Object.fromEntries(Object.entries(values).filter(([, v]) => v !== '')));
      setValues({});
      onCreated(inst.id);
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section>
      <h2 style={{ ...sectionTitle, marginBottom: 10 }}>New request</h2>
      <form onSubmit={e => { e.preventDefault(); submit(); }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div>
          <label htmlFor="new-req-wf" style={labelStyle}>Workflow</label>
          <select
            id="new-req-wf"
            value={workflowId}
            onChange={e => { setWorkflowId(e.target.value ? Number(e.target.value) : ''); setValues({}); }}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="">Choose a workflow…</option>
            {workflows.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          {wf?.description && <div style={{ fontSize: 11, color: colors.textMuted, marginTop: 6, lineHeight: 1.5 }}>{wf.description}</div>}
        </div>
        {wf?.form_fields.map(f => (
          <div key={f}>
            <label htmlFor={`new-req-${f}`} style={{ ...labelStyle, textTransform: 'none', letterSpacing: 0 }}>{humanize(f)}</label>
            <input
              id={`new-req-${f}`}
              value={values[f] ?? ''}
              onChange={e => setValues(v => ({ ...v, [f]: e.target.value }))}
              placeholder="Uses the workflow default if blank"
              style={inputStyle}
            />
          </div>
        ))}
        <button type="submit" disabled={!wf || busy} style={{ ...buttonStyle('primary', !wf || busy), justifyContent: 'center', padding: '8px 12px' }}>
          {busy ? 'Submitting…' : 'Submit request'}
        </button>
      </form>
    </section>
  );
}

function StatsStrip({ stats }: { stats: Stats }) {
  const tiles = [
    { label: 'Total requests', value: stats.total, color: colors.text },
    { label: 'In progress', value: (stats.by_status.waiting ?? 0) + (stats.by_status.running ?? 0), color: colors.amber },
    { label: 'Completed', value: stats.by_status.completed ?? 0, color: colors.green },
    { label: 'Rejected', value: stats.by_status.rejected ?? 0, color: colors.red },
    { label: 'Avg. time to complete', value: stats.avg_completion_hours == null ? '—' : formatHours(stats.avg_completion_hours), color: colors.accentSoft },
  ];
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
      {tiles.map(t => (
        <div key={t.label} style={{ ...cardStyle, padding: '12px 14px' }}>
          <div style={{ fontSize: 11, color: colors.textMuted }}>{t.label}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: t.color, marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{t.value}</div>
        </div>
      ))}
    </div>
  );
}

const sectionTitle: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: colors.text, letterSpacing: '0.01em' };

function humanize(field: string): string {
  return field.replace(/_/g, ' ').replace(/^\w/, c => c.toUpperCase());
}

function formatHours(h: number): string {
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`;
  if (h < 48) return `${h.toFixed(1)}h`;
  return `${(h / 24).toFixed(1)}d`;
}

function summarize(vars: Record<string, unknown>): string {
  return Object.entries(vars)
    .filter(([k, v]) => !k.startsWith('requester_') && v !== '' && v != null)
    .slice(0, 3)
    .map(([k, v]) => `${humanize(k)}: ${String(v)}`)
    .join(' · ');
}
