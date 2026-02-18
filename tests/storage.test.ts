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
};

const createItemMock = (): StorageItemMock => ({
  getValue: vi.fn(),
  setValue: vi.fn().mockResolvedValue(undefined),
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

  it('getConfig returns config when both pat and gistId are present', async () => {
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

  it('getConfig returns config with gistId undefined when only pat is present', async () => {
    const patItem = createItemMock();
    const gistIdItem = createItemMock();
    patItem.getValue.mockResolvedValue('token');
    gistIdItem.getValue.mockResolvedValue(null);
    defineItemMock.mockImplementationOnce(() => patItem).mockImplementationOnce(() => gistIdItem);

    const { getConfig } = await loadModule();
    const config = await getConfig();

    expect(config).toEqual({
      pat: 'token',
      gistId: undefined,
    });
  });

  it('getConfig returns null when pat is missing', async () => {
    const patItem = createItemMock();
    const gistIdItem = createItemMock();
    patItem.getValue.mockResolvedValue(null);
    gistIdItem.getValue.mockResolvedValue('gist-123');
    defineItemMock.mockImplementationOnce(() => patItem).mockImplementationOnce(() => gistIdItem);

    const { getConfig } = await loadModule();
    const config = await getConfig();

    expect(config).toBeNull();
  });

  it('getConfig returns null when pat is an empty string', async () => {
    const patItem = createItemMock();
    const gistIdItem = createItemMock();
    patItem.getValue.mockResolvedValue('');
    gistIdItem.getValue.mockResolvedValue('gist-123');
    defineItemMock.mockImplementationOnce(() => patItem).mockImplementationOnce(() => gistIdItem);

    const { getConfig } = await loadModule();
    const config = await getConfig();

    expect(config).toBeNull();
  });

  it('savePat writes only pat and preserves existing gistId', async () => {
    const patItem = createItemMock();
    const gistIdItem = createItemMock();
    defineItemMock.mockImplementationOnce(() => patItem).mockImplementationOnce(() => gistIdItem);

    const { savePat } = await loadModule();
    await savePat({ pat: 'new-token' });

    expect(patItem.setValue).toHaveBeenCalledWith('new-token');
    expect(gistIdItem.setValue).not.toHaveBeenCalled();
  });

  it('saveGistId writes only gistId and preserves existing pat', async () => {
    const patItem = createItemMock();
    const gistIdItem = createItemMock();
    defineItemMock.mockImplementationOnce(() => patItem).mockImplementationOnce(() => gistIdItem);

    const { saveGistId } = await loadModule();
    await saveGistId({ gistId: 'new-gist-id' });

    expect(gistIdItem.setValue).toHaveBeenCalledWith('new-gist-id');
    expect(patItem.setValue).not.toHaveBeenCalled();
  });
});
