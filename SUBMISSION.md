# Superteam Earn submission — "Create an App on Cookie Chain"

Listing: https://superteam.fun/earn/listing/create-an-app-on-cookie-chain-app
Deadline: 22 Sep 2026, 21:59 UTC

## Form answers

**Live application URL**
https://ihassansattar.github.io/cookie-pulse/

**GitHub repository**
https://github.com/ihassansattar/cookie-pulse

**Relevant program, contract, token, or application addresses**
No custom program deployed. The app composes existing Cookie Chain programs:
- System Program (native COOK transfers)
- Memo Program `MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr`
- DEX programs routed by the Cookiebox aggregator (Cookiebox DAMM `DAMMjDCEFTDkt7ywazZS8GoaLtjb3HaJo3pLbf64xrPY`, Cookiebox CLMM `CLMMmWqTtyNSomqXP3kETJy2SGKPdr31USsm4GfbLyKs`, CookieSwap, Meteora)
- Native COOK mint `So11111111111111111111111111111111111111112`
Endpoints: rpc.cookiescan.io, wss.cookiescan.io, api.cookiescan.io, agg.cookiebox.app

**Short description (otherInfo)**
Cookie Pulse is a one-screen cApp for Cookie Chain: live chain health (slot, epoch, TPS chart, COOK price), every DEX pool ranked by liquidity with a per-venue chart, COOK ⇄ token swaps routed by the Cookiebox aggregator, native COOK transfers with memo, and a live activity feed for the connected wallet. Every transaction runs through a visible Build → Simulate → Sign → Broadcast → Confirm tracker with plain-English errors. Wallet Standard means Nightly, Phantom and Backpack connect with no adapters; the app signs only, and sends through its own Cookie Chain RPC connection. Open source, MIT, no backend, no keys.

**Tweet / X thread link**
(paste after posting — see thread below)

## X thread (post from your account, tag @TheCookieChain)

1/ Shipped 🍪 Cookie Pulse: a one-screen cApp for @TheCookieChain.

Chain health, every DEX pool, swap, send, and a live wallet feed. Nightly + Phantom just work.

Live: ihassansattar.github.io/cookie-pulse
Code: github.com/ihassansattar/cookie-pulse

2/ Chain pulse: slot, epoch progress, TPS over the last 30 min, COOK price, indexed assets, all straight from rpc.cookiescan.io. Refreshes every 10s. It's the fastest way to see Cookie Chain is alive at sub-second finality.

3/ Liquidity: all 160 pools across Cookiebox DAMM/CLMM, CookieSwap and Meteora ranked by USD, with a per-venue chart. Hit "Swap" on any row and the pair is pre-filled.

4/ Swap: quotes from the Cookiebox aggregator (agg.cookiebox.app) show route, venue, min received, price impact and fee BEFORE you sign. The unsigned tx is simulated on RPC first, so a bad route fails in the UI, not in your wallet.

5/ Every tx shows Build → Simulate → Sign → Broadcast → Confirm. The failing step lights up red with a human error: "insufficient COOK", "you rejected in wallet", "expired, nothing charged". No more staring at a spinner.

6/ Send COOK with an on-chain memo, and watch it appear in your activity feed live via websocket. Links go straight to cookiescan.io.

7/ How to try it: install @nightly_app, bridge COOK from Solana at hyperlane.cookiescan.io, open the app, connect, swap 1 COOK for bCOOK. Takes a minute.

8/ Stack: Vite + React + TS, @solana/web3.js, wallet-standard, Recharts. No backend, no keys, no custom program: it composes what's already on Cookie Chain. MIT licensed, fork it.

Built for the Superteam Earn "Create an App on Cookie Chain" bounty. 🍪

## Telegram post (t.me/TheCookieNetChain)

Hey builders 👋 shipped Cookie Pulse for the Superteam bounty: chain health + all DEX pools + swap via Cookiebox agg + send with memo + live wallet feed, one screen, Nightly/Phantom supported.

Live: https://ihassansattar.github.io/cookie-pulse/
Code: https://github.com/ihassansattar/cookie-pulse
Thread: <X thread link>

Feedback welcome, especially from anyone running a validator or a pool.

## Your steps (only you can do these)

1. Optional but strongly recommended before submitting: bridge a few COOK, connect Nightly on the live site, do one swap and one send so the activity feed has real history and you've confirmed the flow end to end. If anything fails, paste me the error text.
2. Post the X thread from your account, tag @TheCookieChain and @nightly_app. Copy the link of tweet 1.
3. Post the Telegram message in the Cookie Chain group.
4. On the listing page click Submit, paste the four answers above plus the thread link.
