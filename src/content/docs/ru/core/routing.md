---
title: Маршрутизация, балансировщики и GeoData
description: Полный справочник правил маршрутизации (RoutingObject, RuleObject), стратегий domainStrategy, балансировщиков, Observatory и автообновления geoip/geosite.
order: 3
origSource: docs
origPath: /config/routing.html
origTitle: 路由
---

Модуль **`routing`** проверяет каждое входящее соединение по списку правил `rules[]` **сверху вниз** и отправляет его в первый совпавший `outboundTag` или `balancerTag`. Если ни одно правило не подошло, трафик уходит в самый первый элемент массива `outbounds[]`.

## Стратегия разрешения доменов (`domainStrategy`) {#domain-strategy} :orig[#routingobject | RoutingObject]

| Значение | Как работает |
| :--- | :--- |
| **`AsIs`** *(по умолчанию)* | Проверяет правила только по домену (без DNS-запросов). Максимальная скорость, но IP-правила (`geoip:`) для доменных запросов не сработают. |
| **`IPIfNonMatch`** | Сначала проверяет доменные правила. Если ни одно не подошло, разрешает домен через встроенный DNS и повторно проверяет IP-правила. |
| **`IPOnDemand`** | Как только в списке правил встречается любое IP-правило, немедленно разрешает домен через DNS и проверяет его IP. |

## Все критерии правила (`RuleObject`) {#rule-object} :orig[#ruleobject | RuleObject]

Внутри одного правила **разные поля объединяются по логическому "И" (AND)**, а элементы внутри массива одного поля — по "ИЛИ" (OR):

- **`domain[]`** (совпадение по домену):
  - `example.com`: вхождение подстроки.
  - `domain:example.com`: сам домен и все его поддомены.
  - `full:example.com`: точное совпадение.
  - `regexp:\\.ru$`: регулярное выражение.
  - `geosite:category-ads-all`: категория из `geosite.dat` (или `ext:file.dat:tag`). :orig[rulesDat: | geosite / geoip 规则]
- **`ip[]`**: IP-адрес, подсеть :term[cidr], `geoip:private`, `geoip:ru`, отрицание `!geoip:cn` или `ext:file.dat:tag`. :orig[~:ip | IP 规则]
- **`port` / `sourcePort` / `localPort`**: целевой, исходный или локальный порт (число, строка `"80,443"` или диапазон `"1000-2000"`).
- **`network`**: `"tcp"`, `"udp"` или `"tcp,udp"`.
- **`sourceIP[]` / `localIP[]`**: IP клиента или локального интерфейса.
- **`inboundTag[]`**: теги входящих подключений (`inbounds[].tag`).
- **`user[]`**: список `email` пользователей (из `clients[].email`).
- **`protocol[]`**: протокол, определённый через `sniffing` (`"http"`, `"tls"`, `"quic"`, `"bittorrent"`).
- **`attrs`**: условия по HTTP-атрибутам и заголовкам (например, `":method"`, `":path"`, `"user-agent"`).
- **`process[]`**: имя или путь локального процесса ОС (включая специальные значения `self/` и `xray/`).
- **`vlessRoute`**: маршрутизация по 2-байтовому тегу маршрута, переданному клиентом внутри VLESS (удобно для выбора разных выходов на одной ноде без создания десятков пользователей). :orig[vlessRoute: | vlessRoute PR #5009]
- **`outboundTag`** или **`balancerTag`**: куда направить совпавший трафик.
- **`ruleTag`**: имя правила в логах.
- **`webhook`** (`url`, `deduplication`, `headers`): отправка HTTP-уведомления при срабатывании правила.

## Балансировщики, Observatory и GeoData {#balancers-geodata} :orig[#balancerobject | BalancerObject]

- **`routing.balancers[]`**: распределяет трафик между группой выходов по префиксу `selector[]` с резервным `fallbackTag`.
  - `strategy.type`: `"random"`, `"roundRobin"`, `"leastPing"` (минимальная задержка) или `"leastLoad"` (учёт `expected`, `maxRTT`, `tolerance`, `baselines`, `costs`).
- **`observatory` / `burstObservatory`**: периодическая проверка доступности и пинга выходов (`subjectSelector`, `probeUrl` / `pingConfig.destination`, `probeInterval` / `interval`, `sampling`, `timeout`), необходимая для `leastPing` и `leastLoad`. :orig[/config/observatory.html | 连接观测]
- **`geodata`**: автоматическое обновление и горячая перезагрузка `geoip.dat` / `geosite.dat` по расписанию `cron` через указанный `outbound` (`assets[]`: `url`, `file`). :orig[/config/geodata.html | 地理数据文件]
- **`routing.script`**: путь к Lua-скрипту для программной маршрутизации. :orig[/development/lua/ | Lua 脚本]
