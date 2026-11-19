/** Return the canonical public GitHub repository URL, never a file URL or credentials. */
export function cmsRepository(value) {
  const match = /^https:\/\/github\.com\/([a-z0-9-]+)\/([a-z0-9_.-]+)\/?$/i.exec(String(value ?? '').trim());
  if (!match) return '';
  const repo = match[2].replace(/\.git$/i, '');
  if (!repo || /^\.+$/.test(repo)) return '';
  return `https://github.com/${match[1]}/${repo}`;
}
