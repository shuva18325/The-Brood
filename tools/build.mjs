/**
 * build.mjs — bundle the whole game into one self-contained HTML file.
 *
 * The published build has to survive a strict CSP with no external hosts,
 * so three.js, every module and every stylesheet are inlined. Nothing is
 * fetched at runtime; there was never anything to fetch.
 *
 *   node tools/build.mjs            → dist/the-brood.html
 *   node tools/build.mjs --artifact → also strips the outer html/head/body
 *                                     for the artifact host, which supplies
 *                                     its own document skeleton.
 */

import { build } from 'esbuild';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const artifactMode = process.argv.includes('--artifact');

const result = await build({
  entryPoints: [join(ROOT, 'src/main.js')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  minify: true,
  legalComments: 'none',
  write: false,
  logLevel: 'warning',
  alias: { three: join(ROOT, 'vendor/three/three.module.min.js') },
});

const js = result.outputFiles[0].text;

const css = (await Promise.all([
  'src/ui/css/base.css',
  'src/ui/css/web.css',
  'src/ui/css/os.css',
].map(f => readFile(join(ROOT, f), 'utf8')))).join('\n');

const BODY = `
<canvas id="scene"></canvas>

<div id="hud" class="hidden">
  <div id="prompt" class="hidden"><span id="prompt-key">E</span> <span id="prompt-text"></span></div>
  <div id="subtitle" class="hidden"></div>
  <div id="clock"></div>
  <div id="carry" class="hidden"></div>
  <div id="reticle"></div>
  <div id="captions" class="hidden"></div>
  <div id="audio-compass" class="hidden"></div>
  <div id="look-hint" class="hidden"></div>
</div>

<div id="overlay" class="hidden">
  <div id="overlay-frame"><div id="overlay-body"></div></div>
  <div id="overlay-hint">ESC — step back</div>
</div>

<div id="plate" class="hidden"><div id="plate-text"></div></div>

<div id="menu">
  <div class="menu-inner">
    <h1>THE BROOD</h1>
    <p class="menu-sub">Fifteen days. One room. Two ways out.</p>
    <div id="menu-buttons"></div>
    <p class="menu-foot" id="menu-foot"></p>
  </div>
</div>

<div id="warning">
  <div class="warn-inner">
    <h2>Before you start</h2>
    <p>This game contains flashing light, sudden loud sound, and long periods
       of near-total darkness and near-total silence.</p>
    <p>A <b>reduced flashing</b> option and separate volume controls are in
       Settings, on the title screen and in the pause menu. Captions for every
       sound, including direction, can be turned on there too — the game hides
       survival-critical information in audio.</p>
    <p><b>Headphones are strongly recommended.</b> The audio is positional and
       it is mixed quiet on purpose.</p>
    <button id="warn-ok">I understand</button>
  </div>
</div>
`;

const page = `<style>\n${css}\n</style>\n${BODY}\n<script>\n${js}\n</script>\n`;

await mkdir(join(ROOT, 'dist'), { recursive: true });

if (artifactMode) {
  await writeFile(join(ROOT, 'dist/the-brood.html'),
    `<title>THE BROOD</title>\n` + page);
} else {
  await writeFile(join(ROOT, 'dist/the-brood.html'),
`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>THE BROOD</title>
</head>
<body>
${page}</body>
</html>`);
}

const kb = (page.length / 1024).toFixed(0);
console.log(`dist/the-brood.html — ${kb} KB${artifactMode ? ' (artifact)' : ''}`);
