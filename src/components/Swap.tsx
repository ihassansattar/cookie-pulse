import { useEffect, useMemo, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { AGG_API, BRIDGE_URL, COOK_DECIMALS, COOK_MINT, buildSwapTx, decodeTx, fromBase, quote, short, toBase, type AggQuote, type ScanToken } from '../lib/cookie'
import TxTracker from './TxTracker'
import { useTx } from '../lib/useTx'

interface Props {
  tokens: Map<string, ScanToken>
  tradeable: string[]
  pick: string | null
  onSettled: () => void
}

export default function Swap({ tokens, tradeable, pick, onSettled }: Props) {
  const { connection } = useConnection()
  const { publicKey, signTransaction } = useWallet()
  const { setVisible } = useWalletModal()
  const [dir, setDir] = useState<'buy' | 'sell'>('buy') // buy = COOK → token
  const [mint, setMint] = useState<string>(tradeable[0] ?? '')
  const [amount, setAmount] = useState('1')
  const [slip, setSlip] = useState(100)
  const [q, setQ] = useState<AggQuote | null | 'none'>(null)
  const [qErr, setQErr] = useState<string | null>(null)
  const [quoting, setQuoting] = useState(false)
  const { tx, busy, run, reset } = useTx()

  useEffect(() => {
    if (pick) {
      setMint(pick)
      setDir('buy')
    }
  }, [pick])
  useEffect(() => {
    if (!mint && tradeable[0]) setMint(tradeable[0])
  }, [tradeable, mint])

  const tokMeta = tokens.get(mint)?.metadata
  const tokDec = tokMeta?.decimals ?? 6
  const tokSym = tokMeta?.symbol ?? short(mint)
  const inMint = dir === 'buy' ? COOK_MINT : mint
  const outMint = dir === 'buy' ? mint : COOK_MINT
  const inDec = dir === 'buy' ? COOK_DECIMALS : tokDec
  const outDec = dir === 'buy' ? tokDec : COOK_DECIMALS
  const inSym = dir === 'buy' ? 'COOK' : tokSym
  const outSym = dir === 'buy' ? tokSym : 'COOK'

  const baseAmount = useMemo(() => {
    try {
      const v = toBase(amount || '0', inDec)
      return v > 0n ? v.toString() : null
    } catch {
      return null
    }
  }, [amount, inDec])

  useEffect(() => {
    if (!mint || !baseAmount) {
      setQ(null)
      return
    }
    let alive = true
    setQuoting(true)
    setQErr(null)
    const t = setTimeout(() => {
      quote(inMint, outMint, baseAmount, slip, publicKey?.toBase58())
        .then((r) => alive && setQ(r ?? 'none'))
        .catch((e) => alive && setQErr(e.message))
        .finally(() => alive && setQuoting(false))
    }, 350)
    return () => {
      alive = false
      clearTimeout(t)
    }
  }, [inMint, outMint, baseAmount, slip, publicKey, mint])

  const doSwap = async () => {
    if (!publicKey || !signTransaction || !baseAmount) return
    await run({
      connection,
      signTransaction,
      build: async () => {
        const built = await buildSwapTx({ inputMint: inMint, outputMint: outMint, amount: baseAmount, slippageBps: slip, owner: publicKey.toBase58() })
        return { tx: decodeTx(built.transactionBase64), blockhash: built.blockhash, lastValidBlockHeight: built.lastValidBlockHeight }
      },
      successText: () => `Swapped ${amount} ${inSym} → ${outSym}. Balances update in a moment.`,
      onDone: onSettled,
    })
  }

  return (
    <section className="panel span-5">
      <h2>Swap</h2>
      <p className="sub">Routed by the Cookiebox aggregator across every Cookie Chain DEX. Unsigned tx is built server-side, simulated here, signed in your wallet.</p>

      <div className="field">
        <label>You pay · {inSym}</label>
        <div className="row">
          <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} aria-label="Amount to pay" />
          {dir === 'sell' && <TokenSelect mint={mint} setMint={setMint} tokens={tokens} tradeable={tradeable} />}
        </div>
      </div>
      <button className="flip" title="Flip direction" onClick={() => setDir((d) => (d === 'buy' ? 'sell' : 'buy'))} aria-label="Flip swap direction">⇅</button>
      <div className="field">
        <label>You receive · {outSym}</label>
        <div className="row">
          <input readOnly value={q && q !== 'none' ? fromBase(q.netOutAmount, outDec, 6) : quoting ? 'quoting…' : ''} aria-label="Amount to receive" />
          {dir === 'buy' && <TokenSelect mint={mint} setMint={setMint} tokens={tokens} tradeable={tradeable} />}
        </div>
      </div>
      <div className="field">
        <label>Slippage</label>
        <div className="row">
          {[50, 100, 300, 500].map((b) => (
            <button key={b} className={`btn ghost sm ${slip === b ? 'good' : ''}`} onClick={() => setSlip(b)} aria-pressed={slip === b}>{b / 100}%</button>
          ))}
        </div>
      </div>

      {q && q !== 'none' && (
        <div className="quotebox">
          <div><span className="muted">Route</span><span>{q.path.map((m) => (m === COOK_MINT ? 'COOK' : tokens.get(m)?.metadata?.symbol ?? short(m))).join(' → ')}</span></div>
          <div><span className="muted">Venue</span><span>{[...new Set(q.segments.map((s) => s.venue))].join(', ')}</span></div>
          <div><span className="muted">Min received</span><span>{fromBase(q.minOutAmount, outDec, 6)} {outSym}</span></div>
          <div><span className="muted">Price impact</span><span className={q.priceImpactPct != null && q.priceImpactPct > 2 ? 'warn' : ''}>{q.priceImpactPct == null ? '—' : q.priceImpactPct.toFixed(2) + '%'}</span></div>
          <div><span className="muted">Aggregator fee</span><span>{q.feePct}%</span></div>
        </div>
      )}
      {q === 'none' && <div className="err">No route found for this pair and amount. Try a smaller amount or another token.</div>}
      {qErr && <div className="err">Quote failed: {qErr}</div>}

      {!publicKey ? (
        <button className="btn" onClick={() => setVisible(true)}>Connect wallet to swap</button>
      ) : (
        <button className="btn" disabled={busy || !q || q === 'none' || !signTransaction} onClick={doSwap}>
          {busy ? 'Working…' : `Swap ${inSym} → ${outSym}`}
        </button>
      )}
      <TxTracker tx={tx} />
      {tx && !busy && <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={reset}>Clear</button>}
      <p className="note">
        Need COOK? Bridge from Solana at <a href={BRIDGE_URL} target="_blank" rel="noreferrer">hyperlane.cookiescan.io</a>. Router: <span className="mono">{AGG_API.replace('https://', '')}</span>
      </p>
    </section>
  )
}

function TokenSelect({ mint, setMint, tokens, tradeable }: { mint: string; setMint: (m: string) => void; tokens: Map<string, ScanToken>; tradeable: string[] }) {
  return (
    <select value={mint} onChange={(e) => setMint(e.target.value)} aria-label="Token" style={{ maxWidth: 160 }}>
      {tradeable.map((m) => (
        <option key={m} value={m}>{tokens.get(m)?.metadata?.symbol ?? short(m)}</option>
      ))}
    </select>
  )
}
