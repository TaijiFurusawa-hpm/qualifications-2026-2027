// アプリ（Capacitor）に入れるファイルだけを www/ に集める。`npm run build:web`
// - 載せてよいものを「名指し」で集める（blind/ content/ tools/ ux/ node_modules/ SPEC.md などは入らない）
// - index.html はアプリ用に2か所だけ書きかえる：
//   1) Capacitor の本体と部品（node_modules の IIFE 版）を、ほかの <script> より先に読む（window.Capacitor.Plugins.* が使える）
//   2) Google Fonts の <link> を外す（アプリはネットに出ない。書体を同梱するまでは端末の書体：index.html の TODO(フォント同梱)）
// - sw.js は入れない（アプリの中では Service Worker を登録しない：js/app.js の boot）
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "www");

const COPY = [
  "css", "js", "img", "audio",
  "data/data.js", "data/vocab.js",
  "manifest.webmanifest", "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png"
];
// Capacitor の部品（読む順：本体 → 部品）。名前は window.Capacitor.Plugins.* の名前と同じになる
const CAP = [
  ["capacitor.js", "@capacitor/core/dist/capacitor.js"],
  ["app.js", "@capacitor/app/dist/plugin.js"],
  ["preferences.js", "@capacitor/preferences/dist/plugin.js"],
  ["haptics.js", "@capacitor/haptics/dist/plugin.js"],
  ["splash-screen.js", "@capacitor/splash-screen/dist/plugin.js"],
  ["keep-awake.js", "@capacitor-community/keep-awake/dist/plugin.js"]
];

rmSync(OUT, { recursive: true, force: true });   // www/ は毎回作り直す（gitignore 済みの生成物）
mkdirSync(join(OUT, "data"), { recursive: true });
for (const p of COPY) cpSync(join(ROOT, p), join(OUT, p), { recursive: true });

mkdirSync(join(OUT, "cap"), { recursive: true });
for (const [name, src] of CAP) {
  const from = join(ROOT, "node_modules", src);
  if (!existsSync(from)) throw new Error(`見つからない：${src}（npm install を先に）`);
  // source map の行は外す（.map は同梱しないため）
  writeFileSync(join(OUT, "cap", name), readFileSync(from, "utf8").replace(/\n\/\/# sourceMappingURL=.*$/m, "\n"));
}

let html = readFileSync(join(ROOT, "index.html"), "utf8");
html = html.replace(/<link rel="preconnect" href="https:\/\/fonts\.[^"]+"[^>]*>\n?/g, "")
           .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^"]*">\n?/g, "");
if (/fonts\.g(oogleapis|static)\.com/.test(html)) throw new Error("Google Fonts の <link> を外せなかった（index.html の形が変わった？）");
const tags = CAP.map(([name]) => `<script src="cap/${name}"></script>`).join("\n");
const anchor = '<script src="data/data.js"></script>';
if (!html.includes(anchor)) throw new Error("index.html に " + anchor + " が無い");
html = html.replace(anchor, tags + "\n" + anchor);
writeFileSync(join(OUT, "index.html"), html);

console.log(`www/ を作りました（${COPY.length} 項目＋Capacitor ${CAP.length} 本）`);
