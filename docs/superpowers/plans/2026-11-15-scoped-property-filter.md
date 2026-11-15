# Value-Scoped Property Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a user filter the property tree to notes sharing one property value, then re-aggregate all other properties and note links within that subset.

**Architecture:** Add a read-only `PropertyIndex.scoped(paths, excludeKey)` derivation that intersects every row with a live set of note paths. The view keeps only a `{ property, value }` condition, derives the index on each render, and swaps every tree/profile/picker read to that derived index. Existing rendering, sorting, search, saved views, and bulk edits then inherit subset semantics without per-call filtering.

**Tech Stack:** TypeScript, Obsidian API, esbuild, Vitest, jsdom.

## Global Constraints

- Minimum Obsidian version: `1.7.2`; `isDesktopOnly` stays `false`.
- No new runtime dependencies; production bundle imports only `obsidian`.
- Keep all view CSS selectors prefixed with `pv-` and use Obsidian theme variables.
- Never inject note content as HTML; use `textContent` and `el()`.
- Counts are distinct notes, not assignments.
- Settings writes go through `plugin.save()`, never `saveData` directly.
- Rebuild the tracked `main.js` whenever runtime behavior changes.
- Node 22.13+/24+; run `npm run validate` before claiming completion.
- Work in the existing isolated worktree: `/Users/bottledoolong/WorkSpace/.worktrees/supercharged-properties-scoped-filter` on branch `feat/scoped-filter`.

---

### Task 1: Scoped Index Derivation

**Files:**
- Modify: `src/index.ts:9-57`
- Test: `tests/index.test.ts`

**Interfaces:**
- Consumes: existing `PropertyIndex.properties`, `PropertyNode.paths`, `ValueNode.paths`.
- Produces: `PropertyIndex.scoped(paths: ReadonlySet<string>, excludeKey?: string): PropertyIndex`, returning a read-only index whose rows contain only paths in `paths` and which omits `excludeKey`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/index.test.ts`:

```ts
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
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx vitest run tests/index.test.ts`
Expected: FAIL with `TypeError: index.scoped is not a function`.

- [ ] **Step 3: Implement `scoped`**

Add this method inside `PropertyIndex` in `src/index.ts`, after `update`:

```ts
  /** Derive a read-only index for a note subset. Do not update the result. */
  scoped(paths: ReadonlySet<string>, excludeKey?: string): PropertyIndex {
    const result = new PropertyIndex();
    const intersect = (source: Set<string>): Set<string> => {
      const kept = new Set<string>();
      for (const path of source) if (paths.has(path)) kept.add(path);
      return kept;
    };
    for (const [key, property] of this.properties) {
      if (key === excludeKey) continue;
      const propertyPaths = intersect(property.paths);
      if (!propertyPaths.size) continue;
      const values = new Map<string, ValueNode>();
      for (const [id, value] of property.values) {
        const valuePaths = intersect(value.paths);
        if (valuePaths.size) values.set(id, { id: value.id, label: value.label, paths: valuePaths });
      }
      result.properties.set(key, { id: property.id, label: property.label, paths: propertyPaths, values });
    }
    return result;
  }
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run tests/index.test.ts`
Expected: PASS, including the 5 existing membership tests and 3 new scoped tests.

- [ ] **Step 5: Commit**

```bash
git add src/index.ts tests/index.test.ts
git commit -m "feat: add scoped property index"
```

---

### Task 2: Filter State, Menu Action, and Scoped View

**Files:**
- Modify: `src/main.ts` (`Preferences` area, `PropertiesView` fields, `onOpen`, `syncProfiles`, `renderScopeChoices`, `render`, `showMenu`)
- Modify: `styles.css`
- Test: `tests/view.test.ts`

**Interfaces:**
- Consumes: `PropertyIndex.scoped(paths, excludeKey)` from Task 1.
- Produces: view-local `ScopeFilter`, `activeIndex()`, `filterPaths()`, `clearFilter()`, and the menu title `Filter notes by this value`.

- [ ] **Step 1: Write the failing view tests**

Add this helper after the existing `click` helper in `tests/view.test.ts`:

```ts
function filterRow(label: string) {
  (document.querySelector(`[aria-label="${label}"]`) as HTMLElement)
    .dispatchEvent(new MouseEvent('contextmenu', { bubbles: true }));
  (Menu as any).items.find((item: any) => item.title === 'Filter notes by this value').run();
}
```

Append these tests to `tests/view.test.ts`:

```ts
it('filters the tree to notes with a value and excludes that property', () => {
  click('Expand status');
  filterRow('Show notes with status: Done (1)');

  const bar = document.querySelector('.pv-filter-bar') as HTMLElement;
  expect(bar.hidden).toBe(false);
  expect(bar.textContent).toContain('Filtered by status = Done');
  expect(bar.textContent).toContain('1 notes');
  expect(document.querySelector('[aria-label="Toggle status (1)"]')).toBeNull();
  expect(document.querySelector('[aria-label="Toggle tags (1)"]')).not.toBeNull();
  expect(document.querySelector('.pv-summary')!.textContent).toBe('1 properties · Filtered (1 notes)');
});

it('clears the filter and restores the full tree', () => {
  click('Expand status');
  filterRow('Show notes with status: Done (1)');
  click('Clear property filter');

  expect((document.querySelector('.pv-filter-bar') as HTMLElement).hidden).toBe(true);
  expect(document.querySelector('[aria-label="Toggle status (2)"]')).not.toBeNull();
  expect(document.querySelector('.pv-summary')!.textContent).toBe('2 properties · Entire vault');
});

it('omits the filtered property from the property picker', () => {
  click('Expand status');
  filterRow('Show notes with status: Done (1)');
  click('Choose properties to show');

  expect(document.querySelector('[aria-label="Include status"]')).toBeNull();
  expect(document.querySelector('[aria-label="Include tags"]')).not.toBeNull();
});

it('searches only the filtered notes', () => {
  click('Expand status');
  filterRow('Show notes with status: Done (1)');
  click('Toggle search');
  const input = document.querySelector('[aria-label="Filter properties and values"]') as HTMLInputElement;

  input.value = 'Two'; input.dispatchEvent(new Event('input'));
  expect(document.querySelector('.pv-tree')!.textContent).toContain('No matching properties');

  input.value = 'One'; input.dispatchEvent(new Event('input'));
  expect(document.querySelector('.pv-tree')!.textContent).toContain('One');
  expect(document.querySelector('.pv-tree')!.textContent).not.toContain('Two');
});

it('shows an empty state when the filtered value disappears', () => {
  click('Expand status');
  filterRow('Show notes with status: Done (1)');
  plugin.index.remove('Projects/One.md');
  view.render();

  expect(document.querySelector('.pv-filter-bar')!.textContent).toContain('0 notes');
  expect(document.querySelector('.pv-tree')!.textContent).toContain('No notes match this filter.');
});
```

- [ ] **Step 2: Run the view tests to verify they fail**

Run: `npx vitest run tests/view.test.ts`
Expected: FAIL because no menu item titled `Filter notes by this value` exists.

- [ ] **Step 3: Add the filter type and view fields**

In `src/main.ts`, after the `Preferences` interface, add:

```ts
interface ScopeFilter { property: string; value: string; propertyLabel: string; label: string }
```

Inside `PropertiesView`, after `private searchScopeButton!: HTMLButtonElement;`, add:

```ts
  private filter: ScopeFilter | null = null;
  private filterBar!: HTMLElement;
  private filterLabel!: HTMLElement;
```

- [ ] **Step 4: Add the filter bar to `onOpen`**

After the `this.scopePanel = ...` line in `onOpen`, add:

```ts
    this.filterBar = el(this.contentEl, 'div', 'pv-filter-bar');
    this.filterBar.hidden = true;
    this.filterLabel = el(this.filterBar, 'span', 'pv-filter-label');
    this.button(this.filterBar, 'Clear', 'Clear property filter', () => this.clearFilter());
```

- [ ] **Step 5: Add filter helpers**

Before `render()` in `PropertiesView`, add:

```ts
  private clearFilter(): void {
    this.filter = null;
    this.render();
  }
  private filterPaths(): Set<string> | null {
    if (!this.filter) return null;
    return this.plugin.index.properties.get(this.filter.property)?.values.get(this.filter.value)?.paths ?? new Set<string>();
  }
  private activeIndex(): PropertyIndex {
    if (!this.filter) return this.plugin.index;
    return this.plugin.index.scoped(this.filterPaths() ?? new Set<string>(), this.filter.property);
  }
```

- [ ] **Step 6: Read scoped counts in profiles and the picker**

Change `syncProfiles` to accept the derived index:

```ts
  private syncProfiles(index = this.activeIndex()): void {
```

Inside it, change only the count helper to read the derived index:

```ts
    const count = (keys: Iterable<string>) => new Set([...keys].filter(key => index.properties.has(key) && !hidden.has(key))).size;
```

Keep the other `this.plugin.index` reads in `syncProfiles` unchanged. The `modified` comparison and the default key list must stay based on the full index, otherwise an unchanged saved profile would appear "(modified)" whenever the filter hides some of its keys.

Change `renderScopeChoices` to use the derived index and skip the filtered property:

```ts
  private renderScopeChoices(index = this.activeIndex()): void {
```

```ts
    const choices = new Map([...index.properties.values()].map(property => [property.id, property]));
    const exclude = this.filter?.property;
    for (const key of this.plugin.prefs.scope ?? []) {
      if (key === exclude) continue;
      if (!choices.has(key)) choices.set(key, { id: key, label: key, paths: new Set(), values: new Map() });
    }
```

- [ ] **Step 7: Derive the index in `render` and update summary/empty state**

At the start of `render()`, after the `this.body` guard, add:

```ts
    const index = this.activeIndex();
    const scopePaths = this.filterPaths();
```

Pass the index to profile and picker rendering:

```ts
    this.syncProfiles(index);
```

```ts
    if (!this.scopePanel.hidden) this.renderScopeChoices(index);
```

Replace the property source:

```ts
    const properties = this.sorted(index.properties.values()).filter(p => !hidden.has(p.id) && (scope === null || scope.includes(p.id)))
      .sort((a, b) => Number(pinned.has(b.id)) - Number(pinned.has(a.id)));
```

Before `this.summary.textContent = ...`, add:

```ts
    this.filterBar.hidden = !this.filter;
    if (this.filter) {
      const text = `Filtered by ${this.filter.propertyLabel} = ${this.filter.label} · ${scopePaths?.size ?? 0} notes`;
      this.filterLabel.textContent = text;
      this.filterBar.title = text;
    }
```

Replace the summary assignment with:

```ts
    this.summary.textContent = `${visible} properties · ${this.filter ? `Filtered (${scopePaths?.size ?? 0} notes)` : scope === null ? 'Entire vault' : 'Custom selection'}`;
```

Replace the empty-state line with:

```ts
    if (!visible) {
      let message = 'No matching properties. Adjust your search or selection.';
      if (this.filter && !this.query) message = 'No notes match this filter.';
      else if (!this.filter && !this.query && scope?.length === 0) message = 'Choose properties above to start exploring.';
      el(this.body, 'div', 'pv-empty', message);
    }
```

- [ ] **Step 8: Add the menu action**

In `showMenu`, inside the existing `if (node !== property)` block, before the edit actions, add:

```ts
      menu.addItem(item => item.setTitle('Filter notes by this value').setIcon('filter').onClick(() => {
        this.filter = { property: property.id, value: node.id, propertyLabel: property.label, label: node.label };
        this.render();
      }));
```

- [ ] **Step 9: Add filter bar styles**

Append to `styles.css`:

```css
.pv-filter-bar { display:flex; align-items:center; gap:6px; flex-shrink:0; padding:5px 12px; border-bottom:1px solid var(--background-modifier-border); background:var(--background-secondary); color:var(--text-muted); font-size:var(--font-ui-smaller, 11px); }
.pv-filter-bar[hidden] { display:none; }
.pv-filter-label { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.pv-filter-bar button { font-size:11px; }
```

- [ ] **Step 10: Run the view tests**

Run: `npx vitest run tests/view.test.ts`
Expected: PASS, including all existing view tests and the 5 new filter tests.

- [ ] **Step 11: Rebuild and run the full suite**

Run: `npm run validate`
Expected: lint passes, `main.js` is regenerated, 75 tests pass, release validation passes.
If the test count differs, confirm only the 8 new tests were added (3 index + 5 view).

- [ ] **Step 12: Commit**

```bash
git add src/main.ts styles.css tests/view.test.ts main.js
git commit -m "feat: filter the property tree by a value"
```

---

### Task 3: Documentation and Release Notes

**Files:**
- Modify: `README.md`
- Modify: `docs/USER-GUIDE.md`
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consumes: the menu title `Filter notes by this value` and the `Clear property filter` action from Task 2.
- Produces: user-facing documentation only; no runtime changes.

- [ ] **Step 1: Add the README feature and usage**

In `README.md`, under `## Features`, after the full property tree bullet, add:

```md
- **Scope to a value** — filter the tree to notes sharing one property value, then re-aggregate every other property and its note links within that subset.
```

Under `### Working with rows`, after the context-menu list, add:

```md
- Right-click a value and choose **Filter notes by this value** to scope the tree to those notes. The filtered property is hidden while the filter is active; use **Clear** in the filter bar to return to the whole vault. Scoped filters apply to searches, counts, copied links, and bulk value edits, but **Open in Search** still runs a vault-wide query.
```

- [ ] **Step 2: Add the user-guide section**

In `docs/USER-GUIDE.md`, add to the contents list after the search entry:

```md
- [Scope to a value](#scope-to-a-value)
```

Add this section before `## Use Obsidian Search and copy links`:

```md
## Scope to a value

Right-click a value row and choose **Filter notes by this value**. The tree then shows only notes that contain that value, and every other property is re-counted within that subset. The filtered property is hidden while the filter is active.

The filter bar under the toolbar shows the condition and the number of matching notes. Choose **Clear** to return to the whole vault. Search, sorting, saved views, copied note links, and bulk value edits operate on the filtered subset. **Open in Search** and **Copy search query** still use a vault-wide query.

Filters are not saved: reopening the view or reloading Obsidian returns to the whole vault.
```

- [ ] **Step 3: Add the changelog entry**

In `CHANGELOG.md`, under `## [Unreleased]`, before `### Fixed`, add:

```md
### Added

- Scope the property tree to notes sharing a value, with subset counts and note links.
```

- [ ] **Step 4: Validate documentation and links**

Run: `npm run validate`
Expected: PASS; the release validator checks all local Markdown links.

- [ ] **Step 5: Commit**

```bash
git add README.md docs/USER-GUIDE.md CHANGELOG.md
git commit -m "docs: document value-scoped filtering"
```

---

## Manual QA

After the three tasks, install `main.js`, `manifest.json`, and `styles.css` into `<Vault>/.obsidian/plugins/scoped-properties/` and verify:

- Right-click a value, filter it, and confirm the filtered property disappears while other counts shrink.
- Clear the filter and confirm the full tree returns.
- Search inside a filter, and copy note links from a scoped value.
- Run a bulk rename from a scoped value and confirm the preview lists only subset paths.
- Edit the filtered property in a note and confirm the tree updates live.
- Check keyboard access: Shift+F10 on a value opens the menu; focus returns after filtering.
