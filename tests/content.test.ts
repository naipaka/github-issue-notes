import { describe, expect, it } from 'vitest';
import { extractNoteKey } from '../utils/noteKey';

describe('extractNoteKey', () => {
  describe('valid pathnames', () => {
    it('extracts noteKey from issue URL', () => {
      const result = extractNoteKey('/facebook/react/issues/123');
      expect(result).toBe('facebook/react#123');
    });

    it('extracts noteKey from PR URL', () => {
      const result = extractNoteKey('/vercel/next.js/pull/456');
      expect(result).toBe('vercel/next.js#456');
    });

    it('handles numeric issue/PR numbers', () => {
      const result = extractNoteKey('/owner/repo/issues/99999');
      expect(result).toBe('owner/repo#99999');
    });

    it('handles owner with hyphens', () => {
      const result = extractNoteKey('/my-org/repo/issues/1');
      expect(result).toBe('my-org/repo#1');
    });

    it('handles repo with hyphens', () => {
      const result = extractNoteKey('/owner/my-repo-name/pull/42');
      expect(result).toBe('owner/my-repo-name#42');
    });

    it('handles repo with dots', () => {
      const result = extractNoteKey('/owner/repo.js/issues/1');
      expect(result).toBe('owner/repo.js#1');
    });

    it('handles owner and repo with underscores', () => {
      const result = extractNoteKey('/my_org/my_repo/issues/1');
      expect(result).toBe('my_org/my_repo#1');
    });
  });

  describe('invalid pathnames', () => {
    it('returns null for non-issue/PR URLs', () => {
      expect(extractNoteKey('/facebook/react')).toBeNull();
      expect(extractNoteKey('/facebook/react/blob/main/README.md')).toBeNull();
      expect(extractNoteKey('/facebook/react/commits/main')).toBeNull();
    });

    it('returns null for issue list URL', () => {
      expect(extractNoteKey('/facebook/react/issues')).toBeNull();
    });

    it('returns null for PR list URL', () => {
      expect(extractNoteKey('/facebook/react/pulls')).toBeNull();
    });

    it('returns null for root URL', () => {
      expect(extractNoteKey('/')).toBeNull();
    });

    it('returns null for empty pathname', () => {
      expect(extractNoteKey('')).toBeNull();
    });

    it('returns null for non-numeric issue number', () => {
      expect(extractNoteKey('/owner/repo/issues/abc')).toBeNull();
    });
  });

  describe('URL with additional path segments', () => {
    it('extracts noteKey from issue with file path', () => {
      // GitHub URLs like /owner/repo/issues/123/files
      const result = extractNoteKey('/owner/repo/issues/123/files');
      expect(result).toBe('owner/repo#123');
    });

    it('extracts noteKey from PR with commits path', () => {
      const result = extractNoteKey('/owner/repo/pull/456/commits');
      expect(result).toBe('owner/repo#456');
    });

    it('extracts noteKey from PR with files path', () => {
      const result = extractNoteKey('/owner/repo/pull/789/files');
      expect(result).toBe('owner/repo#789');
    });
  });
});
