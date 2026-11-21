---
title: Расшифровка ссылок vless:// (стандарт #716)
description: Полная таблица всех параметров в строке подключения vless:// и их точное соответствие полям JSON-конфигурации Xray-core.
order: 1
badge: ref
origSource: shareUri
origPath: ''
origTitle: "VLESS Share Link Standard (#716)"
---

Почти все современные клиенты Xray обмениваются профилями в виде единой URI-строки по официальному стандарту **XTLS/Xray-core #716**:

```text
vless://<uuid>@<host>:<port>?type=raw&security=reality&encryption=none&flow=xtls-rprx-vision&fp=chrome&sni=www.example.com&pbk=<publicKey>&sid=<shortId>&spx=%2F#MyServer
```

Ниже — полная расшифровка каждого query-параметра и точный путь, куда клиент подставляет его в `config.json`.

## Базовые параметры протокола и транспорта {#uri-core} :orig[~:4.3 | 传输方式相关段]

| Параметр URI | Путь в `config.json` | Значение и пояснение |
| :--- | :--- | :--- |
| `encryption` | `settings.encryption` | `"none"` или строка **VLESS Encryption** (в ссылке не должен быть пустым) |
| `flow` | `settings.flow` | `"xtls-rprx-vision"` (режим `-udp443` выбирается на клиенте и обычно не раздаётся сервером) |
| `type` | `streamSettings.network` | `"raw"` (или `"tcp"`), `"xhttp"`, `"ws"`, `"httpupgrade"`, `"grpc"`, `"kcp"` |
| `security` | `streamSettings.security` | `"none"`, `"tls"` или `"reality"` |
| `host` | `xhttpSettings.host` / `wsSettings.host` / `httpupgradeSettings.host` | Заголовок HTTP `Host` (`encodeURIComponent`) |
| `path` | `xhttpSettings.path` / `wsSettings.path` / `httpupgradeSettings.path` | Путь HTTP-запроса (по умолчанию `"/"`, кодируется через `encodeURIComponent`) |
| `mode` *(XHTTP)* | `xhttpSettings.mode` | `"auto"`, `"packet-up"`, `"stream-up"` или `"stream-one"` |
| `extra` *(XHTTP)* | `xhttpSettings.extra` | JSON-объект со всеми расширенными параметрами XHTTP (`xmux`, `downloadSettings`, `xPadding*`), закодированный в URL |
| `serviceName` *(gRPC)* | `grpcSettings.serviceName` | Имя gRPC-сервиса |
| `authority` *(gRPC)* | `grpcSettings.authority` | Псевдозаголовок `:authority` |
| `mode` *(gRPC)* | `grpcSettings.multiMode` | `"gun"` (по умолчанию) или `"multi"` |
| `fm` *(FinalMask)* | `streamSettings.finalmask` | JSON-объект `finalmask` (например, `fragment`, `salamander`, `udphop`), закодированный через `encodeURIComponent` |

## Параметры TLS и REALITY {#uri-tls-reality} :orig[~:4.4 TLS 相关段 | 4.4 TLS / REALITY 段]

| Параметр URI | Путь в `config.json` | Значение и пояснение |
| :--- | :--- | :--- |
| `fp` | `tlsSettings.fingerprint` / `realitySettings.fingerprint` | Отпечаток :term[utls] (`"chrome"` по умолчанию; обязателен для REALITY) |
| `sni` | `tlsSettings.serverName` / `realitySettings.serverName` | Домен :term[sni] |
| `alpn` | `tlsSettings.alpn` | Список :term[alpn] через запятую без пробелов (`h2,http/1.1` или `h3`) |
| `ech` | `tlsSettings.echConfigList` | Конфигурация :term[ech] |
| `pcs` | `tlsSettings.pinnedPeerCertSha256` | SHA-256 пин сертификата сервера/CA (безопасная замена `allowInsecure`) |
| `vcn` | `tlsSettings.verifyPeerCertByName` | Имя домена для проверки leaf-сертификата |
| `pbk` *(REALITY)* | `realitySettings.password` | Публичный ключ :term[x25519] сервера (обязателен для REALITY) |
| `sid` *(REALITY)* | `realitySettings.shortId` | Hex-идентификатор клиента (`shortId`) |
| `pqv` *(REALITY)* | `realitySettings.mldsa65Verify` | Постквантовый публичный ключ :term[mldsa65] для дополнительной проверки сертификата |
| `spx` *(REALITY)* | `realitySettings.spiderX` | Стартовый путь краулера REALITY (кодируется через `encodeURIComponent`, например `%2F`) |
