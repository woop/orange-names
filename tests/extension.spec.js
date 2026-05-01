const { test, expect, chromium } = require("@playwright/test");
const path = require("path");
const os = require("os");
const fs = require("fs");

const EXT_PATH = path.resolve(__dirname, "..", "chrome");

// Static front-page snapshots so the test stays deterministic.
const PAGES = [
  "https://news.ycombinator.com/front?day=2026-04-30",
  "https://news.ycombinator.com/front?day=2026-04-29",
];

async function launchWithExtension() {
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "hn-notables-"));
  return chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless: false,
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`,
    ],
  });
}

test("highlights at least one notable across two HN front-page snapshots", async () => {
  const context = await launchWithExtension();
  try {
    let total = 0;
    for (const url of PAGES) {
      const page = await context.newPage();
      await page.goto(url, { waitUntil: "domcontentloaded" });
      // Background script fetches each story's comments via Algolia and the
      // content script renders inline .hn-notables-list entries when a
      // commenter is in NOTABLES. ~30 stories per page; give it room.
      await page
        .waitForFunction(
          () =>
            document.querySelectorAll(
              ".hn-notables-list a.hn-notable, a.hnuser.hn-notable-user"
            ).length > 0,
          { timeout: 60_000 }
        )
        .catch(() => {});
      total += await page
        .locator(".hn-notables-list a.hn-notable, a.hnuser.hn-notable-user")
        .count();
      await page.close();
    }
    expect(total).toBeGreaterThan(0);
  } finally {
    await context.close();
  }
});
