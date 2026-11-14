import { fold } from './index';
export interface PropertyProfile { id: string; name: string; keys: string[] }
export function loadProfiles(raw: unknown): PropertyProfile[] {
  if (!Array.isArray(raw)) return [];
  const ids = new Set<string>(); const names = new Set<string>();
  return raw.flatMap((entry: unknown) => {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return [];
    const value = entry as Record<string, unknown>;
    if (!value || typeof value.id !== 'string' || !value.id || typeof value.name !== 'string' || !value.name.trim() || !Array.isArray(value.keys)) return [];
    if (ids.has(value.id) || names.has(fold(value.name))) return [];
    ids.add(value.id); names.add(fold(value.name));
    return [{ id: value.id, name: value.name.trim(), keys: [...new Set<string>(value.keys.filter((key: unknown): key is string => typeof key === 'string').map(fold).filter(Boolean))] }];
  });
}
export function sameKeys(a: readonly string[], b: readonly string[]): boolean {
  const left = new Set(a); const right = new Set(b);
  return left.size === right.size && [...left].every(key => right.has(key));
}
