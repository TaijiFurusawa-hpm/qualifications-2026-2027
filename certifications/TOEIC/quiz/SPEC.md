# TOEIC L&R 自作模試アプリ 仕様書（全エージェント共通の契約）

目的：本人専用の学習アプリ（目標840点）。公式問題の転載はしない。すべて自作。人名・社名は架空。
場所：このフォルダ（certifications/TOEIC/quiz/）。git の commit / push はしない。

## フォルダ
- content/*.json … 問題の正本（問題作成エージェントが書く）
- tools/ … build.py（検証→音声生成→data/data.js 出力）、blind.py（答え抜き出力と照合）、asr_check.py
- data/data.js … `window.TOEIC_DATA = {part2:[],part3:[],part4:[],part5:[],part6:[],part7:[]}`（build.py が生成）
- audio/{id}.mp3 … build.py が生成
- index.html, sw.js, manifest.webmanifest … アプリ本体

## 模試1回分の構成（Part 1 は作らない）
| Part | 番号 | content ファイル | 量 |
|---|---|---|---|
| 2 | 7–31 | part2.json | 25問（3択） |
| 3 | 32–70 | part3.json | 13セット×3問 |
| 4 | 71–100 | part4.json | 10セット×3問 |
| 5 | 101–130 | part5.json | 30問 |
| 6 | 131–146 | part6.json | 4セット×4問 |
| 7 | 147–200 | part7_single.json（10セット29問）＋ part7_multi.json（5セット25問） | 54問 |

番号（num）は build.py が id 順に振る。content には書かない。

## 共通ルール
- 各ファイルは JSON 配列。id は `P2-01` `P3-01` `P5-01` `P7S-01` `P7M-01` の形で連番。
- a は正解の位置（0始まり）。**選択肢はアプリで並べ替えない**ので、正解位置をファイル内でほぼ均等にする。
- e は日本語の解説。1問80〜140字。①正解の根拠（本文のどこか）②言い換え ③主なひっかけ、の順。選択肢を記号や位置（A、1番目）で指さず、内容で書く。
- tag は下の一覧から1つ。
- 難しさは本番並み。約3割は800点台で差がつく問題（言い換えが遠い、推測、複数の情報の照合）にする。
- 正解は必ず1つ。他の選択肢が正解と読める余地を残さない。
- 英文は自然なビジネス英語。日付・金額・人名は問題間で矛盾させない。

## 音声の声（voice キー）
US-F, US-F2, US-M, US-M2, UK-F, UK-M, UK-M2, AU-F（build.py が Mac の声に対応づける）。1つのファイルの中で米・英・豪をまんべんなく使う。

## スキーマ
### Part 2（part2.json）
`{id, tag, vq, va, prompt, c:[3], a, ja:{prompt, c:[3]}, e}`
vq=質問の声、va=応答3つを読む声（vq と性別か国を変える）。
tag: WH疑問文 / YesNo疑問文 / 否定・付加疑問文 / 選択疑問文 / 依頼・提案・申し出 / 平叙文
配分：WH 10、YesNo 4、否定・付加 3、選択 2、依頼・提案 3、平叙文 3。間接的な応答が正解の問題を8問以上。

### Part 3（part3.json）
`{id, intro, speakers:[{k:"M1",v:"US-M"},...], lines:[{s:"M1", t:"..."}], ja:["行ごとの和訳"], graphic?:{title, rows:[[..],[..]]}, qs:[{q, c:[4], a, e, tag}×3]}`
intro は "conversation" か "conversation with three speakers"。会話は6〜9発話、90〜130語。
tag: 主題・目的 / 詳細 / 次の行動 / 話者・場所 / 意図問題 / 図表問題
構成：P3-01〜10 は図表なし（うち2セットは3人の会話）、P3-11〜13 は図表つき（図表問題を1問ずつ。設問は "Look at the graphic." で始める）。意図問題は全体で3問。
### Part 4（part4.json）
`{id, intro, v, text, ja, graphic?, qs:[...×3]}`
intro は "telephone message" "announcement" "advertisement" "talk" "excerpt from a meeting" "broadcast" "tour information" など。90〜120語。P4-09・10 は図表つき。意図問題は全体で3問。tag は Part 3 と同じ。
graphic.rows は表の行（1行目が見出し）。

### Part 5（part5.json）
`{id, tag, q, c:[4], a, ja, e}`　q の空所は `-------`。ja は完成文の和訳。
tag: 品詞 / 動詞の形 / 前置詞・接続詞 / 代名詞・関係詞 / 語彙 / 語法・その他
配分：品詞 8、動詞の形 5、前置詞・接続詞 5、代名詞・関係詞 3、語彙 8、語法・その他 1。

### Part 6（part6.json）
`{id, doc, text, sum, qs:[{c:[4], a, e, tag}×4]}`
doc は "e-mail" "notice" "article" "advertisement" など。text は100〜130語で、空所を `{{1}}`〜`{{4}}` と書く。sum は日本語の要約1〜2文。
各セットに 文挿入 を1問（選択肢は文）。tag: 文挿入 / 語彙 / 文法（文脈で決まる時制・接続語を含む）

### Part 7（part7_single.json / part7_multi.json）
`{id, docs:[{type, title?, text}], sum:["文書ごとの日本語要約1〜2文"], qs:[{q, c:[4], a, e, tag}]}`
text は改行 `\n` 入りのプレーンテキスト（表は行をそろえて書く）。文挿入問題では本文に `[1]`〜`[4]` を入れる。
tag: 主旨・目的 / 詳細 / 推測 / NOT問題 / 言い換え（同義語） / 意図問題 / 文挿入 / 複数文書の照合
- single：10セット、設問数は 2,2,2,2,3,3,3,4,4,4。文書の種類をばらす（notice, e-mail, text-message chain, advertisement, form, online chat discussion, article, letter, web page, memo）。後ろのセットほど長く（100語→300語）。意図問題2、文挿入2、NOT問題3、同義語1〜2を含める。
- multi：P7M-01・02 は2文書、P7M-03〜05 は3文書。各5問。複数文書の照合を、2文書セットに1〜2問、3文書セットに2問。同義語問題を全体で2問。

## 作成後の自己点検（問題作成エージェント）
1. `python3 -c "import json;json.load(open('content/xxx.json'))"` が通る。
2. セット数・問題数・tag の配分・正解位置の偏りを数えて確かめる。
3. 自分の問題を答えを隠して解き直し、正解が1つに決まるか確かめる。
最終報告は5行以内（作った数、正解位置の分布、気になる点）。問題の中身は報告に貼らない。

## 英単語特訓（content/vocab.json）
目的：TOEIC 900点で求められる単語力。見出し語は content/vocab_words.tsv（レベル・語・狙う意味のヒント）で決まっている。語を足す・削るときは tsv を先に直す。
レベル（lv）：1＝730〜800点、2＝860点、3＝900点以上（多義語・難語・言い回し）。

### スキーマ
`{w, pos, lv, ja, ex, f, exja, syn:[1〜3], d:[3], note?}`
- w：見出し語（tsv のとおり。変えない）。lv：tsv のとおり。
- pos：`動` `名` `形` `副` `前・接` `句` のどれか（例文での使い方に合わせる。句動詞は `句`）。
- ja：TOEICで問われる意味を日本語で。22字以内、語義は1〜2個。tsv にヒントがある語はその意味を先頭に書く。動詞は「〜を合理化する」のように書く。
- ex：例文1つ。9〜17語。TOEICに出る場面（オフィス、人事、経理、物流、不動産、製造、出張、販促、契約、イベントなど）。
  **空所にしても答えが1つに決まるように、文脈の手がかりを文中に入れる**（例：`To cut approval times, the firm will streamline its purchasing process.`）。人名・社名は架空。
- f：ex の中に出てくる形そのまま（活用していてよい。例 w=`streamline` → f=`streamlined`）。ex の中に f がちょうど1回、単語の区切りで現れること。句は途中に他の語をはさまない。
- exja：ex の自然な和訳。
- syn：TOEIC の Part 7 で言い換えに使われる英語の語句を1〜3個（例文の f と置き換えて意味が通るもの）。
- d：空所問題の誤答3つ。**f と同じ品詞・同じ形（時制・数・-ing/-ed・句の型）にそろえ、文法だけでは消せないようにする。ただし意味ではっきり入らないこと。** 同義語・近い意味の語・入れても意味が通る語は使わない。TOEIC頻出の語から選ぶ。3つとも別の語で、f とも違うこと。
- note：任意。40字以内。語法・コロケーション・派生語・まぎらわしい語のどれか（例：`comply with 〜（自動詞）`）。なければ書かない。

### 確認
`python3 tools/vocab.py validate`（形の検査）→ `vocab.py blind-export` → Sonnet に答えなしで空所問題を解かせる → `vocab.py blind-compare` → 直す → `vocab.py audio` → `vocab.py data`（data/vocab.js）。
音声は audio/v/{id}.mp3（単語）と audio/v/{id}_s.mp3（例文）。id は w を小文字にして英数字以外を `_` にしたもの。
音声の検査：`python3 tools/asr_vocab.py`（単語音声を文字起こしして見出し語と照合）。1語だけの音声は英国系の声で崩れやすいので、食い違った語は `tools/vocab_voice.json`（`{"語": "US-F"}`）で声を指定して `vocab.py audio` をやり直す。
