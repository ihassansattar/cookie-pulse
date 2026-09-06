import { useEffect, useState } from 'react'
import { useConnection } from '@solana/wallet-adapter-react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { fetchHealth, fetchPulse, fmtNum, fmtUsd, type ChainPulse } from '../lib/cookie'

export default function Pulse() {
  const { connection } = useConnection()
  const [p, setP] = useState<ChainPulse | null>(null)
  const [cookUsd, setCookUsd] = useState<number | null>(null)
  const [assets, setAssets] = useState<number | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    const tick = async () => {
      try {
        const [pulse, health] = await Promise.all([fetchPulse(connection), fetchHealth().catch(() => null)])
        if (!alive) return
        setP(pulse)
        if (health) {
          setCookUsd(health.cookUsd)
          setAssets(health.registry?.totalAssets ?? null)
        }
        setErr(null)
      } catch (e) {
        if (alive) setErr(e instanceof Error ? e.message : String(e))
      }
    }
    tick()
    const id = setInterval(tick, 10_000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [connection])

  return (
    <section className="panel span-12">
      <h2>
        <span className="live" aria-hidden="true" /> Chain pulse
      </h2>
      <p className="sub">Live from rpc.cookiescan.io · refreshes every 10s · solana-core {p?.version ?? '…'}</p>
      <div className="stats">
        <div className="stat"><span>Slot</span><b>{p ? p.slot.toLocaleString() : '…'}</b></div>
        <div className="stat"><span>Epoch {p?.epoch ?? '…'}</span><b>{p ? p.epochPct.toFixed(1) + '%' : '…'}</b></div>
        <div className="stat"><span>TPS (last 60s)</span><b>{p ? p.tps.toFixed(1) : '…'} <small className="muted" style={{ fontSize: 12 }}>{p ? `${p.nonVoteTps.toFixed(2)} user` : ''}</small></b></div>
        <div className="stat"><span>Total transactions</span><b>{p ? fmtNum(p.txCount, 1) : '…'}</b></div>
        <div className="stat"><span>COOK price</span><b>{cookUsd != null ? fmtUsd(cookUsd) : '…'}</b></div>
        <div className="stat"><span>Block height</span><b>{p ? p.blockHeight.toLocaleString() : '…'}</b></div>
        <div className="stat"><span>Indexed assets</span><b>{assets != null ? assets.toLocaleString() : '…'}</b></div>
        <div className="stat"><span>Fee per signature</span><b>0.000005 <small className="muted" style={{ fontSize: 12 }}>COOK</small></b></div>
      </div>
      <div style={{ height: 150 }}>
        {p && (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={p.samples} margin={{ top: 6, right: 6, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#e8a24a" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#e8a24a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="minsAgo" tick={{ fill: '#8b7d72', fontSize: 11 }} tickFormatter={(v: number) => (v === 0 ? 'now' : `${v}m`)} stroke="#2c231e" interval={4} />
              <YAxis tick={{ fill: '#8b7d72', fontSize: 11 }} stroke="#2c231e" />
              <Tooltip contentStyle={{ background: '#1f1815', border: '1px solid #2c231e', borderRadius: 8, fontSize: 12 }} labelFormatter={(v, payload) => `${v === 0 ? 'now' : v + ' min'} · slot ${Number((payload?.[0]?.payload as { slot?: number })?.slot ?? 0).toLocaleString()}`} formatter={(v) => [Number(v).toFixed(2) + ' tps', 'throughput']} />
              <Area type="monotone" dataKey="tps" stroke="#e8a24a" fill="url(#g)" strokeWidth={2} isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
      {err && <div className="err">RPC error: {err}</div>}
    </section>
  )
}
