export interface OriginSource {
  label: string;
  baseUrl: string;
  descriptionRu: string;
  descriptionEn: string;
}

export const ORIGINS = {
  docs: {
    label: 'xtls.github.io',
    baseUrl: 'https://xtls.github.io',
    descriptionRu: 'Официальная китайская документация Xray-core',
    descriptionEn: 'Official Chinese Xray-core documentation',
  },
  xhttp: {
    label: 'Xray-core #4113',
    baseUrl: 'https://github.com/XTLS/Xray-core/discussions/4113',
    descriptionRu: 'Официальная спецификация XHTTP: Beyond REALITY',
    descriptionEn: 'Official XHTTP: Beyond REALITY specification',
  },
  xhttpProto: {
    label: 'splithttp/config.proto',
    baseUrl: 'https://github.com/XTLS/Xray-core/blob/main/transport/internet/splithttp/config.proto',
    descriptionRu: 'Protobuf-схема всех параметров XHTTP в исходниках Xray-core',
    descriptionEn: 'Protobuf schema of all XHTTP fields in Xray-core',
  },
  vlessEnc: {
    label: 'Xray-core PR #5067',
    baseUrl: 'https://github.com/XTLS/Xray-core/pull/5067',
    descriptionRu: 'Спецификация постквантового шифрования VLESS Encryption',
    descriptionEn: 'Post-quantum VLESS Encryption specification',
  },
  reality: {
    label: 'XTLS/REALITY',
    baseUrl: 'https://github.com/XTLS/REALITY/blob/main/README.md',
    descriptionRu: 'Первоисточник протокола REALITY',
    descriptionEn: 'Primary REALITY protocol specification',
  },
  shareUri: {
    label: 'Xray-core #716',
    baseUrl: 'https://github.com/XTLS/Xray-core/discussions/716',
    descriptionRu: 'Стандарт ссылок подключения vless:// и vmess://',
    descriptionEn: 'Standard for vless:// and vmess:// share links',
  },
  uuidMap: {
    label: 'Xray-core #158',
    baseUrl: 'https://github.com/XTLS/Xray-core/issues/158',
    descriptionRu: 'Стандарт отображения строки в UUIDv5',
    descriptionEn: 'String-to-UUIDv5 mapping standard',
  },
  vlessRoute: {
    label: 'Xray-core PR #5009',
    baseUrl: 'https://github.com/XTLS/Xray-core/pull/5009',
    descriptionRu: 'Механизм маршрутизации vlessRoute',
    descriptionEn: 'vlessRoute routing mechanism',
  },
  rulesDat: {
    label: 'XTLS/Xray-rules-dat',
    baseUrl: 'https://github.com/XTLS/Xray-rules-dat/blob/main/README_zh-Hans.md',
    descriptionRu: 'Репозиторий баз geoip.dat и geosite.dat',
    descriptionEn: 'geoip.dat and geosite.dat repository',
  },
  apiDocs: {
    label: 'Xray-API-documents',
    baseUrl: 'https://github.com/XTLS/Xray-API-documents',
    descriptionRu: 'Документация gRPC API Xray-core',
    descriptionEn: 'Xray-core gRPC API documentation',
  },
  utls: {
    label: 'refraction-networking/utls',
    baseUrl: 'https://github.com/refraction-networking/utls/blob/master/u_common.go',
    descriptionRu: 'Список отпечатков TLS ClientHello библиотеки uTLS',
    descriptionEn: 'uTLS ClientHello fingerprint list',
  },
  sudoku: {
    label: 'SUDOKU-ASCII/sudoku',
    baseUrl: 'https://github.com/SUDOKU-ASCII/sudoku/blob/main/configs/README.zh_CN.md',
    descriptionRu: 'Документация обфускатора Sudoku в FinalMask',
    descriptionEn: 'Sudoku obfuscator documentation for FinalMask',
  },
  rfc: {
    label: 'IETF RFC',
    baseUrl: 'https://www.rfc-editor.org/rfc',
    descriptionRu: 'Сетевые стандарты IETF RFC',
    descriptionEn: 'IETF RFC networking standards',
  },
} as const satisfies Record<string, OriginSource>;

export type OriginKey = keyof typeof ORIGINS;

/**
 * Собирает точную ссылку на первоисточник для :orig[...]:
 * - `#якорь` -> `<base><origPath>#якорь`
 * - `~:фраза` -> `<base><origPath>#:~:text=<encoded>` (Text Fragments)
 * - `/другая/страница#якорь` -> `<base>/другая/страница#якорь`
 * - `sourceKey:ref` -> переключение на другой ключ из ORIGINS
 * - `https://...` -> внешняя ссылка напрямую
 */
export function resolveOriginUrl(
  rawRef: string,
  pageSource: OriginKey = 'docs',
  pagePath = '/',
): string {
  const ref = rawRef.trim();
  if (/^https?:\/\//i.test(ref)) {
    return ref;
  }

  let sourceKey: OriginKey = pageSource;
  let target = ref;

  const prefixMatch = ref.match(/^([a-zA-Z0-9_-]+):(.*)$/);
  if (prefixMatch && prefixMatch[1] in ORIGINS && !ref.startsWith('~:')) {
    sourceKey = prefixMatch[1] as OriginKey;
    target = prefixMatch[2].trim();
  }

  const base = ORIGINS[sourceKey].baseUrl.replace(/\/+$/, '');
  const normalizedPagePath =
    sourceKey === pageSource && pagePath
      ? pagePath.startsWith('/')
        ? pagePath
        : `/${pagePath}`
      : '';

  if (!target) {
    return `${base}${normalizedPagePath}`;
  }

  if (target.startsWith('~:')) {
    const fragment = encodeURIComponent(target.slice(2).trim());
    return `${base}${normalizedPagePath}#:~:text=${fragment}`;
  }

  if (target.startsWith('#')) {
    return `${base}${normalizedPagePath}${target}`;
  }

  if (target.startsWith('/')) {
    const tildeIdx = target.indexOf('~:');
    if (tildeIdx !== -1) {
      const p = target.slice(0, tildeIdx).replace(/#$/, '');
      const text = encodeURIComponent(target.slice(tildeIdx + 2).trim());
      return `${base}${p}#:~:text=${text}`;
    }
    return `${base}${target}`;
  }

  return `${base}/${target}`;
}
