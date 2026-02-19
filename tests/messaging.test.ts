import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ConnectResult } from '../utils/messaging';
import type { Config } from '../utils/storage';
import type { Note } from '../utils/notes';

const defineExtensionMessagingMock = vi.fn();

vi.mock('@webext-core/messaging', () => ({
  defineExtensionMessaging: defineExtensionMessagingMock,
}));

describe('utils/messaging', () => {
  beforeEach(() => {
    defineExtensionMessagingMock.mockReset();
    vi.resetModules();
  });

  it('calls defineExtensionMessaging once on module evaluation', async () => {
    const sendMessage = vi.fn();
    const onMessage = vi.fn();
    defineExtensionMessagingMock.mockReturnValue({ sendMessage, onMessage });

    await import('../utils/messaging');

    expect(defineExtensionMessagingMock).toHaveBeenCalledTimes(1);
    expect(defineExtensionMessagingMock).toHaveBeenCalledWith();
  });

  it('re-exports sendMessage and onMessage from defineExtensionMessaging', async () => {
    const sendMessage = vi.fn();
    const onMessage = vi.fn();
    defineExtensionMessagingMock.mockReturnValue({ sendMessage, onMessage });

    const module = await import('../utils/messaging');

    expect(module.sendMessage).toBe(sendMessage);
    expect(module.onMessage).toBe(onMessage);
  });
});

describe('Type definitions', () => {
  // These tests verify that the type definitions compile correctly.
  // If the types are incorrect, TypeScript compilation will fail.

  it('Config type allows pat as required and gistId as optional', () => {
    // gistId is optional - both cases should compile
    const configWithoutGistId: Config = { pat: 'ghp_xxx' };
    const configWithGistId: Config = { pat: 'ghp_xxx', gistId: 'abc123' };

    expect(configWithoutGistId.pat).toBe('ghp_xxx');
    expect(configWithoutGistId.gistId).toBeUndefined();
    expect(configWithGistId.gistId).toBe('abc123');
  });

  it('Note type requires content and updatedAt', () => {
    const note: Note = {
      content: 'test content',
      updatedAt: '2026-02-04T12:00:00Z',
    };

    expect(note.content).toBe('test content');
    expect(note.updatedAt).toBe('2026-02-04T12:00:00Z');
  });

  it('ConnectResult type requires gistId, gistUrl, and reused', () => {
    const result: ConnectResult = {
      gistId: 'abc123',
      gistUrl: 'https://gist.github.com/user/abc123',
      reused: true,
    };

    expect(result.gistId).toBe('abc123');
    expect(result.gistUrl).toBe('https://gist.github.com/user/abc123');
    expect(result.reused).toBe(true);
  });
});

describe('ProtocolMap message definitions', () => {
  beforeEach(() => {
    defineExtensionMessagingMock.mockReset();
    vi.resetModules();
  });

  it('defines getNote message (key: string) => Note | null', async () => {
    const sendMessage = vi.fn();
    defineExtensionMessagingMock.mockReturnValue({
      sendMessage,
      onMessage: vi.fn(),
    });

    const { sendMessage: send } = await import('../utils/messaging');

    // Type check: calling with string key should compile
    await send('getNote', 'owner/repo#1');

    expect(sendMessage).toHaveBeenCalledWith('getNote', 'owner/repo#1');
  });

  it('defines saveNote message (data: { key, content }) => void', async () => {
    const sendMessage = vi.fn();
    defineExtensionMessagingMock.mockReturnValue({
      sendMessage,
      onMessage: vi.fn(),
    });

    const { sendMessage: send } = await import('../utils/messaging');

    await send('saveNote', { key: 'owner/repo#1', content: 'test note' });

    expect(sendMessage).toHaveBeenCalledWith('saveNote', {
      key: 'owner/repo#1',
      content: 'test note',
    });
  });

  it('defines getConfig message () => Config | null', async () => {
    const sendMessage = vi.fn();
    defineExtensionMessagingMock.mockReturnValue({
      sendMessage,
      onMessage: vi.fn(),
    });

    const { sendMessage: send } = await import('../utils/messaging');

    await send('getConfig', undefined);

    expect(sendMessage).toHaveBeenCalledWith('getConfig', undefined);
  });

  it('defines savePat message (data: { pat }) => void', async () => {
    const sendMessage = vi.fn();
    defineExtensionMessagingMock.mockReturnValue({
      sendMessage,
      onMessage: vi.fn(),
    });

    const { sendMessage: send } = await import('../utils/messaging');

    await send('savePat', { pat: 'ghp_xxxx' });

    expect(sendMessage).toHaveBeenCalledWith('savePat', { pat: 'ghp_xxxx' });
  });

  it('defines connectGist message () => ConnectResult', async () => {
    const sendMessage = vi.fn();
    defineExtensionMessagingMock.mockReturnValue({
      sendMessage,
      onMessage: vi.fn(),
    });

    const { sendMessage: send } = await import('../utils/messaging');

    await send('connectGist', undefined);

    expect(sendMessage).toHaveBeenCalledWith('connectGist', undefined);
  });
});
