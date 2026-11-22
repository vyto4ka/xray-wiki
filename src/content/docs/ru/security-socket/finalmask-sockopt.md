---
title: FinalMask и Sockopt
description: Слой обфускации и QUIC-тюнинга FinalMask (fragment, noise, salamander, sudoku, udphop, quicParams) и все системные опции сокетов Sockopt.
order: 2
origSource: docs
origPath: /config/transports/finalmask.html
origTitle: FinalMask
---

**`finalmask`** и **`sockopt`** — два нижних слоя внутри `streamSettings`, которые работают непосредственно перед выходом пакетов в сетевую карту ОС.

## FinalMask: обфускация пакетов и тюнинг QUIC {#finalmask} :orig[#finalmaskobject | FinalMaskObject]

**FinalMask** задаёт модульный конвейер масок для уже сформированного потока `TCP` или `UDP`. Маски можно выстраивать в цепочку (массивы `tcp[]` и `udp[]`).

### Маски TCP (`finalmask.tcp[]`) {#tcp-mask} :orig[#tcpmask | TCPMask]

- **`fragment`**: разбивает первый TLS `ClientHello` (или указанный диапазон пакетов) на мелкие TCP-фрагменты со случайной длиной и задержкой, мешая простым :term[dpi] прочитать :term[sni]. :orig[#fragment | fragment 分片]
- **`header-custom`**: добавление произвольного байтового префикса к TCP-потоку. :orig[#header-custom | header-custom]
- **`sudoku`**: ASCII-обфускация потока на базе алгоритма Sudoku. :orig[sudoku: | Sudoku 混淆]
- **`filter`**: фильтрация пакетов. :orig[#filter | filter]

### Маски UDP (`finalmask.udp[]`) {#udp-mask} :orig[#udpmask | UDPMask]

- **`noise`**: отправка нескольких случайных стартовых UDP-пакетов перед рукопожатием (сбивает сигнатуры WireGuard/QUIC и помогает пробить NAT). :orig[#noise | UDP noise]
- **`salamander`** и **`gecko`**: быстрая XOR-обфускация UDP-пакетов (аналог обфускатора Hysteria 2). :orig[#salamander | salamander]
- **`mkcp-legacy`**: классические маски заголовков mKCP (`dns` для подмены под DNS-запрос, `dtls`, `srtp`, `utp` для BitTorrent, `wechat`, `wireguard`). :orig[#mkcp-legacy | mkcp-legacy]
- **`udphop`**: динамическая смена целевых UDP-портов по интервалу (Port Hopping), не дающая DPI привязаться к одному долгоживущему UDP-порту. :orig[#udphop | udphop 端口跳跃]
- **`xdns` / `xicmp`**: туннелирование поверх DNS- или ICMP-пакетов. Также для UDP доступны **`sudoku`**, **`realm`**, **`header-custom`** и **`filter`**. :orig[#xdns | xdns / xicmp]

### Параметры QUIC (`finalmask.quicParams`) {#quic-params} :orig[#quicparams | quicParams]

Управляют поведением :term[quic] (в частности, в `Hysteria` и `MASQUE`):

| Параметр `quicParams` | Назначение |
| :--- | :--- |
| `congestion` | Алгоритм управления перегрузкой: `"reno"` \| `"bbr"` \| `"brutal"` \| `"force-brutal"` (см. :term[bbr]) |
| `bbrProfile` | Профиль BBR: `"conservative"` \| `"standard"` \| `"aggressive"` |
| `brutalUp` / `brutalDown` | Целевая полоса для режима Brutal (например, `"100 mbps"`) |
| `udpHop` | Прыжки по портам: `{ "ports": "20000-50000", "interval": 30 }` |
| `initStreamReceiveWindow` / `maxStreamReceiveWindow` | Начальный и максимальный размер окна приёма потока QUIC |
| `initConnectionReceiveWindow` / `maxConnectionReceiveWindow` | Начальный и максимальный размер окна приёма соединения |
| `maxIdleTimeout` / `keepAlivePeriod` | Таймаут простоя и период keep-alive (секунды) |
| `disablePathMTUDiscovery` | Отключить автоподбор :term[mtu] по пути (Path MTU Discovery) |

## Sockopt: системные опции сокетов ОС {#sockopt} :orig[/config/transports/sockopt.html#sockoptobject | SockoptObject]

```jsonc
"sockopt": {
  "mark": 255,
  "tproxy": "off",
  "dialerProxy": "",
  "domainStrategy": "AsIs",
  "tcpFastOpen": false,
  "tcpcongestion": "bbr",
  "tcpMptcp": false,
  "tcpKeepAliveIdle": 300,
  "happyEyeballs": {
    "tryDelayMs": 250,
    "prioritizeIPv6": false,
    "interleave": 2,
    "maxConcurrentTry": 4
  }
}
```

- **`mark`** (`number`, Linux): устанавливает метку ядра :term[fwmark] (`SO_MARK`) на исходящих сокетах для защиты от петель при прозрачном прокси. :orig[/config/transports/sockopt.html~:mark | SO_MARK]
- **`tproxy`**: включает прозрачный приём на `inbound`. Допустимые значения: `"redirect"` (только TCP), `"tproxy"` (TCP + UDP, см. :term[tproxy]) или `"off"`. :orig[/config/transports/sockopt.html~:tproxy | tproxy]
- **`dialerProxy`**: **каскадирование прокси**. Указывает `tag` другого `outbound`, через который пойдёт этот транспорт (например, чтобы пустить `VLESS+REALITY` через промежуточный сервер или WireGuard). :orig[/config/transports/sockopt.html~:dialerProxy | dialerProxy 链式代理]
- **`penetrate`** (`bool`): в `XHTTP` при разделении каналов пробрасывает `sockopt` с восходящего канала в `downloadSettings`.
- **`domainStrategy`**: способ преобразования домена сервера перед подключением (`"AsIs"`, `"UseIP"`, `"UseIPv4"`, `"UseIPv6"`, `"UseIPv4v6"`, `"UseIPv6v4"`, `"ForceIP*"`). :orig[/config/transports/sockopt.html~:domainStrategy | domainStrategy]
- **`addressPortStrategy`**: динамическое чтение IP и порта из DNS-записей `SRV` или `TXT` (`SrvPortOnly`, `SrvAddressOnly`, `SrvPortAndAddress`, `Txt*`). :orig[/config/transports/sockopt.html~:addressPortStrategy | addressPortStrategy]
- **`interface`** / **`V6Only`**: жёсткая привязка сокета к сетевому интерфейсу (например, `eth0`) и режим только IPv6. :orig[/config/transports/sockopt.html~:interface | 绑定网卡]
- **`acceptProxyProtocol`** / **`trustedXForwardedFor`**: приём :term[proxy-protocol] и доверенные адреса для заголовка `X-Forwarded-For`. :orig[/config/transports/sockopt.html~:acceptProxyProtocol | acceptProxyProtocol]
- **Тюнинг TCP:** `tcpFastOpen` (TFO), `tcpMaxSeg` (:term[mtu]{MSS}), `tcpcongestion` (`"bbr"`), `tcpMptcp` (Multipath TCP), `tcpKeepAliveIdle`, `tcpKeepAliveInterval`, `tcpUserTimeout`, `tcpWindowClamp` и универсальный массив `customSockopt[]` (`system`, `network`, `type`, `level`, `opt`, `value`). :orig[/config/transports/sockopt.html~:tcpFastOpen | TCP 优化选项]
- **`happyEyeballs`**: алгоритм быстрого параллельного перебора IPv4/IPv6 адресов (`tryDelayMs`, `prioritizeIPv6`, `interleave`, `maxConcurrentTry`). :orig[/config/transports/sockopt.html#happyeyeballsobject | HappyEyeballsObject]
