// SPDX-License-Identifier: MIT
// Supercharged Properties: typed values for the vault property index.

export type PropertyValueKind = 'empty' | 'string' | 'number' | 'boolean';
export interface IndexedValue { readonly kind: PropertyValueKind; readonly text: string }
interface Cursor { items: readonly unknown[]; offset: number }

const EMPTY: IndexedValue = Object.freeze({ kind: 'empty', text: '' });
const TRUE: IndexedValue = Object.freeze({ kind: 'boolean', text: 'true' });
const FALSE: IndexedValue = Object.freeze({ kind: 'boolean', text: 'false' });

/**
 * Scalar and flat-list paths avoid generator and traversal-state allocation.
 * Nested lists allocate a cursor stack and ancestor set only when needed.
 * Results are read-only; boolean and empty value records are shared.
 */
export function readPropertyValues(input: unknown): readonly IndexedValue[] {
  switch (typeof input) {
    case 'string': {
      const text = input.trim();
      return text ? [{ kind: 'string', text }] : [EMPTY];
    }
    case 'boolean': return input ? [TRUE] : [FALSE];
    case 'number': return Number.isFinite(input) ? [{ kind: 'number', text: String(input) }] : [];
    case 'object': break;
    default: return [];
  }
  if (input === null) return [EMPTY];
  if (!Array.isArray(input)) return [];
  if (!input.length) return [EMPTY];

  return readList(input);
}

function readList(input: readonly unknown[]): readonly IndexedValue[] {
  const output: IndexedValue[] = [];
  let items: readonly unknown[] = input;
  let offset = 0;
  let parents: Cursor[] | undefined;
  let ancestry: Set<readonly unknown[]> | undefined;
  for (;;) {
    if (offset === items.length) {
      if (!parents?.length) break;
      ancestry?.delete(items);
      const parent = parents.pop()!;
      items = parent.items; offset = parent.offset;
      continue;
    }
    const item = items[offset++];
    switch (typeof item) {
      case 'string': {
        const text = item.trim();
        if (text) output.push({ kind: 'string', text });
        break;
      }
      case 'number':
        if (Number.isFinite(item)) output.push({ kind: 'number', text: String(item) });
        break;
      case 'boolean': output.push(item ? TRUE : FALSE); break;
      case 'object':
        if (item === null) { output.push(EMPTY); break; }
        if (!Array.isArray(item) || !item.length) break;
        parents ??= [];
        ancestry ??= new Set([items]);
        // Only active ancestors are cyclic; shared aliases are read again.
        if (!ancestry.has(item)) {
          parents.push({ items, offset }); ancestry.add(item);
          items = item; offset = 0;
        }
        break;
    }
  }
  return output;
}
