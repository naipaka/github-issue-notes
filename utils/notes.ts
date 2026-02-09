import { getGist, updateGist } from './gist';

export const DEFAULT_FILENAME = 'github-issue-notes.json';

export type Note = {
  content: string;
  updatedAt: string;
};

export type NotesData = Record<string, Note>;

const parseNotesContent = (content: string): NotesData => {
  try {
    const parsed = JSON.parse(content) as unknown;
    if (parsed == null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {};
    }
    return parsed as NotesData;
  } catch {
    return {};
  }
};

const getNotesContentFromGist = async (pat: string, gistId: string): Promise<NotesData> => {
  const gist = await getGist(pat, gistId);
  const content = gist.files[DEFAULT_FILENAME]?.content ?? '{}';
  return parseNotesContent(content);
};

export const getAllNotes = async (pat: string, gistId: string): Promise<NotesData> => {
  return getNotesContentFromGist(pat, gistId);
};

export const getNote = async (pat: string, gistId: string, key: string): Promise<Note | null> => {
  const notes = await getNotesContentFromGist(pat, gistId);
  return notes[key] ?? null;
};

export const saveNote = async (
  pat: string,
  gistId: string,
  key: string,
  content: string,
): Promise<void> => {
  const notes = await getNotesContentFromGist(pat, gistId);
  notes[key] = {
    content,
    updatedAt: new Date().toISOString(),
  };
  await updateGist(pat, gistId, DEFAULT_FILENAME, JSON.stringify(notes));
};

export const deleteNote = async (pat: string, gistId: string, key: string): Promise<void> => {
  const notes = await getNotesContentFromGist(pat, gistId);
  delete notes[key];
  await updateGist(pat, gistId, DEFAULT_FILENAME, JSON.stringify(notes));
};
