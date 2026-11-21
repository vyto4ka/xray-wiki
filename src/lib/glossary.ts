import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import type { Lang } from '../i18n/ui';

export interface GlossaryEntry {
  id: string;
  zh?: string;
  path: string;
  ru: {
    title: string;
    short: string;
  };
  en: {
    title: string;
    short: string;
  };
}

let cachedGlossary: Record<string, GlossaryEntry> | null = null;

export function loadGlossary(): Record<string, GlossaryEntry> {
  if (cachedGlossary) return cachedGlossary;
  const filePath = path.resolve(process.cwd(), 'src/content/glossary.yaml');
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = YAML.parse(raw) as { terms: Record<string, Omit<GlossaryEntry, 'id'>> };
  const result: Record<string, GlossaryEntry> = {};
  for (const [id, entry] of Object.entries(parsed?.terms ?? {})) {
    result[id] = { id, ...entry };
  }
  cachedGlossary = result;
  return result;
}

export function getGlossaryList(): GlossaryEntry[] {
  return Object.values(loadGlossary());
}

export function getGlossaryTerm(id: string): GlossaryEntry | undefined {
  return loadGlossary()[id];
}

export function termHref(entry: GlossaryEntry, lang: Lang, basePath = ''): string {
  const cleanBase = basePath === '/' ? '' : basePath.replace(/\/+$/, '');
  const cleanPath = entry.path.startsWith('/') ? entry.path : `/${entry.path}`;
  return `${cleanBase}/${lang}${cleanPath}`;
}
