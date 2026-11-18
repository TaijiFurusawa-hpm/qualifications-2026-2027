# ビジュアル／モーション／触覚 調査メモ（TOEIC模試＋単語アプリ・Capacitor）

調査日：2026-11-19　／　対象：iOS・Android（Capacitor 8＝WKWebView / Android System WebView）、オフライン、買い切り
目的：デザイナーが「5〜6案の見た目の方向性」と「ボタンの手触り・演出」を提案するための素材集。

## 0. 読み方（検証ステータス）

| 記号 | 意味 |
|---|---|
| ✅ | 今回、一次ソース（公式ドキュメント／公式ソースコード／公式ニュースルーム／公式ブログ）を直接読んで確認 |
| △ | 二次情報（解説記事・まとめサイト）のみ。傾向としては使えるが断定しない |
| 未確認 | 一次で確認できなかった／実機で未検証。そのまま使わない |
| 計測 | 今回この環境で実際に測定・生成した値（再現手順あり） |

引用は英語原文を15語以内に切っている。Apple公式の受賞コメントは Apple の説明文であり、アプリの画面そのものを私が見たわけではない（画面の見た目は「Apple説明文＋Behind the Design記事で言及されている範囲」に限る）。

### 0.1 先に結論（設計者向け 12行）

1. **Liquid Glass は「ネイティブのコントロール／ナビ層の素材」**。Appleは「コンテンツ層には使うな、カスタムでは控えめに」と明記（✅）。WebView内のHTMLは自動では適用されない（未確認：実機）。WebではCSS `backdrop-filter` の近似になり、`backdrop-filter:url(#svg)` による屈折はChromium系のみ（△）。可読性の批判も大きい（NN/g ✅）。**試験アプリの本体に全面採用はしない**のが安全。
2. **Material 3 Expressive は「大きい丸み・形の変化・スプリング・強調タイポ」**。Googleの研究値は「46研究・18,000人超・重要要素を最大4倍速く発見」（✅、ただしGoogle自身の数値）。スプリングのトークンは公式ソースで確認済み（§1.2）。
3. **スプリング定数を CSS `linear()` に変換済み**（§1.3）。`linear()` は iOS 17.2+ / WebView 113+。Capacitor 8 の最小 iOS は 15 なので、**iOS 15–17.1 には Web Animations API で生成したキーフレームのフォールバックが必要**（§4）。
4. **Apple Design Award（VG/DF）の共通項**：①一貫したイラスト／キャラ体系（Duolingo, Bears Gratitude, Vocabulary, grug）②物理メタファの触感（Not Boring Habits の長押しチェック、CapWords の「剥がしてシール」、Halide のフィルムカメラ）③文脈に合わせた配色（Tide Guide の空連動、Lumy）④データ画面は静かに（§2）。
5. **単語学習系の直接の先行例**：CapWords（2025 DF受賞）、Vocabulary - Learn words daily（2025 VG finalist「charming, consistent illustrations that create a clean visual style」）、Duolingo（2023 DF）。
6. **Duolingo の公式デザインサイト design.duolingo.com は 2026-11-19 時点で blog.duolingo.com/hub/design/ にリダイレクト**され、色・書体のスペックは取得できなかった。色コード（Feather Green #58CC02 等）は二次情報のみ（△）。
7. **Capacitor Haptics の実装を実ソースで確認（✅）**：Androidは `HapticFeedbackConstants` ではなく**波形バイブ（43〜60ms）**を使用＝Android公式が「避けよ」と言うタイプ（key-click は10〜20msが良い）。iOSは impact／notification で**毎回generatorを生成し `prepare()` を呼ばない**（selection のみ `prepare()` あり）。**ボタンの手触りにこだわるなら、薄い自作プラグイン（Swift/Kotlin 各20行程度）に差し替える価値が高い**（§5.2）。
8. **音は「サイレント時は鳴らさない」が必須（HIG ✅）**。ただしリスニング音声は本番と同じく鳴らす必要がある。MDNによれば `AudioContext`＝ambient（サイレント尊重）、`<audio>`＝playback（無視）が既定 → **効果音は Web Audio、リスニングは `<audio>`** の分担が理にかなう。WKWebViewでの実挙動は未確認＝実機で必ず検証（WebKitバグ報告あり）。
9. **フォント**：全てOFL（商用・同梱可）。**app全データの使用文字だけに絞ると 1フォントあたり約160〜410KB（woff2）**、JIS X 0208 全体でも約0.5〜1.8MB（§6、計測）。**Murecho はアプリ内の漢字15字が未収録**（伊・剪・厨・婉・揃・暢・梱・漕・濡・焙・綴・董・迂・釉・餐）→単独使用は不可。
10. 現行UIで使っている記号のうち ⚑ ⏱ ⚐ は**調べた10フォント全てで未収録**、▶ も半数で未収録（フォールバック描画になる）→SVGアイコン化を推奨（計測）。
11. **模試中は静か、練習と結果で演出**：HIGは「頻繁な操作にモーションを足すな」「アニメの完了を待たせるな」と明記（✅）。これを方向性ごとの「モード別の演出量」の根拠にできる。
12. 英語長文（Part 7）の書体：画面上で serif と sans の読みやすさに**一貫した差はない**というレビュー（△、Springer章）。**書体の種類より、サイズ・行間・行長・コントラストを優先**し、サイズ調整（A−/A+）を付ける。

---

## 1. プラットフォームの設計言語

### 1.1 Apple「Liquid Glass」（iOS 26、WWDC25）

**何か（✅）**
- Apple公式：「translucent software material」で、周囲を「reflects and refracts」し、動きに反応して specular highlight が動く。コントロール（ボタン、スイッチ、スライダー）／ナビ（タブバー、サイドバー）／ホーム画面・ロック画面などに適用。タブバーはスクロールで縮み、戻すと展開。（Newsroom）
- HIG Materials：Liquid Glass は「コントロールとナビゲーションの機能層」で、コンテンツの上に浮く。**「Don't use Liquid Glass in the content layer.」**（コンテンツ層では標準マテリアルを使う）。例外：スライダーやトグルのつまみは操作中だけ Liquid Glass 化。**「Use Liquid Glass effects sparingly」**。
- 2バリアント：**regular**（背景をぼかし輝度を調整して文字の可読性を保つ。アラート／サイドバー／ポップオーバー向け、システム部品の既定）と **clear**（高透過。写真・動画など視覚的に豊かな背景の上だけ）。clear の下地が明るい場合は「**dark dimming layer of 35% opacity**」を検討。
- ユーザーの設定（透明度を下げる／コントラストを上げる／Liquid Glassの見た目の好み）でバリアントの見え方が変わる。
- 標準マテリアル（ultra-thin / thin / regular / thick）はコンテンツ層で継続使用。文字は vibrant color を使うこと。
- 採用API：SwiftUI `glassEffect`、`PrimitiveButtonStyle.glass / .glassProminent`、UIKit `UIGlassEffect`、複数をまとめる `GlassEffectContainer`（性能最適化と形の連続変形）。**同心の角丸**（`ConcentricRectangle`）で入れ子の要素を端末の角に合わせる。スクロールエッジ効果（スクロール下のコンテンツをぼかし・不透明度を下げ可読性確保）。旧見た目を保つ `UIDesignRequiresCompatibility` キー（Adopting Liquid Glass ✅）。
- コントロールは丸み増、特大サイズの選択肢あり、ボタンはメニュー／ポップオーバーへ滑らかに変形（✅）。
- モーション：「Liquid Glass の動きは直接タッチには強め、トラックパッドでは控えめ」（HIG Motion ✅）。

**可読性の注意（✅ NN/g、Appleとは別視点）**
- NN/g（Raluca Budiu）：画像上の半透明要素は文字・アイコンのコントラストを下げる。「Text on top of images is a bad idea.」「Motion for motion's sake is not usability.」。タップ領域が詰まる、検索の移動、戻るボタンのラベル欠落など慣習の破壊も指摘。
- 「Reduce Transparency／Reduce Motion」で効果が変わることを前提に、カスタム要素も両設定でテストせよ（Adopting ✅）。

**このアプリへの含意（私の整理）**
- WKWebView内のHTML要素は Liquid Glass 素材にならない（未確認：実機で確認要）。ネイティブ側の見た目（ステータスバー、システムのシート／アラート／キーボード）だけが新OSで変わる。
- Webでの近似：`backdrop-filter: blur() saturate()`＋細い内側ハイライト（1px白20%）＋薄い影。iOS 18.0未満では `-webkit-backdrop-filter` 必須（BCD 計測）。屈折（SVG displacement）はChromium系のみ（△）→Android WebViewのみで可、iOSでは使えない。
- **試験アプリの使いどころ**：下部ナビや結果画面の浮遊ボタンなど「操作層」限定。問題文・選択肢・長文（コンテンツ層）には使わない（HIGとNN/gの双方に整合）。

### 1.2 Google「Material 3 Expressive」（2025）

**研究の主張（✅ design.google、Google自身の調査）**
- 「46 separate studies」「18,000人超」、視線計測・調査・実験・ユーザビリティテスト。
- 表現的デザインは全年齢で好まれ、18–24歳で最大87%。「energetic, emotive, positive vibe, creative, playful, friendly」等の感情評価が上昇。ただし「strong minority」は落ち着いた版を好む。
- 重要UI要素を**最大4倍速く**発見（10アプリ）。メールの大きい Send ボタンも4倍速。45歳以上も若年層と同等の視線固定時間。
- 要素：color, shape, size, motion, containment。限界：見慣れない構成（プレイリストの非構造化など）は使いやすさが低下。ラベル除去も悪化。

**スプリング（モーション物理）トークン（✅ androidx 公式ソース `ExpressiveMotionTokens.kt` / `StandardMotionTokens.kt`、質量1・Compose の `spring(dampingRatio, stiffness)`）**

| トークン | Expressive（damping / stiffness） | Standard |
|---|---|---|
| Fast spatial（小部品の移動：スイッチ、ボタン） | **0.6 / 800** | 0.9 / 1400 |
| Default spatial（部分画面：ボトムシート、ドロワー） | **0.8 / 380** | 0.9 / 700 |
| Slow spatial（全画面の移動） | **0.8 / 200** | 0.9 / 300 |
| Fast effects（色・不透明度、小部品） | 1.0 / 3800 | 1.0 / 3800 |
| Default effects | 1.0 / 1600 | 1.0 / 1600 |
| Slow effects | 1.0 / 800 | 1.0 / 800 |

- 「spatial＝形・位置が変わる（オーバーシュート可）」「effects＝色・不透明度（damping 1＝跳ねない）」の二層（Compose `MotionScheme` ✅）。Expressive は「prominent UI elements and hero interactions」向け、Standard は「utilitarian UI elements and recurring interactions」向け（✅）。→**この区別がそのまま「練習・結果＝Expressive、模試中＝Standard」の根拠になる**。
- 注意：Flutterパッケージ等は defaultSpatial を 0.73 などと記載する（△）。上表の公式ソース値を優先。
- 従来イージング（Views版）：Standard `cubic-bezier(0.2, 0, 0, 1)`、Emphasized decelerate `cubic-bezier(0.05, 0.7, 0.1, 1)`、Emphasized accelerate `cubic-bezier(0.3, 0, 0.8, 0.15)`。継続時間トークン：Short 50/100/150/200、Medium 250/300/350/400、Long 450–600、ExtraLong 700–1000 ms（✅ Motion.md）。

**形（角丸スケール、✅ Shape.md）**：None 0 / XS 4 / S 8 / M 12 / L 16 / **L-increased 20** / XL 28 / **XL-increased 32** / XXL 48 / Full 50%（dp）。
- 形の変形：ボタンは**押下時・選択時に形が変わる**。トグルボタンは選択で round → square が既定（✅ CommonButton.md、具体の角丸値は記載なし）。「35 shapes」のモーフィング形状ライブラリは二次情報のみ（△ 9to5Google）。

**ボタン／部品（✅ 公式 docs）**
- ボタンサイズ：XS / S（既定）/ M / L / XL。小ボタンのパディングは16dp推奨。ラウンドが既定、スクエアも選べる。
- ボタングループ：標準＝間隔12dp、**コネクテッド＝間隔2dp・内側角8dp・外側は全丸**。押下時に子要素が**15%サイズ変化**、隣の幅も変わる（ButtonGroup.md）。
- Loading indicator：形が連続変形（morph）するインジケータ。**5秒未満の待ち**用。既定 インジケータ38dp／コンテナ48dp。
- Wavy progress：線／円のプログレスに波（wavelength/amplitude）。厚い版は track 8dp＋角丸4dp、円は52dp推奨。長い処理向け。
- タイポ：Type scale は Display 57/45/36、Headline 32/28/24、Title 22/16/14、Body 16/14/12、Label 14/12/11（sp）。**Emphasized 版**（Medium/Bold へ1段太く）が追加（✅ Typography.md）。

### 1.3 スプリング → CSS `linear()` 変換済みプリセット（計測：このメモの作成時に生成）

減衰振動の解析解（質量1、ω=√stiffness、ζ=damping）で25点サンプル。**`transition-duration` はコメントの値を使う**。`linear()` 自体は iOS 17.2+/WebView 113+（MDN BCD）。未対応環境は `ease-out` 等にフォールバック（`@supports (transition-timing-function: linear(0,1))`）。

```css
:root{
  /* Material 3 Expressive（公式トークン）  overshoot 9.5%  → 350ms */
  --ease-m3x-fast:    linear(0, .0709, .2359, .4369, .6335, .8017, .9305, 1.0184, 1.0697, 1.0919, 1.0934, 1.0821, 1.0645, 1.0452, 1.0275, 1.0131, 1.0026, .9958, .9922, .991, .9915, .9929, .9947, .9965, 1);
  /* Material 3 Expressive default spatial  overshoot 1.5% → 410ms */
  --ease-m3x-default: linear(0, .0468, .1561, .2925, .4332, .5642, .6784, .7728, .8477, .9045, .946, .975, .9941, 1.0057, 1.0121, 1.0148, 1.0151, 1.0139, 1.0121, 1.01, 1.0079, 1.006, 1.0043, 1.003, 1);
  /* Material Standard default spatial（跳ねない・実用）→ 220ms */
  --ease-m3-std:      linear(0, .0254, .0881, .1718, .2652, .3605, .4523, .5377, .6147, .6828, .7419, .7923, .8347, .87, .8989, .9224, .9413, .9563, .968, .9771, .9841, .9894, .9933, .9961, 1);
  /* SwiftUI .bouncy 相当（duration .5, bounce .3 → ζ=.7）  overshoot 4.6% → 730ms ※換算式は未確認 */
  --ease-swiftui-bouncy: linear(0, .0607, .201, .3724, .5428, .6936, .8162, .9085, .9728, 1.0135, 1.0359, 1.045, 1.0453, 1.0404, 1.0331, 1.0251, 1.0176, 1.0112, 1.0063, 1.0027, 1.0002, .9988, .9981, .9979, 1);
  /* SwiftUI .snappy 相当（bounce .15 → ζ=.85）overshoot 0.6% → 640ms */
  --ease-swiftui-snappy: linear(0, .0467, .1543, .2872, .4231, .549, .6585, .7495, .8222, .8785, .9206, .9511, .9726, .987, .9963, 1.0018, 1.0048, 1.0061, 1.0063, 1.0058, 1.0051, 1.0043, 1.0034, 1.0026, 1);
}
```
- SwiftUI の `Spring(duration:bounce:)` は「stiffness=(2π/duration)²、ζ=1−bounce」と私は記憶しているが、WWDC23の該当セッションを今回読めていない＝**未確認**。プリセット値（smooth 0.5/0、snappy 0.5/0.15、bouncy 0.5/0.3）も二次の記憶ベース＝**未確認**。Apple公式ページ（developer.apple.com/documentation/swiftui/spring）は今回本文を取得できなかった。
- 汎用ジェネレータ：Jake Archibald / Adam Argyle の Linear Easing Generator（Spring / Bounce / Simple elastic / Material emphasized のプリセットあり）✅。

---

## 2. Apple Design Award「Visuals and Graphics（VG）」「Delight and Fun（DF）」2022–2026

出典：Apple Developer（各年の awards ページ）と Newsroom（✅ 取得済み）。引用は Apple の説明文の抜粋（15語以内）。「視覚処理」欄は**公式文＋Behind the Design 記事で確認できる範囲のみ**。確認できないものは「—（未確認）」。

| 年 | 部門 | 作品（開発） | Apple説明文（抜粋） | 視覚／触感の処理（確認済みの範囲） | このアプリへの示唆 |
|---|---|---|---|---|---|
| 2026 | VG App 受賞 | Tide Guide: Charts & Tables（Condor Digital） | "Tide tracker with Liquid Glass integration and sky-matched palette" | 全画面チャートにカスタムアニメ、水の世界観、**時間帯の空に合わせた配色**（Newsroom） | 「成績／スコア推移」の配色を時間帯・モードに連動させる発想 |
| 2026 | VG finalist | (Not Boring) Camera | "Tactile, retro-styled camera with big buttons and pro features" | **大きなボタン＋レトロな触感**（詳細未確認） | ボタンの物理感の参照 |
| 2026 | VG finalist | SILT | "Haunting monochrome underwater puzzler that makes stunning use of light and shadow" | 白黒＋光と影 | 白黒写真（本番の問題用紙）との相性の参照 |
| 2026 | DF App 受賞 | grug（Ocho） | "Playful daily affirmations in Neolithic grunts, with scribbled, hand-drawn design" | **走り描きの手描き**。薄い水色の背景にハート等の絵（画面キャプション） | 手描きの「ゆるさ」は単語カード・励ましに（試験本体には不向き） |
| 2026 | DF Game 受賞 | Is This Seat Taken?（Poti Poti） | "Cartoon logic puzzler about seating people by their quirky personalities" | カートゥーン調の車内。「Playful interactive elements」 | — |
| 2026 | DF finalist | PowerWash Simulator / Blippo+ / BALL x PIT | "…nozzle-specific haptics…" / "Retro-futurist…" / "retro visuals that shine on HDR" | 触覚の作り分け、レトロ未来、HDR | 触覚を「道具ごとに変える」発想 |
| 2025 | DF App 受賞 | **CapWords**（HappyPlan Tech） | "Learn the name of a thing by taking a picture of it." | **写真を切り抜いてシール化→単語帳に集める**。確認ステップ中に**マイクロアニメ**で待ち時間を感じさせない。音はAVAudioEngine＋Neural Voice。記事は「**sound, touch, and sight cues**」と記述。具体の色・書体・触覚APIは記事に記載なし | **語彙＝コレクション**という報酬設計。6段階のレベル解放と相性良 |
| 2025 | DF Game 受賞 | Balatro（LocalThunk） | "a precisely calibrated mix of poker, solitaire, deck-building, and chaos" | —（未確認。画面は見ていない） | 「調整された手応え」の一般論のみ |
| 2025 | DF finalist | Lumy / Denim | "carefully curated color palette…" / "smooth scroll transitions and elegant text and mesh gradients" | **厳選パレット**／**メッシュグラデ＋滑らかなスクロール遷移** | 配色を絞る／結果画面の背景にメッシュグラデ |
| 2025 | VG App 受賞 | Feather: Draw in 3D | "transform their 2D designs into fully immersive 3D creations" | 3D制作ツール | 参考度低 |
| 2025 | VG finalist | **Vocabulary – Learn words daily**（Monkey Taps） | "charming, consistent illustrations that create a clean visual style" | **一貫したイラスト体系＋クリーンな面構成** | **語彙アプリの直接の参照。イラストの一貫性が評価点** |
| 2025 | VG Game 受賞 | Infinity Nikki | "A wonderland of texture, light, and animation" | 質感・光・アニメ | 参考度低 |
| 2024 | VG App 受賞 | Rooms（Things, Inc.） | "An incredible canvas for creativity, set in a nostalgic 8-bit world." | **ボクセル（3Dブロック）**、柔らかく親しみやすい形、揺れ（sway）で木が生きる | ピクセル／ブロック方向の根拠 |
| 2024 | DF App 受賞 | Bears Gratitude | "Journaling apps just don't get much cuter than Bears Gratitude" | **手描きのシンプルなマスコット**、スワイプ式のカード、絵が全体を牽引（"The art drives everything."） | 手描きマスコットで継続習慣を支える |
| 2024 | DF Game 受賞 | NYT Games | "New titles like Connections are calibrated for maximum replay value" | ナビ再設計、毎日の習慣 | 「毎日1つ」型の設計 |
| 2023 | DF App 受賞 | **Duolingo** | "Users come for the expanding catalog of dialogues and stay for the delightful characters." | 固定キャラ陣、正解時の**控えめなキャラアニメ**、「path」型ナビ | 学習アプリ最大の参照（§3.1） |
| 2023 | VG App 受賞 | Any Distance | "design-forward workout tracker, delivering shareable and dynamic graphics" | **楕円の写真マスクがブランド**、3Dマップ、共有用カード。色・書体は記事に記載なし | 結果画面の**共有カード**（スコア証跡）の発想 |
| 2023 | DF Game | Afterplace | "a vintage pixel adventure with a contemporary twist" | ピクセル | ピクセル方向 |
| 2022 | DF App 受賞 | **(Not Boring) Habits**（Andy Works） | "adds a little flair to the mild-mannered habit tracker" | **チェックは長押し必須**で押し続けるフィードバックを設計。**独自触覚＋独自音＋パーティクル＋Blender製3D**を重ねる。記事で触覚を "zingy"/"playful"、チェックを「explosion」と表現。"thousands of iterations" | **ご褒美の瞬間に触覚・音・粒子を同時に重ねる**設計。ただし「毎回」ではなく節目のみ |
| 2022 | VG App 受賞 | Halide Mark II（Lux Optics） | "focuses on the essentials" | フィルムカメラを想起させるUI（Newsroomの説明） | 計器的・機械的な操作感の参照 |

**パターン抽出（私の整理）**
1. **一貫したキャラ／イラスト体系**が長期の愛着を作る（Duolingo, Bears, Vocabulary, grug）。ただし試験本体の画面は静かに。
2. **物理メタファ**（シール、フィルムカメラ、長押しチェック、大きい物理ボタン）が「手触り」の評価につながる。
3. **配色は文脈連動／厳選**（Tide Guide, Lumy）。
4. **ご褒美の瞬間は多感覚を重ねる**（Habits：触覚＋音＋粒子）。日常操作は控えめ（HIG）。
5. **レトロ／ピクセル／ボクセル**は毎年一定数の受賞（Rooms, Afterplace, Blippo+, BALL x PIT）。

---

## 3. 学習系UIに関連する公開デザイン資料

### 3.1 Duolingo
- **公式サイト**：design.duolingo.com は 2026-11-19 時点で blog.duolingo.com/hub/design/ にリダイレクトされ、スペックページは取得不可（✅ 確認）。ハブには「Elevating craft: How we refreshed our core tabs」ほか4記事のみ。
- **形・イラスト（✅ 公式ブログ）**：「minimalist and playful」、ベクター、**白い余白で囲む**、必要最小限のディテール、誇張・ユーモア。2018年の再設計で**落ち着いた色から vibrant color と丸い形＋白背景**へ。重要な形を少数に絞りシルエットで認識させる。角度のある線で視線を誘導、アニメ（スキルアイコン）で注意喚起。
- **Duoの再設計（✅）**：まず**シルエット**、動きは後から。数か月・日次レビュー。
- **コアタブ再設計（✅ 2026-02）**：バラバラだったヘッダーを統一、**コンテナ・枠線を減らし余白で分離**、タイプスタイル削減、装飾の削除（"Good design means knowing what to remove and what to keep."）。**ソリッドでビビッドなヘッダー色**（ピンク／濃紺／オレンジ）を検証。結果：エンゲージメント向上、学習指標は維持。
- **モーション技術（✅）**：キャラは **Rive**（ステートマシン、20種超の口形＝viseme、正解／不正解のリアクション状態、音声に同期）。**Lottie** は数千ファイルを使用（LottieFiles事例、"Lottie helps us keep file sizes small…"）。
- **書体・色（△）**：見出し **Feather Bold**（Fontsmith / Johnson Banks、2019）、本文 **DIN Next Rounded**（商用）。Feather Green #58CC02 等は二次情報のみ。**公式一次では未確認**。
- **「3D風の押し込みボタン」**：Duolingo自身の仕様説明は見つからず。二次では「下辺の太い縁＋押下で縁が消え下に沈む」と説明される（△）。実装は §4.1（Josh Comeau のパターン✅ ）を使う。
- **示唆**：Duolingoの“ゲーム感”はキャラ＋Rive＋色の組合せ。**成人の試験対策では「キャラ無し／控えめ版」**が現実的（キャラを入れる場合は単語帳の“案内役”に限定）。

### 3.2 Headspace
- 公式 design.headspace.com は名前解決できず（環境起因）、**公式スペックは未確認**。
- ✅ Apple「Behind the Design: Headspace」：「warm, friendly, and easy to use」、**表層は単純・奥に深さ**（"simplicity at the surface… incredible depth of content underneath"）、タブ（瞑想/集中…）を「Today」タブへ統合、分類は平易な言葉（"Mindful Eating"）。明るいオレンジ背景に笑顔の花のイラスト。
- △ 二次：イラストは丸い形で鋭角なし、感情→色・動きの対応（落ち着き＝やわらかい青・ゆっくりの雲、喜び＝コーラル・上向き）。呼吸アニメ。
- **示唆**：言葉・ラベルを平易にする、1日の入口を1つにする（現行ホームの課題と直結）。

### 3.3 Things（Cultured Code）— ミニマルな磨き込み
- ✅ 公式サイト：Apple Design Award を2回受賞、レビュー引用「Lovely, unfolding animations」「Each animation is purposeful」（Craig Mod）、"a clean, crisp piece of paper"。**"Magic Plus" ボタン等の具体仕様は公式サイトに記載なし＝未確認**。
- **示唆**：装飾でなく**1つ1つのアニメに目的**がある設計。方向性「Quiet Paper」の参照。

### 3.4 Lottie / Rive（実測：npm パッケージを取得してサイズ計測）
| ライブラリ | ライセンス | サイズ（計測。1KB=1,000B） | 備考 |
|---|---|---|---|
| lottie-web 5.13.0（lottie_light.min.js） | MIT | 168KB / gzip 47KB（フル版 306KB / gzip 77KB） | AE→Bodymovin JSON。SVG/Canvas/HTML レンダラ。公式ページは保守状況に言及なし（未確認） |
| @lottiefiles/dotlottie-web 0.83.2 | MIT | JS 161KB(gz 31KB)＋WASM 1.2MB(gz 0.49MB) | `.lottie` 圧縮形式。WASMが重い |
| @rive-app/canvas-lite 2.51.0 | MIT | JS 553KB(gz 125KB)＋WASM 892KB(gz 368KB) | ステートマシン（正誤で状態遷移）。Rive Text/Layout/Audio は lite 非対応 |
| canvas-confetti 1.9.4 | ISC | 25KB / gzip 6.9KB | `disableForReducedMotion` オプションあり ✅ |
- 現行は「素のJS・外部ライブラリなし」。**演出の大半は CSS＋WAAPI＋自作Canvas（紙吹雪60行程度）で実現でき、ライブラリは不要**。キャラクターを動かす場合のみ Rive / Lottie を検討（容量とオフライン同梱に注意）。

### 3.5 日本語の落ち着いたデジタル表現の手がかり
- **デジタル庁デザインシステム（✅ v2.18.3 β）**：書体は **Noto Sans JP**（OFL）、本文は**16px以上**、**14px未満は不可**、ウェイトは**400と700の2つ**、行間は**本文最小150%**・一般Web本文は**160–175%**（CSSは無単位 1.7 等）、日本語に斜体は使わない。コントラストは**文字4.5:1／枠線・アイコン3:1**。フォーカス色は Yellow-300＋黒アウトライン。→ **「本文16px・行間1.7」を日本語UIの基準線**にできる。
- **MUJI（原研哉）**：「エンプティ（空っぽ）」＝使い手が自由に意味を注げる余白（△：公式の原研哉インタビューページ muji.com/jp/flagship/huaihai755/archive/hara.html の存在は検索結果で確認、本文は取得タイムアウトで未読＝**引用は未確認**）。「余白＝何もない」ではなく「受け止める器」。
- **伝統色（△、Wikipedia。伝統色名に規範的なHEXは無く出典で値が揺れる）**：藍色 #264348／紺 #192236／群青 #5D8CAE／瑠璃 #1F4788／浅葱 #48929B／縹 #044F67／朱 #FF3500／萌黄 #5B8930／若竹 #6B9362／山吹 #FFA400／墨 #27221F／利休鼠 #656255／鳥の子 #E2BE9F／桜 #FCC9B9。色名リストは nipponcolors.com（✅名称のみ）。**配色に使うときは4.5:1コントラストを必ず再計算**（デジ庁基準）。
- **グッドデザイン賞の学習アプリ（△、受賞事実のみ。審査講評本文は未取得＝未確認）**：スピークバディ（2021、AI英会話：「わかりやすいインターフェース」「学習を続けたくなる仕掛け」と報道）、ベネッセ Study Cast／AI StLike（2022）、旺文社「受験生のための英検カコモン」（2024）。g-mark公式ページ（award/describe/52795）は取得時に本文が空だった。**日本の学習アプリの受賞軸は「飾り」より「継続の仕掛けと分かりやすさ」**と読める（私の解釈）。

---

## 4. マイクロインタラクション・カタログ（Web実装）

### 4.0 対応可否（MDN browser-compat-data 8.1.9 を計測／iOS＝WKWebViewの最小iOS、Androidは System WebView）

| 機能 | iOS Safari/WKWebView | Android WebView | 影響（Capacitor 8：iOS 15 / minSdk 24） |
|---|---|---|---|
| CSS `linear()` | 17.2 | 113 | iOS 15–17.1 は代替（WAAPIキーフレーム） |
| `@property`（カウントアップ） | 16.4 | 85 | JSの rAF 実装を既定に |
| View Transitions（同一文書） | **18.0** | 111 | iOS 15–17 は無し→フェード遷移で代替。`document.startViewTransition` を機能検出 |
| View Transitions（クロスドキュメント `@view-transition`） | 18.2 | 126 | SPAなので不要 |
| `Element.animate()`（WAAPI） | 13.4 | 37 | **全環境で使える基盤** |
| `color-mix()` | 16.2 | 111 | iOS15は rgba でフォールバック |
| `light-dark()` | 17.5 | 123 | 変数＋`prefers-color-scheme` で代替 |
| スクロール駆動アニメ `animation-timeline` | 26 | 115 | iOS 26 未満は使わない（IntersectionObserver等） |
| `backdrop-filter`（接頭辞なし） | 18.0（`-webkit-` は以前から可） | 76 | `-webkit-backdrop-filter` を併記 |
| `backface-visibility`（接頭辞なし） | 15.4 | 37 | フリップは `-webkit-` 併記 |
| `user-select`（iOSは接頭辞） | `-webkit-` 必須 | 54 | 併記 |
| `touch-action: manipulation` | 9.3 | 37 | **300msタップ遅延と二重タップズームを抑止** |
| Pointer Events / `setPointerCapture` | 13 | 55 | スワイプ・スクラブの土台 |
| SVG `pathLength` | 14 | 50 | チェック描画・リングに利用 |
| `text-wrap: balance/pretty` | 17.5 | 114/130 | 見出しの折り返し改善（任意） |
| `text-autospace` | 18.4 | 140 | 和欧の自動スペース（任意）。**`text-spacing-trim` は iOS 非対応**→ `palt` で代替 |
| `word-break: auto-phrase`（文節改行） | 未対応 | 119 | iOSでは使えない（手動の `<wbr>` / budoux 等） |
| `navigator.vibrate` | **非対応** | あり | 触覚は Capacitor Haptics（§5） |
| `navigator.audioSession` | 16.4 | 非対応 | 音の種別（§5.4） |

### 4.1 押し込み式3Dボタン（pressable）
- 公式より：**Josh Comeau の三層方式（✅ 実装記事）**：shadow／edge／front の3層。既定 front −4px・shadow +2px、hover −6px/+4px（250ms `cubic-bezier(0.3,0.7,0.4,1.5)` 跳ね）、**active −2px/+1px を 34ms で即座に**、離すと 600ms `cubic-bezier(0.3,0.7,0.4,1)` で戻る。`transform`/`filter` をアニメさせ `box-shadow`/`border` は避ける、`will-change: transform`、`-webkit-tap-highlight-color: transparent`、`user-select:none`、`:focus:not(:focus-visible)`。
- 1〜数個のボタンなら、より簡単な単層方式で十分：

```css
.btn3d{
  --edge:5px; --face:#4a9d3f; --edge-c:#37782f;      /* 色は方向性ごとに差し替え */
  border:0; border-radius:16px; padding:14px 22px; background:var(--face); color:#fff; font-weight:700;
  box-shadow:0 var(--edge) 0 var(--edge-c);
  transform:translateY(0);
  transition:transform 140ms var(--ease-m3x-fast, ease-out), box-shadow 140ms var(--ease-m3x-fast, ease-out);
  touch-action:manipulation; -webkit-tap-highlight-color:transparent; -webkit-user-select:none; user-select:none;
}
.btn3d:active{ transform:translateY(var(--edge)); box-shadow:0 0 0 var(--edge-c); transition-duration:34ms; }
@media (prefers-reduced-motion:reduce){ .btn3d{ transition:none } }
```
- **「手触り」は見た目より先に“タイミング”**：視覚の沈み込みと触覚は `pointerdown` で即時、アクションの確定は `pointerup`（指を滑らせて取消できる）。触覚は押下で Light、確定で Medium（§5.3）。*（私の提案値。HIG「触覚は視覚・音と一致」✅、Android「co-design of visual, audio, haptic」✅ に整合）*

### 4.2 スプリング挙動
- CSS：§1.3 の `linear()` 変数＋`transition`。
- 未対応環境（iOS 15–17.1）用：スプリングを解いてキーフレーム化する **WAAPI フォールバック**（計測：動作確認済み。M3 Expressive fast は23フレーム・383ms）。

```js
// spring -> WAAPI keyframes（質量1）。Element.animate が使える全環境（iOS13.4+/WebView37+）で動く
function springKeyframes(from,to,{stiffness=800,damping=0.6,fps=60,eps=0.002,maxMs=1500}={}){
  const w=Math.sqrt(stiffness), z=damping;
  const x = z<1 ? t=>{const wd=w*Math.sqrt(1-z*z);return 1-Math.exp(-z*w*t)*(Math.cos(wd*t)+(z*w/wd)*Math.sin(wd*t));}
                : t=>1-Math.exp(-w*t)*(1+w*t);
  const dt=1/fps, f=[]; let last=0;
  for(let t=0;t*1000<maxMs;t+=dt){ f.push(x(t)); if(Math.abs(x(t)-1)>eps) last=f.length; }
  f.length=Math.min(f.length,last+1); f.push(1);
  return { duration:f.length*dt*1000,
           keyframes:f.map(p=>({transform:`translateY(${(from+(to-from)*p).toFixed(3)}px)`})) };
}
// 使い方: const s=springKeyframes(5,0); el.animate(s.keyframes,{duration:s.duration,easing:'linear',fill:'both'});
```
- Emil Kowalski の実用則（✅）：押下 `scale(.97)`、出現は `scale(0)` から始めず 0.9以上、**UIは300ms未満**（180msの方が400msより俊敏）、出入りは ease-out、頻繁な操作は無アニメ、`transform-origin` を発生源に。

### 4.3 リップル vs スケールダウン
- Material の波紋は押下位置から広がる（Android らしさ）。iOS では**スケールダウン（0.96–0.98）＋色の濃淡**が自然。**方向性ごとに切替**：Chunky＝沈み込み、Quiet＝0.98＋背景色変化、Material系＝波紋または形モーフ（角丸が小さく→大きく）。リップルは `::after` の円を `transform: scale()` で拡大（実装は軽い）。**模試中は波紋・形モーフを使わず背景色のみ**（Standard 側）。

### 4.4 正解／不正解のフィードバック
| 要素 | 実装メモ |
|---|---|
| **チェックの描画（draw-on）** | SVG `pathLength="1"`＋`stroke-dasharray:1; stroke-dashoffset:1` → `@keyframes{to{stroke-dashoffset:0}}`、300–360ms、`cubic-bezier(.65,0,.35,1)` |
| **シェイク（不正解）** | `translateX(±6px)` を 3–4往復・300–400ms。**強いシェイクは前庭障害の誘因**（reduce 時は色の点滅のみ） |
| **グロー／リング** | `box-shadow:0 0 0 0 → 0 0 0 6px (alpha→0)` を 450–600ms。背景の補色にしない（色覚多様性：色だけでなく**アイコン形状**でも区別） |
| **選択肢の確定** | 正解は面の色塗りを**左→右へマスクで流す**（ink/インクの滲み）など、方向性で表現を替える |
| **ストリーク炎** | SVG炎＋`transform: scaleY` の ±3% ゆらぎ（周期1.2–2s）。**常時ループは前庭への配慮で reduce 時停止**、WCAG 2.2.2（開始する自動アニメ）にも注意 |

```html
<svg viewBox="0 0 52 52" class="chk" aria-hidden="true"><path pathLength="1" d="M14 27l8 8 16-18"/></svg>
<style>
.chk path{fill:none;stroke:currentColor;stroke-width:5;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:1;stroke-dashoffset:1}
.is-correct .chk path{animation:draw 320ms cubic-bezier(.65,0,.35,1) forwards}
@keyframes draw{to{stroke-dashoffset:0}}
@media (prefers-reduced-motion:reduce){.is-correct .chk path{animation:none;stroke-dashoffset:0}}
</style>
```

### 4.5 紙吹雪・粒子（控えめに）
- 使う場面：**レベル到達／模試完了で自己ベスト更新／連続日数の節目**のみ（Habits のような「ここ一番」）。**練習の各問では使わない**（HIG「頻繁な操作にモーションを足すな」✅）。**模試中は一切使わない**。
- 量：40–80粒、持続 900–1400ms、重力＋減衰、画面の2/3まで、色は方向性のパレットから3–4色。自作Canvas約60行 or canvas-confetti（`disableForReducedMotion:true`、25KB）。reduce 時は**粒子なし＋バッジの静的表示**。
- 粒子は触覚・音と同時に（Habits ✅）。ただし毎回は鳴らさない。

### 4.6 数字のカウントアップ・プログレスリング
- カウントアップ：rAF＋ease-out（`1-(1-t)^4`）、700–1100ms、`Intl.NumberFormat('ja-JP')`、**`font-variant-numeric: tabular-nums`**（iOS 9.3+）で桁ブレ防止。`@property` 方式は iOS 16.4+ のため既定にしない。
- リング：`<circle pathLength="100" stroke-dasharray="100" stroke-dashoffset="calc(100 - p)" stroke-linecap="round" transform="rotate(-90)">`。値変更に `transition: stroke-dashoffset 600ms var(--ease-m3x-default)`。**M3 Expressive の wavy progress**（波長・振幅）は SVG path のアニメで近似可能（長い処理用／「推定スコア」の演出用）。

### 4.7 フラッシュカード：フリップとスワイプ
- フリップ：`perspective:1000px` ＋ `transform-style:preserve-3d` ＋ `backface-visibility:hidden`（`-webkit-` 併記）。`rotateY(180deg)`、400–500ms。**reduce 時は rotate せずクロスフェード**。
- スワイプ：Pointer Events＋`setPointerCapture`、`touch-action:pan-y`、`translate3d(dx,0,0) rotate(dx*0.05deg)`。**確定条件の目安：幅の30%超 or 速度0.5px/ms超**（私の提案値）。しきい値を跨いだ瞬間に Selection 触覚（Android の GESTURE_THRESHOLD_ACTIVATE 相当、API 34 ✅ 概念）、確定で Impact。離したら §4.2 のスプリングで戻す。

### 4.8 音声波形スクラバー（事前計算ピークから）
- 方針：ビルド時に各mp3から**100〜200点のピーク（Uint8）**を計算して data/*.js に埋め込む（1クリップ約100〜200バイト）。実行時は Canvas に棒を描画、再生位置で色を切替、**端末でmp3をデコードしない**。
- 先行：BBC `audiowaveform`（GPL-3.0、JSON/バイナリ出力、`--zoom` で点密度、8/16bit。ビルド用CLIとしての利用）。wavesurfer.js は事前デコード済みピークと duration を渡せる（公式「We recommend using pre-decoded peaks for large files」✅）。自作でも Python で `numpy` による max-abs 集計で十分。
- **模試モードではスクラブ不可（本番どおり1回きり）**：進み具合の表示と残り時間のみ。練習モードで頭出し・速度変更を許可（audit準拠）。

### 4.9 スケルトン／シマー
- オフライン・同梱データのためほぼ不要。**音声デコード／採点計算など150ms超の待ちにだけ**、150msの遅延表示＋最短表示時間を設ける（出して即消えるチラつき防止）。Material の Loading indicator は「5秒未満」想定（✅）。

### 4.10 画面遷移
- **View Transitions**（同一文書）：iOS 18.0+ / WebView 111+（✅ WebKit blog：「WebKit added support for the View Transitions API in Safari 18」）。`view-transition-name` で共有要素（単語カード→詳細）、`types` で進む／戻るの向きを切替。
- フォールバック（iOS 15–17）：旧画面を `opacity` ＋ 12–24px のスライドで 180–240ms。機能検出：`if(!document.startViewTransition || reduce){ update(); return; }`。
- Apple HIG：「滑らかさ」より「**待たせない**」。アニメ完了を待たず入力可能にする（✅ "Let people cancel motion"）。

### 4.11 reduced motion と設定
- OSの `prefers-reduced-motion`（Baseline Widely available ✅）。**削る**：拡大縮小・回転・パララックス・大面積スライド・ループ。**残す／代替**：フェード、色、小さな状態インジケータ（MDN ✅）。WCAG 2.3.3（AAA）：操作で起こるモーションアニメは無効化可能に（✅）。
- **アプリ内にも「演出を減らす」「触覚」「効果音」の3トグル**を設ける（HIG：「Make motion optional」「Make haptics optional」✅）。OS設定が WKWebView／Android WebView で `matchMedia` に反映されるかは**未確認（実機で要確認）**。

---

## 5. 触覚（Haptics）と UI 音

### 5.1 原則（一次）
- **Apple HIG Playing haptics（✅）**：標準パターンは**文書化された意味どおりに**使う／**一貫して**（原因と結果の対応）／視覚・音と**強さと鋭さを合わせる**／使いすぎない（「最良の触覚は、無いと寂しいと感じる程度」）／**短い単発**を基本／**オプトアウト可能**に／カメラ等と干渉に注意。
  - Impact：light / medium / heavy / **soft / rigid**（衝突物の重さ・硬さの比喩）。Notification：**success / warning / error**（結果）。**Selection**（値が変化している間）。
  - Core Haptics：transient（タップ状）／continuous、**sharpness** と **intensity**。
- **Android Haptics principles（✅）**：「Favor rich and clear haptics over buzzy」「buzzyなら無しを選べ」／頻度と重要度に比例した強さ（スクロール等は極めて弱く、フォーム送信等は強く）／app内で一貫／**視覚・音・触覚を共同設計**（ずれると「アクチュエータ故障」と思われる）／**キークリックは10–20ms**が良く、単発one-shotは余韻でbuzzyになりやすい。
- Android `HapticFeedbackConstants`（✅）：`CONFIRM`（API 30）／`REJECT`（30）／`CLOCK_TICK`（21）／`CONTEXT_CLICK`（23）／`VIRTUAL_KEY`（5）／`VIRTUAL_KEY_RELEASE`（27）／`KEYBOARD_TAP`（8）／`LONG_PRESS`（3）／`GESTURE_START/END`（30）／**`SEGMENT_TICK`・`SEGMENT_FREQUENT_TICK`・`TOGGLE_ON/OFF`・`GESTURE_THRESHOLD_ACTIVATE/DEACTIVATE`・`DRAG_START`・`NO_HAPTICS`（API 34）**。`View.performHapticFeedback` は **VIBRATE権限不要**で、システムの「タッチフィードバック」設定を尊重（✅）。

### 5.2 `@capacitor/haptics`（v8.0.2）の実装を実ソースで確認（✅ github.com/ionic-team/capacitor-haptics）
| API | iOS 実装 | Android 実装 |
|---|---|---|
| `impact({style})` Light/Medium/Heavy（**既定 Heavy**） | `UIImpactFeedbackGenerator(style:)` を**毎回生成して即 `impactOccurred()`（`prepare()` なし）**。soft / rigid は**公開されていない** | `Vibrator` ＋ `VibrationEffect.createWaveform`：Light 50ms@amp110、Medium 43ms@180、Heavy 60ms@255 |
| `notification({type})` Success/Warning/Error | `UINotificationFeedbackGenerator` | Success [35,65,21]ms 振幅[250,0,180]、Warning 6区間 全振幅255、Error [27,45,50] 振幅[120,0,250] |
| `selectionStart/Changed/End` | `UISelectionFeedbackGenerator` を作り `prepare()`、変更ごとに再 `prepare()` | **Selection＝100ms@amp100 の波形**（`HapticFeedbackConstants` は不使用） |
| `vibrate({duration})` 既定300ms | Core Haptics 連続イベント（失敗時 `AudioServicesPlayAlertSound`） | `createOneShot` |
- **指摘**：Android は Android 公式が「避けよ」と書く one-shot/waveform 系で、`SEGMENT_TICK` や `CONFIRM/REJECT` に**接続されていない**。ブランドの「手触り」を作るには不足。iOS も `prepare()` 無しのためレイテンシが出る可能性（Apple のgeneratorは `prepare()` を事前に呼ぶ想定。Apple公式ページ本文は今回取得できず＝**この点は未確認**）。
- **提案：自作の薄いプラグイン**（Swift：`UIImpactFeedbackGenerator` を保持して `prepare()`、soft/rigid を含め、`intensity` 引数を公開／Kotlin：`webView.performHapticFeedback(…)`、API 30+ は `CONFIRM/REJECT`、API 34+ は `SEGMENT_TICK`、24–29 は `KEYBOARD_TAP`/`VIRTUAL_KEY` などでフォールバック）。Capacitor 8 の minSdk は24なので**API 30未満のフォールバック設計が必須**（Capacitor 8 更新ガイド ✅）。
- 触覚は端末依存（Taptic Engine／アクチュエータ品質）で、非対応端末では no-op（Capacitorドキュメント ✅「resolve without performing any action」）。**iOSの「システム触覚」設定OFF時の挙動は未確認**。

### 5.3 イベント → 触覚・音の対応表（提案。方向性ごとにプロファイルを差し替える）
| イベント | iOS（推奨） | Capacitor（現行） | Android（推奨） | 音 | 備考 |
|---|---|---|---|---|---|
| ボタン押下（主要） | impact **soft/light** | `impact LIGHT` | `VIRTUAL_KEY` | 軽いクリック(任意) | `pointerdown` で即時 |
| ボタン確定／画面遷移 | impact **medium** | `impact MEDIUM` | `VIRTUAL_KEY_RELEASE` | — | `pointerup` |
| 選択肢のタップ | selection | `selectionStart/Changed` | `SEGMENT_TICK`（34+）/ `KEYBOARD_TAP` | なし | 1操作1回 |
| 正解 | notification **success** | `notification SUCCESS` | `CONFIRM`（30+） | 上昇2音 80–200ms | 連続正解は2連続目以降を弱める |
| 不正解 | notification **error**（重すぎるなら **warning**） | `ERROR` | `REJECT`（30+） | 下降1音（短く柔らかく） | **罰感を出さない**（学習の継続を損なう） |
| スワイプのしきい値到達 | selection | `selectionChanged` | `GESTURE_THRESHOLD_ACTIVATE`（34+） | — | |
| 節目（レベル到達／自己ベスト） | success＋medium（Core Hapticsで3連） | 組合せ | `CONFIRM`＋遅延 | 200–500msのファンファーレ | **1日に数回まで** |
| 残り時間警告（模試） | **使わない or warning 1回** | — | — | **鳴らさない** | 集中を妨げない |
| 模試中の全般 | **触覚OFFが既定**（任意で selection のみ） | — | — | **UI音なし**（リスニング音声のみ） | 本番らしさ |
- 注：音・触覚は「演出を減らす」「触覚」「効果音」トグルに従う。**音声のみ・触覚のみ・視覚のみ、いずれ単独でも意味が通じる**こと（HIG「Make motion optional / avoid communicating with sound only」✅）。

### 5.4 UI音のベストプラクティスと「サイレント」問題
- **Apple HIG Playing audio（✅）**：サイレント時、ユーザーが明示的に始めたメディア再生等以外は鳴らさない（キーボード音、効果音、ゲーム音は消す対象）。アプリは音声カテゴリを選ぶ：**Ambient＝非必須・サイレント尊重・他音と混ざる／Playback＝必須（語学アプリは例示）・サイレントを無視**。システム音量が最終出力を決める。効果音の繰り返しには**ピッチ・音量の微ランダム化**が有効（visionOS節）。
- **MDN Audio Session（✅）**：`navigator.audioSession.type`＝auto/playback/transient/transient-solo/ambient/play-and-record。**`AudioContext`は ambient、`HTMLMediaElement` は playback が既定**、複数が同時なら優先度の高い方が採用。**Safari 16.4+**（BCD 計測）。**Androidは非対応**（Androidにはサイレントスイッチはなく、効果音は主にメディア音量に従う＝一般知識・未確認）。
- **WebKitバグ報告（△）**：「iOS 16.3以降、サイレントスイッチONで WebAudio が無音」「`transient` では鳴らないという報告」「HTML audio/video はミュートスイッチを無視」。**WKWebView でも同じ挙動かは未確認＝TestFlight実機で検証必須**。
- **実装方針（提案）**：リスニング音声は `<audio>`（本番どおり無音設定でも聴こえる＝学習目的として必須）。**UI効果音は Web Audio の `AudioBuffer`（短音をデコードして再利用）**で鳴らす（サイレント尊重・低遅延）。`AudioContext` は**最初のユーザー操作内で作成／`resume()`**（MDN Best practices ✅ 「Create or resume context from inside a user gesture」）。`role="switch"` の音ON/OFF、ラベル付き。
- **音の仕様（実務的な目安・△）**：タップ30–150ms、確認〜通知300ms前後、大きい節目で〜500ms。1回の演出は短く、音量はリスニング音声より6〜10dB低く（提案値）。短い効果音は**無圧縮WAV（16bit/mono/44.1kHz、100msで約9KB）**が安全（mp3は先頭パディングで遅れる可能性＝未確認）。同じ音を連打しない（ピッチ±3%・音量±1.5dBのランダム化、HIG visionOS節 ✅）。
- **受賞アプリの音・触覚の例**：Not Boring Habits＝**独自触覚＋独自音＋粒子を重ねる**（✅）、PowerWash Simulator＝ノズル別の触覚（Apple説明 ✅）、Rytmos＝音楽がパズルの解き方で生成（✅）、CapWords＝AVAudioEngine＋Neural Voice、「sound, touch, and sight cues」（✅）。Duolingoの効果音の制作方針は一次では見つからず（△）。

---

## 6. 日本語フォント（OFL）— 同梱・サブセット

### 6.1 計測方法と前提（計測）
- フォント：Google Fonts リポジトリ（github.com/google/fonts, `ofl/`）の公式ファイル。fonttools 4.68.0 の `pyftsubset` → woff2、`--no-hinting`、レイアウト機能 `kern,palt,liga,calt,locl`。
- 文字集合：**S1**＝index.html内の文字＋ASCII（364字）／**S2**＝**アプリの全データ**（index.html、data/*.js、content/**/*.json・vocab.tsv）の全使用文字＋ASCII（**1,492字：漢字1,216・かな148**）／**S3**＝JIS X 0208 全6,879字＋ASCII（6,974字）。
- 可変フォント（VF）は全ウェイト軸込みのサイズ。静的は**1ウェイト**あたり。**サイズ表記：フォント＝KB=1,024B／MB=1,024KB（バイト数を1024で割った値）。ライブラリ（§3.4）は 1KB=1,000B**。

### 6.2 比較表
| フォント | ライセンス | 性格 | ウェイト | 元ファイル | S1(UI) | **S2(app全文)** | S3(JIS) | アプリ文字の未収録 |
|---|---|---|---|---|---|---|---|---|
| **Noto Sans JP** | OFL（RFN "Source"） | 中立・最も網羅的。デジ庁の指定書体 | VF 100–900 | 9.1MB | 75KB | **359KB**（400固定:189KB） | 1.75MB | 記号のみ（JIS X 0208は1字欠） |
| **IBM Plex Sans JP** | OFL（RFN "Plex"） | 技術的・堅実（IBM Plexの和文）。Mike Abbink, Bold Monday | 静的 100–700 | 2.3MB | 31KB | **161KB** | 0.82MB | 記号のみ |
| **Zen Kaku Gothic New** | OFL | 現代的・上品（大平善道）。繊細で読みやすい | 静的 300–900 | 2.2MB | 34KB | **183KB** | 0.91MB | 記号のみ（JIS X 0208で55字欠） |
| **BIZ UDPGothic** | OFL | **ユニバーサルデザイン**（モリサワ）。フトコロ広く、プロポーショナルかな | 400/700のみ | 4.5MB | 33KB | **183KB** | 0.97MB | 記号のみ |
| **M PLUS 1**（VF） | OFL | モダン・やや角ばった。Latin 同梱 | VF 100–900 | 4.0MB | 86KB | 414KB | 1.48MB | 記号のみ（JIS X 0208で1,301字欠） |
| **M PLUS Rounded 1c** | OFL表記（Google Fonts METADATA。旧M+ライセンス由来のため文面同梱は要確認＝未確認） | 丸ゴ。親しみ・ポップ | 静的 100–900 | 3.4MB | 47KB | 251KB | 0.91MB | 記号のみ（JIS X 0208で1,447字欠） |
| **LINE Seed JP** | OFL（© LY Corporation） | 丸みのあるジオメトリック、ブランド色強い | 静的 Thin/Regular/Bold/ExtraBold | 3.6MB | 45KB | 241KB | 1.26MB | 記号のみ |
| **Murecho**（VF） | OFL | 低コントラスト・フラット終端の読みやすい和文。Neil Summerour | VF 9段階 | **1.4MB** | 60KB | 283KB | 0.49MB | **漢字15字が未収録**：伊 剪 厨 婉 揃 暢 梱 漕 濡 焙 綴 董 迂 釉 餐（JOYO+止まり） |
| **Zen Maru Gothic** | OFL | 丸ゴ、やわらかく読みやすい | 静的 300–900 | 3.6MB | 47KB | 271KB | 1.41MB | 記号のみ（JIS X 0208で3字欠） |
| **Shippori Mincho** | OFL | 明朝。文芸的で端正（FONTDASU） | 静的 400–800 | 8.3MB | 52KB | **257KB** | 1.29MB | 記号のみ（JIS X 0208で194字欠） |
- **注1**：S2/S3 は**1フォントの1ウェイト**（VFは全軸）。2ウェイト（本文＋太字）なら概ね2倍。**現行データの文字だけなら 160〜410KB/ウェイト**で足り、アプリ追加時は**ビルド時に使用文字を自動抽出して再サブセット**する運用が望ましい。
- **注2（RFN）**：Noto Sans JP（"Source"）と IBM Plex Sans JP（"Plex"）は OFL に予約フォント名がある。**サブセット＝改変にあたる可能性があり、改変版では別名（内部名変更）にする**のが無難。法務確認は未確認＝**要確認**。
- **注3（記号）**：現行UIの ⚑ ⏱ ⚐ は調べた全フォントで未収録、▶ は IBM Plex Sans JP／LINE Seed JP／Zen Kaku／Zen Maru／Shippori で未収録、M PLUS 1 は ← → も欠落 →**SVGアイコンに置換**。
- **注4（言語指定）**：HTML に `lang="ja"` を付け、日本語字形を確実に選ばせる（CJK統合漢字の字形差）。和欧混植は `font-family: "Latin", "Japanese"` の順（Latin を先頭にして和文フォントのLatin字面を使わない）。
- **注5**：`font-display` はローカル同梱なので `block` でも `swap` でも体感差は小さい。最初の描画が早いよう **woff2 を事前ロード（起動画面で preload）**。`font-feature-settings: "palt"`（プロポーショナル詰め）は見出し・ボタンに。**iOS は `text-spacing-trim` 非対応**なので `palt` を使う（BCD 計測）。
- **日本語本文の基準線**：16px以上・行間1.7（デジタル庁 ✅）。Apple iOS の既定は 17pt、最小 11pt（HIG Typography ✅）。**細いウェイトはサイズを上げる**（HIG ✅）。→ Shippori Mincho など細明朝は、本文でなく見出し・大きな数字・引用に。

### 6.3 英字（Latin）との組合せ候補（Latin サブセット：基本ラテン＋Latin-1＋句読点、計測）
| 書体 | ライセンス | 性格 | woff2（Latin サブセット） | 備考 |
|---|---|---|---|---|
| **Inter**（VF, opsz+wght） | OFL | 中立的UI用 | **58KB** | `tnum` 等の機能あり。数字の揃いが良く成績・タイマーに |
| **Manrope**（VF） | OFL | 幾何学的・やや温かい | **22KB** | 軽量。見出し・数字に |
| **Source Serif 4**（VF, opsz） | OFL | 端正なセリフ（Adobe） | **112KB** | **opsz軸**で小サイズ最適化。長文向き |
| **Literata**（VF, opsz） | OFL | Google Play Books のために作られた「読書用」セリフ（TypeTogether）。公式説明「every-device font」 | **111KB** | **長文（Part 7）の第一候補** |
| **Fraunces**（VF, SOFT/WONK/opsz/wght） | OFL | “ふにゃり”とした見出し向けセリフ | 118KB | 本文には不向き。ロゴ・数字・大見出し |
| IBM Plex Sans / Serif | OFL | Plex Sans JP と字面が揃う | 未計測（VF/静的混在） | |
| Atkinson Hyperlegible Next | OFL | 字形の判別性を重視（Braille Institute）。元ファイル124KB | 未計測 | 判別性の効果は一次で未確認 |
- 組合せ例：**和文 Zen Kaku Gothic New ＋ 英字 Inter**（モダン）／**IBM Plex Sans JP ＋ IBM Plex Sans**（硬派・統一感）／**Zen Maru Gothic ＋ Manrope**（やわらかい）／**BIZ UDPGothic ＋ Source Serif 4**（読みやすさ重視）／**Shippori Mincho（見出し）＋ Zen Kaku Gothic New（本文）**（和）。

### 6.4 英文長文（Part 7）をスマホで読む
- **セリフ vs サンセリフ**：スクリーン上では一貫した差はない（Springer のレビュー章：△。研究により結果が割れ、速度と正確さのトレードオフと解釈されることも）。→ 書体の“種類”で悩むより次を優先：
  - **本文サイズ 17–18px（iOS既定17pt ✅）、行間 1.55–1.7、1行はスマホ幅で35–45字程度**、コントラスト 4.5:1 以上（デジ庁/WCAG ✅）。
  - **opsz 付き VF（Literata / Source Serif 4 / Inter）**はサイズに応じて字形が最適化される（`font-optical-sizing:auto` は iOS 13.4+ / WebView 79+）。
  - **サイズ調整（A−/A+）、ダーク／セピア／ライトの3背景**。長文＋設問を往復する Part 7 は、文書と設問の**スティッキー配置の再設計**が前提（現行の重なり不具合の解決は別途UX側）。
  - ハイフネーションはオフ（試験は紙面通りの折り返し）、`text-wrap: pretty`（iOS 17.5+）で孤立語の抑制（任意）。

---

## 7. Raw ingredients for 6 directions（候補10案）

評価凡例：**試験アプリ適合（成人日本人の本格対策）** ◎強い適合／○可／△限定的（モード別なら可）。
共通の差し替え軸（トークン化の提案）：`--c-*`（配色）／`--font-*`（文字）／`--r-*`・`--edge`（角丸・立体の厚み）／`--surface`（質感：影・面）／`--ease-*`・`--dur-*`（動き）／`--haptic-set`・`--sfx-set`（触覚・音）。**ボタン手触り4型**（下記）を案をまたいで割り当て可能にする。

**ボタン手触り4型（提案値の出典：M3トークン✅、Comeau✅、Kowalski✅）**
| 型 | 押下 | 離す | 触覚 | 向く案 |
|---|---|---|---|---|
| **A. チャンキー（押し込み）** | 縁5px沈む 34–60ms | `--ease-m3x-fast` 350ms（9.5%オーバーシュート） | pointerdown=Light、確定=Medium | 1, 8 |
| **B. ソフト（縮む）** | `scale(.97)` 100ms＋面色が濃く | ease-out 160ms | 確定のみ Soft/Light | 2, 3, 7 |
| **C. ガラス／モーフ** | 角丸が変形・ハイライトが動く（15%サイズ変化、M3 ButtonGroup 値 ✅） | `--ease-m3x-default` 410ms | Selection | 5, 6 |
| **D. メカニカル（硬い）** | 1–2px沈む 40ms、跳ねない | `--ease-m3-std` 220ms | Rigid/Light、短く鋭く | 4, 9, 10 |

---

### 案1　Chunky Tactile（ぷっくり押し込み・Duolingo系）
- **雰囲気語**：明るい、ポップ、手応え、継続したくなる
- **配色**：背景オフホワイト、主色は彩度高めの緑／青、アクセントは黄、正解＝緑／不正解＝やわらかい赤＋アイコン併用。濃いインク(#2b2f33級)で文字
- **書体**：和文 Zen Maru Gothic（Bold）または M PLUS Rounded 1c ＋ 英字 Manrope（数字は tabular）
- **形**：角丸16–24、**下辺に5px の濃い縁**（3D押し込み）、太めのアウトライン
- **質感**：フラット＋ハードシャドウ（ぼかしなし）。白い余白で囲う（Duolingo ✅）
- **動き**：型A、正解は軽くバウンド、**練習と結果は表現的（M3 Expressive fast）／模試は縁なし・跳ねなし**
- **触覚・音**：押下で Light、正解で Success、不正解は Warning（弱め）。短い「ぽん」系（80–150ms）
- **参照**：Duolingo（✅ ADA 2023）、Not Boring Habits、Rooms
- **適合**：○（子どもっぽく見えないよう配色を落ち着かせる。キャラは入れない／単語帳の案内役に限定）

### 案2　Quiet Paper（静かな紙・Things系）
- **雰囲気語**：静か、端正、余白、集中、信頼
- **配色**：ウォームホワイト(#faf8f4級)／濃墨、アクセント1色（深い青 or 深緑）、正誤は彩度を抑えた緑／赤＋アイコン
- **書体**：和文 Zen Kaku Gothic New ＋ 英字 Inter（長文は Literata or Source Serif 4）
- **形**：角丸8–12、細い罫線(1px)、浅い影
- **質感**：紙。ごく淡い影のみ。装飾は削る（Duolingo のコアタブ再設計と同じ“引き算” ✅）
- **動き**：型B。ease-out 160–220ms、**オーバーシュートなし**（M3 Standard 相当 ✅）。1つ1つに目的（Things ✅）
- **触覚・音**：Selection と Success のみ。音は既定OFF（opt-in）
- **参照**：Things（ADA ✅）、Gentler Streak（"It guided but it didn't push."✅）、デジ庁DS（✅）
- **適合**：◎（模試・Part 7 の本番感と集中に最適。弱点＝記憶に残る個性が出しにくい → 結果画面だけに表現を集める）

### 案3　Ink & Indigo（藍と墨・和）
- **雰囲気語**：凛とした、端正、墨、藍、間（ま）
- **配色**：生成り〜鳥の子の地、藍／紺を主色、朱を差し色、墨の文字。正解＝若竹／萌黄系、不正解＝朱（伝統色 △。**コントラスト要再計算**）
- **書体**：見出し Shippori Mincho（大きく・数字・引用）＋ 本文 Zen Kaku Gothic New、英字 Source Serif 4
- **形**：角丸ほぼ無し〜4、細罫と二重罫、**麻の葉／青海波の極薄パターン**（5%以下）
- **質感**：和紙のごく淡いノイズ、墨の滲みマスク
- **動き**：型B。**墨が流れる塗り**（clip-path/mask）でマーク、チェックは筆のストローク描画（§4.4）。ゆったりした ease-out 220–300ms
- **触覚・音**：Soft／Light、音は木の拍子木のような低め短音（過度な“和風SE”は安っぽく見えるため控えめに）
- **参照**：MUJI のエンプティ（△）、Kenya Hara、日本の伝統色
- **適合**：◎（大人向けで差別化。細明朝は小サイズで弱いので本文には使わない）

### 案4　Answer Sheet（マークシート・試験場）
- **雰囲気語**：本番、正確、機械的、鉛筆、時計
- **配色**：用紙の白〜薄灰、鉛筆の濃灰、**青インク＋マークの黒**。強調は1色（本番の問題冊子に寄せる）
- **書体**：IBM Plex Sans JP ＋ IBM Plex Sans／Plex Mono（番号・タイマー）。写真は白黒（本番どおり）
- **形**：角丸なし〜4、**楕円のマーク欄**、罫線、番号の四角囲み
- **質感**：紙の粒子は極薄。影はほぼなし
- **動き**：型D。鉛筆で塗りつぶす表現（左→右のマスク 120–180ms）、跳ねなし
- **触覚・音**：短く硬い（Rigid/Light）、音は鉛筆の“かすかなスクラッチ”（オプトイン）
- **参照**：Halide Mark II の「必要最小限」（✅）、SILT のモノクロ、実物のOMR
- **適合**：◎（模試モードに最も忠実）。単語特訓や成績では他案の表現と併用するのが現実的

### 案5　Glass Native（Liquid Glass 風・ネイティブ感）
- **雰囲気語**：透明感、浮遊、滑らか、iOS 26らしさ
- **配色**：システム色＋背景の淡いグラデ、文字は vibrant、コントラストは高めに固定
- **書体**：Inter ＋ 和文 Zen Kaku Gothic New（システム書体に寄せる）
- **形**：**カプセル型**、同心の角丸、浮遊するナビ層（コンテンツには使わない ✅ HIG）
- **質感**：`backdrop-filter` ＋内側1pxハイライト。**操作層（タブバー／結果の浮遊ボタン）だけ**
- **動き**：型C。スムーズなスプリング（跳ねない〜微弱）、タブバーはスクロールで縮む（✅）
- **触覚・音**：Selection 中心
- **参照**：iOS 26（✅）、Tide Guide（Liquid Glass 統合・ADA 2026 ✅）、Moonlitt
- **適合**：△（可読性の批判が大きい。NN/g ✅）。**透明度低減設定を尊重**し、問題文面は不透明に。現行のダーク＋ぼかし円と地続きだが、“装飾が目的化”に注意

### 案6　Expressive Material（M3 Expressive 風）
- **雰囲気語**：大胆、大きい、丸い、弾む、Android らしさ
- **配色**：トーナルパレット（コンテナ色を大きく面で使う）、強い主色の大きなCTA
- **書体**：Zen Kaku Gothic New or LINE Seed JP ＋ Manrope、**強調ウェイト（Emphasized）**を見出しに
- **形**：角丸20–48（`L-increased`〜`XXL`）、**押下／選択で形が変わる**、コネクテッドなボタングループ（間隔2dp）
- **質感**：フラットなトーナル面（影は最小）
- **動き**：型C。fast spatial（0.6/800）で跳ね、波形プログレス、モーフィングのローディング（5秒未満）
- **触覚・音**：Confirm/Reject を実装、柔らかい短音
- **参照**：Material 3 Expressive（✅ 研究値 4倍速）、wavy progress／loading indicator（✅）
- **適合**：○（“重要要素を素早く見つける”研究値は試験の選択肢UIと相性良。ただし iOS ユーザーには見慣れず、Googleのデータでも「馴染みのなさ」で好みが落ちると記載 ✅）

### 案7　Editorial Reader（書籍・辞書的リーディング）
- **雰囲気語**：読書、辞書、落ち着き、紙面
- **配色**：クリーム地／セピア／ダーク（3モード）、インクの濃い茶〜黒、アクセントは赤茶
- **書体**：英文 Literata or Source Serif 4（opsz）＋ 和文 Zen Kaku Gothic New／BIZ UDPGothic（解説）、見出し Shippori Mincho
- **形**：角丸なし〜6、見出しの罫、ドロップキャップ（任意）
- **質感**：紙面、ページの“綴じ影”はごく淡く
- **動き**：型B、フリップは**ページをめくる**（回転90°＋フェード）。reduce 時はフェード
- **触覚・音**：ほぼ無し、フリップで Light
- **参照**：Literata（Play Books 用の読書書体 ✅）、辞書アプリ
- **適合**：◎（Part 7 と単語帳の読解に強い）。**全体の方向性というより「読むモード」として併用**する案

### 案8　Sticker Collection（シール帳・語彙コレクション）
- **雰囲気語**：集める、貼る、ゆるい、達成
- **配色**：パステルの台紙＋濃いアウトラインのシール、レベルごとに台紙色
- **書体**：Zen Maru Gothic ＋ Manrope、手書き風は Klee One（OFL、8.9MB＝要サブセット）をワンポイントに
- **形**：**白いダイカット縁のシール**、わずかな回転（±3°）、角丸大
- **質感**：シールの光沢ハイライト、影はソフト
- **動き**：型A寄り。**貼る（スラップ＋小さな跳ね）**、台帳に整列、**6段階の台紙の解放**が到達感
- **触覚・音**：貼る瞬間に Medium、「ぺたっ」短音。節目のみ粒子
- **参照**：CapWords（ADA 2025 ✅ 「剥がして集める」「sound, touch, and sight cues」）、Vocabulary（✅ 一貫したイラスト）、Bears Gratitude
- **適合**：○（単語特訓・レベル解放に限定すれば有効。模試・成績には持ち込まない）。イラスト体系の統一コストが大きい

### 案9　Night Instrument（夜の計器・データ可視化）
- **雰囲気語**：精密、夜、計器、数値、通勤
- **配色**：濃紺〜墨のダーク、**時間帯で空色が変化**（Tide Guide ✅）、文字は高コントラスト、強調は1〜2色
- **書体**：IBM Plex Sans JP ＋ Inter（`tnum`）／Plex Mono（数字）
- **形**：角丸8–12、ゲージ・ダイヤル、細い目盛り線
- **質感**：微細なグラデ、薄い発光（グロー）
- **動き**：型D。針がスプリングで動く、カウントアップ（§4.6）、波形プログレス（推定スコア）
- **触覚・音**：目盛りを跨ぐごとに弱い Selection（頻繁なので極弱）、音なし
- **参照**：Tide Guide、Halide Mark II、Gentler Streak（✅ 結果を「進歩」で見せる）
- **適合**：◎（成績・推定スコア画面に強い。全体ダークは「明るいテーマ無し」の現行課題を継承しないよう、ライト版も用意）

### 案10　Pixel / Arcade（ピクセル・ゲーム機）
- **雰囲気語**：レトロ、遊び、ステップ、8bit
- **配色**：限定パレット（8〜16色）、強い補色
- **書体**：DotGothic16（OFL、2.1MB、要サブセット）＋ 本文は別の読みやすい書体（本文をドット書体にしない）
- **形**：角丸なし、階段状の縁、ピクセルグリッド
- **質感**：ドット・走査線（弱く）。**CRT 風の歪みは可読性を下げるため不可**
- **動き**：型D。コマ送り（steps()）、短いスプライトの祝賀
- **触覚・音**：Rigid、チップチューン短音
- **参照**：Rooms（ADA 2024 ✅ 「nostalgic 8-bit」）、Afterplace（2023 ✅）、BALL x PIT（2026 finalist）
- **適合**：△（単語の“アーケード”モード限定。大人の本格対策の主軸にはしにくい）

---

### 7.1 組合せの示唆（私の整理）
- **「模試／成績＝静かな案（2・4・9）」×「練習／単語＝表現的な案（1・8・6）」**の二層は、HIGの「頻繁な操作にモーションを足すな」と、M3 の Standard（実用）／Expressive（主役の瞬間）の区別の双方に整合する。
- **推奨の検討順（私の見立て）**：A＝案2を骨格（模試・Part 7は案7の読書モードを併用）、結果と単語特訓に案8／1の表現を局所適用。B＝案3（和）を骨格にして差別化。C＝案9（夜の計器）を成績に。いずれも**ボタン手触り4型のうち模試中は B/D のみ**。
- **避けるべき**：全画面の透明（案5）をコンテンツ層に使う／ピクセルや丸ゴを本文に使う／不正解で罰感の強い演出／色だけの正誤表現（アイコン併用）／模試中の紙吹雪・効果音。

---

## 8. 未確認／要検証リスト

1. WKWebView 内で `navigator.audioSession` が使えるか・サイレントスイッチ時の Web Audio の挙動（iOS 16.3以降の報告あり）→ TestFlight 実機。
2. Android WebView で `prefers-reduced-motion` がOSの「アニメーション無効化」に連動するか／iOS WKWebView で「視差効果を減らす」に連動するか。
3. Capacitor 8（iOS 15 / minSdk 24）下限端末での WebView 版（古い Android 端末の System WebView が古いままの割合）。
4. iOS の「システム触覚」設定OFF時の Capacitor haptics 挙動、iPhone SE 等での `prepare()` 無しの遅延。
5. SwiftUI Spring の換算式・プリセット値（WWDC23）。Apple の `Spring` ドキュメント本文は取得不可。
6. Liquid Glass を WKWebView 内HTMLに適用する公式手段の有無（現状「無い」と私は理解）。iOS 26.1以降の「Tinted」設定や iOS 26.4 の Reduce Motion 改善は二次情報（NN/g 以外）。
7. Duolingo の色・書体の公式値、ボタンの公式仕様。design.duolingo.com は閉鎖／リダイレクト。
8. Headspace のモーション原則（design.headspace.com 未到達）。
9. MUJI／原研哉の引用文の原文（公式ページの本文取得はタイムアウト）。グッドデザイン賞の審査講評本文。
10. M PLUS Rounded 1c のライセンス文書の同梱要件、RFN（Source／Plex）下のサブセット再配布の条件（法務確認）。
11. Balatro・Infinity Nikki・Neva 等の具体的な視覚処理（本調査では画面を見ていない／公式文のみ）。
12. 競合アプリ（abceed、スタディサプリ ENGLISH、mikan 等）の画面。今回は未調査。

---

## 9. 出典（URL）

### プラットフォーム
- Apple Newsroom（Liquid Glass 発表）https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/
- HIG Materials https://developer.apple.com/design/human-interface-guidelines/materials ／ Motion …/motion ／ Playing haptics …/playing-haptics ／ Playing audio …/playing-audio ／ Typography …/typography
- Adopting Liquid Glass https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass
- WWDC25 セッション 219 / 356（内容は未読）https://developer.apple.com/videos/play/wwdc2025/219/ ／ https://developer.apple.com/videos/play/wwdc2025/356/
- NN/g「Liquid Glass」https://www.nngroup.com/articles/liquid-glass/
- Google Design 研究 https://design.google/library/expressive-material-design-google-research
- Material Components Android docs（Motion/Shape/Typography/ButtonGroup/CommonButton/LoadingIndicator/ProgressIndicator）https://github.com/material-components/material-components-android/tree/master/docs
- androidx Compose MotionScheme／トークン https://github.com/androidx/androidx/tree/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3 ／ https://developer.android.com/reference/kotlin/androidx/compose/material3/MotionScheme

### Apple Design Award
- https://developer.apple.com/design/awards/（2026）／ …/awards/2025/ ／ …/2024/ ／ …/2023/ ／ …/2022/
- Newsroom：https://www.apple.com/newsroom/2026/06/apple-reveals-winners-of-the-2026-apple-design-awards/ ／ …/2025/06/apple-unveils-winners-and-finalists-of-the-2025-apple-design-awards/ ／ …/2024/06/apple-announces-winners-of-the-2024-apple-design-awards/ ／ …/2023/06/apple-announces-winners-of-the-2023-apple-design-awards/ ／ …/2022/06/apple-announces-winners-of-the-2022-apple-design-awards/
- Behind the Design：Duolingo https://developer.apple.com/news/?id=jhkvppla ／ Headspace ?id=fkfnhq8u ／ Bears Gratitude ?id=i74v3f4r ／ Rooms ?id=sqd5xv4n ／ Any Distance ?id=uiiopcl8 ／ Gentler Streak ?id=3m0ht22s ／ Rytmos ?id=34m9vbvv ／ (Not Boring) Habits ?id=9ab1g4r3 ／ CapWords https://developer.apple.com/articles/capwords/ （日本語 …/jp/articles/capwords/）

### デザインシステム／日本
- Duolingo：https://blog.duolingo.com/shape-language-duolingos-art-style/ ／ …/reshaping-duo/ ／ …/core-tabs-redesign/ ／ …/world-character-visemes ／ https://lottiefiles.com/case-studies/duolingo ／ https://blog.duolingo.com/hub/design/
- Lottie https://github.com/airbnb/lottie-web ／ https://lottie.airbnb.tech/ ／ Rive https://rive.app/docs/runtimes/web/web-js ／ canvas-confetti https://github.com/catdad/canvas-confetti
- Things https://culturedcode.com/things/
- デジタル庁DS https://design.digital.go.jp/dads/ ／ …/foundations/typography/ ／ …/foundations/color/
- MUJI https://www.muji.com/jp/flagship/huaihai755/archive/hara.html（未読）／ 伝統色 https://en.wikipedia.org/wiki/Traditional_colors_of_Japan ／ https://nipponcolors.com/
- グッドデザイン賞（学習アプリ報道）https://resemom.jp/release/prtimes/20211020/75827.html ／ https://resemom.jp/release/prtimes/20221007/89065.html

### Web実装
- View Transitions https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API ／ https://webkit.org/blog/15865/webkit-features-in-safari-18-0/ ／ https://webkit.org/blog/16967/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/
- `linear()` https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function/linear ／ https://developer.chrome.com/docs/css-ui/css-linear-easing-function ／ https://linear-easing-generator.netlify.app/
- prefers-reduced-motion https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion ／ WCAG 2.3.3 https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
- Josh Comeau 3Dボタン https://www.joshwcomeau.com/animation/3d-button/ ／ Emil Kowalski https://emilkowal.ski/ui/7-practical-animation-tips
- 波形 https://github.com/bbc/audiowaveform ／ https://wavesurfer.xyz/docs/
- MDN Audio Session https://developer.mozilla.org/en-US/docs/Web/API/Audio_Session_API ／ Web Audio best practices https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices
- 対応表の元データ：npm `@mdn/browser-compat-data` 8.1.9（計測）

### 触覚
- Capacitor Haptics https://capacitorjs.com/docs/apis/haptics ／ 実装 https://github.com/ionic-team/capacitor-haptics（Haptics.java, HapticsImpactType.java, HapticsNotificationType.java, HapticsSelectionType.java, Haptics.swift）／ Capacitor 8 更新 https://capacitorjs.com/docs/updating/8-0
- Android https://developer.android.com/develop/ui/views/haptics/haptic-feedback ／ …/haptics-principles ／ https://developer.android.com/reference/android/view/HapticFeedbackConstants

### フォント
- https://github.com/google/fonts/tree/main/ofl（notosansjp, ibmplexsansjp, zenkakugothicnew, bizudpgothic, mplus1, mplusrounded1c, lineseedjp, murecho, zenmarugothic, shipporimincho, inter, manrope, sourceserif4, literata, fraunces, atkinsonhyperlegiblenext）
- 長文書体のレビュー（△）https://link.springer.com/chapter/10.1007/978-3-030-90984-0_14

### 計測メモ（再現用）
- 文字集合・サブセット：fonttools 4.68.0（`pyftsubset --flavor=woff2 --no-hinting --layout-features='kern,palt,liga,calt,locl'`）。使用文字はアプリの index.html・data/*.js・content/ から抽出（1,492字）。カバレッジは `fontTools` の cmap で照合。
- スプリング→`linear()`：解析解（質量1、25点）。M3 トークンは androidx の `ExpressiveMotionTokens.kt` / `StandardMotionTokens.kt` から。
