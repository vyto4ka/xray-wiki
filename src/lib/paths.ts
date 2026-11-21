const RAW_BASE = import.meta.env.BASE_URL || '/';

export function getBasePath(): string {
  if (RAW_BASE === '/' || RAW_BASE === '') return '';
  return RAW_BASE.endsWith('/') ? RAW_BASE.slice(0, -1) : RAW_BASE;
}

export function withBase(path: string): string {
  if (!path) return getBasePath() || '/';
  if (/^https?:\/\//i.test(path) || path.startsWith('#') || path.startsWith('mailto:')) {
    return path;
  }
  const base = getBasePath();
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${base}${clean}`;
}
