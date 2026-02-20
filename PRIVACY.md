# Privacy Policy

**GitHub Issue Notes** is a browser extension that allows you to add personal notes to GitHub Issues and Pull Requests. This document describes how we handle your data.

## Data Collection

### What We Collect

| Data | Purpose | Storage Location |
|------|---------|------------------|
| GitHub Personal Access Token (PAT) | Authenticate with GitHub Gist API | Local browser storage (`chrome.storage.local`) |
| Gist ID | Identify your notes storage | Local browser storage (`chrome.storage.local`) |
| Note content | Your personal notes | Your private GitHub Gist |

### What We Do NOT Collect

- Usage analytics or telemetry
- Browsing history
- Personal information beyond what you explicitly provide
- Any data from GitHub pages you visit (except the Issue/PR identifier for note lookup)

## Data Storage

### Local Storage

Your PAT and Gist ID are stored locally in your browser using `chrome.storage.local`. This data:

- Never leaves your browser except when sent to GitHub API
- Is not synced to any external servers
- Is deleted when you uninstall the extension

### GitHub Gist

Your notes are stored in a **private GitHub Gist** under your GitHub account. This means:

- Only you can access your notes (via your GitHub account)
- Notes are stored on GitHub's servers under their [privacy policy](https://docs.github.com/en/site-policy/privacy-policies/github-privacy-statement)
- You can delete the Gist at any time from your GitHub account

## Data Transmission

This extension only communicates with:

| Endpoint | Purpose |
|----------|---------|
| `https://api.github.com/gists` | Create, read, and update your notes Gist |

No other external services are contacted.

## Third-Party Access

- **No third parties** have access to your data through this extension
- Your PAT is only used to authenticate with GitHub's official API
- We do not sell, share, or transfer your data to any third parties

## Data Deletion

### Automatic Deletion

- Uninstalling the extension removes all local data (PAT, Gist ID)

### Manual Deletion

- **Delete notes**: Edit or delete the Gist from your GitHub account
- **Revoke access**: Delete the PAT from [GitHub Settings](https://github.com/settings/tokens)

## Security

- PAT is stored only in local browser storage
- PAT is never exposed to web pages (Content Scripts cannot access it)
- All API communication uses HTTPS
- The extension requests minimal permissions

## Permissions Explained

| Permission | Why We Need It |
|------------|----------------|
| `storage` | Store your PAT and Gist ID locally |
| `host_permissions` (api.github.com) | Access GitHub Gist API |

## Children's Privacy

This extension is not intended for use by children under 13 years of age.

## Changes to This Policy

We may update this privacy policy from time to time. Changes will be reflected in this document with an updated date.

## Contact

If you have questions about this privacy policy, please open an issue on our [GitHub repository](https://github.com/YOUR_USERNAME/github-issue-notes/issues).

---

**Last updated**: February 2026
