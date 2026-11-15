# Scoped Property Filter — Design

Date: 2026-11-15
Status: Approved for planning

## Problem

The property tree aggregates every note in the vault. Users cannot answer
questions about a subset of notes, such as "among notes with `status: done`,
which `type` values and tags occur most often?" Today that requires exporting
or manually filtering note links.

## Goal

Let a user scope the whole tree to the notes that share one property value,
then re-aggregate all other properties and their note links within that
subset.

## Non-goals

- Multiple simultaneous filter conditions.
- Nested drill-down history.
- Persisting the filter across view recreation or plugin reload.
- Changing `Open in Search` / `Copy search query` to include the filter.
- Caching the derived index. Add caching only if profiling shows lag.

## Interaction

1. Right-click a value row (including the `(empty)` row) and choose
   **Filter notes by this value**. The item is not shown on property rows.
2. Applying a filter replaces any existing filter.
3. A filter bar appears below the toolbar:
   `Filtered by Status = done · 23 notes` plus a **Clear** button.
4. The filtered property is excluded from the tree and from the property
   picker. Its context stays visible in the filter bar.
5. The summary becomes `N properties · Filtered (23 notes)`.
6. When no notes match, the tree shows `No notes match this filter.` and a
   clear action. The condition is not reset automatically.
7. Search, sorting, expand/collapse, pin/hide, property selection, saved
   views, and bulk value edits keep working; their counts, note links, and
   edits apply to the filtered subset.
8. The filter lives on the view instance: reopening the view or reloading the
   plugin returns to the entire vault. Separate tabs keep separate filters.

## Data model

The view stores:

```ts
interface ScopeFilter {
  property: string;      // folded property key
  value: string;         // value node id, JSON [kind, foldedText]
  propertyLabel: string; // display context in the filter bar
  label: string;         // display context in the filter bar
}
```

No path snapshot is stored. Paths are resolved from the live index on every
render, so metadata edits, renames, and deletes are reflected automatically.
If the value disappears, the scope is empty and the empty state appears.

## Derived index

Add a read-only derivation to `PropertyIndex`:

```ts
scoped(paths: ReadonlySet<string>, excludeKey?: string): PropertyIndex
```

- Skip `excludeKey`.
- For each remaining property and value, keep only paths in `paths`; drop rows
  with no matching paths.
- Preserve `id`, `label`, and value kind so icons, sorting, menus, and search
  continue to work.
- Property paths retain notes whose values are unsupported objects, matching
  current behavior.
- The returned index is never updated; it does not populate `memberships`.

The view adds `activeIndex()` returning the derived index when a filter is
active, otherwise `plugin.index`. Render, counts, and picker choices read
`activeIndex()`. Saving a profile still records keys from the full index so
profiles do not lose properties encountered only outside the filter.

## Bulk edits

`node.paths` on the derived index is already the subset, and `ValueEditor`
previews and applies exactly those paths. Merge targets come from the derived
property, so only values present in the subset are offered. Undo and conflict
checks are unchanged.

## Edge cases

- Filter value renamed or deleted: empty result, filter bar still clearable.
- Filter property hidden in settings: still excluded; filter bar remains.
- Filter property pinned: stays excluded while the filter is active.
- Note without the filter property: never in scope.
- Counts disabled: scope still works; only counters are hidden.
- Search: only notes in the subset match.
- `Copy matching note links` copies subset links. `Open in Search` and
  `Copy search query` remain vault-wide and are documented as such.

## Testing

- `tests/index.test.ts`: excludes the key, intersects counts, preserves labels
  and kinds, keeps unsupported-object property notes, handles an empty set.
- `tests/view.test.ts` (jsdom): filter menu item on value rows only, filter bar
  and summary, filtered property absent, subset counts, clear restores, empty
  state, note search limited to subset, picker omits the filtered property.
- Existing 67 tests stay green.

## Documentation and release

- README: feature bullet, usage, and the Search caveat.
- `docs/USER-GUIDE.md`: scoped filtering workflow.
- `CHANGELOG.md`: entry under the next version.
- If releasing: bump `manifest.json`, `package.json`, `package-lock.json`, and
  `versions.json` together and add `docs/releases/<version>.md`.
- Verify with `npm run validate` and manual QA on desktop and mobile.
