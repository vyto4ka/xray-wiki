---
title: Все остальные протоколы (Inbound и Outbound)
description: "Сводный справочник всех прокси- и сервисных протоколов Xray-core помимо VLESS: TUN, Tunnel, Freedom, Blackhole, Shadowsocks 2022, Trojan, VMess, WireGuard, Hysteria, MASQUE, SOCKS и HTTP."
order: 1
origSource: docs
origPath: /config/inbounds/
origTitle: 入站与出站协议
---

Помимо **VLESS**, Xray-core включает полный набор локальных, сервисных и сетевых протоколов для построения любых схем — от прозрачного роутера до выхода через Cloudflare WARP.

## Системные и сервисные протоколы {#service-protocols}

### TUN (`protocol: "tun"`, Inbound) {#tun-protocol} :orig[/config/inbounds/tun.html | TUN 入站]

Создаёт виртуальную сетевую карту :term[tun] в ОС для перехвата всего системного трафика:
- `name` (имя интерфейса), `desc`, `mtu` (обычно `1500` или `1280`–`1420`), `gateway[]`, `dns[]`, `userLevel`.
- Автоматическая настройка ОС: `autoSystemRoutingTable[]`, `autoOutboundsInterface`, `autoSystemDnsToGateway`, `autoSystemWfpBlockLeak[]` (блокировка утечек через Windows Filtering Platform).

### Tunnel / Dokodemo-Door (`protocol: "tunnel"`, Inbound) {#tunnel-protocol} :orig[/config/inbounds/tunnel.html | Tunnel 入站]

Проброс портов и приём трафика прозрачного прокси (:term[tproxy] / `REDIRECT`):
- `allowedNetwork` (`"tcp"` | `"udp"` | `"tcp,udp"`), `rewriteAddress`, `rewritePort`, `portMap`, `followRedirect` (`true` для прозрачного прокси), `userLevel`.

### Freedom (`protocol: "freedom"`, Outbound) {#freedom-protocol} :orig[/config/outbounds/freedom.html | Freedom 出站]

Выпускает трафик напрямую в интернет (обычно главный выход на сервере и прямой выход `direct` на клиенте):
- `redirect` (принудительная переадресация на `host:port`), `proxyProtocol` (`0` | `1` | `2`), `userLevel`.
- **`finalRules[]`** (`FinalRuleObject`) — встроенный файрвол на выходе (`action`: `"allow"` | `"block"`, `network`, `port`, `ip[]`, `blockDelay` — искусственная задержка перед сбросом сканеров).

### Blackhole, Loopback и DNS Outbound {#utility-outbounds} :orig[/config/outbounds/blackhole.html | Blackhole / Loopback / DNS]

- **Blackhole** (`protocol: "blackhole"`) — молчаливо обрывает соединение (блокировка рекламы, BitTorrent или нежелательных стран); `response.type`: `"none"` | `"http"`.
- **Loopback** (`protocol: "loopback"`) — возвращает соединение обратно в маршрутизатор с заданным `inboundTag` и `sniffing`. :orig[/config/outbounds/loopback.html | Loopback]
- **DNS Outbound** (`protocol: "dns"`) — перехватывает DNS-трафик (обычно с порта 53) и отправляет его во встроенный DNS-сервер Xray (`rewriteNetwork`, `rewriteAddress`, `rewritePort`, `rules[]`: `action` `"direct"` | `"hijack"` | `"drop"` | `"return"`, `qType`, `rCode`, `domain`). :orig[/config/outbounds/dns.html | DNS 出站]

## Прокси- и VPN-протоколы {#proxy-protocols}

| Протокол | Направление | Ключевые параметры и особенности |
| :--- | :---: | :--- |
| **Shadowsocks / SS-2022** :orig[/config/inbounds/shadowsocks.html \| Shadowsocks] | In / Out | Классические :term[aead] и современные **Shadowsocks 2022** (`2022-blake3-aes-128-gcm`, `2022-blake3-aes-256-gcm`, `2022-blake3-chacha20-poly1305`) с многопользовательским EIH (`users[]`), `method`, `password`, `network` |
| **Trojan** :orig[/config/inbounds/trojan.html \| Trojan] | In / Out | Авторизация по SHA-224 хэшу `password` поверх TLS/REALITY; сервер поддерживает `users[]` и `fallbacks[]` |
| **VMess** :orig[/config/inbounds/vmess.html \| VMess] | In / Out | Авторизация по :term[uuid] с привязкой к системному времени; на клиенте `security` (`"auto"`, `"aes-128-gcm"`, `"chacha20-poly1305"`, `"none"`, `"zero"`) |
| **WireGuard** :orig[/config/outbounds/wireguard.html \| WireGuard] | In / Out | `secretKey`, `address[]`, `mtu`, `noKernelTun`, `reserved` (`[b1, b2, b3]` для Cloudflare WARP), `remoteDNS`, `peers[]` (`endpoint`, `publicKey`, `preSharedKey`, `keepAlive`, `allowedIPs`) |
| **Hysteria 2** :orig[/config/inbounds/hysteria.html \| Hysteria] | In / Out | `version: 2`, `users[].auth` (Inbound), `address`, `port` (Outbound); работает в паре с `streamSettings.network: "hysteria"` и `finalmask.quicParams` |
| **MASQUE** :orig[/config/inbounds/masque.html \| MASQUE] | In / Out | `RFC 9484` поверх HTTP/3; `users[]`, `address[]`, `mtu` (Inbound), `address`, `port`, `remoteDNS` (Outbound); работает в паре с `masqueSettings` |
| **SOCKS / HTTP** :orig[/config/inbounds/socks.html \| Socks / HTTP] | In / Out | Локальные прокси-входы и каскадные выходы: `auth` (`"noauth"` \| `"password"`), `users[]`, `udp`, `ip`, `allowTransparent`, `headers` |
