# HN Notables

Browser extension that highlights notable HN users with orange names and info popovers.

## Architecture

MV3 WebExtension (no build step) with dual Firefox/Chrome support. Shared source files live at the repo root. `firefox/` and `chrome/` each contain a `manifest.json` plus symlinks to the shared files. Load the appropriate folder in each browser.

### Shared source files (repo root)

- `notables.js` — `const NOTABLES = { handle: { name, role, bio, homepage?, twitter?, github?, linkedin?, wikipedia? }, ... }`. Shared by both content and background contexts.
- `background.js` — Fetches notable commenters per story from Algolia HN Search API. Caches in `browser.storage.local` with schema versioning (`v: 1`), 3-min TTL, probabilistic 7-day sweep, and in-flight request deduplication. Uses `sendResponse` pattern for cross-browser compat.
- `content.js` — Decorates `a.hnuser` links matching NOTABLES with orange styling. On list pages, queries background for each story's notable commenters and renders them inline in the subtext row. Click any orange name to get an info popover.
- `styles.css` — HN-native styling (Verdana 9pt, #f6f6ef background, #ff6600 orange names).
- `browser-polyfill.js` — Shim that maps `chrome` to `browser` so the same code works in both browsers.
- `background-chrome.js` — Chrome service worker entry point. Loads the polyfill, then imports `notables.js` + `background.js` via `importScripts`.

### Browser folders

- `firefox/manifest.json` — MV3 manifest with gecko settings. Background loads `notables.js` + `background.js` as scripts. Content scripts inject `notables.js` + `content.js` + `styles.css`.
- `chrome/manifest.json` — MV3 manifest with service worker (`background-chrome.js`). Content scripts load `browser-polyfill.js` first for cross-browser compat.

## Key decisions

- Algolia API (`hn.algolia.com/api/v1/search?tags=comment,story_<id>&hitsPerPage=1000`) is used instead of Firebase because it returns all comments for a story in one request.
- Fetches happen in the background script (not content) because HN's CSP blocks cross-origin fetch from content scripts.
- Cached responses include a `cached: true` flag so the content script can apply a 20ms-per-row top-to-bottom cascade animation on cache hits (visual effect only).
- The notables list is hand-curated. Every entry should be verifiable via the person's HN about field or a public link from their known identity back to the HN handle. When in doubt, leave them out.

## Next steps

See `TODO.md`. Chrome port is highest priority.

## Git

- Main branch: `main`
- Remote will be `woop/hn-notables` on GitHub
