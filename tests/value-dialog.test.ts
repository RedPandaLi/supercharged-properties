// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
vi.mock('obsidian', () => ({
  Modal: class { titleEl = document.createElement('h1'); contentEl = document.createElement('div'); close = vi.fn(); }, Notice: class {}
}));
import { ValueEditModal } from '../src/value-dialog';
import type { App } from 'obsidian';
afterEach(() => vi.useRealTimers());
it('shows all preview paths and applies only the displayed preview after explicit confirmation', async () => {
  const plan = { total: 6, changes: Array.from({ length: 6 }, (_, i) => ({ path: `${i}.md`, key: 'status', before: 'doing', after: 'active', original: 'doing', replacement: 'active' })) };
  const apply = vi.fn().mockResolvedValue(undefined);
  const modal = new ValueEditModal({} as App, { request: { property: 'status', kind: 'string', value: 'doing', mode: 'rename', replacement: 'active' }, siblings: [], preview: () => plan, apply });
  modal.onOpen();
  expect(modal.contentEl.textContent).toContain('every matching note listed in the preview');
  expect(modal.contentEl.querySelectorAll('.pv-edit-change')).toHaveLength(6);
  expect(apply).not.toHaveBeenCalled();
  (modal.contentEl.querySelector('.mod-cta') as HTMLButtonElement).click();
  await Promise.resolve();
  expect(apply).toHaveBeenCalledWith(plan);
});
it('disables confirmation while a changed input awaits its preview and for blank inputs', () => {
  vi.useFakeTimers();
  const modal = new ValueEditModal({} as App, { request: { property: 'status', kind: 'string', value: 'doing', mode: 'rename', replacement: 'doing' }, siblings: [], preview: () => ({ total: 1, changes: [] }), apply: vi.fn() });
  modal.onOpen();
  const input = modal.contentEl.querySelector('input')!;
  input.value = ''; input.dispatchEvent(new Event('input'));
  expect((modal.contentEl.querySelector('.mod-cta') as HTMLButtonElement).disabled).toBe(true);
  vi.advanceTimersByTime(120);
  expect((modal.contentEl.querySelector('.mod-cta') as HTMLButtonElement).disabled).toBe(true);
});
