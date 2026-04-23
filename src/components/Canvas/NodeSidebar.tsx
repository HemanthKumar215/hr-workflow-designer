import type { NodeType } from '../../types/node.types';
import { setDraggedNodeType } from './WorkflowCanvas';

interface NodeSidebarProps {
  onAddNode: (type: NodeType, position: { x: number; y: number }) => void;
}

interface NodeDefinition {
  type: NodeType;
  label: string;
  icon: string;
  description: string;
  gradient: string;
  border: string;
  badgeColor: string;
}

const NODE_DEFS: NodeDefinition[] = [
  {
    type: 'start',
    label: 'Start',
    icon: '▶',
    description: 'Workflow entry point',
    gradient: 'linear-gradient(135deg,#052e16,#14532d)',
    border: '1.5px solid #16a34a',
    badgeColor: '#22c55e',
  },
  {
    type: 'task',
    label: 'Task',
    icon: '✓',
    description: 'Human task step',
    gradient: 'linear-gradient(135deg,#0f1f3d,#1e3a5f)',
    border: '1.5px solid #2563eb',
    badgeColor: '#3b82f6',
  },
  {
    type: 'approval',
    label: 'Approval',
    icon: '⚖',
    description: 'Manager/HR approval',
    gradient: 'linear-gradient(135deg,#1c0d00,#422006)',
    border: '1.5px solid #b45309',
    badgeColor: '#f59e0b',
  },
  {
    type: 'automated',
    label: 'Automated',
    icon: '⚡',
    description: 'System-triggered action',
    gradient: 'linear-gradient(135deg,#0f0726,#2e1065)',
    border: '1.5px solid #7c3aed',
    badgeColor: '#8b5cf6',
  },
  {
    type: 'end',
    label: 'End',
    icon: '■',
    description: 'Workflow completion',
    gradient: 'linear-gradient(135deg,#1a0009,#4c0519)',
    border: '1.5px solid #be123c',
    badgeColor: '#f43f5e',
  },
];

export function NodeSidebar({ onAddNode }: NodeSidebarProps) {
  const handleDragStart = (type: NodeType) => {
    setDraggedNodeType(type);
  };

  const handleClickAdd = (type: NodeType) => {
    // Add to center-ish area when just clicking
    onAddNode(type, {
      x: 200 + Math.random() * 200,
      y: 100 + Math.random() * 200,
    });
  };

  return (
    <aside
      style={{
        width: 220,
        background: '#0d1117',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '18px 16px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <div style={{ fontSize: 11, color: '#6366f1', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          Node Palette
        </div>
        <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
          Drag or click to add
        </div>
      </div>

      {/* Node list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {NODE_DEFS.map(def => (
          <div
            key={def.type}
            draggable
            onDragStart={() => handleDragStart(def.type)}
            onClick={() => handleClickAdd(def.type)}
            title={`Add ${def.label} node`}
            style={{
              background: def.gradient,
              border: def.border,
              borderRadius: 10,
              padding: '10px 12px',
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              userSelect: 'none',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateX(3px)';
              (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 16px ${def.badgeColor}33`;
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            <div style={{
              width: 32, height: 32, borderRadius: def.type === 'start' || def.type === 'end' ? '50%' : 8,
              background: `linear-gradient(135deg,${def.badgeColor}cc,${def.badgeColor}88)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14, flexShrink: 0,
              boxShadow: `0 2px 8px ${def.badgeColor}44`,
            }}>
              {def.icon}
            </div>
            <div>
              <div style={{ fontSize: 13, color: '#f1f5f9', fontWeight: 600 }}>{def.label}</div>
              <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>{def.description}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer tip */}
      <div style={{
        padding: '10px 14px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: 10,
        color: '#334155',
        lineHeight: 1.5,
      }}>
        💡 Drag onto canvas or click to place at default position
      </div>
    </aside>
  );
}

