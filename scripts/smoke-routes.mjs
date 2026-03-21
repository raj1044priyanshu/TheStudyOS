import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const expectedCorePages = [
  "/",
  "/login",
  "/onboarding",
  "/suspended",
  "/welcome",
  "/admin",
  "/admin/audit",
  "/admin/errors",
  "/admin/feedback",
  "/admin/ops",
  "/admin/resources",
  "/admin/settings",
  "/admin/users",
  "/dashboard",
  "/dashboard/knowledge-graph",
  "/dashboard/mindmap",
  "/dashboard/notes/[id]",
  "/dashboard/plan",
  "/dashboard/profile",
  "/dashboard/quiz/[id]",
  "/dashboard/quiz/[id]/autopsy",
  "/dashboard/revise",
  "/dashboard/study",
  "/dashboard/study-room",
  "/dashboard/test",
  "/dashboard/track"
];

const expectedLegacyPages = [
  "/doubts",
  "/evaluator",
  "/exams",
  "/flashcards",
  "/focus",
  "/formula-sheet",
  "/knowledge-graph",
  "/mindmap",
  "/notes",
  "/past-papers",
  "/planner",
  "/profile",
  "/progress",
  "/quiz",
  "/revision",
  "/scanner",
  "/study-room",
  "/teach-me",
  "/videos"
];

const expectedApiRoutes = [
  "/api/auth/[...nextauth]",
  "/api/admin/overview",
  "/api/admin/errors",
  "/api/admin/errors/analyze",
  "/api/admin/feedback",
  "/api/admin/users",
  "/api/dashboard",
  "/api/errors/client",
  "/api/feedback",
  "/api/notes",
  "/api/planner",
  "/api/profile",
  "/api/progress",
  "/api/quiz",
  "/api/scanner",
  "/api/search",
  "/api/videos"
];

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function findBuildDir() {
  for (const candidate of [".next", ".next-build"]) {
    const appManifestPath = path.join(root, candidate, "app-path-routes-manifest.json");
    const routesManifestPath = path.join(root, candidate, "routes-manifest.json");
    if (fs.existsSync(appManifestPath) && fs.existsSync(routesManifestPath)) {
      return candidate;
    }
  }

  throw new Error("No Next build artifacts found. Run `npm run build` first.");
}

function collectBuiltRoutes(distDir) {
  const appPathRoutesManifest = readJson(path.join(root, distDir, "app-path-routes-manifest.json"));
  const routesManifest = readJson(path.join(root, distDir, "routes-manifest.json"));
  const builtRoutes = new Set(Object.values(appPathRoutesManifest));

  for (const route of routesManifest.staticRoutes ?? []) {
    builtRoutes.add(route.page);
  }

  for (const route of routesManifest.dynamicRoutes ?? []) {
    builtRoutes.add(route.page);
  }

  return [...builtRoutes].sort();
}

function assertRoutesExist(label, expectedRoutes, builtRoutes) {
  const missing = expectedRoutes.filter((route) => !builtRoutes.includes(route));
  if (!missing.length) {
    return;
  }

  console.error(`${label} smoke check failed. Missing routes:`);
  for (const route of missing) {
    console.error(`- ${route}`);
  }
  process.exitCode = 1;
}

const distDir = findBuildDir();
const builtRoutes = collectBuiltRoutes(distDir);

assertRoutesExist("Core page", expectedCorePages, builtRoutes);
assertRoutesExist("Legacy page", expectedLegacyPages, builtRoutes);
assertRoutesExist("API", expectedApiRoutes, builtRoutes);

if (process.exitCode) {
  process.exit(process.exitCode);
}

const pageRoutes = builtRoutes.filter((route) => !route.startsWith("/api/") && route !== "/icon.svg");
const apiRoutes = builtRoutes.filter((route) => route.startsWith("/api/"));

console.log(`Route smoke passed against ${distDir}.`);
console.log(`Verified ${expectedCorePages.length} core pages, ${expectedLegacyPages.length} legacy pages, and ${expectedApiRoutes.length} core APIs.`);
console.log(`Discovered ${pageRoutes.length} page routes and ${apiRoutes.length} API routes in the built manifest.`);
