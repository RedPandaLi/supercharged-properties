import { describe, expect, it } from 'vitest';
import { PropertyIndex } from '../src/index';

describe('property membership', () => {
  it('deduplicates repeated list values and counts notes, not assignments', () => {
    const index = new PropertyIndex();
    index.update('a.md', { status: ['Done', 'done', ['Pending']] });
    index.update('b.md', { Status: 'DONE' });
    const key = index.properties.get('status')!;
    expect(key.paths.size).toBe(2);
    expect(key.values.size).toBe(2);
    expect([...key.values.values()].find(v => v.label === 'Done')!.paths.size).toBe(2);
  });
  it('handles null, blank, empty lists, false, zero and unsupported objects', () => {
    const index = new PropertyIndex();
    index.update('a.md', { nil: null, blank: ' ', list: [], boolean: false, number: 0, object: { nested: 1 }, position: {} });
    expect([...index.properties.get('nil')!.values.values()][0].label).toBe('(empty)');
    expect(index.properties.get('blank')!.values.size).toBe(1);
    expect(index.properties.get('list')!.values.size).toBe(1);
    expect([...index.properties.get('boolean')!.values.values()][0].label).toBe('false');
    expect([...index.properties.get('number')!.values.values()][0].label).toBe('0');
    expect(index.properties.get('object')!.paths.size).toBe(1);
    expect(index.properties.get('object')!.values.size).toBe(0);
    expect(index.properties.has('position')).toBe(false);
  });
  it('removes stale values on edits, deletion and rename', () => {
    const index = new PropertyIndex();
    index.update('a.md', { status: 'Old' });
    index.update('a.md', { status: 'New' });
    expect([...index.properties.get('status')!.values.values()].map(v => v.label)).toEqual(['New']);
    index.remove('a.md');
    index.update('renamed.md', { status: 'New' });
    expect([...index.properties.get('status')!.paths]).toEqual(['renamed.md']);
    index.update('renamed.md');
    expect(index.properties.size).toBe(0);
  });
  it('does not merge distinct link targets or scalar types', () => {
    const index = new PropertyIndex();
    index.update('a.md', { related: ['[[A|Same]]', '[[B|Same]]'], value: [false, 'false', 0, '0'] });
    expect(index.properties.get('related')!.values.size).toBe(2);
    expect(index.properties.get('value')!.values.size).toBe(4);
  });
  it('handles Unicode-equivalent and prototype-like property names', () => {
    const index = new PropertyIndex();
    index.update('a.md', JSON.parse('{"__proto__":"safe","constructor":"safe","café":"yes"}'));
    index.update('b.md', { 'cafe\u0301': 'YES' });
    expect(index.properties.get('__proto__')!.paths.size).toBe(1);
    expect(index.properties.get('café')!.paths.size).toBe(2);
    expect(index.properties.size).toBe(3);
  });
});

describe('scoped index', () => {
  it('keeps only rows and counts that intersect the note set', () => {
    const index = new PropertyIndex();
    index.update('a.md', { status: 'Done', tags: ['work', 'personal'] });
    index.update('b.md', { status: 'Pending', tags: ['work'] });

    const scoped = index.scoped(new Set(['a.md']), 'status');
    expect(scoped.properties.has('status')).toBe(false);
    const tags = scoped.properties.get('tags')!;
    expect(tags.paths.size).toBe(1);
    expect([...tags.values.values()].find(value => value.label === 'personal')!.paths.size).toBe(1);
    expect([...tags.values.values()].find(value => value.label === 'work')!.paths.size).toBe(1);
  });

  it('preserves labels, kinds, and notes with unsupported object values', () => {
    const index = new PropertyIndex();
    index.update('a.md', { Status: 'Done', object: { nested: 1 }, flag: false });

    const scoped = index.scoped(new Set(['a.md']));
    expect(scoped.properties.get('status')!.label).toBe('Status');
    expect(scoped.properties.get('object')!.values.size).toBe(0);
    expect(scoped.properties.get('object')!.paths.size).toBe(1);
    expect([...scoped.properties.get('flag')!.values.values()][0].label).toBe('false');
  });

  it('returns an empty index for an empty or unmatched note set', () => {
    const index = new PropertyIndex();
    index.update('a.md', { status: 'Done' });

    expect(index.scoped(new Set()).properties.size).toBe(0);
    expect(index.scoped(new Set(['missing.md'])).properties.size).toBe(0);
  });

  it('drops values that exist only outside the note set', () => {
    const index = new PropertyIndex();
    index.update('a.md', { tags: ['work'] });
    index.update('b.md', { tags: ['work', 'urgent'] });

    const scoped = index.scoped(new Set(['a.md']));
    expect([...scoped.properties.get('tags')!.values.values()].map(value => value.label)).toEqual(['work']);
  });
});
