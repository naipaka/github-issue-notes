import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi, afterEach } from 'vitest';

// Use vi.hoisted to define mocks before vi.mock hoisting
const { sendMessageMock } = vi.hoisted(() => ({
  sendMessageMock: vi.fn(),
}));

vi.mock('@/utils/messaging', () => ({
  sendMessage: sendMessageMock,
}));

// Must import NoteArea after mocking
import NoteArea from '../components/NoteArea';

describe('NoteArea', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('browser', {
      runtime: {
        openOptionsPage: vi.fn(),
      },
    });
  });

  describe('loading state', () => {
    it('shows loading state initially', () => {
      sendMessageMock.mockReturnValue(new Promise(() => {}));

      render(<NoteArea noteKey="owner/repo#1" />);

      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('when PAT is not set', () => {
    it('shows Open Settings button', async () => {
      sendMessageMock.mockResolvedValueOnce(null);

      render(<NoteArea noteKey="owner/repo#1" />);

      await waitFor(() => {
        expect(screen.getByText('GitHub Issue Notes is not configured.')).toBeInTheDocument();
      });

      expect(screen.getByText('Open Settings')).toBeInTheDocument();
    });

    it('opens options page when clicking Open Settings', async () => {
      const openOptionsPageMock = vi.fn();
      vi.stubGlobal('browser', {
        runtime: {
          openOptionsPage: openOptionsPageMock,
        },
      });

      sendMessageMock.mockResolvedValueOnce(null);

      render(<NoteArea noteKey="owner/repo#1" />);

      await waitFor(() => {
        expect(screen.getByText('Open Settings')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Open Settings'));

      expect(openOptionsPageMock).toHaveBeenCalled();
    });
  });

  describe('when PAT is set but Gist is not connected', () => {
    it('shows not configured message without Open Settings button', async () => {
      sendMessageMock.mockResolvedValueOnce({ pat: 'token' }); // no gistId

      render(<NoteArea noteKey="owner/repo#1" />);

      await waitFor(() => {
        expect(screen.getByText('GitHub Issue Notes is not configured.')).toBeInTheDocument();
      });

      // PAT is set, so Open Settings button should not be displayed
      expect(screen.queryByText('Open Settings')).not.toBeInTheDocument();
    });
  });

  describe('when fully configured', () => {
    it('shows textarea with loaded note content', async () => {
      sendMessageMock
        .mockResolvedValueOnce({ pat: 'token', gistId: 'gist-123' })
        .mockResolvedValueOnce({ content: 'Existing note', updatedAt: '2026-02-04T12:00:00Z' });

      render(<NoteArea noteKey="owner/repo#1" />);

      await waitFor(() => {
        expect(screen.getByText('Personal Notes')).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText('Add your private notes here...') as HTMLTextAreaElement;
      expect(textarea.value).toBe('Existing note');
    });

    it('shows empty textarea when no note exists', async () => {
      sendMessageMock
        .mockResolvedValueOnce({ pat: 'token', gistId: 'gist-123' })
        .mockResolvedValueOnce(null);

      render(<NoteArea noteKey="owner/repo#1" />);

      await waitFor(() => {
        expect(screen.getByText('Personal Notes')).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText('Add your private notes here...') as HTMLTextAreaElement;
      expect(textarea.value).toBe('');
    });
  });

  describe('saving behavior with fake timers', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('debounces save on input', async () => {
      sendMessageMock
        .mockResolvedValueOnce({ pat: 'token', gistId: 'gist-123' })
        .mockResolvedValueOnce(null) // getNote returns null
        .mockResolvedValue(undefined); // saveNote succeeds

      render(<NoteArea noteKey="owner/repo#1" />);

      // Wait for initialization
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      const textarea = screen.getByPlaceholderText('Add your private notes here...');

      // Input
      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'New note' } });
      });

      // saveNote should not be called before 1 second
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });
      expect(sendMessageMock).not.toHaveBeenCalledWith('saveNote', expect.anything());

      // saveNote should be called after 1 second
      await act(async () => {
        await vi.advanceTimersByTimeAsync(500);
      });

      expect(sendMessageMock).toHaveBeenCalledWith('saveNote', {
        key: 'owner/repo#1',
        content: 'New note',
      });
    });

    it('saves immediately on blur', async () => {
      sendMessageMock
        .mockResolvedValueOnce({ pat: 'token', gistId: 'gist-123' })
        .mockResolvedValueOnce(null)
        .mockResolvedValue(undefined);

      render(<NoteArea noteKey="owner/repo#1" />);

      // Wait for initialization
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      const textarea = screen.getByPlaceholderText('Add your private notes here...');

      // Input
      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'Blur test' } });
      });

      // Should not be saved before blur
      expect(sendMessageMock).not.toHaveBeenCalledWith('saveNote', expect.anything());

      // Save immediately on blur
      await act(async () => {
        fireEvent.blur(textarea);
        await vi.runAllTimersAsync();
      });

      expect(sendMessageMock).toHaveBeenCalledWith('saveNote', {
        key: 'owner/repo#1',
        content: 'Blur test',
      });
    });

    it('shows error message on save failure', async () => {
      sendMessageMock
        .mockResolvedValueOnce({ pat: 'token', gistId: 'gist-123' })
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error('Network error'));

      render(<NoteArea noteKey="owner/repo#1" />);

      // Wait for initialization
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      const textarea = screen.getByPlaceholderText('Add your private notes here...');

      await act(async () => {
        fireEvent.change(textarea, { target: { value: 'Error test' } });
        fireEvent.blur(textarea);
        await vi.runAllTimersAsync();
      });

      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('does not save if content has not changed', async () => {
      sendMessageMock
        .mockResolvedValueOnce({ pat: 'token', gistId: 'gist-123' })
        .mockResolvedValueOnce({ content: 'Original content', updatedAt: '2026-02-04T12:00:00Z' })
        .mockResolvedValue(undefined);

      render(<NoteArea noteKey="owner/repo#1" />);

      // Wait for initialization
      await act(async () => {
        await vi.runAllTimersAsync();
      });

      const textarea = screen.getByPlaceholderText('Add your private notes here...');

      // saveNote should not be called on blur if content hasn't changed
      await act(async () => {
        fireEvent.blur(textarea);
        await vi.runAllTimersAsync();
      });

      // Only getConfig and getNote should be called, not saveNote
      expect(sendMessageMock).toHaveBeenCalledTimes(2);
      expect(sendMessageMock).not.toHaveBeenCalledWith('saveNote', expect.anything());
    });
  });

  describe('saving status (real timers)', () => {
    it('shows Saved status after successful save', async () => {
      sendMessageMock
        .mockResolvedValueOnce({ pat: 'token', gistId: 'gist-123' })
        .mockResolvedValueOnce(null)
        .mockResolvedValue(undefined);

      render(<NoteArea noteKey="owner/repo#1" />);

      await waitFor(() => {
        expect(screen.getByText('Personal Notes')).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText('Add your private notes here...');

      fireEvent.change(textarea, { target: { value: 'Save test' } });
      fireEvent.blur(textarea);

      await waitFor(() => {
        expect(screen.getByText('Saved')).toBeInTheDocument();
      });
    });

    it('shows Saving... during save operation', async () => {
      let resolveSave: () => void;
      const savePromise = new Promise<void>((resolve) => {
        resolveSave = resolve;
      });

      sendMessageMock
        .mockResolvedValueOnce({ pat: 'token', gistId: 'gist-123' })
        .mockResolvedValueOnce(null)
        .mockImplementationOnce(() => savePromise);

      render(<NoteArea noteKey="owner/repo#1" />);

      await waitFor(() => {
        expect(screen.getByText('Personal Notes')).toBeInTheDocument();
      });

      const textarea = screen.getByPlaceholderText('Add your private notes here...');

      fireEvent.change(textarea, { target: { value: 'Saving test' } });
      fireEvent.blur(textarea);

      await waitFor(() => {
        expect(screen.getByText('Saving...')).toBeInTheDocument();
      });

      // Resolve the save promise
      await act(async () => {
        resolveSave!();
      });

      await waitFor(() => {
        expect(screen.getByText('Saved')).toBeInTheDocument();
      });
    });
  });

  describe('error handling', () => {
    it('shows error when note loading fails', async () => {
      sendMessageMock
        .mockResolvedValueOnce({ pat: 'token', gistId: 'gist-123' })
        .mockRejectedValueOnce(new Error('Failed to fetch note'));

      render(<NoteArea noteKey="owner/repo#1" />);

      await waitFor(() => {
        expect(screen.getByText('Failed to fetch note')).toBeInTheDocument();
      });
    });
  });
});
