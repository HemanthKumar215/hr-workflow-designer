import type { NodeType } from '../types/node.types';

// Tracks the node type currently being dragged from the sidebar onto the canvas.
let draggedNodeType: NodeType | null = null;

export function setDraggedNodeType(t: NodeType | null): void {
  draggedNodeType = t;
}

export function takeDraggedNodeType(): NodeType | null {
  const t = draggedNodeType;
  draggedNodeType = null;
  return t;
}
