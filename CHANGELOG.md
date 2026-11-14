# Changelog

All notable changes to Supercharged Properties are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - 2026-11-14

Initial public release.

### Added

- Full-pane property tree showing properties, typed values, and the notes that use them.
- Incremental index built from Obsidian's metadata cache, with live updates for edits, creates, deletes, renames, metadata resolution, and property type changes.
- Typed value handling for strings, numbers, booleans, empty values, and nested lists, with cycle protection and per-note deduplication.
- Search across property names, values, note names, and paths, including automatic branch expansion and a dedicated search scope menu.
- Property picker with All / None shortcuts, filtering, and a count for the current selection.
- Saved views (profiles) with create, update, rename, and delete actions.
- Sorting by property name or distinct-note frequency in both directions.
- Pin and hide actions for properties, with hidden properties managed in settings.
- Native Obsidian Search integration, plus copy actions for property queries and matching note links.
- Type icons based on Obsidian's configured property types, with a text fallback and no inference from note contents.
- Accessible controls with labelled buttons, keyboard-operable context menus, focus restoration, and an aria-live summary.
- Settings for note counts, sort order, and hidden properties.
- Release tooling that validates manifest/package/lockfile versions, assets, runtime imports, and local Markdown links.

### Security

- Note content is rendered with `textContent` and is never interpreted as HTML.
- Host APIs that are not part of the public typings are feature-detected and guarded.
- The plugin is read-only and does not write to notes.

### License

- Released under the MIT License. See [LICENSE](LICENSE) and [NOTICE.md](NOTICE.md).

[Unreleased]: https://github.com/ajay126z/supercharged-properties/compare/1.0.0...HEAD
[1.0.0]: https://github.com/ajay126z/supercharged-properties/releases/tag/1.0.0
