import { onMessage } from '@/utils/messaging';
import { getConfig, savePat, saveGistId } from '@/utils/storage';
import { findOrCreateGist } from '@/utils/gist';
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

  onMessage('getConfig', async () => {
    return getConfig();
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
});
