# HN Notables

Browser extension that highlights noteworthy people on Hacker News. Notable usernames appear in orange across all HN pages (front page, comment threads, user profiles). Clicking a highlighted name opens a popover with their real identity, role, bio, and links to their profiles elsewhere.

## How it works

- `notables.js` — curated dictionary of ~115 notable HN handles with metadata (name, role, bio, links)
- `content.js` — content script that decorates matching `a.hnuser` links on every HN page; on list pages, queries the background script for notable commenters on each story
- `background.js` — fetches comment authors per story via the Algolia HN Search API, caches results in `browser.storage.local` (3-min TTL, 7-day sweep, schema-versioned)
- `styles.css` — orange highlight for notable names, HN-native popover styling

## Install (Firefox, development)

1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select `manifest.json` from this directory
4. Navigate to [Hacker News](https://news.ycombinator.com/)

## Status

Working Firefox extension. Not yet published to AMO or Chrome Web Store.
