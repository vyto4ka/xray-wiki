---
title: VLESS & VLESS Encryption
description: Complete breakdown of VLESS inbound/outbound fields, UUIDv5 mapping, fallbacks, built-in reverse proxy, and post-quantum VLESS Encryption.
order: 1
badge: core
origSource: docs
origPath: /config/inbounds/vless.html
origTitle: VLESS
---

**VLESS** is Xray-core's stateless, lightweight proxy protocol. Unlike VMess, it does not rely on system clock synchronization and avoids redundant encryption by delegating transport security to :term[tls]{TLS 1.3}, **REALITY**, or native **VLESS Encryption**.

## How VLESS works {#how-vless-works} :orig[#vless | VLESS 协议]

Each connection begins with a minimal header carrying protocol version, a 16-byte :term[uuid], target address/port, and command type. Running VLESS with `security: "none"` on public networks is prohibited unless native **VLESS Encryption** is enabled.

## Server settings (inbound) {#vless-inbound} :orig[#inboundconfigurationobject | InboundConfigurationObject]

- **`clients[].id`**: user :term[uuid] (`xray uuid`) or any custom string under 30 bytes deterministically mapped to `UUIDv5`. :orig[uuidMap: | UUIDv5 映射标准]
- **`clients[].flow`**: `"xtls-rprx-vision"` for `RAW + REALITY/TLS` or `VLESS Encryption`. Leave `""` for `XHTTP` / `WS` / `gRPC` without VLESS Encryption. :orig[~:flow | 流控模式]
- **`clients[].email`** / **`level`**: user label for stats/routing and `policy.levels` mapping.
- **`clients[].reverse`**: built-in VLESS reverse proxy (`{ "tag": "r-outbound" }`). :orig[~:reverse | VLESS 极简反向代理]
- **`decryption`**: `"none"` or server **VLESS Encryption** string (`xray vlessenc`). :orig[~:decryption | 解密设置]
- **`fallbacks[]`**: fallback routing rules for unauthenticated traffic (cannot be combined with `decryption ≠ "none"`). :orig[/config/features/fallback.html | Fallback 回落]

## Client settings (outbound) {#vless-outbound} :orig[/config/outbounds/vless.html#outboundconfigurationobject | OutboundConfigurationObject]

- **`address`** & **`port`**: server hostname/IP and port.
- **`id`**: client :term[uuid].
- **`encryption`**: `"none"` (explicitly required when disabled) or client **VLESS Encryption** string. :orig[/config/outbounds/vless.html~:encryption | 加密设置]
- **`flow`**: `"xtls-rprx-vision"` (blocks outbound UDP/443 QUIC so browsers fall back to TCP TLS 1.3 and enable :term[splice]) or `"xtls-rprx-vision-udp443"`. :orig[/config/outbounds/vless.html~:flow | 客户端 flow]

## Fallbacks {#fallbacks} :orig[/config/features/fallback.html#fallbackobject | FallbackObject]

Routes non-VLESS traffic on port `443` to a real web server using `name` (:term[sni]), `alpn` (:term[alpn]), `path`, `dest` (port / `ip:port` / :term[uds]), and `xver` (:term[proxy-protocol] version `0`/`1`/`2`).

## Post-quantum VLESS Encryption {#vless-encryption} :orig[vlessEnc: | VLESS Encryption PR #5067]

Combines :term[mlkem768] + :term[x25519] for :term[pfs]{forward secrecy}, replay protection, **0-RTT** tickets, and full `XTLS Vision` compatibility across any transport (including `XHTTP` over :term[cdn]). Generate ready-to-use `decryption` and `encryption` strings with `xray vlessenc`.
