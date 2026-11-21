import { visit } from 'unist-util-visit';
import type { BlockContent, Html, Paragraph, PhrasingContent, Root, Text } from 'mdast';
import { ORIGINS, resolveOriginUrl, type OriginKey } from '../config/origins';

const ORIG_INLINE_RE = /:orig\[([^\]]+)\]/g;
const EXPLAIN_START_RE = /^:::explain\{([^}]+)\}\s*$/;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function parseOrigPayload(payload: string): { ref: string; zh: string } {
  const pipeIdx = payload.indexOf('|');
  if (pipeIdx === -1) {
    return { ref: payload.trim(), zh: '' };
  }
  return {
    ref: payload.slice(0, pipeIdx).trim(),
    zh: payload.slice(pipeIdx + 1).trim(),
  };
}

function buildOrigHtml(
  ref: string,
  zh: string,
  pageSource: OriginKey,
  pagePath: string,
  lang: 'ru' | 'en',
  extraClass = '',
): string {
  const href = resolveOriginUrl(ref, pageSource, pagePath);
  const titlePrefix = lang === 'en' ? 'Source' : 'Первоисточник';
  const titleText = zh ? `${titlePrefix}: ${zh}` : titlePrefix;
  const cls = extraClass ? `orig-ref ${extraClass}` : 'orig-ref';
  const termAttr = zh ? ` data-orig-term="${escapeHtml(zh)}" data-pagefind-index-attrs="data-orig-term"` : '';
  const termSpan = zh ? `<span class="orig-ref__term">${escapeHtml(zh)}</span>` : '';

  return `<a class="${cls}" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer"${termAttr} title="${escapeHtml(titleText)}" aria-label="${escapeHtml(titleText)}">${termSpan}<span class="orig-ref__glyph">原</span><span class="orig-ref__arrow" aria-hidden="true">↗</span></a>`;
}

function parseAttrs(raw: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const attrRe = /([a-zA-Z0-9_-]+)\s*=\s*["“”]([^"“”]*)["“”]/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(raw)) !== null) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

function detectLangFromFile(filePath?: string): 'ru' | 'en' {
  if (!filePath) return 'ru';
  const norm = filePath.replace(/\\/g, '/');
  return norm.includes('/docs/en/') ? 'en' : 'ru';
}

export function remarkOrigRef() {
  return (tree: Root, file: { history?: string[]; data?: { astro?: { frontmatter?: Record<string, unknown> } } }) => {
    const fm = file.data?.astro?.frontmatter ?? {};
    const rawSource = typeof fm.origSource === 'string' && fm.origSource in ORIGINS ? (fm.origSource as OriginKey) : 'docs';
    const origPath = typeof fm.origPath === 'string' ? fm.origPath : '/';
    const lang = detectLangFromFile(file.history?.[0]);

    // 1. Блочная директива :::explain{ref="..." zh="..."} ... :::
    const children = tree.children as BlockContent[];
    const nextChildren: BlockContent[] = [];

    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      if (node.type === 'paragraph' && node.children.length > 0 && node.children[0].type === 'text') {
        const firstText = node.children[0].value;
        const nl = firstText.indexOf('\n');
        const firstLine = (nl === -1 ? firstText : firstText.slice(0, nl)).trim();
        const startMatch = firstLine.match(EXPLAIN_START_RE);

        if (startMatch) {
          const attrs = parseAttrs(startMatch[1]);
          const badgeHtml = buildOrigHtml(attrs.ref || '', attrs.zh || '', rawSource, origPath, lang, 'orig-ref--block');
          const restFirst = nl === -1 ? '' : firstText.slice(nl + 1);
          const cloned: PhrasingContent[] = node.children.map((c) => ({ ...c }) as PhrasingContent);
          (cloned[0] as Text).value = restFirst;
          const firstPara: Paragraph = { type: 'paragraph', children: cloned };

          const lastChild = cloned[cloned.length - 1];
          if (lastChild?.type === 'text' && /\r?\n:::\s*$/.test(lastChild.value)) {
            lastChild.value = lastChild.value.replace(/\r?\n:::\s*$/, '').trimEnd();
            nextChildren.push({
              type: 'html',
              value: `<div class="explain-box">${badgeHtml}<div class="explain-box__body">`,
            } as Html);
            nextChildren.push(firstPara);
            nextChildren.push({ type: 'html', value: `</div></div>` } as Html);
            continue;
          }

          let endIdx = -1;
          let closingKind: 'standalone' | 'inline-para' | 'inline-list' = 'standalone';
          for (let j = i + 1; j < children.length; j++) {
            const candidate = children[j];
            if (candidate.type === 'paragraph') {
              if (
                candidate.children.length === 1 &&
                candidate.children[0].type === 'text' &&
                candidate.children[0].value.trim() === ':::'
              ) {
                endIdx = j;
                closingKind = 'standalone';
                break;
              }
              const candLast = candidate.children[candidate.children.length - 1];
              if (candLast?.type === 'text' && /\r?\n:::\s*$/.test(candLast.value)) {
                endIdx = j;
                closingKind = 'inline-para';
                break;
              }
            } else if (candidate.type === 'list' && candidate.children.length > 0) {
              const lastLi = candidate.children[candidate.children.length - 1];
              const lastBlock = lastLi.children[lastLi.children.length - 1];
              if (lastBlock?.type === 'paragraph' && lastBlock.children.length > 0) {
                const lastText = lastBlock.children[lastBlock.children.length - 1];
                if (lastText?.type === 'text' && /\r?\n:::\s*$/.test(lastText.value)) {
                  endIdx = j;
                  closingKind = 'inline-list';
                  break;
                }
              }
            }
          }
          if (endIdx !== -1) {
            nextChildren.push({
              type: 'html',
              value: `<div class="explain-box">${badgeHtml}<div class="explain-box__body">`,
            } as Html);
            if (restFirst.trim() || cloned.length > 1) {
              nextChildren.push(firstPara);
            }
            for (let k = i + 1; k < endIdx; k++) {
              nextChildren.push(children[k]);
            }
            if (closingKind === 'inline-para') {
              const endPara = children[endIdx] as Paragraph;
              const endLast = endPara.children[endPara.children.length - 1] as Text;
              endLast.value = endLast.value.replace(/\r?\n:::\s*$/, '').trimEnd();
              nextChildren.push(endPara);
            } else if (closingKind === 'inline-list') {
              const endList = children[endIdx];
              if (endList.type === 'list') {
                const lastLi = endList.children[endList.children.length - 1];
                const lastBlock = lastLi.children[lastLi.children.length - 1] as Paragraph;
                const lastText = lastBlock.children[lastBlock.children.length - 1] as Text;
                lastText.value = lastText.value.replace(/\r?\n:::\s*$/, '').trimEnd();
              }
              nextChildren.push(endList);
            }
            nextChildren.push({
              type: 'html',
              value: `</div></div>`,
            } as Html);
            i = endIdx;
            continue;
          }
        }
      }
      nextChildren.push(node);
    }
    tree.children = nextChildren;

    // 2. Инлайн-метки :orig[ref | zh] в заголовках, абзацах, пунктах списков и ячейках таблиц
    visit(tree, (node) => {
      if (
        node.type !== 'heading' &&
        node.type !== 'paragraph' &&
        node.type !== 'tableCell'
      ) {
        return;
      }

      const parent = node as { children: PhrasingContent[]; data?: { hProperties?: Record<string, unknown> } };
      let foundInNode = false;
      const updated: PhrasingContent[] = [];

      for (const child of parent.children) {
        if (child.type !== 'text' || !child.value.includes(':orig[')) {
          updated.push(child);
          continue;
        }

        const text = (child as Text).value;
        ORIG_INLINE_RE.lastIndex = 0;
        let lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = ORIG_INLINE_RE.exec(text)) !== null) {
          foundInNode = true;
          const before = text.slice(lastIndex, match.index);
          if (before) {
            updated.push({ type: 'text', value: before.replace(/\s+$/, '') });
          }
          const { ref, zh } = parseOrigPayload(match[1]);
          const extraClass =
            node.type === 'heading'
              ? 'orig-ref--heading'
              : node.type === 'tableCell'
                ? 'orig-ref--cell'
                : 'orig-ref--side';
          updated.push({
            type: 'html',
            value: buildOrigHtml(ref, zh, rawSource, origPath, lang, extraClass),
          } as unknown as PhrasingContent);
          lastIndex = ORIG_INLINE_RE.lastIndex;
        }

        const after = text.slice(lastIndex);
        if (after) {
          updated.push({ type: 'text', value: after });
        }
      }

      if (foundInNode) {
        parent.children = updated;
        parent.data = parent.data || {};
        const hProps = parent.data.hProperties || {};
        const existing = typeof hProps.className === 'string' ? hProps.className : Array.isArray(hProps.className) ? hProps.className.join(' ') : '';
        hProps.className = `${existing} has-orig`.trim();
        parent.data.hProperties = hProps;
      }
    });

    // Помечаем <li>, если внутри его первого абзаца есть .has-orig, чтобы кнопка выравнивалась справа по строке списка
    visit(tree, 'listItem', (li) => {
      const first = li.children[0] as Paragraph | undefined;
      const cls = first?.data?.hProperties?.className as string | string[] | undefined;
      const clsStr = Array.isArray(cls) ? cls.join(' ') : typeof cls === 'string' ? cls : '';
      if (clsStr.includes('has-orig')) {
        li.data = li.data || {};
        li.data.hProperties = {
          ...(li.data.hProperties ?? {}),
          className: ['li-has-orig'],
        };
      }
    });
  };
}
