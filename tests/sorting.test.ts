import { expect, it } from 'vitest';
import { sortNodes, sortOrder } from '../src/sorting';
const nodes = [
  { id: 'a', label: 'Alpha', paths: new Set(['1', '2']) },
  { id: 'b', label: 'Beta', paths: new Set(['1']) },
  { id: 'g', label: 'Gamma', paths: new Set(['1', '2', '3']) }
];
it('sorts names and distinct-note frequency in both directions', () => {
  const ids = (order: Parameters<typeof sortNodes>[1]) => sortNodes(nodes, order).map(node => node.id);
  expect(ids('name')).toEqual(['a', 'b', 'g']);
  expect(ids('name-desc')).toEqual(['g', 'b', 'a']);
  expect(ids('count')).toEqual(['g', 'a', 'b']);
  expect(ids('count-asc')).toEqual(['b', 'a', 'g']);
});
it('keeps frequency ties alphabetical and supports old saved modes', () => {
  expect(sortNodes(nodes.map(node => ({ ...node, paths: new Set(['1']) })), 'count-asc').map(node => node.id)).toEqual(['a', 'b', 'g']);
  expect(sortOrder('name')).toBe('name'); expect(sortOrder('count')).toBe('count');
  expect(sortOrder('name-desc')).toBe('name-desc'); expect(sortOrder('count-asc')).toBe('count-asc');
  expect(sortOrder('constructor')).toBe('name');
});
