import { afterEach, describe, expect, it, vi } from 'vitest';

import { createGist, findOrCreateGist, getGist, updateGist } from '../utils/gist';

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
          html_url: 'https://gist.github.com/user/gist-123',
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
        html_url: 'https://gist.github.com/user/gist-456',
        files: {
          'a.json': { content: '{"a":1}' },
          'b.json': {},
        },
      }),
    );

    const result = await getGist('token', 'gist-456');

    expect(result).toEqual({
      id: 'gist-456',
      html_url: 'https://gist.github.com/user/gist-456',
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
      .mockResolvedValueOnce(
        jsonResponse({ id: 'gist-retry', html_url: 'https://gist.github.com/user/gist-retry', files: {} }),
      );

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

describe('findOrCreateGist', () => {
  const jsonResponseWithHeaders = (body: unknown, headers: Record<string, string>, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    });

  it('reuses existing gist when file is found (reused: true)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponseWithHeaders(
        [
          {
            id: 'existing-gist-id',
            html_url: 'https://gist.github.com/user/existing-gist-id',
            files: {
              'github-issue-notes.json': {},
            },
          },
        ],
        {},
      ),
    );

    const result = await findOrCreateGist('token');

    expect(result).toEqual({
      gistId: 'existing-gist-id',
      gistUrl: 'https://gist.github.com/user/existing-gist-id',
      reused: true,
    });
  });

  it('creates new private gist when file is not found (reused: false)', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponseWithHeaders(
          [
            {
              id: 'other-gist',
              html_url: 'https://gist.github.com/user/other-gist',
              files: { 'other-file.txt': {} },
            },
          ],
          {},
        ),
      )
      .mockResolvedValueOnce(
        jsonResponseWithHeaders(
          {
            id: 'new-gist-id',
            html_url: 'https://gist.github.com/user/new-gist-id',
            files: { 'github-issue-notes.json': { content: '{}' } },
          },
          {},
          201,
        ),
      );

    const result = await findOrCreateGist('token');

    expect(result).toEqual({
      gistId: 'new-gist-id',
      gistUrl: 'https://gist.github.com/user/new-gist-id',
      reused: false,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, createInit] = fetchMock.mock.calls[1];
    expect(createInit?.method).toBe('POST');
    expect(JSON.parse(createInit?.body as string)).toMatchObject({
      public: false,
    });
  });

  it('follows Link header pagination to find existing gist', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        jsonResponseWithHeaders(
          [{ id: 'page1-gist', html_url: 'https://gist.github.com/user/page1-gist', files: { 'other.txt': {} } }],
          { Link: '<https://api.github.com/gists?page=2&per_page=100>; rel="next"' },
        ),
      )
      .mockResolvedValueOnce(
        jsonResponseWithHeaders(
          [
            {
              id: 'page2-gist',
              html_url: 'https://gist.github.com/user/page2-gist',
              files: { 'github-issue-notes.json': {} },
            },
          ],
          {},
        ),
      );

    const result = await findOrCreateGist('token');

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.github.com/gists?per_page=100');
    expect(fetchMock.mock.calls[1][0]).toBe('https://api.github.com/gists?page=2&per_page=100');
    expect(result).toEqual({
      gistId: 'page2-gist',
      gistUrl: 'https://gist.github.com/user/page2-gist',
      reused: true,
    });
  });

  it('throws 401 error for invalid token during list', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponseWithHeaders({}, {}, 401),
    );

    await expect(findOrCreateGist('bad-token')).rejects.toMatchObject({
      status: 401,
      message: 'Invalid or expired token',
    });
  });

  it('throws network error when fetch fails persistently', async () => {
    vi.spyOn(globalThis, 'setTimeout').mockImplementation(((fn: TimerHandler) => {
      if (typeof fn === 'function') {
        fn();
      }
      return 0 as unknown as ReturnType<typeof setTimeout>;
    }) as unknown as typeof setTimeout);

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));

    await expect(findOrCreateGist('token')).rejects.toMatchObject({
      status: 0,
      message: 'Network error. Please check your connection.',
    });
  });

  it('uses custom filename when provided', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponseWithHeaders(
        [
          {
            id: 'custom-gist',
            html_url: 'https://gist.github.com/user/custom-gist',
            files: { 'custom-notes.json': {} },
          },
        ],
        {},
      ),
    );

    const result = await findOrCreateGist('token', 'custom-notes.json');

    expect(result).toEqual({
      gistId: 'custom-gist',
      gistUrl: 'https://gist.github.com/user/custom-gist',
      reused: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
