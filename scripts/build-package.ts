#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

import { execaSync } from "execa";

const pnpmCmd = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const run = (args: string[], label: string) => {
  const result = execaSync(pnpmCmd, args, { stdio: "inherit", reject: false });
  if (result.exitCode !== 0) {
    process.stderr.write(`\n[vde-monitor] ${label} failed.\n`);
    process.exit(result.exitCode ?? 1);
  }
};

const ensureShebang = (filePath: string) => {
  const content = fs.readFileSync(filePath, "utf8");
  if (content.startsWith("#!/usr/bin/env node")) {
    return;
  }
  fs.writeFileSync(filePath, `#!/usr/bin/env node\n${content}`);
};

const findBundle = (dir: string, base: string) => {
  const candidates = [
    path.join(dir, `${base}.js`),
    path.join(dir, `${base}.mjs`),
    path.join(dir, `${base}.cjs`),
  ];
  return candidates.find((candidate) => fs.existsSync(candidate)) ?? null;
};

const main = () => {
  run(["--filter", "@vde-monitor/web", "build"], "web build");
  run(["run", "build:bundle"], "bundle build");

  const distDir = path.resolve("dist");
  const webDist = path.resolve("apps/web/dist");
  const targetWebDir = path.join(distDir, "web");

  if (!fs.existsSync(webDist)) {
    process.stderr.write("\n[vde-monitor] apps/web/dist not found. Did the web build fail?\n");
    process.exit(1);
  }

  fs.rmSync(targetWebDir, { recursive: true, force: true });
  fs.mkdirSync(targetWebDir, { recursive: true });
  fs.cpSync(webDist, targetWebDir, { recursive: true });

  const hookBundle = findBundle(distDir, "vde-monitor-hook");
  if (!hookBundle) {
    process.stderr.write("\n[vde-monitor] hook bundle not found in dist.\n");
    process.exit(1);
  }
  const hookTarget = path.join(distDir, "vde-monitor-hook.js");
  fs.rmSync(hookTarget, { force: true });
  if (hookBundle !== hookTarget) {
    fs.renameSync(hookBundle, hookTarget);
  }

  const mainBundle = findBundle(distDir, "index");
  if (!mainBundle) {
    process.stderr.write("\n[vde-monitor] main bundle not found in dist.\n");
    process.exit(1);
  }
  const mainTarget = path.join(distDir, "index.js");
  if (mainBundle !== mainTarget) {
    fs.rmSync(mainTarget, { force: true });
    fs.renameSync(mainBundle, mainTarget);
  }

  ensureShebang(mainTarget);
  ensureShebang(hookTarget);
  fs.chmodSync(mainTarget, 0o755);
  fs.chmodSync(hookTarget, 0o755);
};

main();
