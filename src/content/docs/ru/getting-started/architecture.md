---
title: Архитектура Xray-core, config.json и команды CLI
description: Как устроен Xray-core внутри, все корневые модули конфигурации, многофайловые конфиги и полный список команд CLI.
order: 1
origSource: docs
origPath: /config/
origTitle: 配置文件
---

**Xray-core** — универсальное модульное ядро для построения прокси-систем, развивающееся независимо от V2Ray. Один и тот же исполняемый файл (`xray`) работает и на **сервере**, и на **клиенте** — разница заключается только в содержимом конфигурационного файла.

:::warning Примечание о версиях
Официальная документация `xtls.github.io` всегда описывает самую свежую версию Xray-core (включая pre-release). Версия с пометкой `Latest` на GitHub иногда отстаёт, поэтому новые поля вроде `VLESS Encryption`, `FinalMask` или `version` требуют актуального ядра.
:::

## Корневые модули config.json {#root-modules} :orig[#基础配置模块 | 基础配置模块]

Конфигурация Xray пишется в формате `JSON` (поддерживаются комментарии `//`), а также в `TOML`, `YAML` или скомпилированном `Protobuf (.pb)`.

```jsonc
{
  "version": { "min": "25.8.3", "max": "" },
  "env": {},
  "log": {},
  "api": {},
  "dns": {},
  "fakedns": {},
  "routing": {},
  "policy": {},
  "inbounds": [],
  "outbounds": [],
  "stats": {},
  "metrics": {},
  "observatory": {},
  "burstObservatory": {},
  "geodata": {}
}
```

- **`inbounds`** — массив входящих подключений (то, **откуда** Xray принимает трафик: локальный порт SOCKS/TUN на клиенте или порт `443` с VLESS+REALITY на сервере). :orig[/config/inbound.html | 入站代理]
- **`outbounds`** — массив исходящих подключений (то, **куда** Xray отправляет трафик: на удалённый сервер, напрямую в интернет через `freedom` или в сброс `blackhole`). :orig[/config/outbound.html | 出站代理]
- **`routing`** — правила маршрутизации и балансировщики, решающие, в какой `outbound` направить каждое соединение. :orig[/config/routing.html | 路由]
- **`dns`** и **`fakedns`** — встроенный DNS-сервер с поддержкой :term[doh]{DoH/DoQ}, разделением доменов и :term[fakedns]{FakeDNS}. :orig[/config/dns.html | 内置 DNS 服务器]
- **`policy`** — таймауты, размеры буферов и флаги сбора статистики по уровням пользователей (`level`). :orig[/config/policy.html | 本地策略]
- **`log`** — настройка журналов `access`, `error`, уровня `loglevel` (`debug` / `info` / `warning` / `error` / `none`), `dnsLog` и маскирования клиентских IP (`maskAddress`: `quarter` | `half` | `full`). :orig[/config/log.html | 日志配置]
- **`stats`**, **`api`** и **`metrics`** — подсчёт трафика, gRPC API управления на лету и экспорт метрик (`pprof`, `expvars`). :orig[/config/api.html | API 接口]
- **`observatory`** и **`burstObservatory`** — фоновый и импульсный мониторинг задержки и доступности исходящих серверов. :orig[/config/observatory.html | 连接观测]
- **`geodata`** — автоматическое обновление и горячая перезагрузка баз `geoip.dat` и `geosite.dat` по расписанию `cron`. :orig[/config/geodata.html | 地理数据文件]
- **`env`** — переопределение встроенных переменных окружения прямо из конфига. :orig[/config/env.html | 环境变量]
- **`version`** — ограничение допустимого диапазона версий ядра (`min`, `max` в формате `x.y.z`, доступно с `25.8.3`). :orig[~:version | 版本限制]

## Многофайловая конфигурация {#multiple-configs} :orig[/config/features/multiple.html | 多文件配置]

Вместо одного гигантского `config.json` конфигурацию можно разбить на несколько файлов (например, `00_log.json`, `01_inbounds.json`, `02_outbounds.json`, `03_routing.json`) и передать их через `-confdir /etc/xray/conf.d` или несколько флагов `-c`.

- Обычные объекты `{}` при слиянии **перезаписываются** более поздним файлом (в алфавитном порядке).
- Массивы `inbounds`, `outbounds` и `routing.rules` **объединяются** (дописываются друг за другом).
- Проверить итоговый склеенный конфиг без запуска можно командой `xray run -confdir ... -dump` или проверить валидность через `-test`.

## Полный справочник команд CLI {#cli-commands} :orig[/document/command.html | 命令参数]

| Команда | Назначение |
| :--- | :--- |
| `xray run [-c file] [-confdir dir] [-test] [-dump]` | Запуск ядра (команда по умолчанию). `-c` принимает файлы, `stdin:`, `http(s)://` и `http+unix://` |
| `xray version` | Показать версию Xray-core и компилятора Go |
| `xray uuid [-i "строка"]` | Сгенерировать случайный :term[uuid]{UUIDv4} или детерминированный `UUIDv5` из строки до 30 байт |
| `xray x25519 [-i key --std-encoding]` | Сгенерировать пару ключей :term[x25519] (`PrivateKey` + `Password` для REALITY и VLESS Encryption) |
| `xray mldsa65 [-i seed]` | Сгенерировать постквантовую пару подписей :term[mldsa65] для REALITY (`mldsa65Seed` / `mldsa65Verify`) |
| `xray mlkem768 [-i seed]` | Сгенерировать постквантовую пару :term[mlkem768] для VLESS Encryption |
| `xray vlessenc` | Сгенерировать готовую пару строк `decryption` / `encryption` для VLESS Encryption |
| `xray wg` | Сгенерировать ключевую пару Curve25519 для WireGuard |
| `xray tls cert \| ping \| certChainHash` | Выпуск тестового сертификата, проверка TLS-рукопожатия домена (`ping`) и расчёт SHA-256 пина сертификата |
| `xray api <subcommand>` | Вызов gRPC API запущенного процесса (`stats`, `statsquery`, `adi`, `ado`, `rmi`, `rmo`, `restartlogger`) |
| `xray convert pb \| json` | Конвертация JSON-конфигов в бинарный Protobuf `.pb` и декодирование `typedMessage` |
