import { afterEach, describe, expect, it, vi } from 'vitest';

import { createGist, getGist, updateGist } from '../utils/gist';

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('utils/gist', () => {
  it('createGist: creates a private gist with default filename and returns id', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse(
        {
          id: 'gist-123',
          files: {
            'github-issue-notes.json': { content: '{}' },
          },
        },
        201,
      ),
    );

    const id = await createGist('token');

    expect(id).toBe('gist-123');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.github.com/gists');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toMatchObject({
      Authorization: 'Bearer token',
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    });
    expect(JSON.parse(init?.body as string)).toEqual({
      public: false,
      files: {
        'github-issue-notes.json': {
          content: '{}',
        },
      },
    });
  });

  it('getGist: maps API response into GistResponse shape', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({
        id: 'gist-456',
        files: {
          'a.json': { content: '{"a":1}' },
          'b.json': {},
        },
      }),
    );

    const result = await getGist('token', 'gist-456');

    expect(result).toEqual({
      id: 'gist-456',
      files: {
        'a.json': { content: '{"a":1}' },
        'b.json': { content: '' },
      },
    });
  });

  it('updateGist: updates target file via PATCH', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}));

    await updateGist('token', 'gist-789', 'notes.json', '{"k":"v"}');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://api.github.com/gists/gist-789');
    expect(init?.method).toBe('PATCH');
    expect(JSON.parse(init?.body as string)).toEqual({
      files: {
        'notes.json': {
          content: '{"k":"v"}',
        },
      },
    });
  });

  it('401: returns Invalid or expired token', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}, 401));

    await expect(getGist('bad-token', 'gist-401')).rejects.toMatchObject({
      status: 401,
      message: 'Invalid or expired token',
    });
  });

  it('404: returns Gist not found', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}, 404));

    await expect(getGist('token', 'missing-gist')).rejects.toMatchObject({
      status: 404,
      message: 'Gist not found',
    });
  });

  it('retries up to 3 times on network errors', async () => {
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: TimerHandler) => {
      if (typeof fn === 'function') {
        fn();
      }
      return 0 as unknown as ReturnType<typeof setTimeout>;
    }) as unknown as typeof setTimeout);

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(jsonResponse({ id: 'gist-retry', files: {} }));

    const result = await getGist('token', 'gist-retry');

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(result.id).toBe('gist-retry');
  });

  it('fails with expected message when network errors persist', async () => {
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: TimerHandler) => {
      if (typeof fn === 'function') {
        fn();
      }
      return 0 as unknown as ReturnType<typeof setTimeout>;
    }) as unknown as typeof setTimeout);

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(createGist('token')).rejects.toMatchObject({
      status: 0,
      message: 'Network error. Please check your connection.',
    });
  });
});
