import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock browser API
const openOptionsPageMock = vi.fn();
const addListenerMock = vi.fn();

vi.stubGlobal('browser', {
  runtime: {
    onInstalled: {
      addListener: addListenerMock,
    },
    openOptionsPage: openOptionsPageMock,
  },
});

// Mock defineBackground as global (WXT auto-imports this)
const defineBackgroundMock = vi.fn((callback: () => void) => {
  callback();
  return callback;
});

vi.stubGlobal('defineBackground', defineBackgroundMock);

// Mock messaging
type MessageHandler = (args: { data: unknown; sender?: { tab?: { id: number } } }) => Promise<unknown>;
const messageHandlers: Record<string, MessageHandler> = {};
const onMessageMock = vi.fn((name: string, handler: MessageHandler) => {
  messageHandlers[name] = handler;
});

vi.mock('@/utils/messaging', () => ({
  onMessage: onMessageMock,
}));

// Mock storage
const getConfigMock = vi.fn();
const savePatMock = vi.fn();
const saveGistIdMock = vi.fn();

vi.mock('@/utils/storage', () => ({
  getConfig: getConfigMock,
  savePat: savePatMock,
  saveGistId: saveGistIdMock,
}));

// Mock gist
const findOrCreateGistMock = vi.fn();
const getGistMock = vi.fn();
const isManagedGistMock = vi.fn();

vi.mock('@/utils/gist', () => ({
  findOrCreateGist: findOrCreateGistMock,
  getGist: getGistMock,
  isManagedGist: isManagedGistMock,
}));

// Mock notes
const getNoteMock = vi.fn();
const saveNoteMock = vi.fn();

vi.mock('@/utils/notes', () => ({
  getNote: getNoteMock,
  saveNote: saveNoteMock,
}));

const loadModule = async () => {
  vi.resetModules();
  // Clear handlers from previous test
  Object.keys(messageHandlers).forEach((key) => delete messageHandlers[key]);
  addListenerMock.mockReset();
  return import('../entrypoints/background');
};

describe('entrypoints/background', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isManagedGistMock.mockReturnValue(true);
  });

  describe('onInstalled listener', () => {
    it('opens options page when reason is install', async () => {
      await loadModule();

      expect(addListenerMock).toHaveBeenCalledTimes(1);
      const listener = addListenerMock.mock.calls[0][0];

      listener({ reason: 'install' });

      expect(openOptionsPageMock).toHaveBeenCalledTimes(1);
    });

    it('does not open options page when reason is update', async () => {
      await loadModule();

      const listener = addListenerMock.mock.calls[0][0];

      listener({ reason: 'update' });

      expect(openOptionsPageMock).not.toHaveBeenCalled();
    });

    it('does not open options page when reason is chrome_update', async () => {
      await loadModule();

      const listener = addListenerMock.mock.calls[0][0];

      listener({ reason: 'chrome_update' });

      expect(openOptionsPageMock).not.toHaveBeenCalled();
    });
  });

  describe('getNote handler', () => {
    it('returns note when config is valid', async () => {
      await loadModule();

      getConfigMock.mockResolvedValue({ pat: 'token', gistId: 'gist-123' });
      getNoteMock.mockResolvedValue({ content: 'test note', updatedAt: '2026-02-18T00:00:00Z' });

      const result = await messageHandlers.getNote({ data: 'owner/repo#1' });

      expect(getConfigMock).toHaveBeenCalled();
      expect(getNoteMock).toHaveBeenCalledWith('token', 'gist-123', 'owner/repo#1');
      expect(result).toEqual({ content: 'test note', updatedAt: '2026-02-18T00:00:00Z' });
    });

    it('throws error when config is null', async () => {
      await loadModule();

      getConfigMock.mockResolvedValue(null);

      await expect(messageHandlers.getNote({ data: 'owner/repo#1' })).rejects.toThrow(
        'Configuration not found. Please set up PAT first.',
      );
    });

    it('throws error when gistId is not set', async () => {
      await loadModule();

      getConfigMock.mockResolvedValue({ pat: 'token' });

      await expect(messageHandlers.getNote({ data: 'owner/repo#1' })).rejects.toThrow(
        'Gist not connected. Please connect Gist first.',
      );
    });
  });

  describe('saveNote handler', () => {
    it('saves note when config is valid', async () => {
      await loadModule();

      getConfigMock.mockResolvedValue({ pat: 'token', gistId: 'gist-123' });
      saveNoteMock.mockResolvedValue(undefined);

      await messageHandlers.saveNote({ data: { key: 'owner/repo#1', content: 'my note' } });

      expect(saveNoteMock).toHaveBeenCalledWith('token', 'gist-123', 'owner/repo#1', 'my note');
    });

    it('throws error when config is null', async () => {
      await loadModule();

      getConfigMock.mockResolvedValue(null);

      await expect(
        messageHandlers.saveNote({ data: { key: 'owner/repo#1', content: 'my note' } }),
      ).rejects.toThrow('Configuration not found. Please set up PAT first.');
    });

    it('throws error when gistId is not set', async () => {
      await loadModule();

      getConfigMock.mockResolvedValue({ pat: 'token' });

      await expect(
        messageHandlers.saveNote({ data: { key: 'owner/repo#1', content: 'my note' } }),
      ).rejects.toThrow('Gist not connected. Please connect Gist first.');
    });
  });

  describe('getConfig handler', () => {
    it('returns config with PAT for extension page requests', async () => {
      await loadModule();

      getConfigMock.mockResolvedValue({ pat: 'token', gistId: 'gist-123' });

      const result = await messageHandlers.getConfig({ data: undefined });

      expect(getConfigMock).toHaveBeenCalled();
      expect(result).toEqual({ hasPat: true, pat: 'token', gistId: 'gist-123' });
    });

    it('returns config without PAT for content script requests', async () => {
      await loadModule();

      getConfigMock.mockResolvedValue({ pat: 'token', gistId: 'gist-123' });

      const result = await messageHandlers.getConfig({ data: undefined, sender: { tab: { id: 1 } } });

      expect(getConfigMock).toHaveBeenCalled();
      expect(result).toEqual({ hasPat: true, gistId: 'gist-123' });
    });

    it('returns hasPat false when config is not set', async () => {
      await loadModule();

      getConfigMock.mockResolvedValue(null);

      const result = await messageHandlers.getConfig({ data: undefined });

      expect(result).toEqual({ hasPat: false });
    });
  });

  describe('savePat handler', () => {
    it('saves pat to storage', async () => {
      await loadModule();

      savePatMock.mockResolvedValue(undefined);

      await messageHandlers.savePat({ data: { pat: 'new-token' } });

      expect(savePatMock).toHaveBeenCalledWith({ pat: 'new-token' });
    });
  });

  describe('connectGist handler', () => {
    it('connects gist and saves gistId when config exists', async () => {
      await loadModule();

      getConfigMock.mockResolvedValue({ pat: 'token' });
      findOrCreateGistMock.mockResolvedValue({
        gistId: 'new-gist-id',
        gistUrl: 'https://gist.github.com/user/new-gist-id',
        reused: false,
      });
      saveGistIdMock.mockResolvedValue(undefined);

      const result = await messageHandlers.connectGist({ data: undefined });

      expect(findOrCreateGistMock).toHaveBeenCalledWith('token');
      expect(saveGistIdMock).toHaveBeenCalledWith({ gistId: 'new-gist-id' });
      expect(result).toEqual({
        gistId: 'new-gist-id',
        gistUrl: 'https://gist.github.com/user/new-gist-id',
        reused: false,
      });
    });

    it('reuses existing gist when found', async () => {
      await loadModule();

      getConfigMock.mockResolvedValue({ pat: 'token' });
      findOrCreateGistMock.mockResolvedValue({
        gistId: 'existing-gist-id',
        gistUrl: 'https://gist.github.com/user/existing-gist-id',
        reused: true,
      });
      saveGistIdMock.mockResolvedValue(undefined);

      const result = (await messageHandlers.connectGist({ data: undefined })) as {
        gistId: string;
        gistUrl: string;
        reused: boolean;
      };

      expect(result.reused).toBe(true);
      expect(saveGistIdMock).toHaveBeenCalledWith({ gistId: 'existing-gist-id' });
    });

    it('throws error when config is null (PAT not set)', async () => {
      await loadModule();

      getConfigMock.mockResolvedValue(null);

      await expect(messageHandlers.connectGist({ data: undefined })).rejects.toThrow(
        'PAT not configured. Please set up PAT first.',
      );

      expect(findOrCreateGistMock).not.toHaveBeenCalled();
      expect(saveGistIdMock).not.toHaveBeenCalled();
    });
  });

  describe('checkConnection handler', () => {
    it('returns connected: true with gistUrl when gist exists', async () => {
      await loadModule();

      getConfigMock.mockResolvedValue({ pat: 'token', gistId: 'gist-123' });
      getGistMock.mockResolvedValue({
        id: 'gist-123',
        html_url: 'https://gist.github.com/user/gist-123',
        files: {},
      });
      isManagedGistMock.mockReturnValue(true);

      const result = (await messageHandlers.checkConnection({ data: undefined })) as {
        connected: boolean;
        gistUrl?: string;
      };

      expect(result.connected).toBe(true);
      expect(result.gistUrl).toBe('https://gist.github.com/user/gist-123');
      expect(getGistMock).toHaveBeenCalledWith('token', 'gist-123');
      expect(isManagedGistMock).toHaveBeenCalled();
    });

    it('returns connected: false when config is null', async () => {
      await loadModule();

      getConfigMock.mockResolvedValue(null);

      const result = (await messageHandlers.checkConnection({ data: undefined })) as {
        connected: boolean;
      };

      expect(result.connected).toBe(false);
      expect(getGistMock).not.toHaveBeenCalled();
    });

    it('returns connected: false when gistId is not set', async () => {
      await loadModule();

      getConfigMock.mockResolvedValue({ pat: 'token' });

      const result = (await messageHandlers.checkConnection({ data: undefined })) as {
        connected: boolean;
      };

      expect(result.connected).toBe(false);
      expect(getGistMock).not.toHaveBeenCalled();
    });

    it('returns connected: false when getGist throws error', async () => {
      await loadModule();

      getConfigMock.mockResolvedValue({ pat: 'token', gistId: 'deleted-gist' });
      getGistMock.mockRejectedValue(new Error('Gist not found'));

      const result = (await messageHandlers.checkConnection({ data: undefined })) as {
        connected: boolean;
      };

      expect(result.connected).toBe(false);
    });

    it('returns connected: false when gist is not managed by extension', async () => {
      await loadModule();

      getConfigMock.mockResolvedValue({ pat: 'token', gistId: 'gist-123' });
      getGistMock.mockResolvedValue({
        id: 'gist-123',
        html_url: 'https://gist.github.com/user/gist-123',
        files: {},
      });
      isManagedGistMock.mockReturnValue(false);

      const result = (await messageHandlers.checkConnection({ data: undefined })) as {
        connected: boolean;
      };

      expect(result.connected).toBe(false);
      expect(getGistMock).toHaveBeenCalledWith('token', 'gist-123');
      expect(isManagedGistMock).toHaveBeenCalled();
    });
  });
});
