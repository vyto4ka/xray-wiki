import { visit } from 'unist-util-visit';
import type { PhrasingContent, Root, Text } from 'mdast';
import { loadGlossary, termHref } from '../lib/glossary';

// Синтаксис: :term[sni] или :term[sni]{открытый SNI}
const TERM_RE = /:term\[([a-zA-Z0-9_-]+)\](?:\{([^}]+)\})?/g;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function detectLang(filePath?: string): 'ru' | 'en' {
  if (!filePath) return 'ru';
  return filePath.replace(/\\/g, '/').includes('/docs/en/') ? 'en' : 'ru';
}

export function remarkTermRef(options: { basePath?: string } = {}) {
  const basePath = options.basePath ?? '/';

  return (tree: Root, file: { history?: string[] }) => {
    const glossary = loadGlossary();
    const lang = detectLang(file.history?.[0]);

    visit(tree, (node) => {
      if (
        node.type !== 'paragraph' &&
        node.type !== 'tableCell' &&
        node.type !== 'emphasis' &&
        node.type !== 'strong'
      ) {
        return;
      }

      const parent = node as { children: PhrasingContent[] };
      if (!Array.isArray(parent.children)) return;

      const updated: PhrasingContent[] = [];
      let changed = false;

      for (const child of parent.children) {
        if (child.type !== 'text' || !child.value.includes(':term[')) {
          updated.push(child);
          continue;
        }

        const text = (child as Text).value;
        TERM_RE.lastIndex = 0;
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = TERM_RE.exec(text)) !== null) {
          const termId = match[1];
          const customLabel = match[2];
          const entry = glossary[termId];

          if (!entry) {
            // Если термин не найден в glossary.yaml, оставляем текст и валидатор поймает ошибку
            continue;
          }

          changed = true;
          const before = text.slice(lastIndex, match.index);
          if (before) updated.push({ type: 'text', value: before });

          const localized = entry[lang];
          const label = customLabel?.trim() || localized.title;
          const href = termHref(entry, lang, basePath);
          const zhAttr = entry.zh ? ` data-term-zh="${escapeHtml(entry.zh)}"` : '';

          updated.push({
            type: 'html',
            value: `<a class="term-link" href="${escapeHtml(href)}" data-term-id="${escapeHtml(termId)}" data-term-title="${escapeHtml(localized.title)}" data-term-short="${escapeHtml(localized.short)}"${zhAttr}>${escapeHtml(label)}</a>`,
          } as unknown as PhrasingContent);

          lastIndex = TERM_RE.lastIndex;
        }

        const after = text.slice(lastIndex);
        if (after) updated.push({ type: 'text', value: after });
      }

      if (changed) {
        parent.children = updated;
      }
    });
  };
}
