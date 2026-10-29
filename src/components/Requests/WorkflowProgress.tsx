import { useMemo } from 'react';
import { Background, BackgroundVariant, ReactFlow, ReactFlowProvider } from '@xyflow/react';
import type { InstanceDetail } from '../../types/api.types';
import type { WorkflowEdge, WorkflowNode } from '../../types/workflow.types';
import { StartNode } from '../Canvas/CustomNodes/StartNode';
import { TaskNode } from '../Canvas/CustomNodes/TaskNode';
import { ApprovalNode } from '../Canvas/CustomNodes/ApprovalNode';
import { AutomatedStepNode } from '../Canvas/CustomNodes/AutomatedStepNode';
import { EndNode } from '../Canvas/CustomNodes/EndNode';
import { conditionLabelProps } from '../../hooks/useWorkflowState';

const nodeTypes = { start: StartNode, task: TaskNode, approval: ApprovalNode, automated: AutomatedStepNode, end: EndNode };

/** Read-only view of the request's workflow snapshot, highlighting the path it took. */
export function WorkflowProgress({ instance }: { instance: InstanceDetail }) {
  const { nodes, edges } = useMemo(() => {
    const visited = new Set(instance.events.map(e => e.node_id).filter(Boolean) as string[]);
    const waiting = new Set(instance.actions.filter(a => a.status === 'open').map(a => a.node_id));
    const rejected = new Set(instance.actions.filter(a => a.status === 'rejected').map(a => a.node_id));

    const nodes: WorkflowNode[] = instance.graph.nodes.map(n => ({
      ...n,
      draggable: false,
      selectable: false,
      connectable: false,
      className: waiting.has(n.id) ? 'wf-node-waiting'
        : rejected.has(n.id) ? 'wf-node-rejected'
        : visited.has(n.id) ? 'wf-node-done'
        : 'wf-node-idle',
    }));
    // Conditional edges count as taken only if the engine logged that branch.
    const branches = new Set(
      instance.events
        .filter(ev => ev.event_type === 'branch_taken')
        .map(ev => `${ev.node_id}->${String(ev.data.target)}`)
    );
    const edges: WorkflowEdge[] = instance.graph.edges.map(e => {
      const cond = String((e.data as { condition?: string } | undefined)?.condition ?? '');
      const taken = cond
        ? branches.has(`${e.source}->${e.target}`)
        : visited.has(e.source) && visited.has(e.target);
      return {
        ...e,
        ...conditionLabelProps(cond),
        animated: taken,
        selectable: false,
        className: taken ? 'wf-edge-taken' : 'wf-edge-idle',
      };
    });
    return { nodes, edges };
  }, [instance]);

  return (
    <div style={{ height: 240, flexShrink: 0, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.15 }}
          minZoom={0.05}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          panOnScroll
          proOptions={{ hideAttribution: true }}
          style={{ background: '#0b0e15' }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} color="rgba(99,102,241,0.15)" />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
