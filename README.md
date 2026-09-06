# 🍪 Cookie Pulse

**Live:** https://ihassansattar.github.io/cookie-pulse/

A single-page cApp for [Cookie Chain](https://www.cookiechain.wtf) (Solana-compatible SVM) that puts chain health, DEX liquidity, swapping and native transfers on one screen, with a step-by-step transaction tracker so users always know what their wallet is doing.

Built for the Superteam Earn bounty *Create an App on Cookie Chain*.

## What it does

| Panel | Source | What you can do |
|---|---|---|
| **Chain pulse** | `rpc.cookiescan.io` (`getEpochInfo`, `getRecentPerformanceSamples`, `getVersion`) + `api.cookiescan.io/v1/health` | Live slot, epoch progress, TPS (total and user), total transactions, COOK price, indexed asset count. Throughput chart over the last 30 minutes. Refreshes every 10 s. |
| **Liquidity** | `api.cookiescan.io/api/markets` + `/api/tokens` | Every pool across Cookiebox DAMM/CLMM, CookieSwap CPAMM/BAMM and Meteora, ranked by USD liquidity, with a per-venue chart. One-click "Swap" pre-fills the swap panel. |
| **Swap** | `agg.cookiebox.app` (`GET /quote`, `POST /swap-tx`) | Quote COOK ⇄ any pooled token with route, venue, min-received, price impact and fee shown before you sign. The aggregator returns an unsigned v0 transaction; the app **simulates it on RPC**, then asks the wallet to sign, broadcasts, and confirms against the returned blockhash/height. |
| **Send COOK** | `SystemProgram.transfer` + Memo program | Native transfer with an on-chain memo, balance check, address validation. |
| **Your activity** | `getSignaturesForAddress` + `onAccountChange` websocket | Last 12 transactions for the connected wallet with status chips, memo, and Cookiescan links. Updates live when the account changes. |

Every transaction goes through the same lifecycle UI: **Build → Simulate → Sign → Broadcast → Confirm**, with the failing step highlighted and a plain-English error (wallet rejected, insufficient COOK, expired blockhash, network error).

## Wallets

Uses the [Wallet Standard](https://github.com/wallet-standard/wallet-standard) via `@solana/wallet-adapter-react` with no hard-coded adapters, so **Nightly**, Phantom, Backpack and any other standard-compliant wallet appear automatically. The app talks to Cookie Chain through its own `Connection` (`https://rpc.cookiescan.io`, ws `wss://wss.cookiescan.io`) and only asks the wallet to **sign**, so the wallet's own network setting doesn't matter. Keys never leave the wallet; nothing is custodial.

Need COOK? Bridge from Solana at https://hyperlane.cookiescan.io.

## Run locally

```bash
git clone https://github.com/ihassansattar/cookie-pulse
cd cookie-pulse
npm install
npm run dev        # http://localhost:5173/cookie-pulse/
```

Build and deploy to GitHub Pages:

```bash
npm run build      # → dist/
npm run deploy     # gh-pages -d dist
```

No environment variables, no backend, no API keys. Everything runs in the browser against public Cookie Chain endpoints.

## Stack

Vite 7 · React 19 · TypeScript · `@solana/web3.js` 1.98 · `@solana/wallet-adapter-react` · Recharts · `vite-plugin-node-polyfills` (Buffer for web3.js)

## Addresses and endpoints used

- Native COOK mint: `So11111111111111111111111111111111111111112` (9 decimals)
- Memo program: `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`
- RPC: `https://rpc.cookiescan.io` · WS: `wss://wss.cookiescan.io`
- Cookiescan REST/DAS: `https://api.cookiescan.io`
- Cookiebox swap router: `https://agg.cookiebox.app`
- Explorer: `https://cookiescan.io`

No custom program is deployed: the app composes existing Cookie Chain programs (System, Memo, and the DEX programs routed by Cookiebox).

## Project layout

```
src/
  lib/cookie.ts        constants, API clients, RPC pulse, formatters
  lib/useTx.ts         build → simulate → sign → send → confirm lifecycle hook
  components/
    Pulse.tsx          chain health + throughput chart
    Markets.tsx        pools table + venue liquidity chart
    Swap.tsx           quote + execute via Cookiebox aggregator
    Send.tsx           native transfer with memo
    Activity.tsx       wallet transaction feed (live)
    TxTracker.tsx      step tracker UI
  App.tsx              layout, wallet header, balance, shared token registry
  main.tsx             Connection / Wallet / Modal providers
```

## License

MIT
