# HN Notables

Firefox + Chrome MV3 extension that highlights notable HN users with orange names and info popovers. No build step.

## Layout

`firefox/` is the source of truth for shared files (`notables.js`, `background.js`, `content.js`, `styles.css`). `chrome/` keeps real copies of those plus Chrome-only entries (`browser-polyfill.js`, `background-chrome.js` service worker that `importScripts` the shared bg). Each folder has its own `manifest.json`.

Edit shared files in `firefox/`, then `npm run sync` to copy into `chrome/`. CI fails if the two drift. Symlinks don't work: Firefox temporary add-ons don't follow them at all, and Chrome's `--load-extension` follows them for the SW but not for content scripts.

The message listener in `background.js` uses `sendResponse` + `return true` (not Promise return). Firefox supports both patterns; Chrome only supports `sendResponse`.

## Key decisions

- Algolia API (`hn.algolia.com/api/v1/search?tags=comment,story_<id>&hitsPerPage=1000`) instead of Firebase — returns all comments for a story in one request.
- Fetches run in the background script, not content, because HN's CSP blocks cross-origin fetch from content scripts.
- Cache entries include `cached: true` so the content script can apply a 20ms-per-row cascade animation on cache hits.
- Notables list is hand-curated. Every entry must be verifiable via the person's HN about field or a public link from their known identity back to the HN handle.

## Git

- Main branch: `main`
- Remote: `woop/orange-names`
