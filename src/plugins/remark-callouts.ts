import type { BlockContent, Html, Paragraph, PhrasingContent, Root } from 'mdast';

const CALLOUT_START_RE = /^:::(tip|warning|danger|info)(?:[ \t]+(.*))?$/;

const CLASS_MAP: Record<string, string> = {
  tip: 'note tip',
  info: 'note tip',
  warning: 'note warn',
  danger: 'note danger',
};

const DEFAULT_TITLES: Record<'ru' | 'en', Record<string, string>> = {
  ru: { tip: 'Совет', info: 'Заметка', warning: 'Важно', danger: 'Осторожно' },
  en: { tip: 'Tip', info: 'Note', warning: 'Warning', danger: 'Caution' },
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Разделяет первый абзац на первую строку (директива + заголовок, включая возможный inlineCode)
 * и оставшиеся узлы тела абзаца после первого переноса строки.
 */
function splitFirstLine(para: Paragraph): { kind: string; titleHtml: string; bodyChildren: PhrasingContent[] } | null {
  if (para.children.length === 0) return null;
  const first = para.children[0];
  if (first.type !== 'text') return null;

  const nl0 = first.value.indexOf('\n');
  const headText = nl0 === -1 ? first.value : first.value.slice(0, nl0);
  const startMatch = headText.trimStart().match(CALLOUT_START_RE);
  if (!startMatch) return null;

  const kind = startMatch[1];
  const titleParts: string[] = [];
  if (startMatch[2]) titleParts.push(escapeHtml(startMatch[2]));

  // Если перенос строки уже был в первом text-узле — заголовок закончился
  if (nl0 !== -1) {
    const bodyChildren: PhrasingContent[] = [];
    const rest = first.value.slice(nl0 + 1);
    if (rest) bodyChildren.push({ type: 'text', value: rest });
    for (let i = 1; i < para.children.length; i++) {
      bodyChildren.push({ ...para.children[i] } as PhrasingContent);
    }
    return { kind, titleHtml: titleParts.join('').trim(), bodyChildren };
  }

  // Иначе заголовок содержит inlineCode / emphasis и тянется до первого '\n' в последующем text-узле
  let splitIdx = -1;
  let afterSplit = '';
  for (let i = 1; i < para.children.length; i++) {
    const child = para.children[i];
    if (child.type === 'text') {
      const nl = child.value.indexOf('\n');
      if (nl !== -1) {
        titleParts.push(escapeHtml(child.value.slice(0, nl)));
        afterSplit = child.value.slice(nl + 1);
        splitIdx = i;
        break;
      }
      titleParts.push(escapeHtml(child.value));
    } else if (child.type === 'inlineCode') {
      titleParts.push(`<code>${escapeHtml(child.value)}</code>`);
    } else if ('children' in child && Array.isArray(child.children)) {
      const inner = child.children
        .map((c) => ('value' in c && typeof c.value === 'string' ? escapeHtml(c.value) : ''))
        .join('');
      titleParts.push(inner);
    }
  }

  const bodyChildren: PhrasingContent[] = [];
  if (splitIdx !== -1) {
    if (afterSplit) bodyChildren.push({ type: 'text', value: afterSplit });
    for (let i = splitIdx + 1; i < para.children.length; i++) {
      bodyChildren.push({ ...para.children[i] } as PhrasingContent);
    }
  }

  return { kind, titleHtml: titleParts.join('').trim(), bodyChildren };
}

function stripClosingFromParagraph(para: Paragraph): boolean {
  if (para.children.length === 0) return false;
  const last = para.children[para.children.length - 1];
  if (last.type !== 'text') return false;

  if (last.value.trim() === ':::') {
    para.children.pop();
    return true;
  }
  const m = last.value.match(/\r?\n:::\s*$/);
  if (m) {
    last.value = last.value.slice(0, m.index).trimEnd();
    return true;
  }
  return false;
}

export function remarkCallouts() {
  return (tree: Root, file: { history?: string[] }) => {
    const lang: 'ru' | 'en' = file.history?.[0]?.replace(/\\/g, '/').includes('/docs/en/') ? 'en' : 'ru';
    const children = tree.children as BlockContent[];
    const next: BlockContent[] = [];

    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      if (node.type !== 'paragraph') {
        next.push(node);
        continue;
      }

      const open = splitFirstLine(node);
      if (!open) {
        next.push(node);
        continue;
      }

      const titleHtml = open.titleHtml || escapeHtml(DEFAULT_TITLES[lang][open.kind]);
      const firstBody: Paragraph = { type: 'paragraph', children: open.bodyChildren };

      // Вариант 1: одноабзацный callout
      if (stripClosingFromParagraph(firstBody)) {
        next.push({
          type: 'html',
          value: `<div class="${CLASS_MAP[open.kind]}"><div class="note-title">${titleHtml}</div><div class="note-body">`,
        } as Html);
        if (firstBody.children.length > 0) next.push(firstBody);
        next.push({ type: 'html', value: '</div></div>' } as Html);
        continue;
      }

      // Вариант 2: многоабзацный callout
      let endIdx = -1;
      let closingInline = false;
      for (let j = i + 1; j < children.length; j++) {
        const candidate = children[j];
        if (candidate.type === 'paragraph') {
          if (
            candidate.children.length === 1 &&
            candidate.children[0].type === 'text' &&
            candidate.children[0].value.trim() === ':::'
          ) {
            endIdx = j;
            break;
          }
          const last = candidate.children[candidate.children.length - 1];
          if (last?.type === 'text' && /\r?\n:::\s*$/.test(last.value)) {
            endIdx = j;
            closingInline = true;
            break;
          }
        }
      }

      if (endIdx !== -1) {
        next.push({
          type: 'html',
          value: `<div class="${CLASS_MAP[open.kind]}"><div class="note-title">${titleHtml}</div><div class="note-body">`,
        } as Html);
        if (firstBody.children.length > 0) next.push(firstBody);
        for (let k = i + 1; k < endIdx; k++) next.push(children[k]);
        if (closingInline) {
          const endPara = children[endIdx] as Paragraph;
          stripClosingFromParagraph(endPara);
          if (endPara.children.length > 0) next.push(endPara);
        }
        next.push({ type: 'html', value: '</div></div>' } as Html);
        i = endIdx;
        continue;
      }

      next.push(node);
    }

    tree.children = next;
  };
}
