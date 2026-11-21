---
title: StreamSettings и матрица транспортов
description: Как устроен объект streamSettings, как выбирать транспорт и слой безопасности, и какие старые названия транспортов заменены.
order: 1
origSource: docs
origPath: /config/transport.html
origTitle: 传输配置
---

Объект **`streamSettings`** задаёт, **каким образом** данные прокси-протокола (`VLESS`, `VMess`, `Trojan`, `Shadowsocks` и др.) упаковываются и передаются по сети. Он присутствует и в `inbounds[]`, и в `outbounds[]` и делится на три логических уровня:

1. **Способ передачи (`network`)** — как данные упакованы поверх TCP или UDP (`raw`, `xhttp`, `websocket`, `grpc`, `httpupgrade`, `mkcp`, `hysteria`, `masque`).
2. **Транспортная безопасность (`security`)** — чем защищён канал (`none`, `tls`, `reality`).
3. **Дополнительные слои (`finalmask`, `sockopt`)** — обфускация пакетов, параметры QUIC и системные опции сокетов ОС.

## Структура StreamSettingsObject {#stream-settings-object} :orig[#streamsettingsobject | StreamSettingsObject]

```jsonc
"streamSettings": {
  "network": "raw",          // raw | xhttp | mkcp | grpc | websocket | httpupgrade | hysteria | masque
  "security": "reality",     // none | tls | reality
  "rawSettings": {},
  "xhttpSettings": {},
  "kcpSettings": {},
  "grpcSettings": {},
  "wsSettings": {},
  "httpupgradeSettings": {},
  "hysteriaSettings": {},
  "masqueSettings": {},
  "realitySettings": {},
  "tlsSettings": {},
  "finalmask": {},
  "sockopt": {}
}
```

## Сравнение транспортов и совместимость {#compatibility-matrix} :orig[#传输组合速查表 | 传输组合速查表]

| Транспорт (`network`) | Базовый слой | TLS | REALITY | Проходит CDN | Когда выбирать |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **`raw`** *(ранее `tcp`)* | :term[tcp] | Да | Да | Нет | Прямое подключение + `VLESS + XTLS Vision + REALITY`. Максимальная скорость и :term[splice]. |
| **`xhttp`** *(ранее `splithttp`)* | HTTP/1.1, H2, :term[quic]{H3} | Да | Да | Да | Универсальный флагман: работает через CDN, Nginx, напрямую с REALITY и поддерживает разделение вверх/вниз. |
| **`websocket`** (`ws`) | HTTP/1.1 Upgrade | Да | Нет | Да | Классика для совместимости со старыми клиентами и CDN. |
| **`httpupgrade`** | HTTP/1.1 Upgrade | Да | Нет | Да | Легче `websocket` (нет фрейминга WS), требует поддержки Upgrade на CDN/Nginx. |
| **`grpc`** | HTTP/2 | Да | Да | Да | Потоковый HTTP/2 через Nginx/CDN; сегодня в основном вытеснен `xhttp`. |
| **`mkcp`** | :term[udp] | Нет | Нет | Нет | Устойчив к высоким потерям пакетов, но расходует больше трафика; обфускация перенесена в `finalmask`. |
| **`hysteria`** | :term[quic] (:term[udp]) | Да | Нет | Нет | Только для протокола Hysteria 2 (высокая скорость на плохих каналах с BBR / Brutal). |
| **`masque`** | HTTP/3 (:term[quic]) | Да | Нет | Да (WARP) | Только для протокола MASQUE (`RFC 9484`), включая нативный выход через Cloudflare WARP. |

## Переименования и устаревшие транспорты {#deprecated-transports} :orig[/config/transports/ | 传输配置列表]

В современных версиях Xray-core часть старых имён заменена или объединена:

- **`tcp` → `raw`** (`tcpSettings` → `rawSettings`). Старое название сохраняется как псевдоним, но в новых конфигах используйте `raw`.
- **`splithttp` → `xhttp`** (`splithttpSettings` → `xhttpSettings`).
- **`http` / `h2` и `quic` (старый)** — удалены и полностью заменены на **`xhttp`** (с поддержкой H1/H2/H3), **`hysteria`** и **`masque`**.
