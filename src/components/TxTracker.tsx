import { txUrl, short } from '../lib/cookie'

export type StepState = 'idle' | 'active' | 'done' | 'fail'
export interface TrackerStep { key: string; label: string; state: StepState; detail?: string }

export interface TxState {
  steps: TrackerStep[]
  signature?: string
  error?: string
  success?: string
}

export const STEP_LABELS: Record<string, string> = {
  build: 'Build transaction',
  simulate: 'Simulate on Cookie Chain',
  sign: 'Awaiting wallet signature',
  send: 'Broadcast to network',
  confirm: 'Confirm (commitment: confirmed)',
}

export function freshSteps(keys: string[]): TrackerStep[] {
  return keys.map((k) => ({ key: k, label: STEP_LABELS[k] ?? k, state: 'idle' }))
}

export default function TxTracker({ tx }: { tx: TxState | null }) {
  if (!tx) return null
  return (
    <div>
      <div className="tracker" aria-live="polite">
        {tx.steps.map((s) => (
          <div key={s.key} className={`step ${s.state}`}>
            <span className="dot" />
            <span>{s.label}</span>
            {s.detail && <span className="detail">{s.detail}</span>}
          </div>
        ))}
      </div>
      {tx.signature && (
        <div className="note">
          Signature{' '}
          <a href={txUrl(tx.signature)} target="_blank" rel="noreferrer" className="mono">
            {short(tx.signature, 8)}
          </a>{' '}
          · view on Cookiescan
        </div>
      )}
      {tx.error && <div className="err">{tx.error}</div>}
      {tx.success && <div className="ok">{tx.success}</div>}
    </div>
  )
}
