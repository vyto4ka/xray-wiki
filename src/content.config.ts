import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const docs = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/docs' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    order: z.number().default(100),
    badge: z.string().optional(),
    origSource: z
      .enum([
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
      ])
      .default('docs'),
    origPath: z.string().default('/'),
    origTitle: z.string().optional(),
  }),
});

export const collections = { docs };
