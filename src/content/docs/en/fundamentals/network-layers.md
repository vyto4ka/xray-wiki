---
title: Network Layers, IP, Ports, and MTU
description: "Core anatomy of a network packet: IPv4/IPv6, CIDR subnets, ports, Unix Domain Sockets, and MTU/MSS."
order: 1
origSource: docs
origPath: /config/
origTitle: 配置文件
---

You do not need a full networking textbook to configure Xray-core confidently. Understanding how IP addresses, ports, and packet sizes work makes every config option clear.

## IP Addresses and CIDR Subnets {#ip-cidr}

Every host on a network has an **IP address**:

- **IPv4** — four octets (`203.0.113.10`).
- **IPv6** — 128-bit hexadecimal address (`2001:db8::1`).
- **Private (RFC 1918) addresses** — reserved for local networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `127.0.0.0/8`), matched in Xray routing via `geoip:private`.

**CIDR** (Classless Inter-Domain Routing) defines an IP range with a prefix length:

| CIDR | Scope | Where used in Xray |
| :--- | :--- | :--- |
| `203.0.113.10/32` | Single IPv4 host | Exact rule in `routing.rules` |
| `192.168.1.0/24` | 256 addresses | LAN bypass rules |
| `198.18.0.0/15` | 131,072 addresses | Default IPv4 pool for :term[fakedns] |
| `0.0.0.0/0` and `::/0` | All IPv4 / IPv6 traffic | WireGuard `allowedIPs` |

## Ports, Sockets, and Unix Domain Sockets {#ports-sockets}

**Ports** (`1`–`65535`) separate multiple services sharing one IP address. Port `443` is standard for HTTPS (:term[tcp] and :term[quic]) and blends in best with regular web traffic.

**Unix Domain Sockets (UDS)** connect processes on the same Linux host without going through the TCP/IP stack:

- **File socket:** `/run/xray/vless.sock`
- **Abstract Linux socket:** `@xray-vless`

## Packet Size: MTU and MSS {#mtu-mss}

**MTU** (Maximum Transmission Unit) is the largest IP packet that can cross a link without fragmentation (normally `1500` bytes on Ethernet). Tunnel headers (:term[tun], WireGuard, mKCP) add overhead, so tunnel interfaces typically use `1420` or `1280–1350`.

**MSS** (Maximum Segment Size) limits TCP payload per segment and can be tuned via `sockopt.tcpMaxSeg`.
