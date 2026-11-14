# Release QA

Run this checklist against a build candidate before publishing. Automated checks are necessary but not sufficient: verify the plugin in Obsidian on desktop, and on mobile when possible.

## Test setup

- [ ] Use a disposable vault or a backed-up vault with a mix of notes.
- [ ] Include notes with strings, numbers, booleans, dates, lists, nested lists, wiki links, empty values, and unsupported object values.
- [ ] Include at least one large note set (a few thousand notes) when checking performance.
- [ ] Confirm the build was produced from the release source and `main.js` is current.

## Automated checks

- [ ] `npm run lint` passes with zero warnings.
- [ ] `npm test` passes all suites.
- [ ] `npm run validate` passes.
- [ ] `npm run release:prepare` creates `dist/<version>/` with the expected files.
- [ ] `SHA256SUMS` verifies for every staged file.
- [ ] The release tag equals `manifest.json` `version`, without a `v` prefix.

## Installation and startup

- [ ] Enable the plugin in a vault that did not previously have it installed.
- [ ] The plugin loads without console errors.
- [ ] The ribbon icon opens the sidebar.
- [ ] **Open sidebar** and **Open in tab** commands work.
- [ ] **Refresh property index** rebuilds without errors.
- [ ] Reloading Obsidian restores the previously saved settings.

## Indexing

- [ ] Every expected YAML property appears.
- [ ] `Status` and `status` share one row.
- [ ] Note counts reflect distinct notes, not repeated values.
- [ ] Strings, numbers, booleans, empty values, and nested lists remain distinct.
- [ ] Wiki links with aliases are not merged when their targets differ.
- [ ] Unsupported object values do not crash the view; their notes remain reachable.
- [ ] The Obsidian cache `position` field is not shown as a property.

## Live updates

- [ ] Editing frontmatter updates values and counts.
- [ ] Removing a property from a note removes the note from that row.
- [ ] Creating a note adds it after metadata is available.
- [ ] Deleting a note removes its contributions.
- [ ] Renaming a note moves its contributions to the new path.
- [ ] Renaming a folder rebuilds the index.
- [ ] Rapid edits do not leave stale values or duplicate counts.

## Search

- [ ] Search finds property names, values, note names, and paths.
- [ ] Scope switching between everything, property names, values, and notes behaves correctly.
- [ ] Matching branches expand automatically.
- [ ] Clearing search restores the previous tree without stale filtering.
- [ ] Hiding search clears the filter and returns focus to the toggle.
- [ ] Escape closes search and clears the filter.
- [ ] Search text with quotes, backslashes, and newlines does not break query actions.

## Property picker and saved views

- [ ] **All** and **None** update the selection.
- [ ] The picker filter narrows the list without changing the tree query.
- [ ] The picker keeps its filter and focus during live index updates.
- [ ] Saving a new view records the current selection.
- [ ] Switching views restores the saved selection.
- [ ] A modified active view is marked as modified.
- [ ] **Update** replaces the active view with the current selection.
- [ ] **Rename** changes the name and rejects blank or duplicate names.
- [ ] **Delete** removes the active view without affecting notes.
- [ ] A view referencing a currently absent property preserves that key and shows the property once it appears.
- [ ] All / None apply to every property, not only filtered results.

## Sorting, pinning, and hiding

- [ ] All four sort modes work: name A–Z, name Z–A, frequency high to low, frequency low to high.
- [ ] Frequency ties fall back to alphabetical order.
- [ ] The sort button reflects the active order.
- [ ] Pinning moves a property to the top and shows a pin marker.
- [ ] Unpinning restores the normal order.
- [ ] Hiding removes a property from the tree and the settings entry restores it.
- [ ] Hidden properties are excluded from profile and selection counts.

## Row interactions

- [ ] Property rows expand and collapse.
- [ ] Value rows reveal and hide their notes.
- [ ] Note rows open on click; Ctrl/Cmd-click opens a new tab.
- [ ] Long names, paths, and Unicode text truncate without breaking layout.
- [ ] **Show more** appears for large value and note lists and pages correctly.
- [ ] Expand all and collapse all follow the current selection and search state.

## Context menu and Search integration

- [ ] Right-click opens the row menu.
- [ ] Shift+F10 and the Context Menu key open the same menu.
- [ ] **Open in Search** opens the core Search view with a property query.
- [ ] Disabling the core Search plugin produces a helpful notice instead of an error.
- [ ] **Copy search query** copies a correctly quoted query.
- [ ] **Copy matching note links** copies wiki links for every matching note.
- [ ] Empty-value searches explain the local empty-row approximation.

## Accessibility

- [ ] Every icon-only control has a meaningful accessible name.
- [ ] Keyboard focus is visible.
- [ ] Focus returns to the same control after a re-render.
- [ ] Controls are reachable and operable without a mouse.
- [ ] Expand/collapse state is exposed with `aria-expanded`.
- [ ] The summary updates and is announced through the live region.
- [ ] Zooming to 200% does not hide essential controls.
- [ ] Coarse-pointer and mobile layouts keep touch targets usable.

## Performance and resilience

- [ ] Opening the view on a large vault remains responsive.
- [ ] Typing in search does not noticeably lag.
- [ ] Expanding large branches does not freeze the app.
- [ ] Repeated metadata events are debounced rather than causing constant rebuilds.
- [ ] A failed settings write shows a notice and later saves still work.
- [ ] Malformed saved settings fall back to defaults instead of breaking startup.
- [ ] Disabling the plugin removes its listeners and pending timers.

## Mobile

- [ ] The view opens and scrolls correctly.
- [ ] Search, picker, profile, and sort controls are reachable.
- [ ] Row and icon controls meet touch-target expectations.
- [ ] Context menus work through long-press or the host equivalent.
- [ ] Note opening and Ctrl/Cmd-equivalent behavior are sane.

## Documentation and licensing

- [ ] [README.md](../README.md) matches the shipped behavior.
- [ ] [CHANGELOG.md](../CHANGELOG.md) describes the release.
- [ ] The release notes in [docs/releases/](releases/) describe the release.
- [ ] `LICENSE` contains the MIT License text and the project is identified as MIT.
- [ ] [NOTICE.md](../NOTICE.md) lists third-party notices.
- [ ] Relative documentation links resolve.
- [ ] The plugin description, author, and minimum app version are correct in the community list.

## Sign-off

| Field | Value |
| --- | --- |
| Version | |
| Obsidian version | |
| Platform | |
| Reviewer | |
| Date | |
| Result | Pass / Fail |
| Notes | |
