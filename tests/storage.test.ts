import { beforeEach, describe, expect, it, vi } from 'vitest';

const defineItemMock = vi.fn();

vi.mock('wxt/utils/storage', () => ({
  storage: {
    defineItem: defineItemMock,
  },
}));

type StorageItemMock = {
  getValue: ReturnType<typeof vi.fn>;
  setValue: ReturnType<typeof vi.fn>;
  removeValue: ReturnType<typeof vi.fn>;
};

const createItemMock = (): StorageItemMock => ({
  getValue: vi.fn(),
  setValue: vi.fn().mockResolvedValue(undefined),
  removeValue: vi.fn().mockResolvedValue(undefined),
});

const loadModule = async () => {
  vi.resetModules();
  return import('../utils/storage');
};

describe('utils/storage', () => {
  beforeEach(() => {
    defineItemMock.mockReset();
  });

  it('defines pat and gistId storage keys on module evaluation', async () => {
    defineItemMock.mockReturnValue(createItemMock());

    await loadModule();

    expect(defineItemMock).toHaveBeenNthCalledWith(1, 'local:pat');
    expect(defineItemMock).toHaveBeenNthCalledWith(2, 'local:gistId');
  });

  it('getConfig returns config when both values are present', async () => {
    const patItem = createItemMock();
    const gistIdItem = createItemMock();
    patItem.getValue.mockResolvedValue('token');
    gistIdItem.getValue.mockResolvedValue('gist-123');
    defineItemMock.mockImplementationOnce(() => patItem).mockImplementationOnce(() => gistIdItem);

    const { getConfig } = await loadModule();
    const config = await getConfig();

    expect(config).toEqual({
      pat: 'token',
      gistId: 'gist-123',
    });
  });

  it('getConfig returns null when pat or gistId is missing', async () => {
    const patItem = createItemMock();
    const gistIdItem = createItemMock();
    patItem.getValue.mockResolvedValue(null);
    gistIdItem.getValue.mockResolvedValue('gist-123');
    defineItemMock.mockImplementationOnce(() => patItem).mockImplementationOnce(() => gistIdItem);

    const { getConfig } = await loadModule();
    const config = await getConfig();

    expect(config).toBeNull();
  });

  it('getConfig returns null when pat or gistId is an empty string', async () => {
    const patItem = createItemMock();
    const gistIdItem = createItemMock();
    patItem.getValue.mockResolvedValue('token');
    gistIdItem.getValue.mockResolvedValue('');
    defineItemMock.mockImplementationOnce(() => patItem).mockImplementationOnce(() => gistIdItem);

    const { getConfig } = await loadModule();
    const config = await getConfig();

    expect(config).toBeNull();
  });

  it('saveConfig writes pat and gistId', async () => {
    const patItem = createItemMock();
    const gistIdItem = createItemMock();
    defineItemMock.mockImplementationOnce(() => patItem).mockImplementationOnce(() => gistIdItem);

    const { saveConfig } = await loadModule();
    await saveConfig({ pat: 'token', gistId: 'gist-456' });

    expect(patItem.setValue).toHaveBeenCalledWith('token');
    expect(gistIdItem.setValue).toHaveBeenCalledWith('gist-456');
  });

  it('clearConfig removes pat and gistId', async () => {
    const patItem = createItemMock();
    const gistIdItem = createItemMock();
    defineItemMock.mockImplementationOnce(() => patItem).mockImplementationOnce(() => gistIdItem);

    const { clearConfig } = await loadModule();
    await clearConfig();

    expect(patItem.removeValue).toHaveBeenCalledTimes(1);
    expect(gistIdItem.removeValue).toHaveBeenCalledTimes(1);
  });
});
