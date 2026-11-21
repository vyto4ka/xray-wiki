import { defineConfig } from 'astro/config';
import { remarkHeadingId } from './src/plugins/remark-heading-id';
import { remarkOrigRef } from './src/plugins/remark-orig-ref';
import { remarkTermRef } from './src/plugins/remark-term-ref';
import { remarkCallouts } from './src/plugins/remark-callouts';

const basePath = process.env.BASE_PATH || '/';
const siteUrl = process.env.SITE_URL || 'https://vyto4ka.github.io';

export default defineConfig({
  site: siteUrl,
  base: basePath,
  output: 'static',
  trailingSlash: 'always',
  markdown: {
    syntaxHighlight: 'shiki',
    shikiConfig: {
      theme: 'github-dark-dimmed',
      wrap: false,
    },
    remarkPlugins: [
      remarkHeadingId,
      remarkCallouts,
      remarkOrigRef,
      [remarkTermRef, { basePath }],
    ],
  },
});
