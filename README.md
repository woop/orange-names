# Orange Names

Browser extension that paints notable Hacker News users orange. Click a highlighted name to see who they are.

![Screenshot](docs/screenshot.png)

## How it works

On story and comment pages, the extension asks the background script for the list of commenters in that thread. The background script hits the Algolia HN Search API (`hn.algolia.com/api/v1/search?tags=comment,story_<id>`) which returns every comment for the story in a single request, and the resulting set of usernames is cached. The content script then walks the DOM, recolors any username that appears in the curated notables list, and attaches a popover with the person's bio and links.

Algolia is used instead of the Firebase HN API because it returns the full comment tree in one call rather than requiring a recursive walk. Fetches happen in the background script because HN's CSP blocks cross-origin requests from content scripts.

## Install

### Firefox

1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `firefox/manifest.json`

### Chrome

1. Open `chrome://extensions`
2. Enable "Developer mode"
3. Click "Load unpacked" and select the `chrome/` folder

## Updating the notables list

Edit `firefox/notables.js`. Each entry maps an HN username to name, role, bio, and links. Then run `npm run sync` to copy the shared files into `chrome/` (CI fails if they drift).
