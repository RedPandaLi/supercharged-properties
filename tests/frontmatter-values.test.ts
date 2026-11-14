import { expect, it } from 'vitest';
import { readPropertyValues } from '../src/frontmatter-values';
const read = (value: unknown) => [...readPropertyValues(value)];

it('preserves scalar types, zero and false while trimming text', () => {
  expect(read(['  Draft  ', 0, false, 'false', 2.5, true])).toEqual([
    { kind: 'string', text: 'Draft' }, { kind: 'number', text: '0' },
    { kind: 'boolean', text: 'false' }, { kind: 'string', text: 'false' },
    { kind: 'number', text: '2.5' }, { kind: 'boolean', text: 'true' }
  ]);
});
it('represents top-level null, blank strings and empty lists as empty', () => {
  for (const input of [null, '', ' \n ', []]) expect(read(input)).toEqual([{ kind: 'empty', text: '' }]);
});
it('retains nested list order and skips blank list elements', () => {
  expect(read(['first', ['', [], ['second', null]], 'third']).map(value => value.text)).toEqual(['first', 'second', '', 'third']);
});
it('does not stringify unsupported objects or nonfinite numbers', () => {
  expect(read([undefined, NaN, Infinity, -Infinity, {}, new Date(), Symbol('x'), 1n])).toEqual([]);
  expect(read({ toString() { throw new Error('Must not coerce objects'); } })).toEqual([]);
});
it('keeps complete links and Unicode strings intact', () => {
  expect(read(['[[A|Same]]', '[[B|Same]]', 'café']).map(value => value.text)).toEqual(['[[A|Same]]', '[[B|Same]]', 'café']);
});
it('handles deep nesting without recursive call-stack growth', () => {
  let value: unknown = 'leaf';
  for (let depth = 0; depth < 20000; depth++) value = [value];
  expect(read(value)).toEqual([{ kind: 'string', text: 'leaf' }]);
});
it('terminates cycles and still reads subsequent values', () => {
  const values: unknown[] = ['first']; values.push(values, 'last');
  expect(read(values).map(value => value.text)).toEqual(['first', 'last']);
});
it('reads shared, noncyclic list aliases at each occurrence', () => {
  const shared = ['alias'];
  expect(read([shared, shared]).map(value => value.text)).toEqual(['alias', 'alias']);
});

it('restores parent cursors across sibling arrays and indirect cycles', () => {
  const root: unknown[] = ['start'];
  const child: unknown[] = ['child', root, 'end child'];
  root.push(child, ['sibling', ['leaf']], 'end');
  expect(read(root).map(value => value.text)).toEqual(['start', 'child', 'end child', 'sibling', 'leaf', 'end']);
});
it('keeps independent result arrays and protects shared value records', () => {
  const first = readPropertyValues(false);
  const second = readPropertyValues(false);
  expect(first).not.toBe(second);
  expect(Object.isFrozen(first[0])).toBe(true);
  expect(readPropertyValues(null)).toEqual([{ kind: 'empty', text: '' }]);
});
