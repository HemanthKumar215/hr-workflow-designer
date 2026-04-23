import { useState, useEffect } from 'react';
import type { AutomationAction } from '../types/workflow.types';
import { fetchAutomations } from '../services/api';

export function useAutomations() {
  const [automations, setAutomations] = useState<AutomationAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAutomations()
      .then(data => { if (!cancelled) setAutomations(data); })
      .catch(err => { if (!cancelled) setError(String(err)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const getActionById = (id: string): AutomationAction | undefined =>
    automations.find(a => a.id === id);

  return { automations, loading, error, getActionById };
}
