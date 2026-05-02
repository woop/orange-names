#!/usr/bin/env node
// Records a short clip showing notable names being highlighted on an HN
// front-page snapshot. First visit warms the background script's Algolia
// cache so the second visit triggers the 20ms-per-row cascade animation.
// ffmpeg crops + converts the webm into docs/demo.gif.

const { chromium } = require("@playwright/test");
const path = require("path");
const os = require("os");
const fs = require("fs");
const { execSync } = require("child_process");

const EXT_PATH = path.resolve(__dirname, "..", "chrome");
const URL = "https://news.ycombinator.com/front?day=2026-04-30";
const VIDEO_DIR = path.resolve(__dirname, "..", "test-results", "demo-video");
const OUT_GIF = path.resolve(__dirname, "..", "docs", "demo.gif");

const VW = 1280;
const VH = 900;

(async () => {
  fs.rmSync(VIDEO_DIR, { recursive: true, force: true });
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "hn-demo-"));

  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless: false,
    viewport: { width: VW, height: VH },
    recordVideo: { dir: VIDEO_DIR, size: { width: VW, height: VH } },
    args: [
      `--disable-extensions-except=${EXT_PATH}`,
      `--load-extension=${EXT_PATH}`,
    ],
  });

  // Warm cache.
  const warm = await context.newPage();
  await warm.goto(URL, { waitUntil: "domcontentloaded" });
  await warm
    .waitForFunction(
      () =>
        document.querySelectorAll(".hn-notables-list a.hn-notable").length > 3,
      { timeout: 60_000 }
    )
    .catch(() => {});
  await warm.waitForTimeout(3000);
  await warm.close();

  // Recorded visit: cache is hot, names cascade in.
  const page = await context.newPage();
  const navPromise = page.goto(URL, { waitUntil: "domcontentloaded" });
  await navPromise;

  // Scroll to roughly where notables tend to cluster on the snapshot.
  await page.evaluate(() => window.scrollTo(0, 400));

  // Wait for the cascade to play out.
  await page.waitForTimeout(3500);

  // Find a notable and grab the bounding box of its row to drive the crop.
  const first = page.locator(".hn-notables-list a.hn-notable").first();
  const row = first.locator("xpath=ancestor::tr[1]");
  const box = await row.boundingBox();
  console.log("notable row box:", box);

  const recordPath = await page.video().path();
  await page.close();
  await context.close();

  if (!fs.existsSync(recordPath)) {
    throw new Error(`video not found at ${recordPath}`);
  }
  console.log("video:", recordPath);

  // Crop: full width, ~6 rows tall around the notable. Even if the row box
  // wasn't found, fall back to a reasonable region.
  const cropW = 1120;
  const cropH = 360;
  const cropX = 60;
  const baseY = box ? Math.floor(box.y) - 80 : 380;
  const cropY = Math.max(0, Math.min(VH - cropH, baseY));

  const cropExpr = `crop=${cropW}:${cropH}:${cropX}:${cropY}`;
  // 3s clip starting ~0.5s in (skip the blank flash at navigation start).
  const start = "0.5";
  const dur = "3";
  const filters = `${cropExpr},fps=18,scale=900:-1:flags=lanczos`;
  const palette = path.join(VIDEO_DIR, "palette.png");

  execSync(
    `ffmpeg -y -ss ${start} -t ${dur} -i "${recordPath}" -vf "${filters},palettegen=stats_mode=diff" "${palette}"`,
    { stdio: "inherit" }
  );
  fs.mkdirSync(path.dirname(OUT_GIF), { recursive: true });
  execSync(
    `ffmpeg -y -ss ${start} -t ${dur} -i "${recordPath}" -i "${palette}" -lavfi "${filters} [x]; [x][1:v] paletteuse=dither=bayer:bayer_scale=5" "${OUT_GIF}"`,
    { stdio: "inherit" }
  );

  console.log("wrote", OUT_GIF);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
