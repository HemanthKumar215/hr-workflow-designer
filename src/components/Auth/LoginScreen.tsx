import { useEffect, useState } from 'react';
import { fetchDemoAccounts, login } from '../../services/api';
import type { DemoAccount, User } from '../../types/api.types';
import { buttonStyle, cardStyle, colors, inputStyle, labelStyle, roleLabels } from '../ui/styles';

interface Props {
  onLogin: (user: User) => void;
}

const roleHints: Record<string, string> = {
  admin: 'Everything, including IT tasks',
  hrbp: 'Designs workflows, approves long leave',
  manager: 'Approves team requests',
  director: 'Approves headcount',
  employee: 'Submits requests',
};

export function LoginScreen({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [demo, setDemo] = useState<DemoAccount[]>([]);

  useEffect(() => {
    fetchDemoAccounts().then(setDemo).catch(err => setError(String(err.message ?? err)));
  }, []);

  const submit = async (e?: string, p?: string) => {
    setBusy(true);
    setError(null);
    try {
      onLogin(await login(e ?? email, p ?? password));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{
      height: '100%', overflowY: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24, background: `radial-gradient(ellipse at top, rgba(99,102,241,0.12), transparent 60%), ${colors.bg}`,
    }}>
      <div style={{ width: '100%', maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
          }}>⬡</div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700, color: colors.text }}>HR Workflow Engine</div>
            <div style={{ fontSize: 12, color: colors.textMuted }}>Design, run and approve HR workflows</div>
          </div>
        </div>

        <form
          style={{ ...cardStyle, padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}
          onSubmit={e => { e.preventDefault(); submit(); }}
        >
          <div>
            <label htmlFor="login-email" style={labelStyle}>Email</label>
            <input id="login-email" type="email" autoComplete="username" value={email}
              onChange={e => setEmail(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label htmlFor="login-password" style={labelStyle}>Password</label>
            <input id="login-password" type="password" autoComplete="current-password" value={password}
              onChange={e => setPassword(e.target.value)} style={inputStyle} required />
          </div>
          {error && <div role="alert" style={{ fontSize: 12, color: '#fda4af' }}>{error}</div>}
          <button type="submit" disabled={busy} style={{ ...buttonStyle('primary', busy), justifyContent: 'center', padding: '9px 12px' }}>
            {busy ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        {demo.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ ...labelStyle, marginBottom: 0 }}>Or try a demo account</div>
            {demo.map(acc => (
              <button
                key={acc.email}
                disabled={busy}
                onClick={() => submit(acc.email, acc.password)}
                style={{
                  ...cardStyle, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 12,
                  cursor: busy ? 'wait' : 'pointer', textAlign: 'left', color: colors.text, fontFamily: 'inherit',
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', background: 'rgba(99,102,241,0.15)',
                  color: colors.accentSoft, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {acc.full_name.split(' ').map(p => p[0]).join('')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{acc.full_name}</div>
                  <div style={{ fontSize: 11, color: colors.textMuted }}>{roleHints[acc.role]}</div>
                </div>
                <span style={{ fontSize: 11, color: colors.accentSoft, fontWeight: 600 }}>{roleLabels[acc.role]}</span>
              </button>
            ))}
            <div style={{ fontSize: 11, color: colors.textMuted }}>
              Demo password for every account: <code>{demo[0].password}</code>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
