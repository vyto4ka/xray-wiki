---
title: Glossary of terms
description: "Plain-language explanations of common networking and Xray-core jargon: multiplexing, padding, obfuscation, sniffing, fallback, entropy, and more."
order: 8
badge: A–Z
origSource: docs
origPath: /config/
origTitle: 术语表
---

Networking and proxy docs rely on compact technical terms for straightforward mechanisms. Here are the ones you will run into most often.

## Multiplexing (Mux / XMUX) {#multiplexing}

Carrying multiple independent streams (browser tabs, assets, API requests) inside a **single** underlying :term[tcp] or :term[quic] connection to avoid repeated handshakes (0-:term[rtt]). In Xray, legacy `mux.cool` is incompatible with XTLS Vision, whereas **XHTTP** uses **XMUX** with automatic connection rotation.

## Padding {#padding}

Appending random dummy bytes to packets, headers, or handshakes so :term[dpi] systems cannot fingerprint fixed message sizes. Used in `XTLS Vision`, `VLESS Encryption`, and `XHTTP` (`xPaddingBytes`).

## Obfuscation {#obfuscation}

Changing the wire appearance of proxy traffic so observers cannot distinguish it from benign protocols — ranging from XOR/noise wrappers (`FinalMask`) to full protocol mimicry (`REALITY`, `XHTTP`).

## Handshake {#handshake}

The initial exchange of control messages between client and server to open a connection, verify identity, and establish session keys before application data flows.

## Sniffing {#sniffing}

Inspecting the first bytes of an inbound connection in Xray (TLS :term[sni], HTTP `Host`, :term[quic], or :term[fakedns]) to recover the real target domain for domain-based routing rules (`geosite:`).

## Fallback {#fallback}

Redirecting unauthenticated or unmatched connections to a legitimate web server (protecting against :term[active-probing]) or failing over to a backup outbound (`fallbackTag`).

## Fragmentation {#fragmentation}

Intentionally splitting the initial TCP packet (usually TLS `ClientHello`) into small fragments with slight delays (`finalmask.tcp` `fragment`) to bypass simple stateless SNI filters.

## Traffic entropy {#entropy}

A measure of byte randomness. Raw encrypted protocols without a TLS wrapper look like uniform random noise from byte zero and are easier for DPI to flag than structured TLS/HTTP traffic.

## Domain fronting {#domain-fronting}

Using one CDN hostname in the plaintext TLS :term[sni] and a different hostname in the encrypted HTTP `Host` header.

## MITM (man-in-the-middle) {#mitm}

An active attacker positioned on the network path who intercepts and attempts to forge or inspect traffic using a substitute certificate. Mitigated by certificate pinning (`pinnedPeerCertSha256`), **REALITY**, and post-quantum :term[mldsa65].

## Keep-alive {#keepalive}

Periodic lightweight probes sent over idle connections so NAT routers, firewalls, or CDNs do not drop them (`tcpKeepAliveIdle`, `hKeepAlivePeriod`, `heartbeatPeriod`).

## Stateless protocol {#stateless}

A protocol (like **VLESS**) where every new connection carries all authentication metadata without requiring synchronized clocks or shared session state.

## Proxy chain (`dialerProxy`) {#cascade}

Tunneling one outbound through another (`streamSettings.sockopt.dialerProxy`) so traffic hops through a relay server before reaching the final exit node.
