import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const ROUTES = ["/", "/features", "/resources", "/blog", "/study-guides", "/login"];
const VIEWPORTS = [
  { width: 320, height: 900, label: "mobile-320" },
  { width: 360, height: 900, label: "mobile-360" },
  { width: 390, height: 844, label: "mobile-390" },
  { width: 768, height: 1024, label: "tablet-768" },
  { width: 1024, height: 768, label: "tablet-1024" },
  { width: 1280, height: 900, label: "desktop-1280" },
  { width: 1440, height: 900, label: "desktop-1440" }
];

const root = process.cwd();
const outputDir = path.join(root, ".next", "ui-smoke");
const port = process.env.STUDYOS_UI_SMOKE_PORT || "3000";
const baseUrl = process.env.STUDYOS_UI_SMOKE_BASE_URL || `http://localhost:${port}`;

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isServerAvailable(url) {
  try {
    const response = await fetch(url, { redirect: "manual" });
    return response.ok || response.status === 307 || response.status === 308;
  } catch {
    return false;
  }
}

async function waitForServer(url, timeoutMs = 120000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerAvailable(url)) {
      return;
    }

    await wait(1000);
  }

  throw new Error(`Timed out waiting for ${url}`);
}

function runScreenshot(route, viewport) {
  const outputPath = path.join(outputDir, `${route === "/" ? "home" : route.slice(1).replaceAll("/", "_")}-${viewport.label}.png`);

  execFileSync(
    "npx",
    [
      "-y",
      "playwright",
      "screenshot",
      "--browser=chromium",
      `--viewport-size=${viewport.width},${viewport.height}`,
      `${baseUrl}${route}`,
      outputPath
    ],
    {
      cwd: root,
      stdio: "pipe"
    }
  );

  if (!fs.existsSync(outputPath)) {
    throw new Error(`Screenshot was not created for ${route} at ${viewport.label}`);
  }
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });

  if (!(await isServerAvailable(baseUrl))) {
    throw new Error(`No app server is reachable at ${baseUrl}. Start the app with \`npm run dev\` or provide STUDYOS_UI_SMOKE_BASE_URL.`);
  }

  await waitForServer(baseUrl, 15000);

  for (const route of ROUTES) {
    for (const viewport of VIEWPORTS) {
      process.stdout.write(`UI smoke: ${route} @ ${viewport.label}\n`);
      runScreenshot(route, viewport);
    }
  }

  process.stdout.write(`UI smoke passed. Screenshots saved to ${outputDir}\n`);
}

main().catch((error) => {
  console.error("UI smoke failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
