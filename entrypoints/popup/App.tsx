import { useCallback, useEffect, useState } from 'react';
import { sendMessage } from '@/utils/messaging';

type ConnectionState = 'loading' | 'no-pat' | 'not-connected' | 'connected' | 'connecting' | 'verifying';

export default function App() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('loading');
  const [gistId, setGistId] = useState<string | null>(null);
  const [gistUrl, setGistUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reused, setReused] = useState<boolean | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const config = await sendMessage('getConfig', undefined);
        if (!config.hasPat) {
          setConnectionState('no-pat');
          return;
        }

        if (config.gistId) {
          setGistId(config.gistId);
          setConnectionState('connected');
        } else {
          setConnectionState('not-connected');
        }
      } catch (err) {
        console.error('Failed to load config:', err);
        setConnectionState('not-connected');
      }
    };

    loadConfig();
  }, []);

  const handleConnect = useCallback(async () => {
    setConnectionState('connecting');
    setError(null);
    setReused(null);

    try {
      const result = await sendMessage('connectGist', undefined);
      setGistId(result.gistId);
      setGistUrl(result.gistUrl);
      setReused(result.reused);
      setConnectionState('connected');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect Gist.');
      setConnectionState('not-connected');
    }
  }, []);

  const handleVerify = useCallback(async () => {
    setConnectionState('verifying');
    setError(null);

    try {
      const result = await sendMessage('checkConnection', undefined);
      if (result.connected) {
        if (result.gistUrl) {
          setGistUrl(result.gistUrl);
        }
        setConnectionState('connected');
      } else {
        setGistId(null);
        setGistUrl(null);
        setConnectionState('not-connected');
        setError('Gist not found. Please reconnect.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to verify connection.');
      setConnectionState('connected');
    }
  }, []);

  const openOptionsPage = useCallback(() => {
    browser.runtime.openOptionsPage();
  }, []);

  if (connectionState === 'loading') {
    return (
      <div className="w-72 p-4">
        <p className="text-gray-500 text-center">Loading...</p>
      </div>
    );
  }

  if (connectionState === 'no-pat') {
    return (
      <div className="w-72 p-4">
        <h1 className="text-lg font-bold text-gray-900 mb-3">GitHub Issue Notes</h1>
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-3">
          <p className="text-sm text-yellow-800">
            PAT is not configured. Please set up your Personal Access Token first.
          </p>
        </div>
        <button
          onClick={openOptionsPage}
          className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Open Settings
        </button>
      </div>
    );
  }

  return (
    <div className="w-72 p-4">
      <h1 className="text-lg font-bold text-gray-900 mb-3">GitHub Issue Notes</h1>

      {(connectionState === 'connected' || connectionState === 'verifying') && (
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
              Connected
            </span>
            {reused === true && (
              <span className="text-xs text-gray-500">(existing Gist reused)</span>
            )}
            {reused === false && (
              <span className="text-xs text-gray-500">(new Gist created)</span>
            )}
          </div>

          <div className="bg-gray-50 rounded-md p-3 text-sm">
            <div className="flex items-center gap-2 mb-2 whitespace-nowrap">
              <span className="text-gray-600">Gist ID:</span>
              <code className="text-xs bg-gray-200 px-1 rounded">{gistId?.slice(0, 8)}...</code>
            </div>

            <div className="flex gap-2">
              {gistUrl && (
                <a
                  href={gistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline text-sm"
                >
                  Open Gist
                </a>
              )}
              <button
                onClick={handleVerify}
                disabled={connectionState === 'verifying'}
                className="text-purple-600 hover:text-purple-800 text-sm disabled:text-purple-400"
              >
                {connectionState === 'verifying' ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {(connectionState === 'not-connected' || connectionState === 'connecting') && (
        <div className="mb-3">
          <p className="text-sm text-gray-600 mb-3">
            Connect to a Gist to store your notes. If an existing Gist with your notes is found, it will be reused.
          </p>
          <button
            onClick={handleConnect}
            disabled={connectionState === 'connecting'}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed"
          >
            {connectionState === 'connecting' ? 'Connecting...' : 'Connect Gist'}
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-gray-200">
        <button
          onClick={openOptionsPage}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Settings
        </button>
      </div>
    </div>
  );
}
