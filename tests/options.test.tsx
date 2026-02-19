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
import App from '../entrypoints/options/App';

describe('Options App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    sendMessageMock.mockReturnValue(new Promise(() => {})); // Never resolves

    render(<App />);

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('loads and displays existing PAT', async () => {
    sendMessageMock.mockResolvedValueOnce({ hasPat: true, pat: 'ghp_existing_token', gistId: 'gist-123' });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    const input = screen.getByLabelText('PAT') as HTMLInputElement;
    expect(input.value).toBe('ghp_existing_token');
    expect(input.type).toBe('password');
  });

  it('toggles PAT visibility when clicking Show/Hide button', async () => {
    sendMessageMock.mockResolvedValueOnce({ hasPat: true, pat: 'ghp_token' });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    const input = screen.getByLabelText('PAT') as HTMLInputElement;
    const toggleButton = screen.getByText('Show');

    expect(input.type).toBe('password');

    fireEvent.click(toggleButton);
    expect(input.type).toBe('text');
    expect(screen.getByText('Hide')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Hide'));
    expect(input.type).toBe('password');
  });

  it('saves PAT and shows success message', async () => {
    sendMessageMock
      .mockResolvedValueOnce({ hasPat: false }) // getConfig returns no PAT
      .mockResolvedValueOnce(undefined); // savePat succeeds

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    const input = screen.getByLabelText('PAT');
    const saveButton = screen.getByText('Save');

    fireEvent.change(input, { target: { value: 'ghp_new_token' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Saved successfully!')).toBeInTheDocument();
    });

    expect(sendMessageMock).toHaveBeenCalledWith('savePat', { pat: 'ghp_new_token' });
  });

  it('shows error message when PAT is empty', async () => {
    sendMessageMock.mockResolvedValueOnce({ hasPat: false });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    const saveButton = screen.getByText('Save');
    fireEvent.click(saveButton);

    expect(screen.getByText('Please enter a PAT.')).toBeInTheDocument();
  });

  it('shows error message when save fails', async () => {
    sendMessageMock
      .mockResolvedValueOnce({ hasPat: false })
      .mockRejectedValueOnce(new Error('Network error'));

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    const input = screen.getByLabelText('PAT');
    const saveButton = screen.getByText('Save');

    fireEvent.change(input, { target: { value: 'ghp_token' } });
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('preserves PAT after page reload (persistence simulation)', async () => {
    // First load - save PAT
    sendMessageMock
      .mockResolvedValueOnce({ hasPat: false })
      .mockResolvedValueOnce(undefined);

    const { unmount } = render(<App />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    const input = screen.getByLabelText('PAT');
    fireEvent.change(input, { target: { value: 'ghp_persistent_token' } });
    fireEvent.click(screen.getByText('Save'));

    await waitFor(() => {
      expect(screen.getByText('Saved successfully!')).toBeInTheDocument();
    });

    unmount();

    // Second load - PAT should be restored
    sendMessageMock.mockResolvedValueOnce({ hasPat: true, pat: 'ghp_persistent_token' });

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    const restoredInput = screen.getByLabelText('PAT') as HTMLInputElement;
    expect(restoredInput.value).toBe('ghp_persistent_token');
  });
});
