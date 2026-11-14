import { expect, it } from 'vitest';
import { loadProfiles, sameKeys } from '../src/profiles';
it('restores and normalizes saved profiles without accepting malformed data', () => {
  const profiles = loadProfiles([
    { id: 'a', name: ' Writing ', keys: ['Status', 'status', 4, ' deadline '] },
    { id: 'a', name: 'Duplicate ID', keys: [] },
    { id: 'b', name: 'writing', keys: [] },
    { id: 'c', name: 'Broken', keys: 'status' },
    null
  ]);
  expect(profiles).toEqual([{ id: 'a', name: 'Writing', keys: ['status', 'deadline'] }]);
  expect(loadProfiles(undefined)).toEqual([]);
  expect(loadProfiles({})).toEqual([]);
});
it('compares profile membership without depending on selection order', () => {
  expect(sameKeys(['a', 'b'], ['b', 'a'])).toBe(true);
  expect(sameKeys(['a'], ['a', 'b'])).toBe(false);
});
