/** The CMS bundled with the panel. Rebuild from this exact revision when refreshing it. */
export const BUNDLED_CMS_REPOSITORY = 'https://github.com/rehmaahmed11/ams-cms-aligned';
export const BUNDLED_CMS_REF = '73348dfefaaeeeb412f4a2f73f0812ce988e2afc';

// Version both the cache and the published asset when the bundled source changes.
// This prevents an old KV value or an older panel's GitHub fallback from winning.
export const BUNDLED_TEMPLATE_KEY = 'cms/template-v2';
export const BUNDLED_TEMPLATE_FILE = 'cms-template-worker-v2.js';

/** Return the canonical public GitHub repository URL, never a file URL or credentials. */
export function cmsRepository(value) {
  const match = /^https:\/\/github\.com\/([a-z0-9-]+)\/([a-z0-9_.-]+)\/?$/i.exec(String(value ?? '').trim());
  if (!match) return '';
  const repo = match[2].replace(/\.git$/i, '');
  if (!repo || /^\.+$/.test(repo)) return '';
  return `https://github.com/${match[1]}/${repo}`;
}
