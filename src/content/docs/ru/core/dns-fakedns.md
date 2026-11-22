---
title: Встроенный DNS и FakeDNS
description: "Полная настройка модуля dns и fakedns в Xray-core: типы апстримов DoH/DoQ, разделение доменов, expectedIPs, кэширование и FakeDNS."
order: 2
origSource: docs
origPath: /config/dns.html
origTitle: 内置 DNS 服务器
---

Встроенный DNS-сервер Xray отвечает за разрешение доменов при маршрутизации (`IPIfNonMatch` / `IPOnDemand`), при отправке трафика (`targetStrategy: "UseIP*"`) и при работе **DNS Outbound** (перехват системных DNS-запросов).

## Структура DnsObject {#dns-object} :orig[#dnsobject | DnsObject]

```jsonc
"dns": {
  "hosts": {
    "dns.google": ["8.8.8.8", "8.8.4.4"]
  },
  "servers": [
    "https+local://1.1.1.1/dns-query",
    {
      "address": "https+local://dns.alidns.com/dns-query",
      "domains": ["geosite:cn"],
      "expectedIPs": ["geoip:cn"],
      "skipFallback": true
    },
    "fakedns"
  ],
  "queryStrategy": "UseIP",
  "disableCache": false,
  "serveStale": true,
  "serveExpiredTTL": 86400,
  "disableFallback": false,
  "disableFallbackIfMatch": true,
  "tag": "dns-in"
}
```

- **`hosts`**: статическая таблица соответствий "домен → IP или другой домен" (срабатывает в первую очередь, до обращения к внешним серверам). :orig[~:hosts | hosts 静态映射]
- **`servers[]`**: упорядоченный список DNS-серверов (строки или объекты `DnsServerObject`). :orig[#dnsserverobject | DnsServerObject]
- **`queryStrategy`**: `"UseIP"` (A + AAAA), `"UseIPv4"`, `"UseIPv6"` или `"UseSystem"`. :orig[~:queryStrategy | queryStrategy]
- **`clientIp`**: префикс :term[ecs]{EDNS Client Subnet} для более точного географического ответа CDN. :orig[~:clientIp | clientIp / ECS]
- **`disableCache`** / **`serveStale`** / **`serveExpiredTTL`**: управление кэшем DNS и отдачей устаревшей записи из кэша с фоновым обновлением. :orig[~:serveStale | DNS 缓存]
- **`disableFallback`** / **`disableFallbackIfMatch`**: запретить опрос резервных DNS-серверов, если основной не ответил или уже совпал по домену. :orig[~:disableFallback | disableFallback]
- **`enableParallelQuery`**: опрашивать подходящие серверы параллельно. :orig[~:enableParallelQuery | 并行查询]
- **`tag`**: метка `inboundTag`, с которой исходящие запросы самого встроенного DNS попадают в таблицу маршрутизации `routing.rules`. :orig[~:tag | DNS tag]

## Форматы адресов DNS-серверов (`address`) {#dns-transports} :orig[#dns-服务器 | DNS 服务器协议]

| Формат `address` | Как идёт запрос |
| :--- | :--- |
| `https+local://1.1.1.1/dns-query` | :term[doh]{DoH} напрямую в сеть, минуя маршрутизатор Xray (быстро и без риска петель) |
| `https://1.1.1.1/dns-query` | DoH через маршрутизатор Xray (удобно пустить через `proxy` outbound) |
| `quic+local://dns.adguard-dns.com` | :term[doh]{DoQ} (DNS поверх QUIC) напрямую в сеть |
| `tcp+local://8.8.8.8` / `tcp://8.8.8.8` | DNS по TCP напрямую / через маршрутизатор |
| `8.8.8.8` | Обычный UDP DNS через маршрутизатор Xray |
| `fakedns` | Выдача фиктивного IP из модуля :term[fakedns]{FakeDNS} |
| `localhost` | Системный резолвер ОС |

## Поля DnsServerObject {#dns-server-object} :orig[#dnsserverobject | DnsServerObject]

- **`domains[]`**: список доменов (`geosite:`, `domain:`, `full:`, `regexp:`), которые должен обслуживать именно этот сервер.
- **`expectedIPs[]` / `unexpectedIPs[]`**: фильтр ответов по :term[cidr] или `geoip:`. Если сервер вернул неожиданный IP (например, страницу-заглушку провайдера), Xray отбросит ответ и спросит следующий сервер.
- **`skipFallback`** (`bool`): не использовать этот сервер при откате (fallback), только при прямом совпадении `domains`.
- **`timeoutMs`**: таймаут ожидания ответа в миллисекундах (по умолчанию `4000`).
- **`finalQuery`** (`bool`): не передавать запрос дальше по цепочке, даже если этот сервер вернул пустой ответ.

## Настройка FakeDNS (`fakedns`) {#fakedns-config} :orig[/config/fakedns.html#fakednsobject | FakeDNSObject]

```jsonc
"fakedns": [
  { "ipPool": "198.18.0.0/15", "poolSize": 65535 },
  { "ipPool": "fc00::/18", "poolSize": 65535 }
]
```

- **`ipPool`**: подсеть :term[cidr], из которой выдаются фиктивные адреса.
- **`poolSize`**: максимальное количество одновременно хранимых пар "домен ↔ фиктивный IP" (LRU-кэш).
- Для работы в `dns.servers` добавляется `"fakedns"`, а на принимающем `inbound` (например, `tun` или `tunnel`) включается `sniffing.destOverride: ["fakedns"]`.
