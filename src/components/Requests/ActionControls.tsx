import { useState } from 'react';
import { decideAction } from '../../services/api';
import type { Decision, InstanceDetail, PendingAction } from '../../types/api.types';
import { buttonStyle, inputStyle } from '../ui/styles';

interface Props {
  action: PendingAction;
  onDone: (instance: InstanceDetail) => void;
  onError: (message: string) => void;
}

/** Approve / reject (approvals) or mark done (tasks), with an optional comment. */
export function ActionControls({ action, onDone, onError }: Props) {
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState<Decision | null>(null);

  const act = async (decision: Decision) => {
    setBusy(decision);
    try {
      onDone(await decideAction(action.id, decision, comment.trim()));
      setComment('');
    } catch (err) {
      onError((err as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <input
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Add a comment (optional)"
        aria-label={`Comment on ${action.title}`}
        style={{ ...inputStyle, padding: '6px 9px', fontSize: 12 }}
      />
      <div style={{ display: 'flex', gap: 8 }}>
        {action.kind === 'approval' ? (
          <>
            <button disabled={busy !== null} onClick={() => act('approve')} style={{ ...buttonStyle('success', busy !== null), flex: 1, justifyContent: 'center' }}>
              {busy === 'approve' ? 'Approving…' : '✓ Approve'}
            </button>
            <button disabled={busy !== null} onClick={() => act('reject')} style={{ ...buttonStyle('danger', busy !== null), flex: 1, justifyContent: 'center' }}>
              {busy === 'reject' ? 'Rejecting…' : '✕ Reject'}
            </button>
          </>
        ) : (
          <button disabled={busy !== null} onClick={() => act('complete')} style={{ ...buttonStyle('primary', busy !== null), flex: 1, justifyContent: 'center' }}>
            {busy === 'complete' ? 'Saving…' : '✓ Mark done'}
          </button>
        )}
      </div>
    </div>
  );
}
