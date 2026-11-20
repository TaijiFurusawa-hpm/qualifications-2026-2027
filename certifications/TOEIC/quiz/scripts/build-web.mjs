// アプリ（Capacitor）に入れるファイルだけを www/ に集める。`npm run build:web`
// - 載せてよいものを「名指し」で集める（blind/ content/ tools/ ux/ node_modules/ SPEC.md などは入らない）
// - index.html はアプリ用に1か所だけ書きかえる：Capacitor の本体と部品（node_modules の IIFE 版）を、
//   ほかの <script> より先に読む（window.Capacitor.Plugins.* が使える）。書体は fonts/ を同梱（ネットに出ない）
// - sw.js は入れない（アプリの中では Service Worker を登録しない：js/app.js の boot）
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "www");

const COPY = [
  "css", "js", "img", "audio", "fonts",
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
  ["keep-awake.js", "@capacitor-community/keep-awake/dist/plugin.js"],
  ["native-purchases.js", "@capgo/native-purchases/dist/plugin.js"]
];

// 同梱の日本語書体は使う文字だけに絞ってある（tools/fonts.py）。問題を足して控えに無い字が出たら、作り直しを促して止める
{
  const have = new Set(readFileSync(join(ROOT, "tools/fonts_chars.txt"), "utf8"));
  const srcs = ["index.html", "manifest.webmanifest", "data/data.js", "data/vocab.js",
    ...readdirSync(join(ROOT, "js")).filter(f => f.endsWith(".js")).map(f => "js/" + f)];
  const miss = new Set();
  for (const f of srcs) for (const ch of readFileSync(join(ROOT, f), "utf8")) if (ch.codePointAt(0) >= 0x3400 && !have.has(ch)) miss.add(ch);
  if (miss.size) throw new Error(`同梱書体に無い字 ${miss.size} 字（${[...miss].slice(0, 20).join("")}…）：tools/.venv/bin/python tools/fonts.py を流す`);
}

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
if (/fonts\.g(oogleapis|static)\.com/.test(html)) throw new Error("index.html が外の書体（Google Fonts）を読んでいる：アプリはネットに出ないので fonts/ を使う");
const tags = CAP.map(([name]) => `<script src="cap/${name}"></script>`).join("\n");
const anchor = '<script src="data/data.js"></script>';
if (!html.includes(anchor)) throw new Error("index.html に " + anchor + " が無い");
html = html.replace(anchor, tags + "\n" + anchor);
writeFileSync(join(OUT, "index.html"), html);

console.log(`www/ を作りました（${COPY.length} 項目＋Capacitor ${CAP.length} 本）`);
