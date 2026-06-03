import { describe, it, expect, vi } from 'vitest';

const AppleStylePlugin = require('../input.js');

describe('AppleStylePlugin - publish context menu helpers', () => {
  it('collects markdown files recursively and sorts them by path', () => {
    const plugin = new AppleStylePlugin();
    const files = plugin.collectMarkdownFiles({
      children: [
        { path: 'notes/b.txt', extension: 'txt' },
        { path: 'notes/z.md', extension: 'md', basename: 'z' },
        {
          children: [
            { path: 'notes/a.md', extension: 'md', basename: 'a' },
          ],
        },
      ],
    });

    expect(files.map((file) => file.path)).toEqual(['notes/a.md', 'notes/z.md']);
  });

  it('renders selected markdown files as a merged publish draft', async () => {
    const plugin = new AppleStylePlugin();
    const convertCurrent = vi.fn().mockResolvedValue(undefined);
    const showSyncModal = vi.fn().mockResolvedValue(undefined);
    const view = { convertCurrent, showSyncModal };
    const files = [
      { path: 'notes/b.md', extension: 'md', basename: 'B' },
      { path: 'notes/a.md', extension: 'md', basename: 'A' },
    ];

    plugin.app = {
      vault: {
        read: vi.fn(async (file) => `body:${file.basename}`),
      },
      workspace: {
        getLeavesOfType: vi.fn(() => [{ view }]),
      },
    };
    plugin.openConverter = vi.fn().mockResolvedValue(undefined);

    await plugin.openFilesInPublishAssistant(files, { merge: true });

    expect(plugin.app.vault.read).toHaveBeenCalledTimes(2);
    expect(convertCurrent).toHaveBeenCalledWith(true, {
      showLoading: true,
      loadingText: '正在合并文章预览...',
      sourceOverride: {
        markdown: '# A\n\nbody:A\n\n---\n\n# B\n\nbody:B',
        sourcePath: 'notes/a.md + notes/b.md',
      },
    });
    expect(showSyncModal).toHaveBeenCalledTimes(1);
  });

  it('opens a single markdown file before showing the publish modal', async () => {
    const plugin = new AppleStylePlugin();
    const convertCurrent = vi.fn().mockResolvedValue(undefined);
    const showSyncModal = vi.fn().mockResolvedValue(undefined);
    const openFile = vi.fn().mockResolvedValue(undefined);
    const file = { path: 'notes/a.md', extension: 'md', basename: 'A' };

    plugin.app = {
      vault: {
        read: vi.fn(async () => '# A'),
      },
      workspace: {
        getLeaf: vi.fn(() => ({ openFile })),
        getLeavesOfType: vi.fn(() => [{ view: { convertCurrent, showSyncModal } }]),
      },
    };
    plugin.openConverter = vi.fn().mockResolvedValue(undefined);

    await plugin.openFilesInPublishAssistant(file);

    expect(openFile).toHaveBeenCalledWith(file);
    expect(convertCurrent).toHaveBeenCalledWith(true, {
      showLoading: true,
      loadingText: '正在准备文章预览...',
      sourceOverride: {
        markdown: '# A',
        sourcePath: 'notes/a.md',
      },
    });
    expect(showSyncModal).toHaveBeenCalledTimes(1);
  });
});
