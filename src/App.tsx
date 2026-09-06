import { useCallback, useEffect, useMemo, useState } from 'react'
import { useConnection, useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import Pulse from './components/Pulse'
import Markets from './components/Markets'
import Swap from './components/Swap'
import Send from './components/Send'
import Activity from './components/Activity'
import { COOK_MINT, LAMPORTS, addrUrl, fetchMarkets, fetchTokens, fmtUsd, short, type ScanToken } from './lib/cookie'

export default function App() {
  const { connection } = useConnection()
  const { publicKey, wallet } = useWallet()
  const [tokens, setTokens] = useState<Map<string, ScanToken>>(new Map())
  const [cookUsd, setCookUsd] = useState<number | null>(null)
  const [tradeable, setTradeable] = useState<string[]>([])
  const [balance, setBalance] = useState<number | null>(null)
  const [pick, setPick] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // Token registry + tradeable set (tokens that have a pool against COOK), ranked by pool liquidity.
  useEffect(() => {
    Promise.all([fetchTokens(), fetchMarkets()])
      .then(([t, m]) => {
        setTokens(new Map(t.tokens.map((x) => [x.mint, x])))
        setCookUsd(t.cookUsd)
        const liq = new Map<string, number>()
        for (const mk of m) {
          const other = mk.baseToken.mint === COOK_MINT ? mk.quoteToken.mint : mk.quoteToken.mint === COOK_MINT ? mk.baseToken.mint : null
          if (other) liq.set(other, (liq.get(other) ?? 0) + (mk.liquidityUsd ?? 0))
        }
        setTradeable([...liq.entries()].sort((a, b) => b[1] - a[1]).map(([mint]) => mint))
      })
      .catch(() => {})
  }, [])

  const loadBalance = useCallback(async () => {
    if (!publicKey) return setBalance(null)
    try {
      setBalance((await connection.getBalance(publicKey, 'confirmed')) / LAMPORTS)
    } catch {
      /* keep last value */
    }
  }, [connection, publicKey])

  useEffect(() => {
    loadBalance()
  }, [loadBalance, refreshKey])
  useEffect(() => {
    if (!publicKey) return
    let id: number | null = null
    try {
      id = connection.onAccountChange(publicKey, (acc) => setBalance(acc.lamports / LAMPORTS), 'confirmed')
    } catch {
      /* no websocket */
    }
    return () => {
      if (id != null) connection.removeAccountChangeListener(id).catch(() => {})
    }
  }, [connection, publicKey])

  const settled = useCallback(() => setRefreshKey((k) => k + 1), [])
  const balUsd = useMemo(() => (balance != null && cookUsd ? balance * cookUsd : null), [balance, cookUsd])

  return (
    <div className="wrap">
      <header className="top">
        <div className="brand">
          <div className="logo" aria-hidden="true" />
          <div>
            <h1>Cookie Pulse</h1>
            <small>chain health · liquidity · swap · send — on Cookie Chain</small>
          </div>
        </div>
        <div className="walletbox">
          {publicKey && (
            <div className="balance">
              <b>{balance == null ? '…' : balance.toLocaleString(undefined, { maximumFractionDigits: 4 })} COOK</b>
              <a href={addrUrl(publicKey.toBase58())} target="_blank" rel="noreferrer" title={publicKey.toBase58()}>{short(publicKey.toBase58(), 5)}</a>
              {balUsd != null && <span> · {fmtUsd(balUsd)}</span>}
              {wallet && <span> · {wallet.adapter.name}</span>}
            </div>
          )}
          <WalletMultiButton />
        </div>
      </header>

      <div className="grid">
        <Pulse />
        <Markets tokens={tokens} onPick={(m) => setPick(m)} />
        <Swap tokens={tokens} tradeable={tradeable} pick={pick} onSettled={settled} />
        <Activity refreshKey={refreshKey} />
        <Send onSettled={settled} balance={balance} />
      </div>

      <footer>
        <span>Open source · <a href="https://github.com/ihassansattar/cookie-pulse" target="_blank" rel="noreferrer">github.com/ihassansattar/cookie-pulse</a></span>
        <span>Data: rpc.cookiescan.io · api.cookiescan.io · agg.cookiebox.app. Not financial advice. Wallet keys never leave your wallet.</span>
      </footer>
    </div>
  )
}
