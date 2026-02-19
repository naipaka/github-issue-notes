import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Use vi.hoisted to define mocks before vi.mock hoisting
const { sendMessageMock } = vi.hoisted(() => ({
  sendMessageMock: vi.fn(),
}));

vi.mock('@/utils/messaging', () => ({
  sendMessage: sendMessageMock,
}));

// Must import App after mocking
import App from '../entrypoints/popup/App';

describe('Popup App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    sendMessageMock.mockReturnValue(new Promise(() => {}));

    render(<App />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  describe('when PAT is not set', () => {
    it('shows PAT not configured message', async () => {
      sendMessageMock.mockResolvedValueOnce(null);

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/PAT is not configured/)).toBeInTheDocument();
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

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Open Settings')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Open Settings'));

      expect(openOptionsPageMock).toHaveBeenCalled();
    });
  });

  describe('when PAT is set but Gist is not connected', () => {
    it('shows Connect Gist button', async () => {
      sendMessageMock.mockResolvedValueOnce({ pat: 'token' }); // no gistId

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Connect Gist')).toBeInTheDocument();
      });

      expect(screen.queryByText('Connected')).not.toBeInTheDocument();
    });

    it('connects to Gist when clicking Connect Gist button', async () => {
      sendMessageMock
        .mockResolvedValueOnce({ pat: 'token' })
        .mockResolvedValueOnce({
          gistId: 'new-gist-id',
          gistUrl: 'https://gist.github.com/user/new-gist-id',
          reused: false,
        });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Connect Gist')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Connect Gist'));

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      expect(screen.getByText('new-gist-id')).toBeInTheDocument();
      expect(screen.getByText('(new Gist created)')).toBeInTheDocument();
    });

    it('shows reused message when existing Gist is found', async () => {
      sendMessageMock
        .mockResolvedValueOnce({ pat: 'token' })
        .mockResolvedValueOnce({
          gistId: 'existing-gist-id',
          gistUrl: 'https://gist.github.com/user/existing-gist-id',
          reused: true,
        });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Connect Gist')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Connect Gist'));

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      expect(screen.getByText('(existing Gist reused)')).toBeInTheDocument();
    });

    it('shows error message when connection fails', async () => {
      sendMessageMock
        .mockResolvedValueOnce({ pat: 'token' })
        .mockRejectedValueOnce(new Error('Invalid token'));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Connect Gist')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Connect Gist'));

      await waitFor(() => {
        expect(screen.getByText('Invalid token')).toBeInTheDocument();
      });
    });
  });

  describe('when Gist is connected', () => {
    it('shows Connected badge and Gist ID', async () => {
      sendMessageMock.mockResolvedValueOnce({ pat: 'token', gistId: 'gist-123' });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      expect(screen.getByText('gist-123')).toBeInTheDocument();
    });

    it('shows Open Gist link after verification', async () => {
      sendMessageMock
        .mockResolvedValueOnce({ pat: 'token', gistId: 'gist-123' })
        .mockResolvedValueOnce({ connected: true, gistUrl: 'https://gist.github.com/user/gist-123' });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Verify'));

      await waitFor(() => {
        const openGistLink = screen.getByText('Open Gist');
        expect(openGistLink).toBeInTheDocument();
        expect(openGistLink).toHaveAttribute('href', 'https://gist.github.com/user/gist-123');
      });
    });

    it('shows Verify button', async () => {
      sendMessageMock.mockResolvedValueOnce({ pat: 'token', gistId: 'gist-123' });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Verify')).toBeInTheDocument();
      });
    });

    it('verifies connection and updates gistUrl', async () => {
      sendMessageMock
        .mockResolvedValueOnce({ pat: 'token', gistId: 'gist-123' })
        .mockResolvedValueOnce({ connected: true, gistUrl: 'https://gist.github.com/user/gist-123' });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Verify')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Verify'));

      await waitFor(() => {
        expect(screen.getByText('Open Gist')).toBeInTheDocument();
      });

      expect(sendMessageMock).toHaveBeenCalledWith('checkConnection', undefined);
    });

    it('shows error and disconnects when verification fails', async () => {
      sendMessageMock
        .mockResolvedValueOnce({ pat: 'token', gistId: 'gist-123' })
        .mockResolvedValueOnce({ connected: false });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Verify')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Verify'));

      await waitFor(() => {
        expect(screen.getByText('Gist not found. Please reconnect.')).toBeInTheDocument();
      });

      expect(screen.getByText('Connect Gist')).toBeInTheDocument();
    });
  });

  describe('persistence', () => {
    it('restores connected state on re-open', async () => {
      // First open - connected
      sendMessageMock.mockResolvedValueOnce({ pat: 'token', gistId: 'gist-123' });

      const { unmount } = render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
      });

      unmount();

      // Second open - still connected (from storage)
      sendMessageMock.mockResolvedValueOnce({ pat: 'token', gistId: 'gist-123' });

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Connected')).toBeInTheDocument();
        expect(screen.getByText('gist-123')).toBeInTheDocument();
      });
    });
  });
});
