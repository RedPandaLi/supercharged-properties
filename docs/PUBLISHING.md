# Publishing Supercharged Properties

This document describes how to prepare and publish a release. Publishing is manual: the release scripts stage and validate files but do not upload anything.

## Before the first release

1. Ensure the repository is public and contains the plugin at its root.
2. Confirm `manifest.json` has a stable plugin ID, a description ending in a period, and the correct author and minimum Obsidian version.
3. Confirm [README.md](../README.md), [LICENSE](../LICENSE), [NOTICE.md](../NOTICE.md), and [CHANGELOG.md](../CHANGELOG.md) are complete.
4. Confirm the project uses the MIT License and that release validation passes.
5. Submit the plugin to the Obsidian community list by opening a pull request against the [obsidian-releases](https://github.com/obsidianmd/obsidian-releases) repository and adding an entry to `community-plugins.json`. Follow the repository's current instructions and template.

## Release checklist

- [ ] All user-facing changes are in [CHANGELOG.md](../CHANGELOG.md).
- [ ] `manifest.json` `version` is the new semantic version.
- [ ] `manifest.json` `minAppVersion` is correct for the APIs used.
- [ ] `package.json` `version` matches `manifest.json`.
- [ ] `package-lock.json` root `version` and package version match.
- [ ] `versions.json` maps the new version to `minAppVersion`, and keeps older entries.
- [ ] `docs/releases/<version>.md` exists and is not empty.
- [ ] `npm run validate` passes.
- [ ] Manual checks in [RELEASE-QA.md](RELEASE-QA.md) pass.
- [ ] `main.js` was rebuilt from the current source.

## Version files

A release must keep these values synchronized:

| File | Field |
| --- | --- |
| `manifest.json` | `version`, `minAppVersion` |
| `package.json` | `version` |
| `package-lock.json` | root `version` and `packages[""].version` |
| `versions.json` | key: plugin version, value: minimum Obsidian version |
| `docs/releases/<version>.md` | release notes for this version |

For example, version `1.0.0` with a minimum app version of `1.7.2` requires:

```json
{
  "1.0.0": "1.7.2"
}
```

in `versions.json`, plus matching `1.0.0` values in the manifest, package, and lockfile.

## Build and validate

Use a supported Node version (22.13+, 24+, or 26+):

```sh
npm ci
npm run validate
```

`npm run validate` performs:

- ESLint with zero warnings allowed.
- `tsc --noEmit` and an esbuild production bundle to `main.js`.
- The full Vitest suite.
- Release validation from `scripts/validate-release.mjs`.

Release validation checks version agreement, license metadata, required assets, machine-specific paths, the runtime module graph, and relative Markdown links.

## Prepare release assets

```sh
npm run release:prepare
```

This runs validation, then creates:

```text
dist/<version>/
  main.js
  manifest.json
  styles.css
  LICENSE
  NOTICE.md
  release-notes.md
  SHA256SUMS
```

`release-notes.md` is copied from `docs/releases/<version>.md`. Nothing is uploaded or published by the script.

## Create the GitHub release

1. Commit the source changes and the rebuilt `main.js`.
2. Create a tag that exactly matches `manifest.json` `version`, without a `v` prefix:

   ```sh
   git tag 1.0.0
   git push origin 1.0.0
   ```

3. Create a GitHub release for that tag. Use the contents of `docs/releases/<version>.md` as the release description.
4. Attach the three files Obsidian expects:
   - `main.js`
   - `manifest.json`
   - `styles.css`

   You may also attach `LICENSE`, `NOTICE.md`, and `SHA256SUMS` for transparency.
5. Publish the release and verify the assets download correctly.

You can optionally confirm the tag matches the manifest before releasing:

```sh
RELEASE_TAG=1.0.0 node scripts/validate-release.mjs
```

## After publishing

- Verify the plugin installs from the community list, or from a manual install using the attached files.
- Confirm the version shown in Obsidian matches the release.
- Keep older entries in `versions.json` so users on older app versions can install compatible releases.
- Open the next development cycle by adding an `Unreleased` section to the changelog if it is missing.

## Rolling back

If a release is broken:

1. Do not delete the tag or rewrite published assets; users may already depend on them.
2. Publish a new patch version with the fix and release notes explaining the issue.
3. If necessary, update the community plugin entry to point users to the fixed version.

## Related documents

- [README.md](../README.md)
- [CONTRIBUTING.md](../CONTRIBUTING.md)
- [RELEASE-QA.md](RELEASE-QA.md)
- [CHANGELOG.md](../CHANGELOG.md)
- [NOTICE.md](../NOTICE.md)
- [LICENSE](../LICENSE)
