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

  // Recorded visit: let everything finish rendering, then drive a manual
  // hide/reveal so the GIF has a clear before/after instead of a
  // sub-second cascade that's invisible at 18fps.
  const page = await context.newPage();
  const recordStart = Date.now();
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  await page.waitForFunction(
    () =>
      document.querySelectorAll(".hn-notables-list a.hn-notable").length > 5,
    { timeout: 60_000 }
  );
  await page.waitForTimeout(1200);

  // Scroll so the densest notable cluster sits in the crop window.
  const targetY = await page.evaluate(() => {
    const first = document.querySelector(".hn-notables-list a.hn-notable");
    if (!first) return 200;
    const tr = first.closest("tr");
    const titleTr = tr.previousElementSibling || tr;
    return Math.max(
      0,
      titleTr.getBoundingClientRect().top + window.scrollY - 60
    );
  });
  await page.evaluate((y) => window.scrollTo(0, y), targetY);
  await page.waitForTimeout(400);

  const first = page.locator(".hn-notables-list a.hn-notable").first();
  const row = first.locator("xpath=ancestor::tr[1]");
  const box = await row.boundingBox();
  console.log("notable row box:", box);

  // 0.8s of "before" with notables hidden.
  const tHide = (Date.now() - recordStart) / 1000;
  console.log("tHide:", tHide.toFixed(2));
  await page.addStyleTag({
    content: `
      .hn-notables-list { visibility: hidden !important; }
      a.hnuser.hn-notable-user,
      a.hn-notable-user,
      a.hn-notable-user:link,
      a.hn-notable-user:visited {
        color: #828282 !important;
        font-weight: normal !important;
      }
    `,
  });
  await page.waitForTimeout(1100);

  // Reveal: drop the override, all names pop simultaneously.
  await page.evaluate(() => {
    document.querySelectorAll("style").forEach((s) => {
      if (
        s.textContent &&
        s.textContent.includes(".hn-notables-list") &&
        s.textContent.includes("visibility: hidden")
      ) {
        s.remove();
      }
    });
  });
  await page.waitForTimeout(2200);

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
  // Trim window: start exactly at the hide so the GIF loops
  // gray -> pop -> hold instead of the other way around.
  const start = tHide.toFixed(2);
  const dur = "3.0";
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
