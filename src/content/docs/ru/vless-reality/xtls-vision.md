---
title: XTLS Vision, Splice и XUDP
description: Что такое flow xtls-rprx-vision, как он устраняет сигнатуру TLS-in-TLS, ускоряет сервер через Linux splice() и передаёт UDP через XUDP.
order: 2
badge: speed
origSource: docs
origPath: /config/outbounds/vless.html
origTitle: XTLS Vision
---

**XTLS** — фирменная технология Xray-core, решающая сразу две проблемы классических TLS-прокси: демаскирующую сигнатуру :term[tls-in-tls] и бессмысленную трату процессора на двойное шифрование уже зашифрованного HTTPS-трафика.

## Как работает `xtls-rprx-vision` {#vision-mechanics} :orig[/config/outbounds/vless.html~:xtls-rprx-vision | xtls-rprx-vision 流控]

Когда вы открываете обычный HTTPS-сайт (TLS 1.3) через VLESS с `flow: "xtls-rprx-vision"`, соединение проходит два этапа:

1. **Маскировка внутреннего рукопожатия (Padding):** Vision распознаёт первые пакеты внутреннего TLS 1.3 (`ClientHello`, `ServerHello`, сертификат) и добавляет к ним случайный паддинг внутри внешнего туннеля (:term[tls] / REALITY / VLESS Encryption). В результате :term[dpi] не видит характерных «ступенек» двойного рукопожатия.
2. **Прямая пересылка без двойного шифрования:** как только внутреннее рукопожатие TLS 1.3 завершилось и начался обмен шифрованными данными сайта, Vision перестаёт повторно шифровать поток внешним слоем и передаёт зашифрованные TLS-записи напрямую в сокет.

:::tip Что происходит с не-TLS трафиком
Если внутри туннеля идёт незашифрованный протокол (например, обычный HTTP, SSH или TLS 1.2 без нужных свойств), Vision просто оставляет его под защитой внешнего шифрования — ничего не ломается и данные не раскрываются.
:::

## Разница между `xtls-rprx-vision` и `-udp443` {#vision-udp443} :orig[/config/outbounds/vless.html~:xtls-rprx-vision-udp443 | udp443 选项]

| Значение `flow` | Где указывается | Поведение для исходящего `UDP/443` (:term[quic]) |
| :--- | :--- | :--- |
| `xtls-rprx-vision` | Сервер и клиент | **Блокирует** исходящий `UDP/443` на клиенте. Браузер мгновенно откатывается с HTTP/3 на обычный HTTPS поверх TCP (TLS 1.3), для которого работает Vision и :term[splice]. |
| `xtls-rprx-vision-udp443` | Только клиент (на сервере остаётся `xtls-rprx-vision`) | **Пропускает** `UDP/443` без блокировки. Нужен, если конкретная программа жёстко требует QUIC и не умеет переключаться на TCP. |

## Условия работы XTLS и Linux `splice()` {#splice-conditions} :orig[/config/outbounds/vless.html~:Splice | Splice 零拷贝]

XTLS Vision поддерживается в двух связках:

- **`RAW (TCP) + REALITY / TLS`** — полный режим с переходом в ядерный zero-copy :term[splice] на Linux и Android.
- **`VLESS Encryption` поверх любого транспорта** (в том числе `XHTTP` и `WebSocket`) — снимает повторное шифрование самого VLESS Encryption; если транспорт `RAW`, дополнительно включается `splice()`.

Чтобы на Linux-сервере или роутере автоматически включился `splice()`, должны выполняться условия:

- Входящий трафик приходит по чистому TCP (`Tunnel`, `SOCKS`, `HTTP`, `VLESS+XTLS`).
- Исходящее соединение использует `VLESS + XTLS Vision` поверх `RAW`.
- Включён системный механизм `splice` (включён по умолчанию, управляется переменной `XRAY_BUF_SPLICE`).

## Передача UDP поверх VLESS: протокол XUDP {#xudp} :orig[/development/protocols/muxcool.html | XUDP / Mux.Cool]

Обычный VLESS работает поверх TCP-транспорта (`RAW`, `XHTTP`, `WS`). Чтобы передавать через него UDP-трафик (DNS, онлайн-игры, звонки, WebRTC), Xray по умолчанию использует встроенный протокол **XUDP**:

- Мультиплексирует UDP-потоки внутри одного TCP-соединения.
- Присваивает каждому локальному UDP-сокету уникальный `GlobalID`, благодаря чему сервер удерживает один и тот же внешний UDP-порт для разных адресатов — это обеспечивает полноценный :term[nat]{FullCone NAT}.
- Не путайте `XUDP` с устаревшим `mux.cool` (`mux.enabled: true`): при использовании `XTLS Vision` или `XHTTP` включать `mux.enabled: true` **нельзя** — оно ломает Vision и избыточно для XMUX.
