#!/usr/bin/env node
/* ==========================================================
   クイズ検証スクリプト（2026-08-26 作成）
   ----------------------------------------------------------
   使い方:
     node quiz/verify.js                        … index.html の全問を検証
     node quiz/verify.js quiz/drafts/xxx.js     … 投入前のドラフト単体を検証
   ★出題時に選択肢はシャッフルされる（2026-08-26 実装）。したがって
     解説に【選択肢3に着地する】のような位置表現を書かないこと（金額・内容で書く）。
   ★ドラフトは【index.html に入れる前に】必ずこれを通すこと
     （2026-08-26、挿入してから検証してアプリ全体を壊した事故の対策）
   ========================================================== */
const fs = require('fs');

// 他問への参照＝単独出題で解けなくなる（2026-08-26 S43・F49 で発覚）
const REF_PATTERNS = [
  /(?:設定|条件|設例|前提|数値)は?\s*[A-Z]?\d*\s*と同じ/,
  /上記の/, /前問/, /直前の問/, /先ほどの/, /同じ設例/,
];

function check(items, label) {
  let bad = 0, warn = 0;
  const ids = new Set();
  const pos = {0:0, 1:0, 2:0, 3:0};
  for (const q of items) {
    const err = [], wrn = [];
    if (!q.id) err.push('idなし');
    if (ids.has(q.id)) err.push('ID重複');
    ids.add(q.id);
    if (!Array.isArray(q.c) || q.c.length !== 4) err.push(`選択肢が4でない(${(q.c||[]).length})`);
    if (!Number.isInteger(q.a) || q.a < 0 || q.a > 3) err.push(`正解indexが不正(${q.a})`);
    else pos[q.a]++;
    if (![1,2,3].includes(q.t)) err.push(`tierが不正(${q.t})`);
    if (!q.q) err.push('設問なし');
    if (!q.e) err.push('解説なし');
    if (!q.s) wrn.push('出典なし');
    // 半角ダブルクォート（DATA文字列を壊しアプリ全体が起動しなくなる）
    for (const [k, v] of Object.entries(q)) {
      const vals = Array.isArray(v) ? v : [v];
      for (const x of vals) if (typeof x === 'string' && x.includes('"')) err.push(`${k}に半角ダブルクォート`);
    }
    // ★他問への参照（単独出題で解けない）
    for (const re of REF_PATTERNS) if (q.q && re.test(q.q)) err.push(`設問が他問を参照(${q.q.match(re)[0]})＝単独で解けない`);
    if (err.length) { bad++; console.log('❌', label, q.id, err.join(' / ')); }
    if (wrn.length) { warn++; console.log('⚠️ ', label, q.id, wrn.join(' / ')); }
  }
  // 正解位置の偏り
  //   2026-08-26 に index.html へ選択肢シャッフルを実装したため、
  //   文章の選択肢は出題時に並べ替えられる＝偏っていても実害はない。
  //   ただし【数値だけの選択肢】は本試験と同じ昇順を保つため並べ替えない → ここだけ偏りが残る。
  const NUMERIC = /^[\s0-9,.，、０-９]+(円|千円|万円|億円|%|％|倍|年|年間|ヵ月|か月|月|日|株|口|㎡|人|件)?$/;
  const fixed = items.filter(q => Array.isArray(q.c) && q.c.every(c => NUMERIC.test(String(c))));
  if (fixed.length >= 8) {
    const fp = {0:0, 1:0, 2:0, 3:0};
    fixed.forEach(q => { if (Number.isInteger(q.a)) fp[q.a]++; });
    const skew = Object.entries(fp).filter(([, c]) => c > fixed.length * 0.5);
    if (skew.length) console.log(`⚠️  ${label}: 【数値のみ＝並べ替えない】${fixed.length}問で正解位置が偏っている ${JSON.stringify(fp)}（肢${Number(skew[0][0])+1}に${skew[0][1]}）`);
  }
  const n = items.length;
  return { bad, warn, n, pos };
}

const target = process.argv[2];
let totalBad = 0, totalN = 0;

if (target && target.endsWith('.js')) {
  const src = fs.readFileSync(target, 'utf8');
  let items;
  try { items = eval('[' + src + ']'); }
  catch (e) { console.error('❌ パース失敗:', e.message); process.exit(1); }
  const r = check(items, 'draft');
  totalBad += r.bad; totalN += r.n;
  console.log(`\nドラフト ${r.n}問  正解位置 ${JSON.stringify(r.pos)}`);
} else {
  const html = fs.readFileSync(target || 'quiz/index.html', 'utf8');
  const s = html.indexOf('const DATA = {');
  const e = html.indexOf('/* ===== localStorage', s);
  if (s < 0 || e < 0) { console.error('❌ DATAブロックが見つからない'); process.exit(1); }
  let DATA;
  try { DATA = eval('(' + html.slice(s, e).replace(/^const DATA = /, '').replace(/;\s*$/, '') + ')'); }
  catch (err) { console.error('❌ DATAのパース失敗（アプリが起動しない状態）:', err.message); process.exit(1); }
  for (const [subject, arr] of Object.entries(DATA)) {
    if (!Array.isArray(arr)) continue;
    const r = check(arr, subject);
    totalBad += r.bad; totalN += r.n;
    console.log(`${subject}: ${r.n}問  正解位置 ${JSON.stringify(r.pos)}`);
  }
}
console.log(`\n合計 ${totalN}問 / エラー ${totalBad}`);
process.exit(totalBad ? 1 : 0);
