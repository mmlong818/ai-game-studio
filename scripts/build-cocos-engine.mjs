#!/usr/bin/env node
// 复现 Cocos 4（https://github.com/cocos/cocos4，tag v4.0.0）Web 运行时的单文件 ESM 构建，并做体积 / 许可门禁。
//
// 该脚本只在仓库**外部**工作（默认 D:/codex/_external 或 $COCOS4_WORKDIR），不会把任何引擎产物写进仓库。
// 2026-09-04 的门禁结论见 third_party/cocos4/BUILD.md：构建与渲染可行，但产物必然内含 @cocos/engine-pal
//（package.json / README 明示 "UNLICENSED — Cocos 内部使用"）的混淆代码，许可核对不通过，因此迁移停止。
// 本脚本保留给日后上游澄清许可后再次评估，默认不会复制产物到 third_party/ 或 vendor/。
//
// 用法：
//   node scripts/build-cocos-engine.mjs [--workdir D:/codex/_external] [--features base,gfx-webgl2,3d,legacy-pipeline] [--skip-clone]
//
// 步骤：
//   1. git clone --depth 1 --branch v4.0.0 cocos/cocos4   （约 350 MB，含 native/）
//   2. npm install --ignore-scripts（Node 24 需 NODE_OPTIONS=--max-old-space-size=8192，否则 npm 自身 OOM）
//   3. 手工执行 postinstall 中与 Web 相关的步骤：spread-pal / build:debug-infos / spread-adapter / build:const
//   4. @cocos/ccbuild buildEngine({ moduleFormat: 'esm', platform: 'HTML5', features, split: false, targets: 现代浏览器 })
//      —— 必须指定现代 targets：默认 ES5 降级会触发 Babel 循环闭包变量错误（`_i is not defined`，program-lib insertBuiltinBindings）
//      —— 不能用 ccbuild 的 compress:true：Node 24.20 下 terser 阶段 "Zone Allocation failed" 崩溃，改用 esbuild 压缩
//   5. esbuild --minify --format=esm --target=es2020 → cocos.module.js，输出 raw / gzip / brotli 体积
//   6. 许可扫描：读取 node_modules/@cocos/* 的 license 字段，凡进入产物的包若非 OSI 许可即判失败
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; };
const flag = (name) => args.includes(name);

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const workdir = path.resolve(opt('--workdir', process.env.COCOS4_WORKDIR || 'D:/codex/_external'));
const engineDir = path.join(workdir, 'cocos4');
const outDir = path.join(workdir, 'cocos4-build');
const features = opt('--features', 'base,gfx-webgl2,3d,legacy-pipeline').split(',');
const EXPECTED_TAG = 'v4.0.0';
const EXPECTED_COMMIT = '6722aac66902b08c1effc376d77af579b4261560';
const SIZE_GATE = { raw: 6 * 1024 * 1024, gzip: 1.5 * 1024 * 1024 };
const OSI_LICENSES = new Set(['MIT', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', 'ISC', 'Zlib', 'Unlicense', '0BSD']);

if (engineDir.startsWith(repoRoot) || outDir.startsWith(repoRoot)) {
  throw new Error(`workdir 不能位于仓库内部：${workdir}`);
}
const env = { ...process.env, NODE_OPTIONS: '--max-old-space-size=8192' };
const sh = (cmd, cwd) => { console.log(`\n$ ${cmd}`); execSync(cmd, { cwd, stdio: 'inherit', env }); };
const timed = async (label, fn) => { const t = Date.now(); const r = await fn(); console.log(`[${label}] ${Date.now() - t} ms`); return r; };

fs.mkdirSync(workdir, { recursive: true });
if (!flag('--skip-clone') && !fs.existsSync(path.join(engineDir, '.git'))) {
  await timed('clone', () => sh(`git clone --depth 1 --branch ${EXPECTED_TAG} https://github.com/cocos/cocos4.git cocos4`, workdir));
}
const head = execSync('git rev-parse HEAD', { cwd: engineDir }).toString().trim();
console.log(`engine commit: ${head}${head === EXPECTED_COMMIT ? '' : `  (注意：与记录的 ${EXPECTED_COMMIT} 不同)`}`);

if (!fs.existsSync(path.join(engineDir, 'node_modules', '@cocos', 'ccbuild'))) {
  await timed('npm install', () => sh('npm install --ignore-scripts --no-audit --no-fund --loglevel=error', engineDir));
}
if (!fs.existsSync(path.join(engineDir, 'pal', 'pacer'))) sh('node scripts/spread-pal.cjs', engineDir);
sh('npm run build:debug-infos', engineDir);
sh('node scripts/spread-adapter.cjs', engineDir);
sh('npm run build:const', engineDir);

// ---- 4. ccbuild → ESM（未压缩）
const require = createRequire(path.join(engineDir, 'package.json'));
const { buildEngine } = require('@cocos/ccbuild');
const rawOut = path.join(outDir, 'esm');
fs.rmSync(rawOut, { recursive: true, force: true });
fs.mkdirSync(rawOut, { recursive: true });
const result = await timed('ccbuild', () => buildEngine({
  engine: engineDir,
  out: rawOut,
  mode: 'BUILD',
  platform: 'HTML5',
  moduleFormat: 'esm',
  features,
  compress: false,
  split: false,
  sourceMap: false,
  inlineEnum: true,
  mangleProperties: false,
  noDeprecatedFeatures: true,
  nativeCodeBundleMode: 'wasm',
  assetURLFormat: 'runtime-resolved',
  flags: { DEBUG: false },
  targets: ['chrome 100', 'safari 15.4', 'firefox 100'],
}));
const rawFile = path.join(rawOut, result.exports.cc || 'cc.js');
if (result.hasCriticalWarns) console.warn('ccbuild 报告了 critical warnings');

// ---- 5. esbuild 压缩
const esbuild = path.join(repoRoot, 'node_modules', '.bin', process.platform === 'win32' ? 'esbuild.cmd' : 'esbuild');
const minFile = path.join(outDir, 'cocos.module.js');
await timed('esbuild', () => sh(`"${esbuild}" "${rawFile}" --minify --format=esm --target=es2020 --outfile="${minFile}" --log-level=warning`, repoRoot));

const report = (file) => {
  const b = fs.readFileSync(file);
  return { file, raw: b.length, gzip: zlib.gzipSync(b, { level: 9 }).length, brotli: zlib.brotliCompressSync(b).length };
};
const sizes = [report(rawFile), report(minFile)];
console.log('\n体积：');
for (const s of sizes) console.log(`  ${path.relative(workdir, s.file)}  raw ${(s.raw / 1048576).toFixed(2)} MB  gzip ${(s.gzip / 1024).toFixed(0)} KB  brotli ${(s.brotli / 1024).toFixed(0)} KB`);
const min = sizes[1];
const sizeOk = min.raw <= SIZE_GATE.raw && min.gzip <= SIZE_GATE.gzip;
console.log(`体积门禁（≤ 6 MB / gzip ≤ 1.5 MB）：${sizeOk ? '通过' : '不通过'}`);

// ---- 6. 许可扫描：pal/ 与 bin/adapter 来自 @cocos/engine-pal、@cocos/engine-platforms；pal 进入产物
const licenseRows = [];
for (const pkg of ['@cocos/engine-pal', '@cocos/engine-platforms', '@cocos/ccbuild']) {
  const p = path.join(engineDir, 'node_modules', pkg, 'package.json');
  if (!fs.existsSync(p)) continue;
  const j = JSON.parse(fs.readFileSync(p, 'utf8'));
  const bundled = pkg === '@cocos/engine-pal';
  licenseRows.push({ pkg, version: j.version, license: j.license ?? '(未声明)', bundled });
}
const engineLicense = fs.readFileSync(path.join(engineDir, 'LICENSE'), 'utf8').split('\n')[0].trim();
console.log(`\n许可：引擎仓库 LICENSE = ${engineLicense}`);
let licenseOk = true;
for (const r of licenseRows) {
  const ok = !r.bundled || OSI_LICENSES.has(r.license);
  if (!ok) licenseOk = false;
  console.log(`  ${r.pkg}@${r.version}  license=${r.license}  ${r.bundled ? '进入产物' : '仅构建期'}  ${ok ? 'OK' : '不通过'}`);
}
console.log(`许可门禁：${licenseOk ? '通过' : '不通过（产物含非开源许可代码，不得提交到 third_party/ 或写入 vendor/）'}`);

fs.writeFileSync(path.join(outDir, 'gate-report.json'), JSON.stringify({
  date: new Date().toISOString(), engineCommit: head, features, sizes, licenseRows, engineLicense, sizeOk, licenseOk,
}, null, 2));
console.log(`\n报告：${path.join(outDir, 'gate-report.json')}`);
process.exitCode = sizeOk && licenseOk ? 0 : 2;
