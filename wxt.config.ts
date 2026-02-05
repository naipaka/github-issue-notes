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
});
