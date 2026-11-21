---
title: Inbound, Outbound, Sniffing, Mux и Policy
description: Общие поля всех входящих и исходящих модулей Xray-core, определение доменов (Sniffing), Mux, политики, статистика и gRPC API.
order: 1
origSource: docs
origPath: /config/inbound.html
origTitle: 入站代理
---

Каждый элемент массивов `inbounds[]` и `outbounds[]` имеет единую оболочку, внутри которой в поле `settings` лежит конфигурация конкретного протокола (`vless`, `freedom`, `tun`, `socks` и др.).

## InboundObject и Sniffing {#inbound-object} :orig[#inboundobject | InboundObject]

```jsonc
{
  "tag": "in-socks",
  "listen": "127.0.0.1",
  "port": 1080,
  "protocol": "socks",
  "settings": {},
  "streamSettings": {},
  "sniffing": {
    "enabled": true,
    "destOverride": ["http", "tls", "quic", "fakedns"],
    "metadataOnly": false,
    "routeOnly": false,
    "domainsExcluded": []
  }
}
```

- **`listen`** — IP-адрес прослушивания (`"0.0.0.0"`, `"::"`, `"127.0.0.1"`), файловый путь или абстрактный :term[uds] (`"@xray"`). :orig[~:listen | listen]
- **`port`** — число (`443`), диапазон (`"1000-2000"`) или переменная окружения (`"env:PORT"`). :orig[~:port | port]
- **`tag`** — уникальное имя входа, по которому на него ссылаются правила `routing` (`inboundTag`) и статистика. :orig[~:tag | tag]
- **`sniffing`** (`SniffingObject`) — анализ первых байтов входящего соединения для восстановления настоящего доменного имени из HTTP `Host`, TLS :term[sni], QUIC или таблицы :term[fakedns]: :orig[#sniffingobject | SniffingObject]
  - `enabled` (`bool`) — включить определение домена.
  - `destOverride` — источники имени: `"http"`, `"tls"`, `"quic"`, `"fakedns"`.
  - `metadataOnly` (`bool`) — брать имя только из метаданных (`fakedns`) без чтения первых байтов пакета.
  - `routeOnly` (`bool`) — использовать определённый домен **только для правил маршрутизации**, но подключаться к исходному IP-адресу (полезно, если DNS на сервере отличается от клиентского).
  - `domainsExcluded` / `ipsExcluded` — списки доменов или IP, для которых подмена цели отключена.

## OutboundObject и Mux {#outbound-object} :orig[/config/outbound.html#outboundobject | OutboundObject]

- **`tag`** — имя выхода для маршрутизации (`outboundTag` / `balancerTag`). Первый элемент массива `outbounds[]` является выходом по умолчанию, если не сработало ни одно правило. :orig[/config/outbound.html~:tag | tag]
- **`sendThrough`** — локальный исходный IP-адрес, CIDR-пул или имя интерфейса, с которого Xray будет устанавливать исходящее соединение. :orig[/config/outbound.html~:sendThrough | sendThrough]
- **`targetStrategy`** — стратегия разрешения целевого домена перед отправкой через этот `outbound` (`"AsIs"`, `"UseIP"`, `"UseIPv4"`, `"UseIPv6"`, `"UseIPv4v6"`, `"UseIPv6v4"`, `"ForceIP*"`). :orig[/config/outbound.html~:targetStrategy | targetStrategy]
- **`mux`** (`MuxObject`) — мультиплексирование множества TCP-соединений в одно (`enabled`, `concurrency`, `xudpConcurrency`, `xudpProxyUDP443`: `"reject"` | `"allow"` | `"skip"`). :orig[/config/outbound.html#muxobject | MuxObject]

:::warning Когда `mux.enabled` нужно держать выключенным
При использовании **VLESS + XTLS Vision** или **XHTTP (XMUX)** всегда оставляйте `mux.enabled: false`. Классический `mux.cool` несовместим с XTLS и создаёт :term[hol]{Head-of-Line Blocking}.
:::

## Policy, Stats, API и Metrics {#policy-stats-api} :orig[/config/policy.html#policyobject | PolicyObject]

- **`policy.levels[level]`** (`LevelPolicyObject`) — таймауты и буферы для пользователей данного уровня: `handshake` (по умолчанию 4 с), `connIdle` (300 с), `uplinkOnly` (2 с), `downlinkOnly` (5 с), `bufferSize` (КБ), а также флаги `statsUserUplink`, `statsUserDownlink`, `statsUserOnline`. :orig[/config/policy.html#levelpolicyobject | LevelPolicyObject]
- **`policy.system`** (`SystemPolicyObject`) — флаги учёта статистики по входам и выходам (`statsInboundUplink/Downlink`, `statsOutboundUplink/Downlink`). :orig[/config/policy.html#systempolicyobject | SystemPolicyObject]
- **`stats`** (`{}`) — включение подсистемы сбора счётчиков трафика. :orig[/config/stats.html | 统计信息]
- **`api`** (`ApiObject`) — gRPC-интерфейс управления ядром (`tag`, `listen`, `services`: `HandlerService`, `RoutingService`, `LoggerService`, `StatsService`, `ReflectionService`). :orig[/config/api.html | API 接口]
- **`metrics`** (`MetricsObject`) — экспорт метрик Go (`pprof`, `expvars`) на указанном `listen` и `tag`. :orig[/config/metrics.html | Metrics]
