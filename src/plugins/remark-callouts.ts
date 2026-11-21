import type { BlockContent, Html, Root } from 'mdast';

const CALLOUT_START_RE = /^:::(tip|warning|danger|info)(?:\s+(.+))?\s*$/;

const CLASS_MAP: Record<string, string> = {
  tip: 'note tip',
  info: 'note tip',
  warning: 'note warn',
  danger: 'note danger',
};

const DEFAULT_TITLES: Record<'ru' | 'en', Record<string, string>> = {
  ru: {
    tip: 'Совет',
    info: 'Заметка',
    warning: 'Важно',
    danger: 'Осторожно',
  },
  en: {
    tip: 'Tip',
    info: 'Note',
    warning: 'Warning',
    danger: 'Caution',
  },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function remarkCallouts() {
  return (tree: Root, file: { history?: string[] }) => {
    const lang: 'ru' | 'en' = file.history?.[0]?.replace(/\\/g, '/').includes('/docs/en/') ? 'en' : 'ru';
    const children = tree.children as BlockContent[];
    const next: BlockContent[] = [];

    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      if (node.type === 'paragraph' && node.children.length === 1 && node.children[0].type === 'text') {
        const match = node.children[0].value.trim().match(CALLOUT_START_RE);
        if (match) {
          const kind = match[1];
          const title = match[2]?.trim() || DEFAULT_TITLES[lang][kind];
          let endIdx = -1;
          for (let j = i + 1; j < children.length; j++) {
            const candidate = children[j];
            if (
              candidate.type === 'paragraph' &&
              candidate.children.length === 1 &&
              candidate.children[0].type === 'text' &&
              candidate.children[0].value.trim() === ':::'
            ) {
              endIdx = j;
              break;
            }
          }
          if (endIdx !== -1) {
            next.push({
              type: 'html',
              value: `<div class="${CLASS_MAP[kind]}"><div class="note-title">${escapeHtml(title)}</div><div class="note-body">`,
            } as Html);
            for (let k = i + 1; k < endIdx; k++) {
              next.push(children[k]);
            }
            next.push({ type: 'html', value: '</div></div>' } as Html);
            i = endIdx;
            continue;
          }
        }
      }
      next.push(node);
    }

    tree.children = next;
  };
}
