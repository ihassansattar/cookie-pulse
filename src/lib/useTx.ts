import { useCallback, useState } from 'react'
import type { Connection, VersionedTransaction, Transaction } from '@solana/web3.js'
import { freshSteps, type TxState, type StepState } from '../components/TxTracker'

type Signer = <T extends Transaction | VersionedTransaction>(tx: T) => Promise<T>

/** Drives the build → simulate → sign → send → confirm lifecycle and exposes UI state. */
export function useTx() {
  const [tx, setTx] = useState<TxState | null>(null)
  const [busy, setBusy] = useState(false)

  const set = (key: string, state: StepState, detail?: string) =>
    setTx((t) => (t ? { ...t, steps: t.steps.map((s) => (s.key === key ? { ...s, state, detail: detail ?? s.detail } : s)) } : t))

  const run = useCallback(
    async (opts: {
      connection: Connection
      signTransaction: Signer
      build: () => Promise<{ tx: VersionedTransaction | Transaction; blockhash: string; lastValidBlockHeight: number }>
      successText: (sig: string) => string
      onDone?: () => void
    }) => {
      setBusy(true)
      setTx({ steps: freshSteps(['build', 'simulate', 'sign', 'send', 'confirm']) })
      try {
        set('build', 'active')
        const built = await opts.build()
        set('build', 'done')

        set('simulate', 'active')
        const sim = 'version' in built.tx
          ? await opts.connection.simulateTransaction(built.tx, { sigVerify: false, replaceRecentBlockhash: true })
          : await opts.connection.simulateTransaction(built.tx)
        if (sim.value.err) {
          const logs = (sim.value.logs ?? []).slice(-6).join('\n')
          throw new Error(`Simulation failed: ${JSON.stringify(sim.value.err)}\n${logs}`)
        }
        set('simulate', 'done', `${sim.value.unitsConsumed ?? '?'} CU`)

        set('sign', 'active')
        const signed = await opts.signTransaction(built.tx)
        set('sign', 'done')

        set('send', 'active')
        const sig = await opts.connection.sendRawTransaction(signed.serialize(), { skipPreflight: true, maxRetries: 3 })
        setTx((t) => (t ? { ...t, signature: sig } : t))
        set('send', 'done', sig.slice(0, 8) + '…')

        set('confirm', 'active')
        const t0 = performance.now()
        const res = await opts.connection.confirmTransaction(
          { signature: sig, blockhash: built.blockhash, lastValidBlockHeight: built.lastValidBlockHeight },
          'confirmed',
        )
        if (res.value.err) throw new Error(`Transaction failed on-chain: ${JSON.stringify(res.value.err)}`)
        set('confirm', 'done', `${((performance.now() - t0) / 1000).toFixed(1)}s`)
        setTx((t) => (t ? { ...t, success: opts.successText(sig) } : t))
        opts.onDone?.()
        return sig
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e)
        setTx((t) => {
          if (!t) return t
          const active = t.steps.find((s) => s.state === 'active')
          return { ...t, error: friendly(msg), steps: t.steps.map((s) => (s === active ? { ...s, state: 'fail' } : s)) }
        })
        return null
      } finally {
        setBusy(false)
      }
    },
    [],
  )

  return { tx, busy, run, reset: () => setTx(null) }
}

function friendly(msg: string) {
  if (/user rejected|rejected the request|declined/i.test(msg)) return 'You rejected the request in your wallet. Nothing was sent.'
  if (/insufficient (funds|lamports)/i.test(msg)) return 'Insufficient COOK to cover the amount plus network fee. Bridge COOK in via hyperlane.cookiescan.io and try again.'
  if (/block height exceeded|expired/i.test(msg)) return 'The transaction expired before confirmation. Nothing was charged. Try again.'
  if (/Failed to fetch|NetworkError|aborted/i.test(msg)) return 'Network error reaching the Cookie Chain API. Check your connection and retry.'
  return msg
}
