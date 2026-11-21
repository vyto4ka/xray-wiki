---
title: "XHTTP: Beyond REALITY"
description: "Full reference for Xray's native HTTP transport: auto/packet-up/stream-up/stream-one modes, XMUX multiplexing, uplink/downlink split, and every extra parameter."
order: 2
badge: new
origSource: xhttp
origPath: ''
origTitle: "XHTTP: Beyond REALITY (#4113)"
---

**XHTTP** (formerly *SplitHTTP*) is Xray-core's native HTTP transport spanning **HTTP/1.1**, **HTTP/2**, and **HTTP/3 (:term[quic])**. It traverses :term[cdn] networks and reverse proxies (Nginx, Caddy), pairs with **REALITY** or **VLESS Encryption**, and supports full **uplink/downlink traffic separation**.

## Four Transport Modes (`mode`) {#xhttp-modes} :orig[~:STREAM-UP/ONE | XHTTP 传输模式]

- **`auto`** *(default)* — client picks `stream-up` on TLS H2, `stream-one` on REALITY (without `downloadSettings`), otherwise `packet-up`; server accepts all three.
- **`packet-up`** — chunked `POST /path/<uuid>/<seq>` uplink + streaming `GET` downlink (:term[sse]); passes strict buffering CDNs and HTTP/3.
- **`stream-up`** — streaming `POST` uplink (with :term[grpc] header for Cloudflare) + streaming `GET` downlink.
- **`stream-one`** — single bidirectional `POST /path/` stream.

## HTTP Version Selection (H1 / H2 / H3) {#http-version-selection} :orig[~:对于 XHTTP 客户端 | HTTP 版本选择]

Clients default to **HTTP/2** over TLS/REALITY, switch to `HTTP/1.1` if `alpn: ["http/1.1"]`, and use **HTTP/3 (quic-go)** when `alpn: ["h3"]`.

## Core Fields & `extra` Container {#xhttp-config} :orig[~:downloadSettings | XHTTP 完整配置]

Top-level fields are `host` (priority `host > serverName > address`), `path`, `mode`, and `extra` (raw JSON object shared as a single `extra` query parameter in `vless://` links).

## XMUX Multiplexer (`extra.xmux`) {#xmux} :orig[~:XMUX | XMUX 多路复用]

Controls 0-RTT :term[multiplexing] and rotation on H2/H3: `maxConcurrency` (default `"16-32"`), `maxConnections`, `cMaxReuseTimes`, `hMaxRequestTimes` (`"600-900"`), `hMaxReusableSecs` (`"1800-3000"`), and `hKeepAlivePeriod` (single integer, no range allowed). Setting any single field disables the automatic defaults for the remaining fields.

## Uplink / Downlink Separation (`downloadSettings`) {#uplink-downlink-split} :orig[~:上下行分离 | 上下行分离]

`extra.downloadSettings` is a complete independent `streamSettings` object plus `address` and `port` (same `path`, `network: "xhttp"`). You can send uplink over IPv4 TCP H2 and receive downlink over IPv6 QUIC H3, or split traffic across two CDNs / REALITY entry servers. Set `sockopt.penetrate: true` on uplink to inherit socket options (such as `mark`) on downlink.

## Detailed `extra` & `config.proto` Parameters {#xhttp-extra-fields} :orig[xhttpProto: | splithttp/config.proto]

### Buffering & Timing (`packet-up` / `stream-up`) {#xhttp-buffering}

- `scMaxEachPostBytes` (`1000000`), `scMinPostsIntervalMs` (`30`, client), `scMaxBufferedPosts` (`30`, server), `scStreamUpServerSecs` (`"20-80"`, server), `uplinkChunkSize`, `serverMaxHeaderBytes`.

### Headers & Proxy Compatibility {#xhttp-headers}

- `headers`, `noGRPCHeader` (client, keep `false` for Cloudflare/Nginx `grpc_pass`), `noSSEHeader` (server, keep `false` to prevent response buffering), `uplinkHTTPMethod`, `h2Params`.

### Flexible Padding (`xPadding*`) {#xhttp-padding}

- `xPaddingBytes` (`"100-1000"`), `xPaddingObfsMode`, `xPaddingPlacement`, `xPaddingKey`, `xPaddingHeader`, `xPaddingMethod`.

### Custom Metadata Placement (`sessionID*`, `seq*`, `uplinkData*`) {#xhttp-placement}

- `sessionIDPlacement`, `sessionIDKey`, `sessionIDTable`, `sessionIDLength`, `seqPlacement`, `seqKey`, `uplinkDataPlacement`, `uplinkDataKey`.

## Nginx Reverse Proxy Example {#xhttp-nginx} :orig[~:Nginx 推荐 grpc_pass | Nginx 反代配置]

```nginx
location /yourpath {
    grpc_pass grpc://127.0.0.1:20000;
    grpc_set_header Host $host;
    grpc_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    client_max_body_size 0;
}
```
