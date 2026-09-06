// Cookie Chain constants and thin API clients.
// Sources: docs.cookiechain.wtf, api.cookiescan.io (DAS + REST), agg.cookiebox.app (swap router).
import { Connection, PublicKey, VersionedTransaction } from '@solana/web3.js'

export const RPC_URL = 'https://rpc.cookiescan.io'
export const WS_URL = 'wss://wss.cookiescan.io'
export const EXPLORER = 'https://cookiescan.io'
export const SCAN_API = 'https://api.cookiescan.io'
export const AGG_API = 'https://agg.cookiebox.app'
export const BRIDGE_URL = 'https://hyperlane.cookiescan.io'

// Native COOK is exposed as Solana's native mint, 9 decimals.
export const COOK_MINT = 'So11111111111111111111111111111111111111112'
export const COOK_DECIMALS = 9
export const LAMPORTS = 1_000_000_000

export const txUrl = (sig: string) => `${EXPLORER}/tx/${sig}`
export const addrUrl = (a: string) => `${EXPLORER}/address/${a}`
export const short = (a: string, n = 4) => (a.length > 2 * n + 1 ? `${a.slice(0, n)}…${a.slice(-n)}` : a)

export interface ScanToken {
  mint: string
  metadata?: { name?: string; symbol?: string; logo?: string | null; decimals?: number }
  price?: { usd?: string | number; native?: number; change24h?: number }
  marketData?: { volume24h?: number; liquidity?: number; marketCap?: number; holderCount?: number }
}
export interface ScanMarket {
  marketId: string
  type: string
  baseToken: { mint: string; symbol?: string; amount?: number; priceUsd?: number }
  quoteToken: { mint: string; symbol?: string; amount?: number; priceUsd?: number }
  liquidityUsd?: number
}
export interface AggQuote {
  inAmount: string
  outAmount: string
  feePct: number
  netOutAmount: string
  minOutAmount: string
  priceImpactPct: number | null
  path: string[]
  isMultiHop: boolean
  segments: { pool: string; venue: string; inAmount: string; outAmount: string; hopIndex: number }[]
}
export interface AggSwapTx {
  transactionBase64: string
  blockhash: string
  lastValidBlockHeight: number
  route: AggQuote
}

async function getJson<T>(url: string, init?: RequestInit, timeoutMs = 30_000): Promise<T> {
  const ctl = new AbortController()
  const t = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const r = await fetch(url, { ...init, signal: ctl.signal, headers: { accept: 'application/json', ...(init?.headers || {}) } })
    const text = await r.text()
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 200)}`)
    return JSON.parse(text) as T
  } finally {
    clearTimeout(t)
  }
}

export async function fetchTokens(): Promise<{ cookUsd: number; tokens: ScanToken[] }> {
  const j = await getJson<{ cookUsd: number; data: ScanToken[] }>(`${SCAN_API}/api/tokens`)
  return { cookUsd: j.cookUsd, tokens: j.data ?? [] }
}
export async function fetchMarkets(): Promise<ScanMarket[]> {
  const j = await getJson<{ markets?: ScanMarket[]; data?: ScanMarket[] } | ScanMarket[]>(`${SCAN_API}/api/markets`)
  return Array.isArray(j) ? j : j.markets ?? j.data ?? []
}
export async function fetchHealth(): Promise<{ status: string; cookUsd: number; registry: { totalAssets: number } }> {
  return getJson(`${SCAN_API}/v1/health`)
}

export async function quote(inputMint: string, outputMint: string, amount: string, slippageBps: number, owner?: string) {
  const q = new URLSearchParams({ inputMint, outputMint, amount, slippageBps: String(slippageBps), ...(owner ? { owner } : {}) })
  try {
    const j = await getJson<{ route: AggQuote }>(`${AGG_API}/quote?${q}`)
    return j.route
  } catch (e) {
    if (e instanceof Error && /404|no route/i.test(e.message)) return null
    throw e
  }
}
export async function buildSwapTx(args: { inputMint: string; outputMint: string; amount: string; slippageBps: number; owner: string }) {
  return getJson<AggSwapTx>(`${AGG_API}/swap-tx`, { method: 'POST', body: JSON.stringify(args), headers: { 'content-type': 'application/json' } }, 60_000)
}
export const decodeTx = (b64: string) => VersionedTransaction.deserialize(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)))

export interface ChainPulse {
  slot: number
  blockHeight: number
  epoch: number
  epochPct: number
  txCount: number
  tps: number
  nonVoteTps: number
  samples: { slot: number; minsAgo: number; tps: number; nonVote: number }[]
  version: string
}
export async function fetchPulse(conn: Connection): Promise<ChainPulse> {
  const [epoch, perf, ver] = await Promise.all([conn.getEpochInfo(), conn.getRecentPerformanceSamples(30), conn.getVersion()])
  const samples = perf
    .slice()
    .reverse()
    .map((s, i, arr) => ({ slot: s.slot, minsAgo: -(arr.length - 1 - i), tps: s.numTransactions / s.samplePeriodSecs, nonVote: ((s as unknown as { numNonVoteTransactions?: number }).numNonVoteTransactions ?? 0) / s.samplePeriodSecs }))
  const last = samples[samples.length - 1]
  return {
    slot: epoch.absoluteSlot,
    blockHeight: epoch.blockHeight ?? 0,
    epoch: epoch.epoch,
    epochPct: (epoch.slotIndex / epoch.slotsInEpoch) * 100,
    txCount: epoch.transactionCount ?? 0,
    tps: last?.tps ?? 0,
    nonVoteTps: last?.nonVote ?? 0,
    samples,
    version: ver['solana-core'],
  }
}

export function fmtNum(n: number | undefined | null, d = 2) {
  if (n === undefined || n === null || !Number.isFinite(n)) return '—'
  if (Math.abs(n) >= 1e9) return (n / 1e9).toFixed(d) + 'B'
  if (Math.abs(n) >= 1e6) return (n / 1e6).toFixed(d) + 'M'
  if (Math.abs(n) >= 1e3) return (n / 1e3).toFixed(d) + 'K'
  return n.toLocaleString(undefined, { maximumFractionDigits: d })
}
export function fmtUsd(n: number | undefined | null) {
  if (n === undefined || n === null || !Number.isFinite(n)) return '—'
  if (n < 0.01) return '$' + n.toPrecision(3)
  return '$' + n.toLocaleString(undefined, { maximumFractionDigits: 2 })
}
export const toBase = (ui: string, decimals: number): bigint => {
  const [i, f = ''] = ui.trim().split('.')
  const frac = (f + '0'.repeat(decimals)).slice(0, decimals)
  return BigInt(i || '0') * BigInt(10) ** BigInt(decimals) + BigInt(frac || '0')
}
export const fromBase = (v: bigint | string | number, decimals: number, d = 4) => (Number(v) / 10 ** decimals).toLocaleString(undefined, { maximumFractionDigits: d })
export const isPubkey = (s: string) => {
  try {
    new PublicKey(s)
    return true
  } catch {
    return false
  }
}
