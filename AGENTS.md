# AGENTS.md

Chrome extension to add personal notes to GitHub Issue/PR pages. Built with WXT + React + TypeScript + Tailwind CSS v4.

## Commands

```bash
pnpm dev          # Start dev server (Chrome)
pnpm dev:firefox  # Start dev server (Firefox)
pnpm build        # Production build
pnpm compile      # TypeScript type check
pnpm test         # Run tests
pnpm zip          # Create ZIP for store submission
```

## Architecture

```
entrypoints/
├── background.ts   # Service Worker - Gist API communication
├── content.tsx     # Content Script - Inject UI into GitHub pages
├── options/        # Options page - PAT settings
└── popup/          # Popup page - Gist connection
```

**Data flow**: Content Script → `sendMessage` → Background → Gist API

**Match patterns**: `https://github.com/*/*/issues/*`, `https://github.com/*/*/pull/*`

GitHub uses Turbo Drive (SPA), so re-injection on `turbo:load` is required.

## Data Structure

Gist file (`github-issue-notes.json`):
```json
{ "owner/repo#1": { "content": "...", "updatedAt": "..." } }
```

Storage (`chrome.storage.local`): `pat`, `gistId`

## Specifications

- Save: debounce 1s + blur
- Auth: PAT with `gist` scope only
- Gist: Reuse existing file if found, otherwise create new
- Retry: 3 times (exponential backoff)
- Offline: Not supported

## Coding Conventions

- TypeScript + React functional components
- Indent: 2 spaces
- Components: PascalCase, others: camelCase
- Use `@/` alias for shared assets

## Commits

Conventional Commits format: `<type>: <summary>`
