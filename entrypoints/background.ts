import { onMessage } from '@/utils/messaging';
import { getConfig, savePat, saveGistId } from '@/utils/storage';
import { findOrCreateGist, getGist, isManagedGist } from '@/utils/gist';
import { getNote, saveNote } from '@/utils/notes';

export default defineBackground(() => {
  browser.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
      browser.runtime.openOptionsPage();
    }
  });

  onMessage('getNote', async ({ data: key }) => {
    const config = await getConfig();
    if (!config) {
      throw new Error('Configuration not found. Please set up PAT first.');
    }
    if (!config.gistId) {
      throw new Error('Gist not connected. Please connect Gist first.');
    }
    return getNote(config.pat, config.gistId, key);
  });

  onMessage('saveNote', async ({ data }) => {
    const config = await getConfig();
    if (!config) {
      throw new Error('Configuration not found. Please set up PAT first.');
    }
    if (!config.gistId) {
      throw new Error('Gist not connected. Please connect Gist first.');
    }
    await saveNote(config.pat, config.gistId, data.key, data.content);
  });

  onMessage('getConfig', async ({ sender }) => {
    const config = await getConfig();
    if (!config) {
      return { hasPat: false };
    }

    const isContentScriptRequest = sender?.tab?.id != null;
    if (isContentScriptRequest) {
      return {
        hasPat: true,
        gistId: config.gistId,
      };
    }

    return {
      hasPat: true,
      gistId: config.gistId,
      pat: config.pat,
    };
  });

  onMessage('savePat', async ({ data }) => {
    await savePat(data);
  });

  onMessage('connectGist', async () => {
    const config = await getConfig();
    if (!config) {
      throw new Error('PAT not configured. Please set up PAT first.');
    }
    const result = await findOrCreateGist(config.pat);
    await saveGistId({ gistId: result.gistId });
    return result;
  });

  onMessage('checkConnection', async () => {
    const config = await getConfig();
    if (!config) {
      return { connected: false };
    }
    if (!config.gistId) {
      return { connected: false };
    }
    try {
      const gist = await getGist(config.pat, config.gistId);
      if (!isManagedGist(gist)) {
        return { connected: false };
      }
      return { connected: true, gistUrl: gist.html_url };
    } catch {
      return { connected: false };
    }
  });
});
