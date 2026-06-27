import { cp, mkdir, readFile, rm, stat } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "opsboard");

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

async function assertFile(file) {
  const info = await stat(path.join(root, file));
  if (!info.isFile()) throw new Error(`Required file is not a file: ${file}`);
}

function syntaxCheck(file) {
  execFileSync(process.execPath, ["--check", path.join(root, file)], { stdio: "inherit" });
}

async function validate() {
  await Promise.all(requiredFiles.map(assertFile));
  syntaxCheck("app.js");
  syntaxCheck("tests/qa.js");

  const index = await readFile(path.join(root, "index.html"), "utf8");
  if (!/href="styles\.css\?v=\d+"/.test(index)) {
    throw new Error("index.html must reference a versioned, relative styles.css asset");
  }
  if (!/src="app\.js\?v=\d+"/.test(index)) {
    throw new Error("index.html must reference a versioned, relative app.js asset");
  }
  if (/src="\/src\/|\/node_modules\//.test(index)) {
    throw new Error("index.html references a build-only asset path");
  }

  const app = await readFile(path.join(root, "app.js"), "utf8");
  const version = app.match(/APP_VERSION = "(\d+\.\d+\.\d+)"/)?.[1];
  if (!version) throw new Error("Unable to read APP_VERSION from app.js");

  const changelog = await readFile(path.join(root, "CHANGELOG.md"), "utf8");
  if (!changelog.includes(`## [${version}]`)) {
    throw new Error(`CHANGELOG.md has no entry for ${version}`);
  }
  if (/console\.(log|debug)\(|debugger;|FIXME/.test(app)) {
    throw new Error("app.js contains a debug marker");
  }

  return version;
}

async function refreshPublicBuild() {
  await rm(outDir, { recursive: true, force: true });
  await mkdir(path.join(outDir, "tests"), { recursive: true });
  await mkdir(path.join(outDir, "docs", "qa"), { recursive: true });

  const copies = [
    "index.html",
    "styles.css",
    "app.js",
    "LICENSE",
    ".nojekyll",
    "tests/qa.html",
    "tests/qa.js",
    "docs/qa/QA-REPORT.md",
  ];

  await Promise.all(copies.map(function (file) {
    return cp(path.join(root, file), path.join(outDir, file));
  }));
}

const version = await validate();
await refreshPublicBuild();
console.log(`Techniek OpsBoard Pro v${version} release validated and opsboard/ refreshed.`);
