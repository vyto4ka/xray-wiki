---
title: TLS, сертификаты, ECH и пиннинг
description: "Полный справочник объекта tlsSettings: serverName, ALPN, uTLS fingerprint, ECH, CertificateObject, OCSP Stapling и проверка сертификатов."
order: 1
origSource: docs
origPath: /config/transports/tls.html
origTitle: TLS
---

Объект **`tlsSettings`** настраивает классическое шифрование :term[tls]{TLS 1.3} (когда у вас есть собственный домен и сертификат или вы подключаетесь через :term[cdn]).

## Основные поля TLSObject {#tls-object} :orig[#tlsobject | TLSObject]

```jsonc
"tlsSettings": {
  "serverName": "example.com",
  "alpn": ["h2", "http/1.1"],
  "fingerprint": "chrome",
  "minVersion": "1.3",
  "maxVersion": "1.3",
  "rejectUnknownSni": false,
  "enableSessionResumption": false,
  "pinnedPeerCertSha256": "",
  "verifyPeerCertByName": "",
  "echConfigList": "",
  "certificates": []
}
```

- **`serverName`**: имя домена :term[sni], отправляемое клиентом (и используемое для проверки сертификата сервера). :orig[~:serverName | serverName]
- **`alpn`**: список протоколов :term[alpn] (`["h2", "http/1.1"]` или `["h3"]` для QUIC/XHTTP). :orig[~:alpn | ALPN]
- **`fingerprint`**: отпечаток браузера :term[utls] (`"chrome"`, `"firefox"`, `"safari"`, `"ios"`, `"android"`, `"edge"`). :orig[~:fingerprint | uTLS 指纹]
- **`minVersion` / `maxVersion`**: минимальная и максимальная версии TLS (`"1.2"`, `"1.3"`). :orig[~:minVersion | TLS 版本]
- **`cipherSuites` / `curvePreferences`**: явный список шифронаборов и эллиптических кривых (например, `X25519MLKEM768`). :orig[~:cipherSuites | 加密套件]
- **`rejectUnknownSni`** *(сервер)*: немедленно обрывать рукопожатие, если присланный клиентом SNI не совпадает ни с одним загруженным сертификатом. :orig[~:rejectUnknownSni | rejectUnknownSni]
- **`enableSessionResumption`**: разрешить TLS Session Resumption (ускоряет повторные подключения, но может создавать коррелируемый тикет). :orig[~:enableSessionResumption | 会话恢复]
- **`masterKeyLog`**: путь к файлу NSS Key Log для расшифровки трафика в Wireshark при отладке. :orig[~:masterKeyLog | masterKeyLog]

## Проверка сертификата без `allowInsecure` {#cert-verification} :orig[~:pinnedPeerCertSha256 | 证书校验]

В современных версиях Xray-core небезопасный флаг `allowInsecure` удалён. Для самоподписанных сертификатов или усиленной защиты от MITM используйте точные проверки:

- **`pinnedPeerCertSha256`** *(в ссылке `pcs`)*: SHA-256 отпечаток сертификата сервера или корневого CA (вычисляется командой `xray tls certChainHash --cert fullchain.pem`). Можно указать несколько хэшей через запятую. :orig[~:pinnedPeerCertSha256 | pinnedPeerCertSha256]
- **`verifyPeerCertByName`** *(в ссылке `vcn`)*: альтернативное имя домена, по которому проверяется сертификат, если в `serverName` передан другой SNI (например, при доменном фронтинге). :orig[~:verifyPeerCertByName | verifyPeerCertByName]
- **`useSystemCA` / `disableSystemRoot`**: управление использованием системного хранилища корневых сертификатов ОС. :orig[~:disableSystemRoot | 系统根证书]

## Encrypted Client Hello (ECH) {#tls-ech} :orig[~:echConfigList | ECH 配置]

- **`echConfigList`** *(клиент, в ссылке `ech`)*: строка конфигурации ECH в Base64 или DNS-запрос для автоматического получения :term[ech]-ключей из HTTPS-записи домена (например, `"cloudflare-ech.com+https://1.1.1.1/dns-query"`).
- **`echServerKeys`** *(сервер)*: приватные ключи ECH сервера в Base64.
- **`echSockopt`**: отдельные опции сокета (`SockoptObject`) для DNS-запроса при получении `echConfigList`.

## Серверные сертификаты (`certificates[]`) {#certificates} :orig[#certificateobject | CertificateObject]

| Поле | Назначение |
| :--- | :--- |
| `certificateFile` / `keyFile` | Пути к файлам `fullchain.pem` и `privkey.pem` на диске (автоматически перечитываются при обновлении) |
| `certificate` / `key` | Содержимое PEM-сертификата и ключа прямо в массиве строк JSON |
| `usage` | `"encipherment"` (обычный TLS), `"verify"` (проверка клиентских сертификатов), `"issue"` (выдача сертификатов) |
| `ocspStapling` | Интервал обновления :term[ocsp]{OCSP Stapling} в секундах (например, `3600`) |
| `oneTimeLoading` | Загрузить сертификат один раз при старте без отслеживания изменений файла |
| `buildChain` | Автоматически достраивать цепочку сертификатов |
