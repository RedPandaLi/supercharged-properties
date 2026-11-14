import { expect, it } from 'vitest';
import { propertyQuery } from '../src/search';
it('quotes operators and escapes quotes, backslashes and newlines', () => {
  expect(propertyQuery('a"b', 'x\\y OR z')).toBe('["a\\"b":"x\\\\y OR z"]');
  expect(propertyQuery('status', 'line\nbreak')).toBe('["status":"line\\nbreak"]');
});
it('distinguishes a literal null string from the empty operator', () => {
  expect(propertyQuery('status')).toBe('["status"]');
  expect(propertyQuery('status', 'null')).toBe('["status":"null"]');
  expect(propertyQuery('status', '(empty)', true)).toBe('["status":null]');
});
