// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('obsidian', () => ({
  Plugin: class {
    app: any; cleanups: Array<() => void> = [];
    loadData = async () => null;
    registerView() {} addRibbonIcon() {} addCommand() {} addSettingTab() {}
    registerEvent(ref: { off: () => void }) { this.cleanups.push(ref.off); }
    register(fn: () => void) { this.cleanups.push(fn); }
  },
  ItemView: class {}, PluginSettingTab: class {}, Setting: class {}, Menu: class {}, Notice: class {}, TFile: class {}, setIcon() {}
}));
import Plugin from '../src/main';
import { TFile } from 'obsidian';
function emitter() {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();
  return {
    on(event: string, callback: (...args: any[]) => void) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(callback);
      return { off: () => { listeners.get(event)!.delete(callback); } };
    },
    emit(event: string, ...args: any[]) { for (const callback of listeners.get(event) ?? []) callback(...args); }
  };
}
async function setup(saved: unknown = null) {
  vi.useFakeTimers();
  const cache = emitter(); const vault = emitter(); const types = emitter();
  const plugin = new Plugin({} as any, {} as any);
  const files: any[] = []; const metadata = new Map<string, any>();
  (plugin as any).app = {
    metadataCache: { ...cache, getFileCache: (file: any) => metadata.get(file.path) },
    vault: { ...vault, getMarkdownFiles: () => files },
    metadataTypeManager: types,
    workspace: { onLayoutReady: (run: () => void) => run(), getLeavesOfType: () => [] }
  };
  (plugin as any).loadData = async () => saved;
  await plugin.onload(); vi.runAllTimers();
  return { plugin, cache, vault, types, files, metadata };
}
afterEach(() => { vi.useRealTimers(); });
it('indexes new notes when metadata is ready, updates edits, and removes deleted notes', async () => {
  const { plugin, cache, vault } = await setup();
  const file = Object.assign(new TFile(), { path: 'a.md', extension: 'md' });
  vault.emit('create', file); expect(plugin.index.properties.size).toBe(0);
  cache.emit('changed', file, '', { frontmatter: { status: 'Todo' } });
  expect(plugin.index.properties.get('status')!.paths.has('a.md')).toBe(true);
  cache.emit('changed', file, '', { frontmatter: { due: 'today' } });
  expect(plugin.index.properties.has('status')).toBe(false);
  vault.emit('delete', file); expect(plugin.index.properties.size).toBe(0);
});
it('refreshes type changes and coalesces metadata/folder rebuild events', async () => {
  const { plugin, cache, vault, types } = await setup();
  const refresh = vi.spyOn(plugin, 'refresh'); const rebuild = vi.spyOn(plugin, 'rebuild');
  types.emit('changed'); expect(refresh).toHaveBeenCalledOnce();
  cache.emit('resolved'); cache.emit('resolved'); vault.emit('rename', {}, 'Folder');
  expect(rebuild).not.toHaveBeenCalled(); vi.advanceTimersByTime(150);
  expect(rebuild).toHaveBeenCalledOnce();
});
it('cancels queued work and unregisters events on unload', async () => {
  const { plugin, cache, types } = await setup();
  const rebuild = vi.spyOn(plugin, 'rebuild'); const refresh = vi.spyOn(plugin, 'refresh');
  cache.emit('resolved');
  for (const cleanup of (plugin as any).cleanups) cleanup();
  vi.runAllTimers(); types.emit('changed');
  expect(rebuild).not.toHaveBeenCalled(); expect(refresh).not.toHaveBeenCalled();
});

it('restores profiles and the active selection when the plugin loads', async () => {
  const { plugin } = await setup({
    profiles: [{ id: 'writing', name: 'Writing View', keys: ['status', 'deadline', 'word_count'] }],
    activeProfile: 'writing', scope: ['status', 'deadline', 'word_count']
  });
  expect(plugin.prefs.activeProfile).toBe('writing');
  expect(plugin.prefs.scope).toEqual(['status', 'deadline', 'word_count']);
  expect(plugin.prefs.profiles[0].name).toBe('Writing View');
});
it('loads older settings without requiring profiles and ignores a stale active profile', async () => {
  const { plugin } = await setup({ scope: ['status'], activeProfile: 'missing' });
  expect(plugin.prefs.profiles).toEqual([]);
  expect(plugin.prefs.activeProfile).toBeNull();
  expect(plugin.prefs.scope).toEqual(['status']);
});
it('serializes settings snapshots so rapid changes persist in order', async () => {
  const { plugin } = await setup();
  let releaseFirst!: () => void;
  const firstWrite = new Promise<void>(resolve => { releaseFirst = resolve; });
  const saveData = vi.fn().mockImplementationOnce(() => firstWrite).mockResolvedValue(undefined);
  (plugin as any).saveData = saveData;
  plugin.prefs.scope = ['status']; const first = plugin.save();
  plugin.prefs.scope = ['deadline']; const second = plugin.save();
  await Promise.resolve();
  expect(saveData).toHaveBeenCalledTimes(1);
  expect(saveData.mock.calls[0][0].scope).toEqual(['status']);
  releaseFirst(); await first; await second;
  expect(saveData.mock.calls[1][0].scope).toEqual(['deadline']);
});
it('recovers the settings save queue after a failed write', async () => {
  const { plugin } = await setup();
  const saveData = vi.fn().mockRejectedValueOnce(new Error('disk full')).mockResolvedValue(undefined);
  (plugin as any).saveData = saveData;
  await expect(plugin.save()).resolves.toBeUndefined();
  await plugin.save();
  expect(saveData).toHaveBeenCalledTimes(2);
});
it('treats malformed settings roots as defaults', async () => {
  const { plugin } = await setup('not a settings object');
  expect(plugin.prefs.scope).toBeNull();
  expect(plugin.prefs.profiles).toEqual([]);
});
