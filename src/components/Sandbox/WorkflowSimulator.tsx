import { useState, useCallback } from 'react';
import type { WorkflowNode, WorkflowEdge, SimulationResult, ValidationError } from '../../types/workflow.types';
import { simulateWorkflow } from '../../services/api';
import { validateWorkflow } from '../../utils/workflowValidator';
import { exportWorkflowAsJSON, importWorkflowFromFile } from '../../utils/workflowSerializer';
import { ExecutionLog } from './ExecutionLog';

interface Props {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
  onImport: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void;
  onClear: () => void;
}

export function WorkflowSimulator({ nodes, edges, onImport, onClear }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [preflightErrors, setPreflightErrors] = useState<ValidationError[]>([]);
  const [activeTab, setActiveTab] = useState<'log' | 'json'>('log');

  const handleSimulate = useCallback(async () => {
    // Pre-flight validation
    const errors = validateWorkflow(nodes, edges);
    const hardErrors = errors.filter(e => e.severity === 'error');
    setPreflightErrors(errors);

    if (hardErrors.length > 0) {
      setResult(null);
      setIsOpen(true);
      return;
    }

    setIsRunning(true);
    setResult(null);
    setIsOpen(true);

    try {
      const res = await simulateWorkflow(nodes, edges);
      setResult(res);
    } catch (err) {
      setResult({
        status: 'failure',
        steps: [],
        validationErrors: [{ type: 'invalid_config', message: String(err), severity: 'error' }],
        executionTimeMs: 0,
      });
    } finally {
      setIsRunning(false);
    }
  }, [nodes, edges]);

  const handleExport = () => exportWorkflowAsJSON(nodes, edges, 'hr-workflow');

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { nodes: n, edges: ed } = await importWorkflowFromFile(file);
      onImport(n, ed);
    } catch (err) {
      alert(String(err));
    }
    e.target.value = '';
  };

  const allErrors = [...preflightErrors, ...(result?.validationErrors ?? [])];
  const errorCount = allErrors.filter(e => e.severity === 'error').length;
  const warnCount  = allErrors.filter(e => e.severity === 'warning').length;

  return (
    <>
      {/* Bottom toolbar */}
      <div style={{
        height: 52, background: '#0a0d14', borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', flexShrink: 0,
      }}>
        {/* Stats */}
        <div style={{ display: 'flex', gap: 12, marginRight: 'auto' }}>
          <Stat label="Nodes" value={nodes.length} />
          <Stat label="Edges" value={edges.length} />
          {errorCount > 0 && <Stat label="Errors" value={errorCount} color="#f43f5e" />}
          {warnCount  > 0 && <Stat label="Warnings" value={warnCount} color="#f59e0b" />}
        </div>

        {/* Actions */}
        <label style={toolBtnStyle('#334155')} title="Import workflow JSON">
          📂 Import
          <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
        </label>

        <button onClick={handleExport} style={toolBtnStyle('#334155')} disabled={nodes.length === 0}>
          💾 Export
        </button>

        <button onClick={onClear} style={toolBtnStyle('#7f1d1d')} disabled={nodes.length === 0}>
          🗑 Clear
        </button>

        <button
          onClick={handleSimulate}
          disabled={nodes.length === 0 || isRunning}
          style={{
            ...toolBtnStyle('#312e81'),
            background: isRunning
              ? 'rgba(99,102,241,0.15)'
              : 'linear-gradient(135deg,#4f46e5,#6366f1)',
            border: '1px solid #6366f1',
            color: '#e0e7ff',
            fontWeight: 700,
            minWidth: 120,
          }}
        >
          {isRunning ? '⏳ Running…' : '▶ Run Simulation'}
        </button>
      </div>

      {/* Simulation drawer */}
      {isOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 50,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
        }}
          onClick={e => { if (e.target === e.currentTarget) setIsOpen(false); }}
        >
          <div style={{
            width: '100%', maxWidth: 780, maxHeight: '80vh',
            background: '#111827', borderRadius: '16px 16px 0 0',
            border: '1px solid rgba(255,255,255,0.08)',
            borderBottom: 'none',
            display: 'flex', flexDirection: 'column',
            boxShadow: '0 -20px 60px rgba(0,0,0,0.5)',
            animation: 'fadeInUp 0.25s ease',
          }}>
            {/* Drawer header */}
            <div style={{
              padding: '16px 20px 12px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
            }}>
              <div style={{ fontSize: 16 }}>
                {isRunning ? '⏳' : result?.status === 'success' ? '✅' : result?.status === 'failure' ? '❌' : '🔬'}
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#f1f5f9' }}>
                  Workflow Simulation {isRunning ? '— Running' : result ? `— ${result.status.toUpperCase()}` : '— Validation Errors'}
                </div>
                {result && (
                  <div style={{ fontSize: 11, color: '#475569', marginTop: 1 }}>
                    {result.steps.length} steps • {result.executionTimeMs}ms
                  </div>
                )}
              </div>
              <button
                onClick={() => setIsOpen(false)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#475569', fontSize: 18, cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>

            {/* Tabs */}
            {result && (
              <div style={{ display: 'flex', gap: 0, padding: '0 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexShrink: 0 }}>
                {(['log', 'json'] as const).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: '10px 16px', fontSize: 12, fontWeight: 600,
                      color: activeTab === tab ? '#818cf8' : '#475569',
                      borderBottom: activeTab === tab ? '2px solid #6366f1' : '2px solid transparent',
                      transition: 'all 0.15s', textTransform: 'uppercase', letterSpacing: '0.06em',
                    }}
                  >
                    {tab === 'log' ? '📋 Execution Log' : '{ } JSON'}
                  </button>
                ))}
              </div>
            )}

            {/* Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {/* Validation errors */}
              {allErrors.length > 0 && (
                <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {allErrors.map((err, i) => (
                    <div key={i} style={{
                      display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 12px',
                      background: err.severity === 'error' ? 'rgba(244,63,94,0.08)' : 'rgba(245,158,11,0.08)',
                      border: `1px solid ${err.severity === 'error' ? 'rgba(244,63,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
                      borderRadius: 8, fontSize: 12,
                      color: err.severity === 'error' ? '#f87171' : '#fcd34d',
                    }}>
                      <span>{err.severity === 'error' ? '✕' : '⚠'}</span>
                      <span>{err.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Running spinner */}
              {isRunning && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: 40 }}>
                  <div style={{ fontSize: 32, animation: 'spin 1s linear infinite' }}>⏳</div>
                  <div style={{ color: '#6366f1', fontSize: 14 }}>Simulating workflow execution…</div>
                </div>
              )}

              {/* Results */}
              {!isRunning && result && (
                <>
                  {activeTab === 'log' && <ExecutionLog steps={result.steps} />}
                  {activeTab === 'json' && (
                    <pre style={{
                      background: '#0d1117', borderRadius: 8, padding: 16, fontSize: 11,
                      color: '#94a3b8', overflow: 'auto', lineHeight: 1.6,
                      border: '1px solid rgba(255,255,255,0.06)',
                    }}>
                      {JSON.stringify(result, null, 2)}
                    </pre>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ label, value, color = '#475569' }: { label: string; value: number; color?: string }) {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
      <span style={{ fontSize: 11, color: '#334155' }}>{label}:</span>
      <span style={{ fontSize: 12, color, fontWeight: 700 }}>{value}</span>
    </div>
  );
}

function toolBtnStyle(bgColor: string): React.CSSProperties {
  return {
    background: `${bgColor}33`,
    border: `1px solid ${bgColor}66`,
    borderRadius: 7, padding: '5px 12px',
    color: '#94a3b8', fontSize: 12, cursor: 'pointer',
    fontWeight: 500, transition: 'background 0.15s',
    display: 'flex', alignItems: 'center', gap: 5,
  } as React.CSSProperties;
}
