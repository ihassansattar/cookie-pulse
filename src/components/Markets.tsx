import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { addrUrl, fetchMarkets, fmtUsd, short, type ScanMarket, type ScanToken } from '../lib/cookie'

export default function Markets({ tokens, onPick }: { tokens: Map<string, ScanToken>; onPick: (mint: string) => void }) {
  const [markets, setMarkets] = useState<ScanMarket[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const load = () =>
      fetchMarkets()
        .then((m) => alive && setMarkets(m.sort((a, b) => (b.liquidityUsd ?? 0) - (a.liquidityUsd ?? 0))))
        .catch((e) => alive && setErr(e.message))
    load()
    const id = setInterval(load, 60_000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  const top = useMemo(() => (markets ?? []).slice(0, 12), [markets])
  const tvl = useMemo(() => (markets ?? []).reduce((s, m) => s + (m.liquidityUsd ?? 0), 0), [markets])
  const venues = useMemo(() => {
    const v = new Map<string, number>()
    for (const m of markets ?? []) v.set(m.type, (v.get(m.type) ?? 0) + (m.liquidityUsd ?? 0))
    return [...v.entries()].map(([name, usd]) => ({ name: name.replace(/COOKIE(BOX|SWAP) /, (s) => s.trim() + ' '), usd })).sort((a, b) => b.usd - a.usd)
  }, [markets])

  const Logo = ({ mint, symbol }: { mint: string; symbol?: string }) => {
    const logo = tokens.get(mint)?.metadata?.logo
    return logo ? <img src={logo} alt="" loading="lazy" onError={(e) => ((e.target as HTMLImageElement).style.visibility = 'hidden')} /> : <span className="ph">{(symbol ?? '?').slice(0, 2)}</span>
  }

  return (
    <section className="panel span-7">
      <h2>Liquidity across Cookie Chain DEXes</h2>
      <p className="sub">
        {markets ? `${markets.length} pools · ${fmtUsd(tvl)} total · from api.cookiescan.io/api/markets` : 'Loading pools…'}
      </p>
      {venues.length > 0 && (
        <div style={{ height: 120, marginBottom: 12 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={venues} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: '#8b7d72', fontSize: 10 }} stroke="#2c231e" interval={0} />
              <YAxis tick={{ fill: '#8b7d72', fontSize: 11 }} stroke="#2c231e" tickFormatter={(v: number) => '$' + Math.round(v / 1000) + 'k'} />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={{ background: '#1f1815', border: '1px solid #2c231e', borderRadius: 8, fontSize: 12 }} formatter={(v) => [fmtUsd(Number(v)), 'liquidity']} />
              <Bar dataKey="usd" fill="#e8a24a" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <div className="tablewrap">
        <table>
          <thead>
            <tr><th>Pair</th><th>Venue</th><th style={{ textAlign: 'right' }}>Liquidity</th><th style={{ textAlign: 'right' }}>Base price</th><th></th></tr>
          </thead>
          <tbody>
            {top.map((m) => (
              <tr key={m.marketId}>
                <td>
                  <div className="tok">
                    <Logo mint={m.baseToken.mint} symbol={m.baseToken.symbol} />
                    <span>
                      <b>{m.baseToken.symbol ?? short(m.baseToken.mint)}</b>
                      <span className="muted"> / {m.quoteToken.symbol === 'wCOOK' ? 'COOK' : m.quoteToken.symbol ?? short(m.quoteToken.mint)}</span>
                    </span>
                  </div>
                </td>
                <td><span className="venue">{m.type}</span></td>
                <td style={{ textAlign: 'right' }}>{fmtUsd(m.liquidityUsd)}</td>
                <td style={{ textAlign: 'right' }} className="mono">{fmtUsd(m.baseToken.priceUsd)}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <button className="btn ghost sm" onClick={() => onPick(m.baseToken.mint)}>Swap</button>{' '}
                  <a href={addrUrl(m.marketId)} target="_blank" rel="noreferrer" className="mono muted" title="Pool on Cookiescan">↗</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {markets && markets.length === 0 && <div className="empty">Markets feed is empty right now. Retry in a moment.</div>}
      </div>
      {err && <div className="err">Could not load markets: {err}</div>}
    </section>
  )
}
