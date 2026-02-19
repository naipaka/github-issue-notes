import { useState, useEffect, useRef, useCallback } from 'react';
import { sendMessage } from '@/utils/messaging';

interface NoteAreaProps {
  noteKey: string; // "{owner}/{repo}#{number}" format
}

type Status = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

export default function NoteArea({ noteKey }: NoteAreaProps) {
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<Status>('loading');
  const [error, setError] = useState<string | null>(null);
  const [hasPat, setHasPat] = useState(false);
  const [hasGist, setHasGist] = useState(false);

  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContentRef = useRef<string>('');

  // Save handler
  const performSave = useCallback(
    async (contentToSave: string) => {
      // Skip if content hasn't changed
      if (contentToSave === lastSavedContentRef.current) {
        return;
      }

      setStatus('saving');
      setError(null);

      try {
        await sendMessage('saveNote', { key: noteKey, content: contentToSave });
        lastSavedContentRef.current = contentToSave;
        setStatus('saved');

        // Return to idle after 3 seconds
        if (savedTimeoutRef.current) {
          clearTimeout(savedTimeoutRef.current);
        }
        savedTimeoutRef.current = setTimeout(() => {
          setStatus('idle');
        }, 3000);
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Failed to save note');
      }
    },
    [noteKey]
  );

  // Debounced save
  const debouncedSave = useCallback(
    (contentToSave: string) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      debounceTimeoutRef.current = setTimeout(() => {
        performSave(contentToSave);
      }, 1000);
    },
    [performSave]
  );

  // Immediate save (on blur)
  const immediateSave = useCallback(
    (contentToSave: string) => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      performSave(contentToSave);
    },
    [performSave]
  );

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      setStatus('loading');
      try {
        const config = await sendMessage('getConfig', undefined);

        if (!config || !config.pat) {
          setHasPat(false);
          setHasGist(false);
          setStatus('idle');
          return;
        }

        setHasPat(true);

        if (!config.gistId) {
          setHasGist(false);
          setStatus('idle');
          return;
        }

        setHasGist(true);

        // Load note
        const note = await sendMessage('getNote', noteKey);
        if (note) {
          setContent(note.content);
          lastSavedContentRef.current = note.content;
        }
        setStatus('idle');
      } catch (err) {
        setStatus('error');
        setError(err instanceof Error ? err.message : 'Failed to load note');
      }
    };

    initialize();

    // Cleanup
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
    };
  }, [noteKey]);

  // Input handler
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    debouncedSave(newContent);
  };

  // Blur handler
  const handleBlur = () => {
    immediateSave(content);
  };

  // Open options page
  const openOptionsPage = () => {
    browser.runtime.openOptionsPage();
  };

  // Get status text
  const getStatusText = () => {
    switch (status) {
      case 'saving':
        return 'Saving...';
      case 'saved':
        return 'Saved';
      case 'error':
        return error || 'Error';
      default:
        return '';
    }
  };

  // Get status color
  const getStatusColor = () => {
    switch (status) {
      case 'saving':
        return 'text-gray-500';
      case 'saved':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return '';
    }
  };

  // Loading state
  if (status === 'loading') {
    return (
      <div className="p-4 border rounded bg-white">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // Not configured state
  if (!hasPat || !hasGist) {
    return (
      <div className="p-4 border rounded bg-white">
        <p className="text-gray-700 mb-2">GitHub Issue Notes is not configured.</p>
        {!hasPat && (
          <button
            onClick={openOptionsPage}
            className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Open Settings
          </button>
        )}
        {/* No additional prompt when PAT is set but Gist is not connected */}
      </div>
    );
  }

  // Configured state
  return (
    <div className="p-4 border rounded bg-white">
      <div className="flex justify-between items-center mb-2">
        <label className="font-semibold text-gray-800">Personal Notes</label>
        <span className={`text-sm ${getStatusColor()}`}>{getStatusText()}</span>
      </div>
      <textarea
        value={content}
        onChange={handleChange}
        onBlur={handleBlur}
        placeholder="Add your private notes here..."
        className="w-full min-h-25 p-2 border rounded resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />
    </div>
  );
}
