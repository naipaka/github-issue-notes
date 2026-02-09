import { afterEach, describe, expect, it, vi } from 'vitest';

const { getGistMock, updateGistMock } = vi.hoisted(() => ({
  getGistMock: vi.fn(),
  updateGistMock: vi.fn(),
}));

vi.mock('../utils/gist', () => ({
  getGist: getGistMock,
  updateGist: updateGistMock,
}));

import { DEFAULT_FILENAME, deleteNote, getAllNotes, getNote, saveNote } from '../utils/notes';

afterEach(() => {
  vi.clearAllMocks();
  vi.useRealTimers();
});

describe('utils/notes', () => {
  it('getAllNotes returns parsed notes data', async () => {
    getGistMock.mockResolvedValue({
      id: 'gist-1',
      files: {
        [DEFAULT_FILENAME]: {
          content:
            '{"owner/repo#1":{"content":"hello","updatedAt":"2026-02-04T12:00:00.000Z"}}',
        },
      },
    });

    const result = await getAllNotes('token', 'gist-1');

    expect(result).toEqual({
      'owner/repo#1': {
        content: 'hello',
        updatedAt: '2026-02-04T12:00:00.000Z',
      },
    });
  });

  it('getAllNotes returns empty object when default file is missing', async () => {
    getGistMock.mockResolvedValue({
      id: 'gist-1',
      files: {},
    });

    const result = await getAllNotes('token', 'gist-1');

    expect(result).toEqual({});
  });

  it('getAllNotes returns empty object when file content is invalid json', async () => {
    getGistMock.mockResolvedValue({
      id: 'gist-1',
      files: {
        [DEFAULT_FILENAME]: {
          content: '{invalid-json',
        },
      },
    });

    const result = await getAllNotes('token', 'gist-1');

    expect(result).toEqual({});
  });

  it('getNote returns note for existing key and null for missing key', async () => {
    getGistMock.mockResolvedValue({
      id: 'gist-1',
      files: {
        [DEFAULT_FILENAME]: {
          content:
            '{"owner/repo#1":{"content":"hello","updatedAt":"2026-02-04T12:00:00.000Z"}}',
        },
      },
    });

    const existing = await getNote('token', 'gist-1', 'owner/repo#1');
    const missing = await getNote('token', 'gist-1', 'owner/repo#2');

    expect(existing).toEqual({
      content: 'hello',
      updatedAt: '2026-02-04T12:00:00.000Z',
    });
    expect(missing).toBeNull();
  });

  it('saveNote merges new note with existing notes and updates gist', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-04T13:00:00.000Z'));
    getGistMock.mockResolvedValue({
      id: 'gist-1',
      files: {
        [DEFAULT_FILENAME]: {
          content:
            '{"owner/repo#1":{"content":"old","updatedAt":"2026-02-04T12:00:00.000Z"}}',
        },
      },
    });
    updateGistMock.mockResolvedValue(undefined);

    await saveNote('token', 'gist-1', 'owner/repo#2', 'new note');

    expect(updateGistMock).toHaveBeenCalledTimes(1);
    const [pat, gistId, filename, content] = updateGistMock.mock.calls[0];
    expect(pat).toBe('token');
    expect(gistId).toBe('gist-1');
    expect(filename).toBe(DEFAULT_FILENAME);
    expect(JSON.parse(content as string)).toEqual({
      'owner/repo#1': {
        content: 'old',
        updatedAt: '2026-02-04T12:00:00.000Z',
      },
      'owner/repo#2': {
        content: 'new note',
        updatedAt: '2026-02-04T13:00:00.000Z',
      },
    });
  });

  it('deleteNote removes only target key and preserves other notes', async () => {
    getGistMock.mockResolvedValue({
      id: 'gist-1',
      files: {
        [DEFAULT_FILENAME]: {
          content:
            '{"owner/repo#1":{"content":"a","updatedAt":"2026-02-04T12:00:00.000Z"},"owner/repo#2":{"content":"b","updatedAt":"2026-02-04T12:10:00.000Z"}}',
        },
      },
    });
    updateGistMock.mockResolvedValue(undefined);

    await deleteNote('token', 'gist-1', 'owner/repo#1');

    expect(updateGistMock).toHaveBeenCalledTimes(1);
    const [, , , content] = updateGistMock.mock.calls[0];
    expect(JSON.parse(content as string)).toEqual({
      'owner/repo#2': {
        content: 'b',
        updatedAt: '2026-02-04T12:10:00.000Z',
      },
    });
  });
});
