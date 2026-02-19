import { defineConfig } from 'wxt';
import tailwindcss from '@tailwindcss/vite';

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'GitHub Issue Notes',
    description: 'Add personal notes to GitHub issues and PRs',
    permissions: ['storage'],
    host_permissions: ['https://api.github.com/*'],
  },
  // Persist browser profile data across dev restarts
  // https://wxt.dev/guide/essentials/config/browser-startup.html
  runner: {
    chromiumArgs: ['--user-data-dir=./.wxt/chrome-data'],
  },
});
