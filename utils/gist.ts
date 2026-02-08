const GITHUB_GISTS_API = 'https://api.github.com/gists';
const DEFAULT_FILENAME = 'github-issue-notes.json';
const RETRY_MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 500;

type GistFile = {
  content: string;
};

export type GistResponse = {
  id: string;
  files: Record<string, GistFile>;
};

export type GistError = {
  status: number;
  message: string;
};

const buildHeaders = (pat: string): HeadersInit => ({
  Authorization: `Bearer ${pat}`,
  Accept: 'application/vnd.github+json',
  'Content-Type': 'application/json',
});

const sleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

const isNetworkError = (error: unknown) =>
  error instanceof TypeError || error instanceof DOMException;

const createGistError = (status: number, message: string): GistError => ({
  status,
  message,
});

const parseErrorMessage = async (response: Response): Promise<string> => {
  try {
    const data = (await response.json()) as { message?: string };
    return data.message ?? 'Failed to call GitHub Gist API';
  } catch {
    return 'Failed to call GitHub Gist API';
  }
};

const throwHttpError = async (response: Response): Promise<never> => {
  if (response.status === 401) {
    throw createGistError(401, 'Invalid or expired token');
  }

  if (response.status === 404) {
    throw createGistError(404, 'Gist not found');
  }

  const message = await parseErrorMessage(response);
  throw createGistError(response.status, message);
};

const fetchWithRetry = async (url: string, init: RequestInit): Promise<Response> => {
  for (let attempt = 0; attempt < RETRY_MAX_ATTEMPTS; attempt += 1) {
    try {
      return await fetch(url, init);
    } catch (error) {
      if (!isNetworkError(error) || attempt === RETRY_MAX_ATTEMPTS - 1) {
        throw createGistError(0, 'Network error. Please check your connection.');
      }

      const delay = RETRY_BASE_DELAY_MS * 2 ** attempt;
      await sleep(delay);
    }
  }

  throw createGistError(0, 'Network error. Please check your connection.');
};

const parseGistResponse = async (response: Response): Promise<GistResponse> => {
  const data = (await response.json()) as {
    id: string;
    files?: Record<string, { content?: string }>;
  };
  const files: Record<string, GistFile> = {};

  for (const [filename, file] of Object.entries(data.files ?? {})) {
    files[filename] = {
      content: file.content ?? '',
    };
  }

  return {
    id: data.id,
    files,
  };
};

export const createGist = async (pat: string, filename = DEFAULT_FILENAME): Promise<string> => {
  const response = await fetchWithRetry(GITHUB_GISTS_API, {
    method: 'POST',
    headers: buildHeaders(pat),
    body: JSON.stringify({
      public: false,
      files: {
        [filename]: {
          content: '{}',
        },
      },
    }),
  });

  if (!response.ok) {
    await throwHttpError(response);
  }

  const gist = await parseGistResponse(response);
  return gist.id;
};

export const getGist = async (pat: string, gistId: string): Promise<GistResponse> => {
  const response = await fetchWithRetry(`${GITHUB_GISTS_API}/${gistId}`, {
    method: 'GET',
    headers: buildHeaders(pat),
  });

  if (!response.ok) {
    await throwHttpError(response);
  }

  return parseGistResponse(response);
};

export const updateGist = async (
  pat: string,
  gistId: string,
  filename: string,
  content: string,
): Promise<void> => {
  const response = await fetchWithRetry(`${GITHUB_GISTS_API}/${gistId}`, {
    method: 'PATCH',
    headers: buildHeaders(pat),
    body: JSON.stringify({
      files: {
        [filename]: {
          content,
        },
      },
    }),
  });

  if (!response.ok) {
    await throwHttpError(response);
  }
};
