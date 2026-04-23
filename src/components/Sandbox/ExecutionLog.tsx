import type { SimulationStep } from '../../types/workflow.types';

interface Props {
  steps: SimulationStep[];
}

const statusConfig = {
  completed: { color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', icon: '✓', label: 'Completed' },
  pending:   { color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)', icon: '⏳', label: 'Pending'   },
  skipped:   { color: '#64748b', bg: 'rgba(100,116,139,0.1)', border: 'rgba(100,116,139,0.2)', icon: '⊘', label: 'Skipped'  },
  error:     { color: '#f43f5e', bg: 'rgba(244,63,94,0.1)',  border: 'rgba(244,63,94,0.2)',  icon: '✕', label: 'Error'    },
};

const nodeTypeColor: Record<string, string> = {
  start: '#22c55e', task: '#3b82f6', approval: '#f59e0b', automated: '#8b5cf6', end: '#f43f5e',
};
const nodeTypeIcon: Record<string, string> = {
  start: '▶', task: '✓', approval: '⚖', automated: '⚡', end: '■',
};

export function ExecutionLog({ steps }: Props) {
  if (steps.length === 0) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#334155', fontSize: 13 }}>
        No execution steps to display
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {steps.map((step, idx) => {
        const cfg = statusConfig[step.status] ?? statusConfig.completed;
        const nodeColor = nodeTypeColor[step.nodeType] ?? '#6366f1';
        const nodeIcon = nodeTypeIcon[step.nodeType] ?? '●';
        const isLast = idx === steps.length - 1;

        return (
          <div key={step.nodeId} style={{ display: 'flex', gap: 12, position: 'relative' }}>
            {/* Timeline line */}
            {!isLast && (
              <div style={{
                position: 'absolute', left: 15, top: 32, bottom: 0,
                width: 2, background: 'rgba(255,255,255,0.05)',
              }} />
            )}

            {/* Node type dot */}
            <div style={{
              width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
              background: `${nodeColor}22`, border: `2px solid ${nodeColor}66`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, color: nodeColor, marginTop: 10,
            }}>
              {nodeIcon}
            </div>

            {/* Step card */}
            <div style={{
              flex: 1, background: cfg.bg, border: `1px solid ${cfg.border}`,
              borderRadius: 8, padding: '8px 12px', marginBottom: 8,
              animation: 'fadeInUp 0.3s ease forwards',
              animationDelay: `${idx * 0.06}s`, opacity: 0,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 600, flex: 1, minWidth: 0,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {step.nodeLabel}
                </div>
                <span style={{
                  background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 4,
                  padding: '1px 7px', fontSize: 10, color: cfg.color, fontWeight: 700,
                  flexShrink: 0,
                }}>
                  {cfg.icon} {cfg.label}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{step.message}</div>
              <div style={{ display: 'flex', gap: 12, marginTop: 4, flexWrap: 'wrap' }}>
                {step.assignee && (
                  <span style={{ fontSize: 10, color: '#475569' }}>👤 {step.assignee}</span>
                )}
                <span style={{ fontSize: 10, color: '#1e293b', fontFamily: 'monospace' }}>
                  {new Date(step.timestamp).toLocaleTimeString()}
                </span>
                <span style={{ fontSize: 10, color: '#1e293b', fontFamily: 'monospace' }}>
                  #{step.nodeId}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
