import { useCallback, useEffect, useState } from 'react';
import { sendMessage } from '@/utils/messaging';

type Status = 'idle' | 'saving' | 'saved' | 'error';

export default function App() {
  const [pat, setPat] = useState('');
  const [showPat, setShowPat] = useState(false);
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await sendMessage('getConfig', undefined);
        if (config?.pat) {
          setPat(config.pat);
        }
      } catch (error) {
        console.error('Failed to load config:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, []);

  const handleSave = useCallback(async () => {
    if (!pat.trim()) {
      setStatus('error');
      setErrorMessage('Please enter a PAT.');
      return;
    }

    setStatus('saving');
    setErrorMessage('');

    try {
      await sendMessage('savePat', { pat: pat.trim() });
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (error) {
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Failed to save PAT.');
    }
  }, [pat]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSave();
      }
    },
    [handleSave],
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">GitHub Issue Notes</h1>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Personal Access Token</h2>

          <p className="text-sm text-gray-600 mb-4">
            Enter your GitHub PAT with the <code className="bg-gray-100 px-1 rounded">gist</code> scope.{' '}
            <a
              href="https://github.com/settings/tokens/new?scopes=gist&description=GitHub%20Issue%20Notes"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              Create a new token
            </a>
          </p>

          <div className="mb-4">
            <label htmlFor="pat" className="block text-sm font-medium text-gray-700 mb-1">
              PAT
            </label>
            <div className="relative">
              <input
                id="pat"
                type={showPat ? 'text' : 'password'}
                value={pat}
                onChange={(e) => setPat(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="ghp_xxxxxxxxxxxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 pr-16"
              />
              <button
                type="button"
                onClick={() => setShowPat(!showPat)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-500 hover:text-gray-700"
              >
                {showPat ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={status === 'saving'}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
            >
              {status === 'saving' ? 'Saving...' : 'Save'}
            </button>

            {status === 'saved' && <span className="text-sm text-green-600">Saved successfully!</span>}

            {status === 'error' && <span className="text-sm text-red-600">{errorMessage}</span>}
          </div>
        </div>

        <p className="mt-6 text-sm text-gray-500 text-center">
          After saving your PAT, click the extension icon to connect your Gist.
        </p>
      </div>
    </div>
  );
}
