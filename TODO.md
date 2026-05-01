# TODO

## Chrome port (P0 — next)

- [ ] Add `browser` polyfill shim: `if (typeof browser === "undefined") { var browser = chrome; }`
- [ ] Create `manifest.chrome.json` with `"background": { "service_worker": "background-chrome.js" }` (Chrome MV3 requires a service worker, not background scripts)
- [ ] Create `background-chrome.js` that concatenates `notables.js` + `background.js` (service workers can't load multiple scripts via manifest)
- [ ] Refactor `runtime.onMessage` listener to use `sendResponse` pattern for older Chrome compat:
  ```js
  browser.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg?.type === "fetchStory" && msg.storyId) {
      fetchStoryNotables(String(msg.storyId)).then(sendResponse);
      return true;
    }
  });
  ```
- [ ] Remove `browser_specific_settings.gecko` from Chrome manifest
- [ ] Test in Chrome with `chrome://extensions` → "Load unpacked"

## Store submission

- [ ] Create extension icons (16x16, 48x48, 128x128 PNG)
- [ ] Write privacy policy (extension accesses only public HN + Algolia data, no PII collected)
- [ ] Firefox AMO: sign and submit via `web-ext sign` (free)
- [ ] Chrome Web Store: register developer account ($5), submit with screenshots

## Notables list quality

- [ ] Re-verify every handle against HN `about` field or a public link from the person back to their HN profile
- [ ] Bias toward false negatives (missing notable = invisible; wrong attribution = bug report)
- [ ] Add a "report wrong attribution" link in the popover (GitHub issues URL)
- [ ] Consider moving notables to a JSON file with a build step (easier community contributions)

## Nice-to-haves

- [ ] Options page to let users add/remove notables locally
- [ ] Badge count showing how many notables are in the current page
- [ ] Rate-limit Algolia requests (batch or limit concurrency to ~6 on cold cache)
