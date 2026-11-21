import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';
import { getCollection, type CollectionEntry } from 'astro:content';
import type { Lang } from '../i18n/ui';

export interface SectionMeta {
  id: string;
  title: string;
  icon: string;
  order: number;
  description?: string;
}

export interface NavItem {
  slug: string;
  title: string;
  description: string;
  order: number;
  badge?: string;
  isFallback: boolean;
}

export interface NavSection {
  id: string;
  title: string;
  icon: string;
  order: number;
  description?: string;
  items: NavItem[];
}

export interface ResolvedDoc {
  lang: Lang;
  slug: string;
  sectionId: string;
  entry: CollectionEntry<'docs'>;
  isFallback: boolean;
}

function readMeta(lang: Lang): SectionMeta[] {
  const filePath = path.resolve(process.cwd(), `src/content/docs/${lang}/_meta.yaml`);
  const fallbackPath = path.resolve(process.cwd(), 'src/content/docs/ru/_meta.yaml');
  const target = fs.existsSync(filePath) ? filePath : fallbackPath;
  const raw = fs.readFileSync(target, 'utf-8');
  const parsed = YAML.parse(raw) as { sections: SectionMeta[] };
  return (parsed?.sections ?? []).sort((a, b) => a.order - b.order);
}

export function splitEntryId(id: string): { lang: Lang; slug: string; sectionId: string } {
  const clean = id.replace(/\.md$/, '');
  const parts = clean.split('/');
  const lang = (parts[0] === 'en' ? 'en' : 'ru') as Lang;
  const slugParts = parts.slice(1);
  const slug = slugParts.join('/');
  const sectionId = slugParts[0] || '';
  return { lang, slug, sectionId };
}

export async function getAllResolvedDocs(lang: Lang): Promise<ResolvedDoc[]> {
  const all = await getCollection('docs');
  const ruMap = new Map<string, CollectionEntry<'docs'>>();
  const enMap = new Map<string, CollectionEntry<'docs'>>();

  for (const entry of all) {
    const { lang: entryLang, slug } = splitEntryId(entry.id);
    if (entryLang === 'ru') ruMap.set(slug, entry);
    else enMap.set(slug, entry);
  }

  const allSlugs = new Set([...ruMap.keys(), ...enMap.keys()]);
  const result: ResolvedDoc[] = [];

  for (const slug of allSlugs) {
    const primary = lang === 'ru' ? ruMap.get(slug) : enMap.get(slug);
    const fallback = lang === 'ru' ? enMap.get(slug) : ruMap.get(slug);
    const entry = primary ?? fallback;
    if (!entry) continue;
    const sectionId = slug.split('/')[0] || '';
    result.push({
      lang,
      slug,
      sectionId,
      entry,
      isFallback: !primary,
    });
  }

  return result;
}

export async function getNavTree(lang: Lang): Promise<NavSection[]> {
  const sectionsMeta = readMeta(lang);
  const docs = await getAllResolvedDocs(lang);

  const bySection = new Map<string, NavItem[]>();
  for (const d of docs) {
    const list = bySection.get(d.sectionId) ?? [];
    list.push({
      slug: d.slug,
      title: d.entry.data.title,
      description: d.entry.data.description,
      order: d.entry.data.order,
      badge: d.entry.data.badge,
      isFallback: d.isFallback,
    });
    bySection.set(d.sectionId, list);
  }

  return sectionsMeta
    .map((sec) => ({
      ...sec,
      items: (bySection.get(sec.id) ?? []).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title)),
    }))
    .filter((sec) => sec.items.length > 0);
}

export function flattenNav(sections: NavSection[]): (NavItem & { sectionTitle: string })[] {
  const out: (NavItem & { sectionTitle: string })[] = [];
  for (const s of sections) {
    for (const item of s.items) {
      out.push({ ...item, sectionTitle: s.title });
    }
  }
  return out;
}
