import { natural, ValueNode } from './index';
export const sortOptions = {
  name: 'Property name (A to Z)',
  'name-desc': 'Property name (Z to A)',
  count: 'Frequency (high to low)',
  'count-asc': 'Frequency (low to high)'
};
export type SortOrder = keyof typeof sortOptions;
export function sortOrder(value: unknown): SortOrder {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(sortOptions, value) ? value as SortOrder : 'name';
}
export function sortNodes<T extends ValueNode>(nodes: Iterable<T>, order: SortOrder): T[] {
  return Array.from(nodes).sort((a, b) => {
    const alphabetical = natural(a.label, b.label) || a.id.localeCompare(b.id);
    if (order === 'name-desc') return -alphabetical;
    if (order === 'count') return b.paths.size - a.paths.size || alphabetical;
    if (order === 'count-asc') return a.paths.size - b.paths.size || alphabetical;
    return alphabetical;
  });
}
