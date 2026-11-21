---
title: "XHTTP: Beyond REALITY"
description: "Полный справочник нативного HTTP-транспорта Xray: режимы auto/packet-up/stream-up/stream-one, мультиплексор XMUX, разделение вверх/вниз и все параметры extra."
order: 2
badge: new
origSource: xhttp
origPath: ''
origTitle: "XHTTP: Beyond REALITY (#4113)"
---

**XHTTP** (ранее *SplitHTTP*) — первый полностью собственный HTTP-транспорт Xray-core, объединяющий возможности всех старых HTTP-транспортов (`WS`, `HTTPUpgrade`, `gRPC`, `H2`, `QUIC`). Он работает поверх **HTTP/1.1**, **HTTP/2** и **HTTP/3 (:term[quic])**, проходит через любые :term[cdn] и веб-серверы (Nginx, Caddy), умеет сочетаться с **REALITY** и **VLESS Encryption**, а главное — поддерживает **разделение восходящего и нисходящего каналов**.

:::tip Как проверить реальный режим XHTTP в работе
Установите `log.loglevel: "info"` на клиенте — при подключении Xray выведет в журнал фактическую версию HTTP (`h1`/`h2`/`h3`), заголовок `Host`, выбранный режим (`packet-up` / `stream-up` / `stream-one`) и статус разделения каналов.
:::

## Четыре режима работы (`mode`) {#xhttp-modes} :orig[~:STREAM-UP/ONE | XHTTP 传输模式]

| Режим `mode` | Как идут данные | Где применять |
| :--- | :--- | :--- |
| **`auto`** *(по умолчанию)* | **Клиент:** `stream-up` при TLS H2; `stream-one` при REALITY (если не задан `downloadSettings`); иначе `packet-up`. **Сервер:** принимает все три режима одновременно. | Рекомендуется почти всегда — клиент сам выбирает лучший режим под условия. |
| **`packet-up`** | Вверх — серия обычных коротких `POST /path/<uuid>/<seq>`; вниз — потоковый `GET /path/<uuid>` (с :term[sse]). | Самый совместимый режим: проходит через CDN с жёсткой буферизацией POST и через HTTP/3. |
| **`stream-up`** | Вверх — потоковый `POST /path/<uuid>` (с заголовком :term[grpc]); вниз — потоковый `GET /path/<uuid>`. | Высокая скорость отдачи через Cloudflare (нужно включить поддержку gRPC в панели CF) и Nginx (`grpc_pass`). |
| **`stream-one`** | Единый двунаправленный поток в одном `POST /path/`. | Минимум запросов для прямого `XHTTP + REALITY` без разделения каналов. |

## Как выбирается версия HTTP (H1 / H2 / H3) {#http-version-selection} :orig[~:对于 XHTTP 客户端 | HTTP 版本选择]

- **Сервер XHTTP** по умолчанию слушает TCP и обслуживает HTTP/1.1 и HTTP/2. Чтобы принимать HTTP/3 (QUIC), лучше поставить перед Xray настоящий **Nginx / Caddy** или **CDN** (они примут H3 от клиента и перешлют H2 на Xray).
- **Клиент XHTTP:**
  1. При включённом `TLS` или `REALITY` по умолчанию использует **HTTP/2 (`h2`)**; без них — `HTTP/1.1`.
  2. Если в `tlsSettings.alpn` оставить только `["http/1.1"]` — переходит на `HTTP/1.1`.
  3. Если в `tlsSettings.alpn` оставить только `["h3"]` — использует **HTTP/3 (quic-go)**.

## Базовые поля и контейнер `extra` {#xhttp-config} :orig[~:downloadSettings | XHTTP 完整配置]

```jsonc
"xhttpSettings": {
  "host": "example.com",
  "path": "/yourpath",
  "mode": "auto",
  "extra": {
    "headers": {},
    "xPaddingBytes": "100-1000",
    "noGRPCHeader": false,
    "noSSEHeader": false,
    "scMaxEachPostBytes": 1000000,
    "scMinPostsIntervalMs": 30,
    "scMaxBufferedPosts": 30,
    "scStreamUpServerSecs": "20-80",
    "xmux": {
      "maxConcurrency": "16-32",
      "maxConnections": 0,
      "cMaxReuseTimes": 0,
      "hMaxRequestTimes": "600-900",
      "hMaxReusableSecs": "1800-3000",
      "hKeepAlivePeriod": 0
    },
    "downloadSettings": {}
  }
}
```

- **`host`** — значение заголовка HTTP `Host` (приоритет на клиенте: `host > serverName > address`). На сервере при указании `host` выполняется строгая проверка совпадения. Не указывайте `Host` внутри `headers`. :orig[~:host 的行为 | host 优先级]
- **`path`** — путь HTTP-запросов (например, `"/yourpath"`). Обязательно одинаков на сервере, клиенте и в `downloadSettings`. :orig[~:path | path 路径]
- **`mode`** — `"auto"` | `"packet-up"` | `"stream-up"` | `"stream-one"`. :orig[~:mode | mode 模式]
- **`extra`** — JSON-объект со всеми расширенными параметрами. При передаче ссылки `vless://` весь объект `extra` кодируется одним параметром, чтобы администратор мог централизованно задавать настройки клиентам. :orig[~:extra 是 | extra 字段说明]

## Мультиплексор XMUX (`extra.xmux`) {#xmux} :orig[~:XMUX | XMUX 多路复用]

Для HTTP/2 и HTTP/3 встроен мультиплексор **XMUX** (даёт **0-RTT** на новых запросах внутри открытых соединений и мягко ротирует базовые TCP/QUIC-соединения, чтобы избежать «залипания» на лимитах Nginx и провайдеров).

:::warning Правило значений по умолчанию в XMUX
Если все поля `xmux` не заданы (или равны `0`), Xray автоматически применяет три случайных диапазона: `maxConcurrency: "16-32"`, `hMaxRequestTimes: "600-900"`, `hMaxReusableSecs: "1800-3000"`. **Но как только вы вручную зададите хотя бы одно поле, остальные значения по умолчанию отключаются** — их нужно указать явно. При использовании XHTTP не включайте старый `mux.enabled: true`.
:::

| Поле `xmux` | По умолчанию | Что делает |
| :--- | :--- | :--- |
| `maxConcurrency` | `"16-32"` | Максимум одновременных прокси-запросов на одно TCP/QUIC-соединение (по достижении открывается новое). Взаимоисключающее с `maxConnections`. |
| `maxConnections` | `0` (без лимита) | Максимум одновременных базовых соединений (удобно задать `1` для жёсткого переиспользования одного канала). |
| `cMaxReuseTimes` | `0` (без лимита) | Сколько прокси-запросов максимально может обслужить одно соединение за всё время жизни, после чего оно плавно закрывается. |
| `hMaxRequestTimes` | `"600-900"` | Лимит HTTP-запросов на одно соединение (защита от дефолтного лимита `1000` запросов в Nginx). |
| `hMaxReusableSecs` | `"1800-3000"` | Максимальный срок жизни соединения в секундах (защита от 1-часового таймаута Nginx). |
| `hKeepAlivePeriod` | `0` | Период idle keep-alive в секундах (`0` = 45 с для H2 / 10 с для H3; `-1` — отключить). Единственное поле XMUX, где запрещён диапазон. |

## Разделение восходящего и нисходящего каналов (`downloadSettings`) {#uplink-downlink-split} :orig[~:上下行分离 | 上下行分离]

Поскольку в режимах `packet-up` и `stream-up` сервер связывает восходящий и нисходящий потоки только по случайному UUID в пути, клиент может отправлять данные **одним маршрутом**, а получать — **совершенно другим**:

- **Асимметрия протоколов и IP:** например, отправка (uplink) идёт по `IPv4 + TCP + HTTP/2`, а загрузка (downlink) — по `IPv6 + QUIC + HTTP/3`.
- **Разные SNI в одном CDN:** `serverName: "a.example.com"` для uplink и `"b.example.com"` для downlink при общем `host: "c.example.com"`.
- **Две разные входные точки REALITY:** две разные ноды проксируют трафик к одному и тому же XHTTP-входу на конечном сервере.

Объект `extra.downloadSettings` имеет структуру полноценного `streamSettings` плюс поля **`address`** и **`port`** (`network` обязательно `"xhttp"`, `path` должен совпадать с uplink). По умолчанию настройки `downloadSettings` полностью независимы; единственное исключение — флаг `sockopt.penetrate: true` на uplink, который пробрасывает системные метки сокета (`mark`) и в downlink.

## Тонкие параметры `extra` и `config.proto` {#xhttp-extra-fields} :orig[xhttpProto: | splithttp/config.proto]

- **Буферизация и тайминги (`packet-up` / `stream-up`):**
  - `scMaxEachPostBytes` (`1000000` или диапазон) — максимальный размер одного `POST` в `packet-up`.
  - `scMinPostsIntervalMs` (`30`, клиент) — минимальная пауза между `POST`-запросами в миллисекундах.
  - `scMaxBufferedPosts` (`30`, сервер) — размер буфера переупорядочивания `POST`-пакетов.
  - `scStreamUpServerSecs` (`"20-80"`, сервер) — случайная задержка закрытия потокового `POST` на сервере.
  - `uplinkChunkSize`, `serverMaxHeaderBytes` — тонкое управление размером чанка и лимитом заголовков на сервере.
- **Заголовки и мимикрия:** `headers` (дополнительные HTTP-заголовки), `noGRPCHeader` (клиент), `noSSEHeader` (сервер), `uplinkHTTPMethod` (замена метода `POST`), `h2Params`.
- **Гибкий паддинг (`X-Padding`):** `xPaddingBytes` (`"100-1000"`), `xPaddingObfsMode`, `xPaddingKey`, `xPaddingHeader`, `xPaddingPlacement`, `xPaddingMethod` — управляют тем, куда и как добавляется случайный паддинг (в `Referer`, query-параметр, cookie или отдельный заголовок).
- **Кастомизация раскладки метаданных:** `sessionIDPlacement`, `sessionIDKey`, `sessionIDTable`, `sessionIDLength`, `seqPlacement`, `seqKey`, `uplinkDataPlacement`, `uplinkDataKey` — позволяют перенести UUID сессии, номер последовательности и данные из URL-пути в заголовки, cookies или query-параметры.
