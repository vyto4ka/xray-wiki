---
title: "REALITY: protocol & complete parameter reference"
description: How REALITY eliminates server-side TLS fingerprints without owning a domain, spiderX crawler behavior, and every realitySettings field.
order: 3
badge: main
origSource: docs
origPath: /config/transports/reality.html
origTitle: REALITY
---

**REALITY** replaces standard server-side :term[tls], eliminating server TLS fingerprints and certificate-chain attacks while letting you borrow a legitimate external site's TLS identity without buying a domain.

## How REALITY works {#how-reality-works} :orig[reality: | REALITY 原理]

Unauthenticated browsers and :term[active-probing] scanners are transparently forwarded to the real `target` website. Authenticated Xray clients embed an :term[x25519]-based token inside their :term[utls]-mimicked `ClientHello` and receive a temporary trusted certificate (optionally signed with post-quantum :term[mldsa65]).

## Choosing a good `target` {#choosing-target} :orig[reality:~:目标网站最低标准 | 目标网站选择标准]

Pick an unblocked site supporting **TLS 1.3** and **HTTP/2 (`h2`)** without forced domain redirects (verify with `xray tls ping example.com`). Low latency to your VPS and :term[ocsp]{OCSP Stapling} are strong bonuses.

## Server parameters (`realitySettings` in inbound) {#server-params} :orig[#realityobject | 服务端 RealityObject]

- **`target`** *(required, formerly `dest`)*: real website or local server address (`www.example.com:443`).
- **`serverNames`** *(required)*: allowed :term[sni] hostnames (wildcards `*` are not supported).
- **`privateKey`** *(required)*: server :term[x25519] private key (`xray x25519`).
- **`shortIds`** *(required)*: allowed even-length hex client IDs (0–16 hex chars, include `""` to allow an empty `shortId`).
- **`xver`**: :term[proxy-protocol] version (`0` for external websites, `1`/`2` for local servers).
- **`mldsa65Seed`**: optional post-quantum :term[mldsa65] signature seed (`xray mldsa65`).
- **`minClientVer` / `maxClientVer` / `maxTimeDiff` / `show`**: client version bounds, max clock skew (ms), and debug logging.
- **`limitFallbackUpload` / `limitFallbackDownload`**: fallback rate limiting (`afterBytes`, `bytesPerSec`, `burstBytesPerSec`).

## Client parameters (`realitySettings` in outbound) {#client-params} :orig[#realityobject | 客户端 RealityObject]

- **`serverName`** (`sni`): one of the server's `serverNames`.
- **`password`** (`pbk`, formerly `publicKey`): server's :term[x25519] public key.
- **`fingerprint`** (`fp`, required): :term[utls] browser profile (`"chrome"` recommended).
- **`shortId`** (`sid`): one of the server's `shortIds`.
- **`mldsa65Verify`** (`pqv`): server's :term[mldsa65] public verification key.
- **`spiderX`** (`spx`): initial crawler path used if the client receives the real `target` certificate.
- **`show`**: enable client debug logs.
