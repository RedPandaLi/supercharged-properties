# Supercharged Properties

Supercharged Properties is an Obsidian plugin that turns your vault's YAML frontmatter into a full-pane, browsable tree of **properties → values → notes**. Explore how metadata is used across your vault, filter it, save focused views, and jump straight to the notes you need.

The plugin is read-only: it indexes frontmatter through Obsidian's metadata cache and never modifies your notes.

## Features

- **Full property tree** — every property, its values, and the notes that use them.
- **Typed value rows** — strings, numbers, booleans, empty values, and nested lists are kept distinct. Repeated values are deduplicated per note.
- **Search everything or narrow the scope** — search property names, values, note names, or paths, with automatic branch expansion for matches.
- **Property picker** — include only the properties you care about, with All / None shortcuts and a live filter.
- **Saved views (profiles)** — save a property selection, switch between views, then update, rename, or delete them.
- **Sorting** — by property name (A–Z or Z–A) or by note frequency (high or low).
- **Pinning and hiding** — keep important properties at the top and hide noisy ones.
- **Native Search integration** — open an Obsidian property query for a property or value, copy the query, or copy matching note links.
- **Accessible controls** — labelled buttons, keyboard-operable menus, visible focus states, and live summaries.
- **Live updates** — edits, renames, deletes, metadata resolution, and type changes refresh the tree automatically.

## Requirements

- Obsidian **1.7.2** or later.
- Desktop and mobile are supported (`isDesktopOnly` is `false`).
- The core **Search** plugin is required only for the "Open in Search" action.

## Installation

### Community plugins

If the plugin is listed, open **Settings → Community plugins → Browse**, search for **Supercharged Properties**, install, and enable it.

### Manual installation

1. Create this folder in your vault:

   ```text
   <YourVault>/.obsidian/plugins/supercharged-properties/
   ```

2. Copy these files into it:
   - `main.js`
   - `manifest.json`
   - `styles.css`

3. Reload Obsidian, then enable **Supercharged Properties** under **Settings → Community plugins**.

### From source

```sh
npm install
npm run build
```

Copy `main.js`, `manifest.json`, and `styles.css` into your plugin folder as described above.

## Usage

Open the view with the ribbon icon or a command:

- **Supercharged Properties: Open sidebar**
- **Supercharged Properties: Open in tab**
- **Supercharged Properties: Refresh property index**

The toolbar provides:

- **Sort properties** — choose a sort order.
- **Refresh property index** — rebuild the index from the vault.
- **Expand/collapse all** — follows the current property selection.
- **Toggle search** — show or hide the search field without silently filtering the tree.
- **Choose properties to show** — open the property picker and profile manager.
- **Property view** — switch between all properties, a custom selection, and saved profiles.

### Working with rows

- Click a property to expand or collapse its values.
- Click a value to show or hide the notes that contain it.
- Click a note to open it; Ctrl/Cmd-click opens it in a new tab.
- Right-click a row, or press Shift+F10 / the Context Menu key, for actions:
  - **Open in Search**
  - **Copy search query**
  - **Copy matching note links**
  - **Pin property** / **Unpin property**
  - **Hide property**

### Search scopes

Use the sliders button next to the search field to search:

- everything,
- property names only,
- values only, or
- note names and paths only.

When the search field is hidden, the filter is cleared so the tree always reflects what you see.

### Saved views

Open **Choose properties to show**, select the properties you want, and use **Save new** to create a named view. **Update** overwrites the active view with the current selection, **Rename** changes its name, and **Delete** removes it. Property selections are stored in the plugin's settings, not in your notes.

## Settings

Open **Settings → Supercharged Properties**:

- **Show note counts** — display the number of distinct notes for each property and value.
- **Sort by** — set the default sort order.
- **Hidden properties** — one property name per line. Hidden properties can be restored by removing their names here.

## How it works

On startup, the plugin reads frontmatter from Obsidian's metadata cache and builds an incremental index:

1. Property names are normalized (trimmed, Unicode NFC, case-folded) so `Status` and `status` share one row.
2. Values keep their type identity, so `false`, `"false"`, `0`, and `"0"` remain distinct. Complete wiki links are preserved to avoid alias collisions.
3. Each row counts distinct notes, not assignments; a note contributes at most one count per row.
4. Metadata and vault events update single notes when possible. Metadata resolution and folder renames trigger a debounced rebuild.

Unsupported object values (for example, nested maps) do not produce value rows, but their notes remain visible under the property so they are not lost.

## Development

Development requires Node **22.13+**, **24+**, or **26+**.

```sh
npm install
npm run lint       # ESLint, zero warnings allowed
npm test           # Vitest suite
npm run build      # Type-check and bundle to main.js
npm run validate   # Lint, build, test, and release validation
```

See [CONTRIBUTING.md](CONTRIBUTING.md) for architecture, testing, and review conventions.

## Documentation

- [Contributing](CONTRIBUTING.md)
- [Publishing](docs/PUBLISHING.md)
- [Release QA](docs/RELEASE-QA.md)
- [Changelog](CHANGELOG.md)
- [1.0.2 release notes](docs/releases/1.0.2.md)
- [1.0.1 release notes](docs/releases/1.0.1.md)
- [1.0.0 release notes](docs/releases/1.0.0.md)

## License

Copyright (c) 2026 Ajay Zapadiya.

Released under the **MIT License**. You may use, copy, modify, merge, publish, distribute, sublicense, and sell copies of the software, provided the copyright and permission notice are included. The software is provided **as is**, without warranty of any kind. See [LICENSE](LICENSE) for the full text.

Third-party notices are documented in [NOTICE.md](NOTICE.md).

## Disclaimer

Supercharged Properties is an independent community plugin and is not affiliated with or endorsed by Obsidian. Obsidian is a trademark of Dynalist Inc.
