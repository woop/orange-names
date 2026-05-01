# HN Notables

Firefox + Chrome MV3 extension that highlights notable HN users with orange names and info popovers. No build step.

## Layout

`firefox/` is the source of truth for shared files (`notables.js`, `background.js`, `content.js`, `styles.css`). `chrome/` symlinks to those same files and adds Chrome-only entries (`browser-polyfill.js`, `background-chrome.js` service worker that `importScripts` the shared bg). Each folder has its own `manifest.json`.

Edit shared files in `firefox/`. Chrome picks them up via symlink. Firefox doesn't follow symlinks for temporary add-ons, which is why it's the canonical dir.

## Key decisions

- Algolia API (`hn.algolia.com/api/v1/search?tags=comment,story_<id>&hitsPerPage=1000`) instead of Firebase — returns all comments for a story in one request.
- Fetches run in the background script, not content, because HN's CSP blocks cross-origin fetch from content scripts.
- Cache entries include `cached: true` so the content script can apply a 20ms-per-row cascade animation on cache hits.
- Notables list is hand-curated. Every entry must be verifiable via the person's HN about field or a public link from their known identity back to the HN handle.

## Git

- Main branch: `main`
- Remote: `woop/orange-names`
