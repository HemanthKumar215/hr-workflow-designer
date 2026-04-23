import { useState, useCallback } from 'react';
import type { WorkflowNode, WorkflowEdge, ValidationError } from '../types/workflow.types';
import { validateWorkflow } from '../utils/workflowValidator';

export function useNodeValidation() {
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const runValidation = useCallback(
    (nodes: WorkflowNode[], edges: WorkflowEdge[]): ValidationError[] => {
      const result = validateWorkflow(nodes, edges);
      setErrors(result);
      return result;
    },
    []
  );

  const clearErrors = useCallback(() => setErrors([]), []);

  const errorCount = errors.filter(e => e.severity === 'error').length;
  const warningCount = errors.filter(e => e.severity === 'warning').length;

  return { errors, errorCount, warningCount, runValidation, clearErrors };
}
