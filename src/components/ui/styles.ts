import type { CSSProperties } from 'react';

export const colors = {
  bg: '#0f1117',
  panel: '#0d1117',
  bar: '#0a0d14',
  card: '#161b27',
  border: 'rgba(255,255,255,0.07)',
  borderStrong: 'rgba(255,255,255,0.12)',
  text: '#f1f5f9',
  textDim: '#94a3b8',
  textMuted: '#64748b',
  accent: '#6366f1',
  accentSoft: '#818cf8',
  green: '#22c55e',
  amber: '#f59e0b',
  red: '#f43f5e',
  blue: '#3b82f6',
  violet: '#8b5cf6',
};

export const labelStyle: CSSProperties = {
  display: 'block', fontSize: 11, color: colors.textDim, fontWeight: 600,
  letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 6,
};

export const inputStyle: CSSProperties = {
  width: '100%', background: colors.panel, border: `1px solid ${colors.borderStrong}`,
  borderRadius: 7, padding: '8px 10px', color: colors.text, fontSize: 13,
  outline: 'none', fontFamily: 'inherit',
};

export const cardStyle: CSSProperties = {
  background: colors.card, border: `1px solid ${colors.border}`, borderRadius: 12,
};

export type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'success';

export function buttonStyle(variant: ButtonVariant = 'ghost', disabled = false): CSSProperties {
  const base: CSSProperties = {
    borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 600,
    cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1,
    display: 'inline-flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap',
    fontFamily: 'inherit', transition: 'background 0.15s, border-color 0.15s',
  };
  switch (variant) {
    case 'primary':
      return { ...base, background: 'linear-gradient(135deg,#4f46e5,#6366f1)', border: '1px solid #6366f1', color: '#e0e7ff' };
    case 'danger':
      return { ...base, background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.35)', color: '#fda4af' };
    case 'success':
      return { ...base, background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.35)', color: '#86efac' };
    default:
      return { ...base, background: 'rgba(255,255,255,0.04)', border: `1px solid ${colors.borderStrong}`, color: colors.textDim };
  }
}

export const statusColors: Record<string, string> = {
  running: colors.blue,
  waiting: colors.amber,
  completed: colors.green,
  rejected: colors.red,
  failed: colors.textMuted,
  open: colors.amber,
  approved: colors.green,
  cancelled: colors.textMuted,
};

export const roleLabels: Record<string, string> = {
  admin: 'Admin',
  hrbp: 'HR Business Partner',
  manager: 'Manager',
  director: 'Director',
  employee: 'Employee',
};

export function pillStyle(color: string): CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600,
    color, background: `${color}1a`, border: `1px solid ${color}40`,
    borderRadius: 20, padding: '2px 9px', textTransform: 'capitalize', whiteSpace: 'nowrap',
  };
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
