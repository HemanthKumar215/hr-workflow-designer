import { useCallback, useEffect, useState } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { useWorkflowState } from './hooks/useWorkflowState';
import { NodeSidebar } from './components/Canvas/NodeSidebar';
import { WorkflowCanvas } from './components/Canvas/WorkflowCanvas';
import { WorkflowBrowser } from './components/Canvas/WorkflowBrowser';
import { NodeFormPanel } from './components/NodeForms/NodeFormPanel';
import { EdgeConditionForm } from './components/NodeForms/EdgeConditionForm';
import { WorkflowSimulator } from './components/Sandbox/WorkflowSimulator';
import { LoginScreen } from './components/Auth/LoginScreen';
import { RequestsView } from './components/Requests/RequestsView';
import { buttonStyle, colors, roleLabels } from './components/ui/styles';
import { fetchMe, getWorkflow, isBackendEnabled, logout, saveWorkflow } from './services/api';
import { ApiError, getToken, setUnauthorizedHandler } from './services/http';
import type { NodeType, NodeData } from './types/node.types';
import type { WorkflowNode, WorkflowEdge } from './types/workflow.types';
import type { User } from './types/api.types';

type View = 'designer' | 'requests';

interface WorkflowMeta {
  id: number | null;
  name: string;
  version: number | null;
}

const NEW_WORKFLOW: WorkflowMeta = { id: null, name: 'Untitled Workflow', version: null };

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(!isBackendEnabled || !getToken());

  // Restore a saved session.
  useEffect(() => {
    if (!isBackendEnabled || !getToken()) return;
    fetchMe()
      .then(setUser)
      .catch(() => logout())
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  if (!authChecked) {
    return <div style={{ height: '100%', display: 'grid', placeItems: 'center', color: colors.textMuted, fontSize: 13 }}>Loading…</div>;
  }
  if (isBackendEnabled && !user) return <LoginScreen onLogin={setUser} />;
  return <Shell user={user} onLogout={() => { logout(); setUser(null); }} />;
}

function Shell({ user, onLogout }: { user: User | null; onLogout: () => void }) {
  const [view, setView] = useState<View>(user && !['admin', 'hrbp'].includes(user.role) ? 'requests' : 'designer');
  const [meta, setMeta] = useState<WorkflowMeta>(NEW_WORKFLOW);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const canEdit = !!user && (user.role === 'admin' || user.role === 'hrbp');

  const {
    nodes, edges, selectedNodeId, selectedEdgeId, loadCount,
    onNodesChange, onEdgesChange, onConnect,
    addNode, deleteNode, updateNodeData,
    selectNode, selectEdge, updateEdgeCondition, deleteEdge,
    clearCanvas, setNodesAndEdges,
  } = useWorkflowState();

  const selectedNode = nodes.find(n => n.id === selectedNodeId) ?? null;
  const selectedEdge = edges.find(e => e.id === selectedEdgeId) ?? null;

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), toast.kind === 'ok' ? 2500 : 7000);
    return () => clearTimeout(id);
  }, [toast]);

  const handleAddNode = (type: NodeType, position: { x: number; y: number }) => addNode(type, position);

  const openWorkflow = useCallback(async (id: number) => {
    try {
      const wf = await getWorkflow(id);
      setNodesAndEdges(wf.graph.nodes, wf.graph.edges);
      setMeta({ id: wf.id, name: wf.name, version: wf.version });
      setBrowserOpen(false);
      setView('designer');
    } catch (err) {
      setToast({ kind: 'err', text: (err as Error).message });
    }
  }, [setNodesAndEdges]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const wf = await saveWorkflow(meta.id, meta.name.trim() || 'Untitled Workflow', nodes, edges);
      setMeta({ id: wf.id, name: wf.name, version: wf.version });
      setToast({ kind: 'ok', text: `Saved "${wf.name}" (v${wf.version})` });
    } catch (err) {
      let text = (err as Error).message;
      const issues = err instanceof ApiError
        ? ((err.details as { detail?: { issues?: { message: string; severity: string }[] } })?.detail?.issues ?? [])
        : [];
      const blocking = issues.filter(i => i.severity === 'error').map(i => i.message);
      if (blocking.length) text = `Can't save: ${blocking.join(' ')}`;
      setToast({ kind: 'err', text });
    } finally {
      setSaving(false);
    }
  };

  const handleNew = () => {
    clearCanvas();
    setMeta(NEW_WORKFLOW);
  };

  return (
    <div style={{ width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', background: colors.bg }}>
      <header style={{
        height: 52, background: colors.bar, borderBottom: `1px solid ${colors.border}`,
        display: 'flex', alignItems: 'center', padding: '0 16px', gap: 12, flexShrink: 0, zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15,
            boxShadow: '0 2px 10px rgba(99,102,241,0.4)',
          }}>⬡</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: colors.text, letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
            HR Workflow Engine
          </div>
        </div>

        {isBackendEnabled && (
          <nav role="tablist" style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
            {(['designer', 'requests'] as const).map(v => (
              <button key={v} role="tab" aria-selected={view === v} onClick={() => setView(v)} style={{
                background: view === v ? 'rgba(99,102,241,0.15)' : 'transparent',
                border: 'none', borderRadius: 7, padding: '6px 12px', fontSize: 13, fontWeight: 600,
                color: view === v ? colors.accentSoft : colors.textMuted, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                {v === 'designer' ? 'Designer' : 'Requests'}
              </button>
            ))}
          </nav>
        )}

        <div style={{ width: 1, height: 24, background: colors.border }} />

        {view === 'designer' && (
          <>
            <input
              aria-label="Workflow name"
              value={meta.name}
              onChange={e => setMeta(m => ({ ...m, name: e.target.value }))}
              readOnly={isBackendEnabled && !canEdit}
              style={{
                fontSize: 12, color: colors.accentSoft, background: 'rgba(99,102,241,0.1)',
                border: '1px solid rgba(99,102,241,0.2)', borderRadius: 20, padding: '4px 12px',
                fontWeight: 600, outline: 'none', width: 200, fontFamily: 'inherit',
              }}
            />
            {meta.version != null && <span style={{ fontSize: 11, color: colors.textMuted }}>v{meta.version}</span>}
            {isBackendEnabled && (
              <>
                <button onClick={() => setBrowserOpen(true)} style={buttonStyle('ghost')}>📂 Open</button>
                {canEdit && <button onClick={handleNew} style={buttonStyle('ghost')}>＋ New</button>}
                {canEdit && (
                  <button onClick={handleSave} disabled={saving || nodes.length === 0} style={buttonStyle('primary', saving || nodes.length === 0)}>
                    {saving ? 'Saving…' : meta.id ? 'Save' : 'Save to server'}
                  </button>
                )}
              </>
            )}
          </>
        )}

        <div style={{ flex: 1 }} />

        {!isBackendEnabled && (
          <span title="Set VITE_API_URL to connect the FastAPI backend" style={{
            fontSize: 11, color: colors.amber, background: 'rgba(245,158,11,0.08)',
            border: '1px solid rgba(245,158,11,0.25)', borderRadius: 6, padding: '3px 10px',
          }}>
            Offline demo · mock API
          </span>
        )}

        {user && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ textAlign: 'right', lineHeight: 1.3 }}>
              <div style={{ fontSize: 12, color: colors.text, fontWeight: 600 }}>{user.full_name}</div>
              <div style={{ fontSize: 10, color: colors.textMuted }}>{roleLabels[user.role]}</div>
            </div>
            <button onClick={onLogout} style={buttonStyle('ghost')}>Sign out</button>
          </div>
        )}
      </header>

      {view === 'requests' && user ? (
        <RequestsView user={user} />
      ) : (
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          <NodeSidebar onAddNode={handleAddNode} />
          <ReactFlowProvider>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <WorkflowCanvas
                nodes={nodes}
                edges={edges}
                selectedNodeId={selectedNodeId}
                selectedEdgeId={selectedEdgeId}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeSelect={selectNode}
                onEdgeSelect={selectEdge}
                onAddNode={handleAddNode}
                onDeleteNode={deleteNode}
                onDeleteEdge={deleteEdge}
                fitKey={loadCount}
              />
              <WorkflowSimulator
                nodes={nodes}
                edges={edges}
                onImport={(n, e) => setNodesAndEdges(n as WorkflowNode[], e as WorkflowEdge[])}
                onClear={handleNew}
              />
            </div>
          </ReactFlowProvider>
          {selectedEdge ? (
            <EdgeConditionForm
              key={selectedEdge.id}
              edge={selectedEdge}
              nodes={nodes}
              onChange={cond => updateEdgeCondition(selectedEdge.id, cond)}
              onDelete={() => deleteEdge(selectedEdge.id)}
            />
          ) : (
            <NodeFormPanel
              selectedNode={selectedNode}
              onUpdateNode={(id, data) => updateNodeData(id, data as Partial<NodeData>)}
              onDeleteNode={deleteNode}
            />
          )}
        </div>
      )}

      {browserOpen && (
        <WorkflowBrowser canEdit={canEdit} currentId={meta.id} onOpen={openWorkflow} onClose={() => setBrowserOpen(false)} />
      )}

      {toast && (
        <div role="status" style={{
          position: 'fixed', bottom: 70, left: '50%', transform: 'translateX(-50%)', zIndex: 70,
          maxWidth: 560, padding: '10px 16px', borderRadius: 10, fontSize: 13, animation: 'fadeInUp 0.2s ease',
          background: toast.kind === 'ok' ? '#052e1a' : '#3b0a14',
          border: `1px solid ${toast.kind === 'ok' ? 'rgba(34,197,94,0.4)' : 'rgba(244,63,94,0.4)'}`,
          color: toast.kind === 'ok' ? '#86efac' : '#fda4af', boxShadow: '0 10px 30px rgba(0,0,0,0.4)',
        }}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
