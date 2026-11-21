import { visit } from 'unist-util-visit';
import type { Heading, PhrasingContent, Root, Text } from 'mdast';

const HEADING_ID_RE = /\s*\{#([a-zA-Z0-9_-]+)\}(?=\s*(?::orig\[|$))/;

export function remarkHeadingId() {
  return (tree: Root) => {
    visit(tree, 'heading', (node: Heading) => {
      for (const child of node.children as PhrasingContent[]) {
        if (child.type !== 'text') continue;
        const textNode = child as Text;
        const match = textNode.value.match(HEADING_ID_RE);
        if (match) {
          const customId = match[1];
          textNode.value = textNode.value.replace(HEADING_ID_RE, '').trimEnd();
          node.data = node.data || {};
          node.data.hProperties = {
            ...(node.data.hProperties ?? {}),
            id: customId,
          };
          break;
        }
      }
    });
  };
}
