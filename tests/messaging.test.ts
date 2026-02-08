import { beforeEach, describe, expect, it, vi } from 'vitest';

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
