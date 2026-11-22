---
title: "Остальные транспорты: RAW, WS, gRPC, HTTPUpgrade, mKCP, Hysteria, MASQUE"
description: Справочник параметров всех остальных транспортных протоколов Xray-core и механизма Browser Dialer.
order: 3
origSource: docs
origPath: /config/transports/
origTitle: 传输方式
---

Помимо флагманского **XHTTP**, в Xray-core доступны семь специализированных транспортных протоколов — от минималистичного `RAW` для максимальной скорости до `Hysteria` и `MASQUE` поверх :term[quic].

## RAW (ранее TCP) {#raw} :orig[/config/transports/raw.html#rawobject | RawObject]

Прямая передача потока поверх чистого :term[tcp] без лишних обёрток. Главный транспорт для связки **`VLESS + XTLS Vision + REALITY`** с поддержкой :term[readv] и :term[splice].

- **`acceptProxyProtocol`** (`bool`): принимать заголовок :term[proxy-protocol] на сервере (например, если перед Xray стоит HAProxy или Nginx stream). :orig[/config/transports/raw.html~:acceptProxyProtocol | acceptProxyProtocol]
- **`header`**: опциональная маскировка заголовка: `{"type": "none"}` (рекомендуется) или устаревшая имитация открытого HTTP (`{"type": "http", "request": ..., "response": ...}`). :orig[/config/transports/raw.html#httpheaderobject | header]

## WebSocket (`websocket` / `ws`) {#websocket} :orig[/config/transports/websocket.html#websocketobject | WebSocketObject]

Стандартный протокол поверх `HTTP/1.1 Upgrade`, совместимый почти с любыми :term[cdn] и веб-серверами.

- **`path`**: путь подключения (например, `"/ws"`). Поддерживает добавление `Early Data` через суффикс `?ed=2048` для снижения задержки на 1 :term[rtt]. :orig[/config/transports/websocket.html~:path | path]
- **`host`**: заголовок `Host` (приоритет `host > serverName > address`). :orig[/config/transports/websocket.html~:host | host]
- **`headers`**: дополнительные HTTP-заголовки (`map<string, string>`). :orig[/config/transports/websocket.html~:headers | headers]
- **`heartbeatPeriod`** (`int`, сек): период отправки WebSocket Ping для поддержания "живого" соединения (`0` отключает отправку). :orig[/config/transports/websocket.html~:heartbeatPeriod | heartbeatPeriod]
- **`acceptProxyProtocol`** (`bool`): приём PROXY Protocol на сервере. :orig[/config/transports/websocket.html~:acceptProxyProtocol | acceptProxyProtocol]

## HTTPUpgrade (`httpupgrade`) {#httpupgrade} :orig[/config/transports/httpupgrade.html#httpupgradeobject | HTTPUpgradeObject]

Упрощённая альтернатива WebSocket: выполняет стандартный HTTP-запрос `Connection: Upgrade`, но сразу после ответа `101 Switching Protocols` передаёт чистый поток байтов без накладных расходов на фрейминг WebSocket.

- Параметры `httpupgradeSettings`: **`path`**, **`host`**, **`headers`**, **`acceptProxyProtocol`**.

## gRPC (`grpc`) {#grpc} :orig[/config/transports/grpc.html#grpcobject | GRPCObject]

Потоковый транспорт поверх **HTTP/2** и :term[grpc]{gRPC}. Поддерживает мультиплексирование и работает с REALITY, Nginx (`grpc_pass`) и Cloudflare.

- **`serviceName`**: имя gRPC-сервиса (аналог `path`, не оставляйте пустым). :orig[/config/transports/grpc.html~:serviceName | serviceName]
- **`authority`**: псевдозаголовок `:authority` HTTP/2 (аналог `Host`). :orig[/config/transports/grpc.html~:authority | authority]
- **`multiMode`** (`bool`): режим `multi` (упаковка нескольких чанков в один Protobuf-фрейм вместо `gun`, повышает производительность). :orig[/config/transports/grpc.html~:multiMode | multiMode]
- **`user_agent`**: кастомный `User-Agent`. :orig[/config/transports/grpc.html~:user_agent | user_agent]
- **`idle_timeout`** / **`health_check_timeout`** / **`permit_without_stream`**: параметры проверки живости HTTP/2-канала (не ставьте `idle_timeout` меньше 10 секунд). :orig[/config/transports/grpc.html~:idle_timeout | 健康检查]
- **`initial_windows_size`**: начальный размер окна HTTP/2 (например, `65536`). :orig[/config/transports/grpc.html~:initial_windows_size | initial_windows_size]

## mKCP (`mkcp`) {#mkcp} :orig[/config/transports/mkcp.html#kcpobject | KcpObject]

Надёжный транспорт с повторной отправкой пакетов (ARQ) поверх :term[udp]. Разменивает дополнительный расход трафика на снижение задержки в сетях с большими потерями пакетов.

- **`mtu`**: максимальный размер пакета в байтах (`576`–`1460`, по умолчанию `1350`, см. :term[mtu]). :orig[/config/transports/mkcp.html~:mtu | mtu]
- **`tti`**: интервал обработки пакетов в миллисекундах (`10`–`100`, по умолчанию `50`). :orig[/config/transports/mkcp.html~:tti | tti]
- **`uplinkCapacity` / `downlinkCapacity`**: заявленная пропускная способность отдачи/приёма в МБ/с (влияет на размер окна отправки). :orig[/config/transports/mkcp.html~:uplinkCapacity | 带宽容量]
- **`cwndMultiplier` / `maxSendingWindow`**: множитель и потолок окна перегрузки. :orig[/config/transports/mkcp.html~:cwndMultiplier | 发送窗口]

:::info Шифрование и маскировка заголовков mKCP
В актуальном Xray-core старые поля `seed` и `header` перенесены в универсальный слой **`finalmask`** (тип `mkcp-legacy`, `header-custom`, `salamander` и др.).
:::

## Hysteria (`hysteria`) {#hysteria-transport} :orig[/config/transports/hysteria.html#hysteriaobject | HysteriaObject]

Нативный транспорт **Hysteria 2** поверх :term[quic] (используется вместе с протоколом `protocol: "hysteria"`).

- **`version`**: версия протокола (`2`). :orig[/config/transports/hysteria.html~:version | version]
- **`auth`**: пароль авторизации (на клиенте). :orig[/config/transports/hysteria.html~:auth | auth]
- **`udpIdleTimeout`**: таймаут простоя UDP-сессий. :orig[/config/transports/hysteria.html~:udpIdleTimeout | udpIdleTimeout]
- **`masquerade`** (`MasqObject`): маскировка сервера под обычный HTTP/3-сайт для неавторизованных клиентов: `type` (`"file"` | `"proxy"` | `"string"`), `dir`, `url`, `rewriteHost`, `insecure`, `content`, `headers`, `statusCode`. :orig[/config/transports/hysteria.html#masqobject | MasqObject]
- Алгоритм :term[bbr]{Brutal / BBR}, `udpHop` и обфускация `salamander` настраиваются в `streamSettings.finalmask`.

## MASQUE (`masque`) {#masque-transport} :orig[/config/transports/masque.html#masqueobject | MasqueObject]

Реализация стандарта **IETF RFC 9484 (CONNECT-UDP поверх HTTP/3)** и **RFC 8441**, позволяющая туннелировать IP/UDP-пакеты внутри обычного HTTP/3 и подключаться к **Cloudflare WARP** без WireGuard.

- Параметры `masqueSettings`: **`host`**, **`path`**, **`user`**, **`pass`**, **`headers`** и объект **`warp`** для интеграции с Cloudflare WARP. :orig[/config/transports/masque.html#masqueobject | MasqueObject]

## Browser Dialer {#browser-dialer} :orig[/config/features/browser_dialer.html | Browser Dialer]

Специальный режим (`XRAY_BROWSER_DIALER=127.0.0.1:8080`), при котором Xray делегирует установку TLS/HTTP-соединения для `WebSocket` и `XHTTP` реальному установленному браузеру. В этом случае сетевой отпечаток `ClientHello` и HTTP-стека на 100% принадлежит настоящему браузеру (при этом `tlsSettings` ядра игнорируется).
