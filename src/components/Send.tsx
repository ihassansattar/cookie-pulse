import { useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { useWalletModal } from '@solana/wallet-adapter-react-ui'
import { PublicKey, SystemProgram, Transaction, TransactionInstruction } from '@solana/web3.js'
import { Buffer } from 'buffer'
import { LAMPORTS, isPubkey, toBase } from '../lib/cookie'
import TxTracker from './TxTracker'
import { useTx } from '../lib/useTx'

const MEMO_PROGRAM = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr')

export default function Send({ onSettled, balance }: { onSettled: () => void; balance: number | null }) {
  const { connection } = useConnection()
  const { publicKey, signTransaction } = useWallet()
  const { setVisible } = useWalletModal()
  const [to, setTo] = useState('')
  const [amt, setAmt] = useState('0.01')
  const [memo, setMemo] = useState('sent from Cookie Pulse 🍪')
  const { tx, busy, run, reset } = useTx()

  const valid = isPubkey(to) && Number(amt) > 0
  const tooMuch = balance != null && Number(amt) > balance

  const doSend = async () => {
    if (!publicKey || !signTransaction) return
    await run({
      connection,
      signTransaction,
      build: async () => {
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed')
        const t = new Transaction({ feePayer: publicKey, blockhash, lastValidBlockHeight })
        t.add(SystemProgram.transfer({ fromPubkey: publicKey, toPubkey: new PublicKey(to), lamports: toBase(amt, 9) }))
        if (memo.trim()) t.add(new TransactionInstruction({ keys: [{ pubkey: publicKey, isSigner: true, isWritable: false }], programId: MEMO_PROGRAM, data: Buffer.from(memo.trim(), 'utf8') }))
        return { tx: t, blockhash, lastValidBlockHeight }
      },
      successText: () => `Sent ${amt} COOK to ${to.slice(0, 6)}…${to.slice(-4)}.`,
      onDone: onSettled,
    })
  }

  return (
    <section className="panel span-5">
      <h2>Send COOK</h2>
      <p className="sub">Native transfer with an on-chain memo. Fee is 5,000 lamports ({(5000 / LAMPORTS).toFixed(6)} COOK).</p>
      <div className="field">
        <label>Recipient</label>
        <input value={to} onChange={(e) => setTo(e.target.value.trim())} placeholder="Cookie Chain address" spellCheck={false} />
        {to && !isPubkey(to) && <span className="bad" style={{ fontSize: 12 }}>Not a valid address.</span>}
      </div>
      <div className="field">
        <label>Amount · COOK {balance != null && <span className="muted">(balance {balance.toFixed(4)})</span>}</label>
        <input inputMode="decimal" value={amt} onChange={(e) => setAmt(e.target.value.replace(/[^0-9.]/g, ''))} />
        {tooMuch && <span className="bad" style={{ fontSize: 12 }}>Exceeds your balance.</span>}
      </div>
      <div className="field">
        <label>Memo (optional)</label>
        <input value={memo} onChange={(e) => setMemo(e.target.value)} maxLength={120} />
      </div>
      {!publicKey ? (
        <button className="btn" onClick={() => setVisible(true)}>Connect wallet to send</button>
      ) : (
        <button className="btn" disabled={busy || !valid || tooMuch || !signTransaction} onClick={doSend}>{busy ? 'Working…' : 'Send'}</button>
      )}
      <TxTracker tx={tx} />
      {tx && !busy && <button className="btn ghost sm" style={{ marginTop: 8 }} onClick={reset}>Clear</button>}
    </section>
  )
}
