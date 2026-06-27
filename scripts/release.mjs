import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync, copyFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

const root = process.cwd();
const buildDir = join(root, "opsboard");
const requiredFiles = [
  "index.html",
  "styles.css",
  "app.js",
  "README.md",
  "CHANGELOG.md",
  "LICENSE",
  ".nojekyll",
  "tests/qa.html",
  "tests/qa.js",
  "docs/qa/QA-REPORT.md",
];
const publicFiles = [
  ".nojekyll",
  "index.html",
  "styles.css",
  "app.js",
  "README.md",
  "CHANGELOG.md",
  "LICENSE",
  "tests/qa.html",
  "tests/qa.js",
  "docs/AEC-FINANCIAL-METRICS.md",
  "docs/FV-EAC-HISTORY.md",
  "docs/LATEST-VERSION-IMPLEMENTATION.md",
  "docs/PMI-SCHEDULE-METRICS.md",
  "docs/PMO-RESOURCE-MANAGEMENT.md",
  "docs/REVISION-CONTROL.md",
  "docs/ROADMAP.md",
  "docs/qa/QA-REPORT.md",
];

function file(path) {
  return join(root, path);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(command, args) {
  execFileSync(command, args, { cwd: root, stdio: "inherit" });
}

function copyPublicFile(path) {
  const from = file(path);
  const to = join(buildDir, path);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
}

run("node", ["--check", "app.js"]);
run("node", ["--check", "tests/qa.js"]);

for (const path of requiredFiles) {
  if (!existsSync(file(path)) || !statSync(file(path)).isFile()) fail(`missing required file: ${path}`);
}

const html = readFileSync(file("index.html"), "utf8");
if (!html.includes("styles.css?v=")) fail("index.html missing versioned styles.css reference");
if (!html.includes("app.js?v=")) fail("index.html missing versioned app.js reference");
if (/src="\/src\/|\/node_modules\//.test(html)) fail("index.html references a build-only path");

const app = readFileSync(file("app.js"), "utf8");
const versionMatch = app.match(/APP_VERSION = "([0-9]+\.[0-9]+\.[0-9]+)"/);
if (!versionMatch) fail("APP_VERSION marker not found in app.js");
const changelog = readFileSync(file("CHANGELOG.md"), "utf8");
if (!changelog.includes(`## [${versionMatch[1]}]`)) fail(`CHANGELOG.md has no entry for ${versionMatch[1]}`);
if (/console\.(log|debug)\(|debugger;|FIXME/.test(app)) fail("debug marker found in app.js");

rmSync(buildDir, { recursive: true, force: true });
mkdirSync(buildDir, { recursive: true });
for (const path of publicFiles) copyPublicFile(path);

const manifest = {
  app: "Techniek OpsBoard Pro",
  version: versionMatch[1],
  generatedAt: new Date().toISOString(),
  files: publicFiles,
};
writeFileSync(join(buildDir, "build-manifest.json"), JSON.stringify(manifest, null, 2) + "\n");

console.log(`Release validation passed for v${versionMatch[1]}.`);
console.log(`Refreshed ${readdirSync(buildDir).length} top-level entries in opsboard/.`);
