import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

const ROOT = process.cwd();
const DOCS_DIR = path.join(ROOT, 'src/content/docs');
const GLOSSARY_PATH = path.join(ROOT, 'src/content/glossary.yaml');

const VALID_ORIGINS = new Set([
  'docs',
  'xhttp',
  'xhttpProto',
  'vlessEnc',
  'reality',
  'shareUri',
  'uuidMap',
  'vlessRoute',
  'rulesDat',
  'apiDocs',
  'utls',
  'sudoku',
  'rfc',
]);

const errors = [];

function walkMd(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walkMd(full));
    else if (entry.name.endsWith('.md')) results.push(full);
  }
  return results;
}

function parseFrontmatter(content, relPath) {
  const m = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) {
    errors.push(`[frontmatter] Отсутствует frontmatter в ${relPath}`);
    return { fm: {}, body: content };
  }
  try {
    const fm = YAML.parse(m[1]) || {};
    return { fm, body: content.slice(m[0].length) };
  } catch (err) {
    errors.push(`[frontmatter] Ошибка YAML в ${relPath}: ${err.message}`);
    return { fm: {}, body: content };
  }
}

function extractHeadingIds(body) {
  const ids = new Set();
  const re = /^#{1,6}\s+.*?\{#([a-zA-Z0-9_-]+)\}/gm;
  let m;
  while ((m = re.exec(body)) !== null) {
    ids.add(m[1]);
  }
  return ids;
}

// 1. Проверка glossary.yaml
if (!fs.existsSync(GLOSSARY_PATH)) {
  errors.push('[glossary] Не найден src/content/glossary.yaml');
}
const glossaryRaw = fs.existsSync(GLOSSARY_PATH)
  ? YAML.parse(fs.readFileSync(GLOSSARY_PATH, 'utf-8'))
  : { terms: {} };
const terms = glossaryRaw?.terms || {};

// 2. Проверка _meta.yaml для RU и EN
for (const lang of ['ru', 'en']) {
  const metaPath = path.join(DOCS_DIR, lang, '_meta.yaml');
  if (!fs.existsSync(metaPath)) {
    errors.push(`[meta] Отсутствует src/content/docs/${lang}/_meta.yaml`);
    continue;
  }
  const parsed = YAML.parse(fs.readFileSync(metaPath, 'utf-8'));
  if (!Array.isArray(parsed?.sections) || parsed.sections.length === 0) {
    errors.push(`[meta] Пустой список sections в ${lang}/_meta.yaml`);
  }
}

// 3. Сканирование всех Markdown-файлов
const anchorsByLangSlug = { ru: new Map(), en: new Map() };

for (const lang of ['ru', 'en']) {
  const langDir = path.join(DOCS_DIR, lang);
  const files = walkMd(langDir);

  for (const file of files) {
    const rel = path.relative(ROOT, file).replace(/\\/g, '/');
    const slug = path.relative(langDir, file).replace(/\\/g, '/').replace(/\.md$/, '');
    const content = fs.readFileSync(file, 'utf-8');
    const { fm, body } = parseFrontmatter(content, rel);

    if (!fm.title) errors.push(`[frontmatter] Нет title в ${rel}`);
    if (!fm.description) errors.push(`[frontmatter] Нет description в ${rel}`);
    if (fm.origSource && !VALID_ORIGINS.has(fm.origSource)) {
      errors.push(`[frontmatter] Неизвестный origSource "${fm.origSource}" в ${rel}`);
    }

    // Проверка :term[...]
    const termRe = /:term\[([a-zA-Z0-9_-]+)\]/g;
    let tm;
    while ((tm = termRe.exec(body)) !== null) {
      if (!(tm[1] in terms)) {
        errors.push(`[term] Неизвестный термин :term[${tm[1]}] в ${rel}`);
      }
    }

    // Проверка :orig[...]
    const origRe = /:orig\[([^\]]*)\]/g;
    let om;
    while ((om = origRe.exec(body)) !== null) {
      const payload = om[1].trim();
      if (!payload) {
        errors.push(`[orig] Пустая ссылка :orig[] в ${rel}`);
      }
    }

    anchorsByLangSlug[lang].set(slug, extractHeadingIds(body));
  }
}

// 4. Проверка ссылок из glossary.yaml на реальные статьи и якоря в RU
for (const [key, entry] of Object.entries(terms)) {
  if (!entry.ru?.title || !entry.ru?.short || !entry.en?.title || !entry.en?.short) {
    errors.push(`[glossary] Неполные локализации RU/EN для термина "${key}"`);
  }
  const p = String(entry.path || '');
  const [rawSlug, hash] = p.split('#');
  const slug = rawSlug.replace(/^\/+|\/+$/g, '');
  const ruAnchors = anchorsByLangSlug.ru.get(slug);
  if (!ruAnchors) {
    errors.push(`[glossary] Термин "${key}" ссылается на несуществующую статью "/ru/${slug}/"`);
  } else if (hash && !ruAnchors.has(hash)) {
    errors.push(`[glossary] Термин "${key}" ссылается на отсутствующий якорь "#${hash}" в "/ru/${slug}/"`);
  }
}

// 5. Синхронность явных якорей {#id} между RU и EN
for (const [slug, enIds] of anchorsByLangSlug.en.entries()) {
  const ruIds = anchorsByLangSlug.ru.get(slug);
  if (!ruIds) {
    errors.push(`[i18n] Английская статья "${slug}" не имеет парной русской версии`);
    continue;
  }
  for (const id of ruIds) {
    if (!enIds.has(id)) {
      errors.push(`[i18n] В английской версии "${slug}" отсутствует якорь {#${id}} из русской версии`);
    }
  }
  for (const id of enIds) {
    if (!ruIds.has(id)) {
      errors.push(`[i18n] В русской версии "${slug}" отсутствует якорь {#${id}} из английской версии`);
    }
  }
}

if (errors.length > 0) {
  console.error(`Найдено ошибок валидации: ${errors.length}`);
  for (const err of errors) console.error(`  - ${err}`);
  process.exit(1);
}

console.log(
  `OK: проверено ${anchorsByLangSlug.ru.size} RU статей, ${anchorsByLangSlug.en.size} EN статей, ${Object.keys(terms).length} терминов глоссария.`,
);
