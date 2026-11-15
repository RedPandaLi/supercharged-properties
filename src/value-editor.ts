// SPDX-License-Identifier: MIT
// Scoped Properties (fork of Supercharged Properties): preview and apply frontmatter value edits.

import { App, TFile } from 'obsidian';
import {
  cloneValue,
  getPropertyValue,
  previewValue,
  propertyKey,
  sameValue,
  type ValueEditRequest
} from './value-operations';

export interface ValueEditChange { readonly path: string; readonly before: string; readonly after: string; readonly key: string; readonly original: unknown; readonly replacement: unknown }
export interface ValueEditPreview { readonly total: number; readonly changes: ValueEditChange[] }
export interface ValueEditFailure { readonly path: string; readonly message: string }
export interface ValueEditResult { readonly updated: number; readonly unchanged: number; readonly failures: ValueEditFailure[] }
export interface ValueUndoResult { readonly restored: number; readonly skipped: number; readonly failures: ValueEditFailure[] }

interface Snapshot { readonly path: string; readonly key: string; readonly before: unknown; readonly after: unknown }
interface LastEdit { readonly snapshots: Snapshot[] }

export class ValueEditor {
  private busy = false;
  private last: LastEdit | undefined;

  constructor(private readonly app: App) {}

  canUndo(): boolean { return !!this.last && !this.busy; }

  preview(request: ValueEditRequest, paths: Iterable<string>): ValueEditPreview {
    const changes: ValueEditChange[] = [];
    for (const path of new Set(paths)) {
      const file = this.file(path);
      if (!file) continue;
      const frontmatter = this.frontmatter(file);
      if (!frontmatter) continue;
      const raw = getPropertyValue(frontmatter, request.property);
      if (raw === undefined) continue;
      const result = previewValue(raw, request);
      if (!result.changed) continue;
      changes.push({ path, key: propertyKey(frontmatter, request.property)!, original: cloneValue(raw), replacement: cloneValue(result.value), before: JSON.stringify(raw), after: JSON.stringify(result.value) });
    }
    return { total: changes.length, changes };
  }

  async apply(preview: ValueEditPreview): Promise<ValueEditResult> {
    if (this.busy) throw new Error('Another value edit is running.');
    this.busy = true;
    const snapshots: Snapshot[] = [];
    const failures: ValueEditFailure[] = [];
    let unchanged = 0;
    try {
      for (const change of preview.changes) {
        const file = this.file(change.path);
        if (!file) { failures.push({ path: change.path, message: 'Note not found.' }); continue; }
        let snapshot: Snapshot | undefined;
        try {
          await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
            if (!sameValue(frontmatter[change.key], change.original)) return;
            snapshot = { path: change.path, key: change.key, before: cloneValue(change.original), after: cloneValue(change.replacement) };
            frontmatter[change.key] = cloneValue(change.replacement);
          });
          if (snapshot) snapshots.push(snapshot);
          else unchanged++;
        } catch (error) { failures.push({ path: change.path, message: message(error) }); }
      }
      if (snapshots.length) this.last = { snapshots };
      return { updated: snapshots.length, unchanged, failures };
    } finally { this.busy = false; }
  }

  async undo(): Promise<ValueUndoResult> {
    if (this.busy) throw new Error('Another value edit is running.');
    const last = this.last;
    if (!last) return { restored: 0, skipped: 0, failures: [] };
    this.busy = true;
    const remaining: Snapshot[] = [];
    const failures: ValueEditFailure[] = [];
    let restored = 0;
    let skipped = 0;
    for (const snapshot of last.snapshots) {
      const file = this.file(snapshot.path);
      if (!file) { failures.push({ path: snapshot.path, message: 'Note not found.' }); remaining.push(snapshot); continue; }
      let matched = false;
      try {
        await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
          if (!sameValue(frontmatter[snapshot.key], snapshot.after)) { skipped++; remaining.push(snapshot); return; }
          matched = true;
          frontmatter[snapshot.key] = cloneValue(snapshot.before);
        });
        if (matched) restored++;
      } catch (error) {
        failures.push({ path: snapshot.path, message: message(error) });
        remaining.push(snapshot);
      }
    }
    this.last = remaining.length ? { snapshots: remaining } : undefined;
    this.busy = false;
    return { restored, skipped, failures };
  }

  private file(path: string): TFile | undefined {
    const file = this.app.vault.getAbstractFileByPath(path);
    return file instanceof TFile ? file : undefined;
  }

  private frontmatter(file: TFile): Record<string, unknown> | undefined {
    return this.app.metadataCache.getFileCache(file)?.frontmatter;
  }
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
