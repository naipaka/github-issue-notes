# GitHub Issue Notes

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
<!-- [![Chrome Web Store](https://img.shields.io/chrome-web-store/v/EXTENSION_ID.svg)](https://chrome.google.com/webstore/detail/EXTENSION_ID) -->

Add personal notes to GitHub Issues and Pull Requests. Notes are saved to your private Gist and synced across devices.

<!-- ![Screenshot](docs/screenshot.png) -->

## Features

- **Personal Notes on Issues/PRs** - Add private notes directly on GitHub Issue and PR pages
- **Private Gist Storage** - Notes are saved to your own GitHub Private Gist (only you can access)
- **Auto-save** - Notes are automatically saved as you type (1 second debounce)
- **Dark Mode Support** - Seamlessly adapts to GitHub's dark mode
- **Cross-device Sync** - Access your notes from any device via Gist

## Installation

### Chrome Web Store (Coming Soon)

<!-- [Install from Chrome Web Store](https://chrome.google.com/webstore/detail/EXTENSION_ID) -->

### Development Version

1. Clone this repository
   ```bash
   git clone https://github.com/YOUR_USERNAME/github-issue-notes.git
   cd github-issue-notes
   ```

2. Install dependencies
   ```bash
   pnpm install
   ```

3. Build the extension
   ```bash
   pnpm build
   ```

4. Load in Chrome
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `.output/chrome-mv3` folder

## Usage

### Initial Setup

1. **Get a GitHub Personal Access Token (PAT)**
   - Go to [GitHub Settings > Developer settings > Personal access tokens](https://github.com/settings/tokens)
   - Generate a new token (classic) with the `gist` scope
   - Copy the token

2. **Configure the Extension**
   - Click the extension icon and go to Options (or right-click > Options)
   - Paste your PAT and click Save

3. **Connect Gist**
   - Click the extension icon
   - Click "Connect Gist"
   - The extension will create a private Gist or reuse an existing one

### Taking Notes

1. Navigate to any GitHub Issue or PR page
2. Find the "Personal Notes" section in the sidebar (below Notifications)
3. Type your notes - they auto-save after 1 second
4. Notes persist across page reloads and devices

## Permissions

| Permission | Purpose |
|------------|---------|
| `storage` | Save your PAT and Gist ID locally |
| `host_permissions` (api.github.com) | Access GitHub Gist API to read/write notes |

## Privacy

- **PAT**: Stored locally in your browser, never sent to any server except GitHub API
- **Notes**: Stored in your private GitHub Gist (only you can access)
- **No Analytics**: This extension does not collect any usage data

See [PRIVACY.md](PRIVACY.md) for the full privacy policy.

## Development

### Tech Stack

- [WXT](https://wxt.dev/) - Web Extension Framework
- [React](https://react.dev/) - UI Library
- [TypeScript](https://www.typescriptlang.org/) - Type Safety
- [Tailwind CSS v4](https://tailwindcss.com/) - Styling

### Commands

```bash
pnpm dev          # Start development server (Chrome)
pnpm dev:firefox  # Start development server (Firefox)
pnpm build        # Production build
pnpm compile      # TypeScript type check
pnpm test         # Run tests
pnpm zip          # Create ZIP for store submission
```

### Project Structure

```
entrypoints/
├── background.ts   # Service Worker - Gist API communication
├── content.tsx     # Content Script - Injects UI into GitHub pages
├── options/        # Options page - PAT management
└── popup/          # Popup - Gist connection

components/
└── NoteArea.tsx    # Note input component

utils/
├── messaging.ts    # Type-safe messaging between scripts
├── storage.ts      # Chrome storage wrapper
├── gist.ts         # GitHub Gist API client
└── notes.ts        # Notes data management
```

## License

[MIT](LICENSE)
