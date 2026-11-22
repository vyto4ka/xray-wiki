---
title: VLESS и VLESS Encryption
description: Полный разбор протокола VLESS (Inbound и Outbound), авторизации по UUID, Fallbacks, встроенного Reverse и постквантового VLESS Encryption.
order: 1
badge: core
origSource: docs
origPath: /config/inbounds/vless.html
origTitle: VLESS
---

**VLESS** (от англ. *VMess-less*, "без лишнего в VMess") — лёгкий, не хранящий состояния (stateless) прокси-протокол Xray-core. В отличие от старого VMess, VLESS **не зависит от точности системных часов** и по умолчанию не тратит процессор на собственное шифрование, перекладывая защиту трафика на надёжный внешний слой (:term[tls]{TLS 1.3}, **REALITY** или встроенный **VLESS Encryption**).

## Как устроен VLESS {#how-vless-works} :orig[#vless | VLESS 协议]

Каждый раз, когда клиент открывает соединение, VLESS отправляет минимальный заголовок: версию протокола, 16-байтовый идентификатор пользователя (:term[uuid]), целевой адрес/порт и тип команды (TCP, UDP или Mux). Всё остальное место занимает полезная нагрузка.

:::warning Безопасность без внешнего шифрования
VLESS запрещено запускать в открытом виде (`security: "none"`) в публичном интернете. Xray-core допускает `security: "none"` только в двух случаях: либо вы работаете внутри доверенной приватной сети, либо включили нативное шифрование **VLESS Encryption** (`decryption` / `encryption` ≠ `"none"`).
:::

## Параметры сервера (Inbound) {#vless-inbound} :orig[#inboundconfigurationobject | InboundConfigurationObject]

```jsonc
{
  "inbounds": [
    {
      "listen": "0.0.0.0",
      "port": 443,
      "protocol": "vless",
      "settings": {
        "clients": [
          {
            "id": "5783a3e7-e373-51cd-8642-c83782b807c5",
            "flow": "xtls-rprx-vision",
            "level": 0,
            "email": "user@example.com"
          }
        ],
        "decryption": "none",
        "fallbacks": []
      }
    }
  ]
}
```

- **`clients[]`**: список разрешённых пользователей (`UserObject`). :orig[#userobject | UserObject]
- **`clients[].id`**: уникальный идентификатор пользователя (:term[uuid]{UUID}). Можно указать стандартный UUID (`xray uuid`) или любую строку короче 30 байт, и Xray детерминированно преобразует её в `UUIDv5` (стандарт `xray uuid -i "строка"`). :orig[uuidMap: | UUIDv5 映射标准]
- **`clients[].flow`**: режим потокового управления **XTLS**. Для `RAW + REALITY/TLS` или `VLESS Encryption` указывается `"xtls-rprx-vision"`. Для транспортов `XHTTP`, `WebSocket`, `gRPC` без `VLESS Encryption` поле оставляют пустым `""`. :orig[~:flow | 流控模式]
- **`clients[].email`**: произвольная метка пользователя для логов, статистики (`statsUserUplink`/`Downlink`) и правил маршрутизации `user`. :orig[~:email | 用户邮箱标识]
- **`clients[].level`**: уровень пользователя, связывающий его с секцией `policy.levels`. :orig[~:level | 用户等级]
- **`clients[].reverse`**: включает режим **VLESS Reverse Proxy** (`{ "tag": "r-outbound" }` на сервере и `{ "tag": "r-inbound", "sniffing": {} }` на клиенте) для проброса трафика за NAT без отдельного модуля `reverse`. :orig[~:reverse | VLESS 极简反向代理]
- **`decryption`**: настройка серверной части **VLESS Encryption**. Если используется только TLS или REALITY, обязательно укажите `"none"`. :orig[~:decryption | 解密设置]
- **`fallbacks[]`**: массив правил перенаправления (`FallbackObject`) для соединений, не прошедших авторизацию VLESS (нельзя комбинировать с `decryption ≠ "none"`). :orig[/config/features/fallback.html | Fallback 回落]

## Параметры клиента (Outbound) {#vless-outbound} :orig[/config/outbounds/vless.html#outboundconfigurationobject | OutboundConfigurationObject]

В актуальном Xray-core используется плоский формат `settings` (старый вложенный формат `vnext[].users[]` сохранён для обратной совместимости):

```jsonc
{
  "outbounds": [
    {
      "protocol": "vless",
      "settings": {
        "address": "example.com",
        "port": 443,
        "id": "5783a3e7-e373-51cd-8642-c83782b807c5",
        "encryption": "none",
        "flow": "xtls-rprx-vision",
        "level": 0
      }
    }
  ]
}
```

- **`address`** и **`port`**: домен или IP-адрес сервера и его порт. :orig[/config/outbounds/vless.html#outboundconfigurationobject | address / port]
- **`id`**: :term[uuid] клиента (должен совпадать с одним из `clients[].id` на сервере). :orig[/config/outbounds/vless.html~:id | 用户 ID]
- **`encryption`**: клиентская часть **VLESS Encryption**. Поле обязательное: при отключении явно пишется `"none"`. :orig[/config/outbounds/vless.html~:encryption | 加密设置]
- **`flow`**: `"xtls-rprx-vision"` (блокирует исходящий UDP/443 QUIC, чтобы браузер использовал HTTPS/TCP и включался :term[splice]) или `"xtls-rprx-vision-udp443"` (разрешает UDP/443). :orig[/config/outbounds/vless.html~:flow | 客户端 flow]

## Механизм Fallback (откат на веб-сайт) {#fallbacks} :orig[/config/features/fallback.html#fallbackobject | FallbackObject]

Если сервер работает поверх обычного :term[tls] (а не REALITY), блок `fallbacks` позволяет на одном порту `443` принимать и VLESS-клиентов, и обычных посетителей сайта (а также цензоров при :term[active-probing]{активном зондировании}):

| Поле `FallbackObject` | Назначение |
| :--- | :--- |
| `name` | Матчинг по :term[sni] (пустая строка означает любое имя) |
| `alpn` | Матчинг по :term[alpn] (`"h2"`, `"http/1.1"` или `""`) |
| `path` | Матчинг по начальному HTTP-пути первого пакета (например, `"/ws"`) |
| `dest` | Куда перенаправить соединение: порт (`8080`), `ip:port`, файловый или абстрактный :term[uds] (`@nginx`) |
| `xver` | Версия :term[proxy-protocol] (`0`: выкл., `1`: v1, `2`: v2) |

## Постквантовое шифрование VLESS Encryption {#vless-encryption} :orig[vlessEnc: | VLESS Encryption PR #5067]

**VLESS Encryption** добавляет в протокол VLESS встроенное постквантовое шифрование (:term[mlkem768] + :term[x25519]), пришедшее на смену старым схемам с постоянным ключом (Shadowsocks, VMess). Оно даёт :term[pfs]{прямую секретность}, защиту от повторов (replay), **0-RTT** и полную совместимость с `XTLS Vision` поверх **любого транспорта** (включая `XHTTP` и `WebSocket` через :term[cdn]).

:::tip Не собирайте строку вручную
Выполните на сервере команду `xray vlessenc`. Ядро само сгенерирует валидную пару строк `decryption` (для сервера) и `encryption` (для клиента) с ключами `X25519` и `ML-KEM-768`.
:::

:::explain{ref="vlessEnc:" zh="VLESS Encryption 配置格式"}
Строка состоит из блоков, разделённых точкой `.`:

`mlkem768x25519plus.<внешний_вид>.<rtt>.<паддинг_и_задержки>.<ключи>`

- **1-й блок (`mlkem768x25519plus`)**: гибридный постквантовый обмен ключами (обязательно совпадает на обеих сторонах).
- **2-й блок (внешний вид)**: `native` (чистый бинарный формат, максимальная скорость с :term[readv] и :term[splice]), `xorpub` (маскирует публичный ключ, сохраняя zero-copy) или `random` (полностью случайные байты).
- **3-й блок (сессионные тикеты)**: на сервере `600s` (случайный срок жизни тикета 300–600 с для **0-RTT**) или `0s` (только 1-RTT). На клиенте указывается `0rtt` или `1rtt`.
- **Средние блоки (Padding / Delay)**: цепочка `вероятность-мин-макс`, по умолчанию `100-111-1111.75-0-111.50-0-3333`. Она маскирует длину и тайминг первого 1-RTT рукопожатия.
- **Последние блоки (ключи)**: на сервере `PrivateKey` (`xray x25519`) и/или `Seed` (`xray mlkem768`). На клиенте указываются соответствующие `Password` и/или `Client`.
:::
