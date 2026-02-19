/**
 * Extract noteKey from pathname
 * @param pathname - URL pathname (e.g., /owner/repo/issues/123)
 * @returns noteKey in "owner/repo#number" format, or null if not matched
 */
export function extractNoteKey(pathname: string): string | null {
  const match = pathname.match(/^\/([^/]+)\/([^/]+)\/(issues|pull)\/(\d+)/);
  if (!match) return null;
  const [, owner, repo, , number] = match;
  return `${owner}/${repo}#${number}`;
}
