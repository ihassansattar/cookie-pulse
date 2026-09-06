import { useCallback, useEffect, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import type { ConfirmedSignatureInfo } from '@solana/web3.js'
import { short, txUrl } from '../lib/cookie'

export default function Activity({ refreshKey }: { refreshKey: number }) {
  const { connection } = useConnection()
  const { publicKey } = useWallet()
  const [sigs, setSigs] = useState<ConfirmedSignatureInfo[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!publicKey) return setSigs(null)
    try {
      setSigs(await connection.getSignaturesForAddress(publicKey, { limit: 12 }, 'confirmed'))
      setErr(null)
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    }
  }, [connection, publicKey])

  useEffect(() => {
    load()
  }, [load, refreshKey])

  // Live: re-pull whenever the wallet's account changes on-chain.
  useEffect(() => {
    if (!publicKey) return
    let id: number | null = null
    try {
      id = connection.onAccountChange(publicKey, () => load(), 'confirmed')
    } catch {
      /* websocket unavailable; polling below covers it */
    }
    const poll = setInterval(load, 20_000)
    return () => {
      if (id != null) connection.removeAccountChangeListener(id).catch(() => {})
      clearInterval(poll)
    }
  }, [connection, publicKey, load])

  return (
    <section className="panel span-7">
      <h2>Your activity</h2>
      <p className="sub">Latest transactions for the connected wallet, straight from RPC. Updates live on account change.</p>
      {!publicKey && <div className="empty">Connect a wallet to see its transactions.</div>}
      {publicKey && sigs && sigs.length === 0 && <div className="empty">No transactions yet for {short(publicKey.toBase58())}. Send or swap something above.</div>}
      {sigs && sigs.length > 0 && (
        <div className="tablewrap">
          <table>
            <thead><tr><th>Signature</th><th>Slot</th><th>When</th><th>Status</th><th>Memo</th></tr></thead>
            <tbody>
              {sigs.map((s) => (
                <tr key={s.signature}>
                  <td><a className="mono" href={txUrl(s.signature)} target="_blank" rel="noreferrer">{short(s.signature, 6)}</a></td>
                  <td className="mono">{s.slot.toLocaleString()}</td>
                  <td className="muted">{s.blockTime ? timeAgo(s.blockTime) : '—'}</td>
                  <td>{s.err ? <span className="chip fail">failed</span> : <span className="chip ok">{s.confirmationStatus ?? 'confirmed'}</span>}</td>
                  <td className="muted" style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.memo?.replace(/^\[\d+\]\s*/, '') ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {err && <div className="err">{err}</div>}
    </section>
  )
}

function timeAgo(ts: number) {
  const s = Math.max(0, Math.floor(Date.now() / 1000 - ts))
  if (s < 60) return `${s}s ago`
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}
