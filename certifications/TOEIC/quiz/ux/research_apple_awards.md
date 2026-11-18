# Apple デザイン賞・App Store 賞から抽出した UX パターン（TOEIC 模試＋単語アプリ向け）

調査日: 2026-11-19 / 対象: Apple Design Awards(ADA) 2021〜2026、App Store Awards(Apple Awards) 2021〜2025
方針: 一次情報のみ（Apple 公式の受賞ページ・Newsroom・Developer ニュース記事・HIG・App Store Review Guidelines・各アプリ自身のサイト／ストアページ／公式ブログ）。ログインなし。検索語に個人情報は含めていない。
表記: 英語の引用は各 15 語以内。**未確認** = 一次情報で裏が取れていない、または取得できなかったもの。
注意: 現行アプリの前提（1回目無料＋300円買い切り、オフライン、単独プレイ、Capacitor、ダークパターン不使用、模試中は静か）は `ux/current_audit.md` に従う。

---

## 0. 結論サマリ（先に読む用）

1. **「手触り」で勝った学習・習慣系は、演出を"達成の瞬間"に集中**させ、日常操作は標準的で静か（(Not Boring) Habits の長押しチェック、Duolingo の節目アニメ、Gentler Streak の月次サマリ）。→ 模試中は静か、練習と結果で祝う、という現行方針は ADA の傾向と整合する。
2. **続けさせる仕組みは「ゆるさ」を設計に入れる**（Duolingo: 1レッスンで連続日数が伸びる／Streak Freeze、Gentler Streak: 休んでもリセットしない・自分の履歴と比べる）。罪悪感通知に頼らない。
3. **アクセシビリティは受賞の主要因**（Dynamic Type 200% 以上、VoiceOver、色だけに頼らない、Reduced Motion、触覚＋音の併用）。App Store に「アクセシビリティ栄養ラベル」が導入済みで、"主要タスクを完走できること"が基準。
4. **音声プレーヤーの手本は Moises / Voice Dream Reader / Speechify**: 速度変更、区間タップでループ、声・速度のカスタマイズ。TOEIC は「練習=自由に操作、模試=本番どおり1回」に分ける。
5. **ブランドは"内容層"に、ナビ等の UI 層は標準に**（WWDC26 セッション）。Capacitor の WebView アプリは App Store 4.2「単なるウェブサイトの再パッケージ」に見えないよう、触覚・ネイティブ挙動・オフラインを効かせる。

---

## 1. 受賞アプリ表

ユーザー指定のアプリの確認結果（「確認せず仮定しない」ため先に記載）:

| アプリ | 確認結果 |
|---|---|
| Duolingo | **確認**: ADA 2023 Delight and Fun 受賞（App）。同年 Social Impact のファイナリスト |
| Gentler Streak | **確認**: ADA 2024 Social Impact 受賞。ADA 2023 Visuals and Graphics ファイナリスト。App Store Awards 2022 Apple Watch App of the Year |
| Flighty | **確認**: ADA 2023 Interaction 受賞（App） |
| Crouton | **確認**: ADA 2024 Interaction 受賞（App） |
| Bears Gratitude | **確認**: ADA 2024 Delight and Fun 受賞（App） |
| Lumy | **確認**: ADA 2025 Delight and Fun ファイナリスト（受賞ではない）。App Store Awards 2024 Apple Watch App of the Year |
| Endel | 範囲外: Apple Watch App of the Year **2020**（検索結果）。2021〜2026 の ADA／App Store Awards では確認できず |
| Things | 範囲外: Things 3 は ADA **2017** 受賞（検索結果）。2024 の "Things, Inc." は別会社の Rooms で別物 |
| Streaks / Speak / Brilliant | **未確認**: 2021〜2026 の ADA・App Store Awards の一次ページに名前なし。ほかの受賞歴は未確認 |

### 1-A. 学習・習慣・生産性・アクセシビリティ系を中心にした表

出典 URL の略記: ADA2021=https://developer.apple.com/design/awards/2021/ のように年だけ差し替え（2022〜2026 同形式）。ASA=App Store Awards の Newsroom 記事（末尾の出典一覧に URL）。

| 年 | 賞/カテゴリ | アプリ | 選ばれた理由（公式文言の抜粋/要約） | 出典 |
|---|---|---|---|---|
| 2021 | ADA Inclusivity 受賞 | Voice Dream Reader | 要約: 様々なテキストを読み上げる TTS。声・速度などの設定が細かく選べる。"choose a voice with the perfect tone, timbre, accent, and speed" | https://developer.apple.com/design/awards/2021/ |
| 2021 | ADA Delight and Fun 受賞 | Pok Pok Playroom | 要約: 触覚と効果音の質、創造性を促す設計。"subtle haptics and spot-on sound effects" | https://developer.apple.com/design/awards/2021/ |
| 2021 | ADA Visuals and Graphics 受賞 | Loóna | 要約: 文字・色・アニメ・3D まで精密に作り込んだ"落ち着く"体験。"type, color, animation, and 3D content" を統一 | https://developer.apple.com/design/awards/2021/ |
| 2021 | ADA Interaction 受賞 | CARROT Weather | 要約: ユーモアと、全 Apple 端末で簡潔で上品な UI、ウィジェットや文字盤の充実 | https://developer.apple.com/design/awards/2021/ |
| 2021 | ADA Innovation 受賞 | NaadSadhana | 要約: 歌唱を Core ML で聴き取り、音程の正確さを即時フィードバック（リアルタイム） | https://developer.apple.com/design/awards/2021/ |
| 2021 | ADA Social Impact 受賞 | Be My Eyes | 要約: 視覚障害者と世界中のボランティアをカメラで接続 | https://developer.apple.com/design/awards/2021/ |
| 2021 | ASA iPhone App of the Year | Toca Life World | "masterfully iterating on the art of play and self-expression for kids" | https://www.apple.com/newsroom/2021/12/app-store-awards-honor-the-best-apps-and-games-of-2021/ |
| 2022 | ADA Delight and Fun 受賞 | (Not Boring) Habits | "playful haptics, and elegant gamification"。習慣を旅として見せる。長押しチェックの 3D アニメ＋音＋触覚（Apple 記事） | https://developer.apple.com/design/awards/2022/ ／ https://developer.apple.com/news/?id=9ab1g4r3 |
| 2022 | ADA Inclusivity 受賞 | Procreate | 要約: 手ぶれ・動きのフィルタ、アプリ内 AssistiveTouch 風メニュー、音のフィードバック、色覚設定を追加。VoiceOver・Dynamic Type も | https://developer.apple.com/design/awards/2022/ |
| 2022 | ADA Interaction 受賞 | Slopes | 要約: GPS で滑走を記録、ボタン1つで友人と共有。大量データを滑走ルートのように迷わず読める | https://developer.apple.com/design/awards/2022/ |
| 2022 | ADA Visuals and Graphics 受賞 | Halide Mark II | 要約: 余計な要素のない UI。フィルムカメラを模した配置と、馴染みある操作 | https://developer.apple.com/design/awards/2022/ |
| 2022 | ADA Innovation 受賞 | Odio | 要約: 環境音を円形 UI で調整。アニメと音が同期 | https://developer.apple.com/design/awards/2022/ |
| 2022 | ASA Apple Watch App of the Year | Gentler Streak | "helps users balance fitness and rest" | https://www.apple.com/newsroom/2022/11/app-store-awards-celebrate-the-best-apps-and-games-of-2022/ |
| 2022 | ASA Cultural Impact | How We Feel / Waterllama | 要約: 感情を言葉にする／水分補給の目標を楽しくする（日々のチェックイン系） | 同上 |
| 2022 | ASA iPad App of the Year | GoodNotes 5 | "takes digital note-taking to the next level" | 同上 |
| 2023 | ADA Delight and Fun 受賞 | **Duolingo** | "delight and fun have always been central to the app's success"。UI とコンテンツの全面刷新、クエスト・チャレンジ・リーダーボード、"committed to their learning streak" | https://developer.apple.com/design/awards/2023/ |
| 2023 | ADA Inclusivity 受賞 | Universe — Website Builder | 要約: Dynamic Type と VoiceOver の優れた実装、17 以上の言語。"reducing complexity and removing barriers to entry" | https://developer.apple.com/design/awards/2023/ |
| 2023 | ADA Interaction 受賞 | **Flighty** | "key information where you need it most"。Live Activities／Dynamic Island、空港の標識を踏襲した見た目、ウィジェット、Siri | https://developer.apple.com/design/awards/2023/ |
| 2023 | ADA Social Impact 受賞 | Headspace | 要約: コレクションの目的が明確なラベル、5分の休憩から長いセッションまで迷わない、一貫したイラスト、Watch 連携 | https://developer.apple.com/design/awards/2023/ |
| 2023 | ADA Visuals and Graphics 受賞 | Any Distance | 要約: 動的グラフ、3D マップ、AR で運動の統計を美しく見せる。"in-app collectibles provide a fun incentive" | https://developer.apple.com/design/awards/2023/ |
| 2023 | ADA Innovation 受賞 | SwingVision | 要約: AI でフォームを解析しコーチ役に | https://developer.apple.com/design/awards/2023/ |
| 2023 | ASA Cultural Impact | Pok Pok / Proloquo | 要約: 幼児向けデジタル玩具／AAC（意思伝達）ツール | https://www.apple.com/newsroom/2023/11/apple-unveils-app-store-award-winners-the-best-apps-and-games-of-2023 |
| 2024 | ADA Delight and Fun 受賞 | **Bears Gratitude** | "a simple way to encourage and embrace honest self-reflection"。続けること（maintain）まで配慮した日記アプリ | https://developer.apple.com/design/awards/2024/ ／ https://developer.apple.com/news/?id=i74v3f4r |
| 2024 | ADA Delight and Fun 受賞 | NYT Games | 要約: 毎日遊ぶ習慣。ナビを再設計し、Connections など"再プレイしたくなる"ゲームを追加 | https://developer.apple.com/design/awards/2024/ |
| 2024 | ADA Inclusivity 受賞 | oko | "flawless VoiceOver and Dynamic Type implementation"。信号の状態を触覚と音で伝える | https://developer.apple.com/design/awards/2024/ |
| 2024 | ADA Inclusivity ファイナリスト | Tiimo | 一次ページはファイナリスト名のみ（理由文なし）。→ 2025 に iPhone App of the Year | https://developer.apple.com/design/awards/2024/ |
| 2024 | ADA Interaction 受賞 | **Crouton** | "keep their focus on the counter rather than their screen"。レシピ手順を1画面に絞って提示 | https://developer.apple.com/design/awards/2024/ ／ https://developer.apple.com/news/?id=9x75y43e |
| 2024 | ADA Social Impact 受賞 | **Gentler Streak** | "less about hard comparisons and more about progress"。促しの強い通知ではなく楽観的で励ます調子 | https://developer.apple.com/design/awards/2024/ ／ https://developer.apple.com/news/?id=3m0ht22s |
| 2024 | ADA Social Impact ファイナリスト | How We Feel／Ahead: Emotions Coach | 一次ページは名前のみ | https://developer.apple.com/design/awards/2024/ |
| 2024 | ADA Visuals and Graphics ファイナリスト | Meditate／Sunlitt | 一次ページは名前のみ | 同上 |
| 2024 | ASA iPad App of the Year | Moises | "empowers musicians on iPad to hone their craft with powerful AI tools" | https://www.apple.com/newsroom/2024/12/apple-honors-2024-app-store-award-winners/ |
| 2024 | ASA Apple Watch App of the Year | Lumy | "helps users embrace the patterns of the sun" | 同上 |
| 2024 | ASA Cultural Impact | EF Hello／DailyArt／NYT Games／oko | EF Hello: AI と構造化メソッドで学習者が自信を持って話せるように（要約） | 同上 |
| 2025 | ADA Delight and Fun 受賞 | **CapWords** | 要約: 身近な物の写真をステッカー化して語彙を学ぶ（Apple 記事: 9言語）。写真→背景除去→確認→表示 | https://developer.apple.com/design/awards/2025/ ／ https://developer.apple.com/articles/capwords |
| 2025 | ADA Delight and Fun ファイナリスト | Lumy／Denim | 一次ページは名前・開発者のみ | https://developer.apple.com/design/awards/2025/ |
| 2025 | ADA Inclusivity 受賞 | **Speechify** | 要約: 多数の声・50 以上の言語の読み上げ。Dynamic Type と VoiceOver を前面に（Apple のストア特集）。App Intents で再生再開 | https://apps.apple.com/story/id1808994124 ／ https://developer.apple.com/news/?id=xjifig9f |
| 2025 | ADA Interaction ファイナリスト | iA Writer／Mela | 一次ページは名前のみ（理由文なし） | https://developer.apple.com/design/awards/2025/ |
| 2025 | ADA Social Impact ファイナリスト | Opal／Ground News | 一次ページは名前のみ | 同上 |
| 2025 | ADA Visuals and Graphics ファイナリスト | **Vocabulary - Learn words daily**（Monkey Taps） | 一次ページは名前のみ。ストア: "Word of the day widget & games"、ホーム画面ウィジェット、Watch、iMessage | https://apps.apple.com/us/app/vocabulary-learn-words-daily/id1084540807 |
| 2025 | ASA iPhone App of the Year | **Tiimo** | "an impressive visual planner and thoughtfully implemented AI"（Apple 文言の要約引用）。目標を具体的な次の一歩へ | https://www.apple.com/newsroom/2025/12/apple-unveils-the-winners-of-the-2025-app-store-awards/ |
| 2025 | ASA iPad App of the Year | Detail | 要約: AI 編集でビデオ制作の敷居を下げる | 同上 |
| 2025 | ASA Cultural Impact | Focus Friend／StoryGraph／Be My Eyes／Chants of Sennaar ほか | Focus Friend: "a powerful ally against digital distractions"（Apple 文言の要約引用。集中セッションをゲーム化） | 同上 |
| 2026 | ADA Delight and Fun 受賞 | grug | "a playful way to discover and embrace daily wisdom" | https://www.apple.com/newsroom/2026/06/apple-reveals-winners-of-the-2026-apple-design-awards/ |
| 2026 | ADA Inclusivity 受賞 | Guitar Wiz | "provides spoken instructions on everything from pitch to finger placement"。Dynamic Type・コントラスト増強・色だけに頼らない設定に対応 | 同上 |
| 2026 | ADA Inclusivity ファイナリスト | Hearing Buddy／Structured | Structured: "Visually sharp and easy to scan"（デイリープランナー） | https://developer.apple.com/design/awards/2026/ |
| 2026 | ADA Interaction 受賞 | Moonlitt: Moon Phase Tracker | "easy onboarding" と Liquid Glass 統合（Apple Newsroom の要約） | https://www.apple.com/newsroom/2026/06/apple-reveals-winners-of-the-2026-apple-design-awards/ |
| 2026 | ADA Interaction ファイナリスト | The Outsiders: Athlete Tracker（Gentler Stories） | "a smart balance between intensity and recovery" | https://developer.apple.com/design/awards/2026/ |
| 2026 | ADA Visuals and Graphics 受賞 | Tide Guide: Charts & Tables | "adding extra polish to data presentation and custom animations"。全画面チャート、時間ごとの予報、空に合わせた配色 | 同上＋Newsroom |
| 2026 | ADA Social Impact ファイナリスト | Katha Room／Harvee | Katha Room: 文化的な表現にこだわった寝かしつけ物語（インド）。Harvee: 計測データを回復の指針に翻訳 | https://developer.apple.com/design/awards/2026/ |

注: 2026 の ADA 開発者ページは1回目の取得で抜粋のみ・2回目に 403 となり、全文は未取得。引用は取得できた抜粋と Newsroom による。

### 1-B. App Store Awards（Apple Awards）iPhone App of the Year

| 年 | 受賞 | 理由（公式文言の抜粋） |
|---|---|---|
| 2021 | Toca Life World | "masterfully iterating on the art of play and self-expression for kids" |
| 2022 | BeReal | "gives users an authentic look into the lives of their family and friends" |
| 2023 | AllTrails | "nurtures community through comprehensive trail guides and outdoor exploration" |
| 2024 | Kino | "shows users how cinematic life can be" |
| 2025 | Tiimo | 上表参照（視覚プランナー＋AI） |

学習系で最も近いのは 2024 Cultural Impact の EF Hello と ADA 2023 の Duolingo、2025 ADA の CapWords／Speechify。TOEIC 試験対策そのものの受賞アプリは見つからなかった（**未確認**ではなく、上記ページに存在しない）。

---

## 2. 具体パターン（24 件）

各項目: **パターン** / 出典（受賞アプリ・一次情報）/ **TOEIC アプリへの適用**。適用先タグ: [L]リスニング再生 [T]模試タイマー [F]正誤フィードバック [R]誤答復習 [V]単語（間隔反復）[P]進捗。

### A. 入口（初回・オンボーディング・空状態）

**P1. サインインなしで、起動直後に中身へ**
- 出典: Bears Gratitude（Apple 記事: サインイン画面なし。"go straight into the experience and start writing"）。HIG Onboarding: "fast, fun, and optional"。App Store Review Guidelines 5.1.1(v): "let people use it without a login"。
- 適用: 現行どおりアカウントなし。ホーム初回は「1回目の模試を始める」か「今日の5語」の 1 タップに絞る。通知許可・購入・評価依頼は、価値を体験した後に出す（HIG: 体験前に評価や購入を求めない）。[全体]

**P2. 説明より"触って分かる"オンボーディング**
- 出典: Rytmos（ADA 2024 Interaction。"The onboarding makes gameplay instantly clear"）、stitch.（ADA 2023。"fun onboarding"）、Moonlitt（ADA 2026。"easy onboarding"）。HIG: "Teach through interactivity."
- 適用: 初回だけ、ダミー1問（例: Part 2 の短い音声）を実際に解かせ、再生ボタン・選択・正誤の見え方を体験させる。スキップ可、設定から再表示（HIG: 一度スキップしたら再提示しない）。[L][F]

**P3. 空状態は"白紙"でなく次の一手**
- 出典: Structured（App Store 説明: "Most planners give you a blank page."、対する答えがタイムライン）、Bears Gratitude（プロンプトのカードをめくる UI、Apple 記事）。Tiimo（予定を視覚タイムラインに、tiimoapp.com/product）。
- 適用: 復習ノート 0 件、成績 0 回、ストリーク 0 の画面は「まだ記録がありません」ではなく、今日できる 1 アクション（5語、Part 別 1 問）を主ボタンで出す。推定スコアは「模試1回で表示されます」と条件を明示。[R][P]

### B. 継続（ストリーク・習慣・通知）

**P4. 連続記録は"最小の1行動"で伸びる**
- 出典: Duolingo 公式ブログ（2020-11-19）。ストリークと日次目標を分離し、1レッスンで連続日数が伸びる設計に。自社 A/B で Day 14 継続 +3.3%、ストリーク中の日次学習者 +10.5%（**自社公表値・第三者検証なし**）。
- 適用: 「単語5語 or 任意の1問」で当日達成にする。「毎日1模試」は絶対に要件にしない。[V][P]

**P5. ゆとり（猶予・休止）を最初から組み込む**
- 出典: Duolingo Streak Freeze（公式ブログ 2022-01-31。"slack" がルールの厳格さより動機づける研究を引用。同時所持 2 個で日次学習者 +0.38% と自社公表）。Gentler Streak（公式サイト: 休んでも進捗をリセットしない、ケガ・病気・休みは"罪悪感のない"一時停止。Apple 記事: "guided but it didn't push"）。
- 適用: 自動で付与される「お休み券」（課金なし。買い切りなので売りつけない）。試験日までの残日数を入れておけば、直前期以外の休みを責めない。損失回避（Duolingo は長いストリークに損失回避を使うと自社公表）は**使わない**: 現行の倫理方針（罪悪感をあおる通知なし）と衝突するため、Gentler Streak 側の思想を採る。[P]

**P6. 比較は他人ではなく"自分の履歴"と**
- 出典: Gentler Streak（ADA 2024 本文: "less about hard comparisons and more about progress"。月次サマリは自分の過去との相対）。The Outsiders（ADA 2026: 強度と回復のバランス）。
- 適用: 単独プレイでランキング不要。成績は「前回比」「Part 別の自己ベスト」。推定スコア帯は「目安」と明示（誠実さ）。月次/試験日までのふりかえりカード。[P]

**P7. 通知は少なく、任意で、指図しない**
- 出典: HIG Notifications: "Avoid sending a notification that tells people to perform specific tasks within your app."。App Store Review Guidelines 4.5.4: "Push Notifications must not be required for the app to function"。Gentler Streak: 罪悪感を起こす促しを避ける。
- 適用: ローカル通知のみ、1日1回まで、時刻はユーザーが選ぶ。文言は事実だけ（「今日の5語、できています／まだです」）。初回は求めず、ストリーク2日目などに任意で提案。[P]

### C. フィードバックと演出（正誤・達成）

**P8. 演出は"達成の瞬間"に集中し、日常操作は静かに**
- 出典: (Not Boring) Habits（Apple 記事: 長押しのチェックボックスに 3D アニメ・カスタム音・触覚を数千回調整。ただし通常部品は標準のまま "lightweight, quick-launching, scannable"）。Duolingo（2022: ストリーク節目アニメで新規学習者の 7 日後継続 +1.7%、自社公表。2025: レッスン終了・節目のアニメを刷新）。HIG Motion: "Don't add motion for the sake of adding motion." / 頻繁な UI 操作にモーションを足さない / "Let people cancel motion."
- 適用: 模試中は演出ゼロ。練習の 1 問ごとは短く（正誤を示す 0.2 秒程度の変化）。セクション完了・模試完了・語彙レベル到達・連続日数の節目だけ大きく祝う。いずれもタップでスキップ可。[F][P][T]

**P9. 触覚は意味と 1 対 1 で、少なく**
- 出典: HIG Playing haptics: 触覚は一貫した因果関係で使う／"Avoid overusing haptics."／オプションにする／他の音・視覚と調和。Pok Pok（ADA 2021: subtle haptics）、(Not Boring) Habits（playful haptics）。Capacitor Haptics API: notification の SUCCESS/WARNING/ERROR、impact の LIGHT/MEDIUM/HEAVY、selection 系（Taptic Engine なし端末では何もせず解決）。
- 適用: 正解=notification SUCCESS、不正解=WARNING（ERROR 連打は不快）、選択肢タップ=selection、模試完了のみ強め。模試中は選択の確定時の軽い 1 回だけ（または無し）。設定で OFF、サイレント時も破綻しない。[F][T]

**P10. 正誤は"色だけ"で伝えない（多チャネル）**
- 出典: HIG Feedback: 色・文字・音・触覚を併用すれば "silence their device, look away from the screen, or use VoiceOver" でも受け取れる。HIG Accessibility: "Convey information with more than color alone." Structured（ストア: Differentiate Without Color Alone、Reduced Motion、VoiceOver、ディスレクシア向けフォントを無料機能に）。Procreate（色覚設定）、stitch.（色覚・弱視・動きへの配慮）。
- 適用: 正解/不正解に ✓/✗ アイコン＋「正解」「不正解」の文字＋色＋触覚。VoiceOver には「不正解。正解は B」を読み上げ。Reduced Motion 時は演出を静止表示に置換。[F]

**P11. 失敗を責めない小さな表現**
- 出典: Railbound（ADA 2023。置き間違えた車両の上に"scribbled frustration cloud"が出る、undo が容易）。Duolingo（2025 ハイライト: 小さなミスは減点なしで直せる）。Gentler Streak（励ます調子）。
- 適用: 不正解時は短い言い回し（「惜しい」など。ただし理由は必ず出す）。単語入力式なら小さなつづりミスは許容して再入力の機会を出す。[F][V]

### D. 音声（リスニング）

**P12. 再生速度・区間ループ・声のカスタマイズ（練習モード）**
- 出典: Moises（公式: 速度変更は +/− で調整、無料版は ±10 BPM まで。セクションをタップするとその区間が自動でループ、名前も2タップで変更）。Voice Dream Reader（ADA 2021: 声・速度の細かい調整）。Speechify（Apple 記事: 音声を "sped up, slowed down" 可能）。
- 適用: 練習モードのみ、速度（0.75/0.9/1.0/1.25 倍など）、「この設問をもう一度」、スクリプトの文単位タップで再生（文頭へ戻る）、A-B リピート。模試モードは本番どおり 1 回・停止不可（現行方針）。ピッチ保持の速度変更の実装方法は本調査では**未確認**（Moises ページには明記なし、検索結果の記述のみ）。[L]

**P13. OS 標準のオーディオ挙動を壊さない**
- 出典: HIG Playing audio: ヘッドホンを外したら即一時停止／割り込み後の再開を設計／"Avoid repurposing audio controls."／標準にない"スキップ秒数"などはカスタム可。HIG Accessibility: "Let people control audio and video playback." 自動再生は操作ボタンなしにしない。
- 適用: イヤホン抜けで一時停止。着信などの割り込み後の扱いを明示（模試中は一時停止し、時計も止めるか／止めないかを事前に表示）。ロック画面・Bluetooth の再生ボタンの割当を勝手に変えない（模試では無効にするなら理由を示す）。[L][T]

**P14. 音声は文字でも受け取れる（トランスクリプト）**
- 出典: HIG Accessibility: "Support text-based ways to enjoy audio and video." / "Use haptics in addition to audio cues."
- 適用: 練習・復習でスクリプトと和訳を表示（現行の方針と一致）。Part 1・2 は解答後に選択肢文を出す（本番どおり）。聴覚障害者向けに模試を使う場合の代替は**要検討（本調査では一次情報なし）**。[L][R]

### E. 模試タイマーと画面の情報設計

**P15. 「今必要な情報だけ」を出す**
- 出典: Crouton（Apple 記事: 調理中は現在の手順・材料・換算だけ。"I spent a lot of time figuring out what to leave out."、"How quickly can I get you back to preparing the meal?"）。Flighty（ADA 2023: "key information where you need it most"）。
- 適用: 模試画面＝設問番号・本文・選択肢・残り時間のみ。「この問題はおかしい」「設定」などは目立たない場所へ（現行の指摘どおり）。Part 7 は長文と設問の往復が主操作なので、文書の固定表示が設問を覆うバグ対策を含め、レイアウト検証が必要（award 事例に長文＋設問の直接の手本は**未確認**）。[T]

**P16. タイマーはリング＋数字、節目だけ控えめに知らせる**
- 出典: Tiimo（公式: フォーカスタイマーは進捗リングとカウントダウン、ウィジェットや Live Activities で常に見える）。Flighty（Live Activities／Dynamic Island）。HIG Accessibility: "Minimize use of time-boxed interface elements."（自動で消える通知は、読むのに時間が要る人の障害になる）。
- 適用: 残り時間は常時表示（本番と同じ）。節目（残り 10 分・5 分）は一度だけ、手動で閉じるまで残るバナーに。自動で消えるトーストにしない。練習モードは時間表示を非表示にできる。ロック画面の Live Activity／ウィジェットは**ネイティブ拡張が必要で、Capacitor 標準では未確認**。[T]

**P17. ブランドは内容層に、ナビは標準に**
- 出典: WWDC26 "Communicate your brand identity on iOS"（Apple 動画）。ナビ・ツールバーは標準部品、個性は画像・言葉・動きなど内容層に。"forcing your brand can compromise the user experience." Gentler Streak はシステムフォントで個性を出す。App Store Review Guidelines 4.2: "elevate it beyond a repackaged website"。
- 適用: タブ・戻る・シートは iOS の見慣れた形に寄せる。個性は問題カード、結果画面、マスコット、配色に。Capacitor の WebView でも、スクロール慣性・触覚・オフライン・安全領域（ノッチ）対応で"ただのウェブ"に見えないようにする。[全体]

### F. アクセシビリティ

**P18. 文字は 200% 以上に拡大でき、切り詰めない**
- 出典: Oko・Universe（Dynamic Type と VoiceOver の実装を明記）、Guitar Wiz（Dynamic Type 等）、Structured（"200% or more"）。HIG Accessibility: 少なくとも 200% の拡大を推奨。App Store Connect: Larger Text 対応と認められるには、主要タスクで本文が重ならず、読めない切り詰めがないこと。WWDC26: 独自フォントでも Dynamic Type 対応と折返しが必要。
- 適用: 現行は文字サイズ調整なし。アプリ内で「文字サイズ」を設定に用意（Apple も"自前の文字サイズ設定"を許容）。選択肢は折り返し、Part 7 は拡大時に縦積み。Capacitor の Text Zoom プラグインは WebView の文字拡大用で、**iOS の Dynamic Type に追従するかはドキュメントに記載なし（未確認・実機検証が必要）**。[全体]

**P19. 「主要タスクを最後まで完走できる」を基準にする**
- 出典: App Store Connect アクセシビリティ栄養ラベル（VoiceOver、Voice Control、Larger Text、Dark Interface、Differentiate Without Color Alone、Sufficient Contrast、Reduced Motion、Captions、Audio Descriptions）。"common tasks"＝主要機能に加え、初回起動・購入・設定の流れ。
- 適用: 検証タスクを定義: 初回起動→模試1回目→結果→購入・復元→単語特訓→設定。各タスクを VoiceOver／最大文字／高コントラスト／Reduced Motion で通す。ラベル申告の締切は本調査では**未確認**（"mandatory" になる日付は Apple の Upcoming Requirements 参照）。[全体]

**P20. 声と触覚で状況を伝える（補助チャネル）**
- 出典: Guitar Wiz（ADA 2026: 音程から指の位置まで音声で案内）、oko（触覚と音で信号状態）。HIG: 音のキューには対応する触覚を。
- 適用: 録音・声の機能はないが、正誤・タイマー節目を VoiceOver アナウンス＋触覚で重ねる。[F][T]

### G. 単語・進捗・課金

**P21. 単語カードは「語＋音＋例文」を一画面で。確認ステップで待ち時間を隠す**
- 出典: CapWords（Apple 記事: ステッカー化の処理中に micro-animation を再生、確認ステップがバックエンドの待ち時間を吸収。語・発音・訳を1画面で。音声は AVAudioEngine＋Neural Voice）。Vocabulary（Monkey Taps: ストア説明に Word of the day ウィジェット、レベル・カテゴリ選択）。Duolingo（2025: 8 言語でフラッシュカードの能動想起）。
- 適用: 単語は見出し語（セリフ体は良いと現行評価）＋音声＋例文＋品詞。読み込み待ちは出さない（全データ同梱）。写真認識は不採用（オフライン＋白黒方針）。代替: Part 1 の語彙に白黒写真を添える案（award 事例の直接の手本は**未確認**・翻案）。間隔反復のアルゴリズム自体は受賞事例から取れていない（**未確認**）。[V]

**P22. 段階（レベル）を"旅"として見せる**
- 出典: (Not Boring) Habits（66 日研究に基づく 66 レベルの旅。Apple 記事）。Any Distance（ADA 2023: アプリ内コレクション）。Gentler Streak（Activity Path: 10 日・30 日の見通し）。Tide Guide（ADA 2026: 全画面チャートのカスタムアニメ）。
- 適用: 新しい 6 段（〜400／〜500／〜600／730／860／900+）は「上の段が鍵付き」ではなく、"今ここ"が分かる階段状の進捗ビューに。解放は正答率などの自然な条件で、課金に結びつけない。各段の到達は P8 の"大きく祝う"対象。[V][P]

**P23. 進捗グラフは"数字が伸びる・自分の過去と並ぶ"**
- 出典: Tide Guide（ADA 2026）、Any Distance（ADA 2023: 動的チャート）、Gentler Streak（月次サマリ）。
- 適用: 推定スコアと Part 別正答率の推移、試験日までの日数。数字のカウントアップは練習・結果画面だけ。推定値は「目安」と明示。[P]

**P24. 無料の入口は中身を見せ、有料は拡張。アクセシビリティは有料にしない**
- 出典: Structured（ストア: 基本機能とアクセシビリティ機能は無料、Pro は連携や AI 等）。Gentler Streak（Apple 記事: コア機能は無料、サブスクで拡張）。Pok Pok（開発元 FAQ 検索結果: 遊びの途中に広告・購入画面がない）。App Store Review Guidelines 3.1.1: "you should make sure you have a restore mechanism"、非サブスクの無料トライアル後にフルアンロックを提示してよい。
- 適用: 1回目の模試は完全な体験（文字拡大・触覚・復習も含む）。完了直後の結果画面でアンロックを1か所だけ提示、価格は1つ（300円）、「購入を復元」を設定とアンロック画面の両方に。アクセシビリティ機能は無料側に置く。[全体]

---

## 3. アンチパターン（審査員の言及・ガイドラインが避けるよう求めるもの）

出典明記。審査員の受賞理由文は"何を褒めたか"なので、**逆側（避けるべき）は推論**である点に注意。ガイドライン由来のものは一次の文言。

| # | アンチパターン | 根拠 |
|---|---|---|
| 1 | 動きのための動き。頻繁な操作に演出を付ける。アニメ終了を待たせる | HIG Motion: "Don't add motion for the sake of adding motion." / "Let people cancel motion." |
| 2 | 触覚の多用、成功と失敗で同じ触覚、触覚だけで伝える | HIG Playing haptics: "Avoid overusing haptics." / 一貫した因果関係 / オプションにする |
| 3 | 色だけで正誤・状態を示す | HIG Accessibility: "Convey information with more than color alone." |
| 4 | 文字拡大で重なる・読めない切り詰め。独自フォントで Dynamic Type 非対応 | App Store Connect Larger Text 基準／WWDC26 セッション |
| 5 | 数秒で自動的に消える通知・メッセージ | HIG Accessibility: "Minimize use of time-boxed interface elements." |
| 6 | 操作ボタンなしの自動再生、音声操作ボタンの意味の付け替え | HIG Accessibility／Playing audio: "Avoid repurposing audio controls." |
| 7 | 長い必須チュートリアル、初回に規約を出す、体験前に評価・購入を求める | HIG Onboarding: 速く・楽しく・任意 / 体験前に評価や購入を促さない |
| 8 | 初回に大きなダウンロードを待たせる／空白で待たせる | HIG Onboarding・Loading: "Show something as soon as possible." |
| 9 | アカウント作成の強制（アカウント機能が主でないのに） | Review Guidelines 5.1.1(v) |
| 10 | プッシュ通知を機能の前提にする／販促に使う／"〜してください"と指図する通知 | Review Guidelines 4.5.4／HIG Notifications |
| 11 | 購入の復元なし、紛らわしい価格表示、評価の強制、独自の評価ポップアップ | Guidelines 3.1.1／5.6（"Apps should never prey on users…"）／5.6.1（独自のレビュー依頼は不可）／3.2.2(x) |
| 12 | "ウェブサイトの再パッケージ"に見える作り | Guidelines 4.2: "elevate it beyond a repackaged website" |
| 13 | ナビを独自部品に作り替える、太いバーで内容を圧迫、色の乱用、ダークモード未対応 | WWDC26 "Communicate your brand identity on iOS" |
| 14 | 促しの強い通知・他人との比較で動機づける（長期的に疲れる） | ADA 2024 Gentler Streak の評価文の裏返し: "not by insistent reminders but an optimistic and encouraging vibe"（推論） |
| 15 | 課金・広告・ペイウォールで学習を中断する | Vocabulary のストア評価（2025年9月付の批判的レビュー: ペイウォール・広告。**ユーザーレビューで二次的、受賞評価ではない**）／Pok Pok は逆の好例 |

### 緊張関係（設計判断が要る点）
- **損失回避型ストリーク vs. 罪悪感なし**: Duolingo は損失回避を明示的に使っていると自社ブログで述べ、Apple も"learning streak"を評価。一方 Gentler Streak（ADA 2024）はやさしさを評価された。→ 現行倫理方針により後者を採用し、前者の"1行動で伸びる＋猶予"のみ採る。
- **演出の豊かさ vs. 模試の集中**: (Not Boring) Habits は豊かな演出で受賞したが、本番再現が価値の模試中は演出しない（P8）。
- **ゲーミフィケーション**: Duolingo の数値は自社公表で、他の受賞アプリ（Headspace、Crouton）は演出が控えめ。TOEIC は"試験に受かる"目的が明確なので、ゲーム要素は最小に（コレクションやレベルのみ）。

---

## 4. 優先度の提案（redesign 向け）

1. **すぐ効く（実装が軽い）**: P10（多チャネルの正誤）、P9（触覚の意味づけ＋設定）、P18（アプリ内文字サイズ）、P1・P24（購入復元と初回導線）、P7（任意・少ない通知）
2. **体験の核**: P8（達成だけ祝う）、P12・P13（練習モードの音声操作＋OS 標準挙動）、P15・P16（模試画面の情報削減とタイマー）、P22・P23（語彙の段階と進捗の見せ方）
3. **後回し／別調査**: ロック画面 Live Activity・ウィジェット・Watch（ネイティブ拡張の要否は未確認）、アクセシビリティ栄養ラベル申告（P19）

---

## 5. 未確認・留意事項

- 2026 の ADA 開発者ページ: 取得できた抜粋のみ（再取得は 403）。Newsroom 2026 の要約で補完。ファイナリストの理由文は一部のみ。
- ADA 2021・2022 ページは App／Game の区別が明記されていない。アプリか否かは名称からの判断を含む。2023 ページのファイナリストはゲーム側にまとめて掲載されており、App のファイナリストとの対応が曖昧。
- Speak／Brilliant／Streaks: 2021〜2026 の受賞は一次ページで確認できず（他年の受賞は**未確認**）。
- Duolingo の数値（+3.3%、+10.5%、+1.7%、+0.38%、2.4倍、3.6倍など）はすべて Duolingo 自社ブログの公表値で、独立検証なし。記事の日付は 2020-11-19 と 2022-01-31、2025-12-10。
- Duolingo の触覚・効果音の設計意図は一次の設計記事を見つけられなかった（設定画面のオン/オフ項目の言及のみ、二次情報）。**未確認**。
- CapWords の言語数: Apple 記事は 9 言語、App Store 掲載の検索結果は 10 言語で不一致（掲載時点の差の可能性）。
- Speechify の声の数: ADA 時点の文言は「数百の声・50 以上の言語」、Apple 開発者記事は「1,000 以上・60 言語」。時点が異なる。
- Pok Pok の触覚: 一次情報で確認できず（ADA 2021 本文は触覚に言及、設計詳細は**未確認**）。広告・購入の扱いは開発元 FAQ の検索結果の要約（ページ本体は未取得）。
- Moises: iPad App of the Year 2024 は Apple Newsroom で確認済み。速度変更のピッチ保持や刻み幅は公式ページに明記なし（**未確認**）。
- Tiimo の価格・無料範囲: 公式ページに明記なし。**未確認**。
- Capacitor: Haptics の API は公式ドキュメントで確認。Dynamic Type 追従、Live Activities、ウィジェット、Watch、ピッチ保持再生は本調査では**未確認**。
- HIG の `haptics` ページは取得できなかったため、`playing-haptics` ページ（現行の触覚ガイド）を使用。HIG の本文は各ページの .md 版から読んだ。
- 商標（ETS）・価格設定・競合分析は本調査の対象外。

---

## 6. 出典一覧

**ADA 公式ページ**
- https://developer.apple.com/design/awards/2021/ ／ /2022/ ／ /2023/ ／ /2024/ ／ /2025/ ／ /2026/
- https://www.apple.com/newsroom/2025/06/apple-unveils-winners-and-finalists-of-the-2025-apple-design-awards/
- https://www.apple.com/newsroom/2026/06/apple-reveals-winners-of-the-2026-apple-design-awards/

**App Store Awards（Newsroom）**
- 2021: https://www.apple.com/newsroom/2021/12/app-store-awards-honor-the-best-apps-and-games-of-2021/
- 2022: https://www.apple.com/newsroom/2022/11/app-store-awards-celebrate-the-best-apps-and-games-of-2022/
- 2023: https://www.apple.com/newsroom/2023/11/apple-unveils-app-store-award-winners-the-best-apps-and-games-of-2023
- 2024: https://www.apple.com/newsroom/2024/12/apple-honors-2024-app-store-award-winners/
- 2025: https://www.apple.com/newsroom/2025/12/apple-unveils-the-winners-of-the-2025-app-store-awards/

**Apple Developer 記事・動画**
- Bears Gratitude: https://developer.apple.com/news/?id=i74v3f4r
- (Not Boring) Habits: https://developer.apple.com/news/?id=9ab1g4r3
- Crouton: https://developer.apple.com/news/?id=9x75y43e
- Gentler Streak: https://developer.apple.com/news/?id=3m0ht22s
- CapWords: https://developer.apple.com/articles/capwords
- Speechify: https://developer.apple.com/news/?id=xjifig9f ／ https://apps.apple.com/story/id1808994124
- WWDC26 Communicate your brand identity on iOS: https://developer.apple.com/videos/play/wwdc2026/251/

**ガイドライン**
- HIG: https://developer.apple.com/design/human-interface-guidelines/{onboarding, feedback, playing-haptics, motion, accessibility, playing-audio, notifications, loading}
- App Store Review Guidelines: https://developer.apple.com/app-store/review/guidelines/ （3.1.1, 3.2.2(x), 4.2, 4.5.4, 5.1.1(v), 5.6）
- アクセシビリティ栄養ラベル: https://developer.apple.com/help/app-store-connect/manage-app-accessibility/overview-of-accessibility-nutrition-labels/ ／ https://developer.apple.com/help/app-store-connect/manage-app-accessibility/larger-text-evaluation-criteria/

**各アプリ自身の公式情報**
- Duolingo: https://blog.duolingo.com/improving-the-streak/ ／ https://blog.duolingo.com/how-duolingo-streak-builds-habit/ ／ https://blog.duolingo.com/product-highlights/
- Gentler Streak: https://gentlerstories.com/gentlerstreak/
- Moises: https://moises.ai/features/audio-speed-changer ／ https://moises.ai/features/song-parts
- Tiimo: https://tiimoapp.com/product
- Structured: https://apps.apple.com/us/app/structured-daily-planner/id1499198946
- Vocabulary (Monkey Taps): https://apps.apple.com/us/app/vocabulary-learn-words-daily/id1084540807
- Capacitor: https://capacitorjs.com/docs/apis/haptics ／ https://capacitorjs.com/docs/apis/text-zoom

---

## 付録 A. ADA アプリ部門の受賞・ファイナリスト一覧（2021〜2026・公式ページより）

W=受賞、F=ファイナリスト。ゲームは省略。2021〜2023 ページはアプリ/ゲームの区別が明記されておらず、アプリは名称からの判断を含む。

- **2021** Inclusivity: W Voice Dream Reader／F 1Password, Me: A Kid's Diary。Delight and Fun: W Pok Pok Playroom／F Poolsuite FM, RakugakiAR。Interaction: W CARROT Weather／F Craft, Nova。Social Impact: W Be My Eyes／F Brief, Klima。Visuals and Graphics: W Loóna／F (Not Boring) Weather, Mission to Mars AR。Innovation: W NaadSadhana／F Universe, Museum Alive。
- **2022** Inclusivity: W Procreate／F Navi, Noted.。Delight and Fun: W (Not Boring) Habits／F Chineasy, Waterllama。Interaction: W Slopes／F Transit, Vectornator。Social Impact: W Rebel Girls／F Empathy, Headspace。Visuals and Graphics: W Halide Mark II／F MD Clock, (Not Boring) Habits。Innovation: W Odio／F Focus Noodles, Procreate。
- **2023** Inclusivity: W Universe。Delight and Fun: W Duolingo。Interaction: W Flighty／F（Tide Guide ほか）。Social Impact: W Headspace／F Duolingo, Sago Mini First Words。Visuals and Graphics: W Any Distance／F Gentler Streak。Innovation: W SwingVision／F Camo Studio, Rise: Energy & Sleep Tracker。
- **2024** Delight and Fun: W Bears Gratitude, NYT Games／F Rooms, Dudel Draw。Inclusivity: W oko／F Complete Anatomy 2024, Tiimo。Innovation: W Procreate Dreams／F Copilot Money, SmartGym, Wavelength。Interaction: W Crouton／F Procreate Dreams, Arc Search。Social Impact: W Gentler Streak／F How We Feel, Ahead: Emotions Coach。Visuals and Graphics: W Rooms／F Sunlitt, Meditate。Spatial Computing: W djay／F Sky Guide, NBA。
- **2025** Delight and Fun: W CapWords／F Lumy, Denim。Inclusivity: W Speechify／F Evolve, Train Fitness。Innovation: W Play／F Moises, Capybara。Interaction: W Taobao／F iA Writer, Mela。Social Impact: W Watch Duty／F Ground News, Opal。Visuals and Graphics: W Feather／F Vocabulary, CellWalk。
- **2026** Delight and Fun: W grug／F Blippo+, Metaballs。Inclusivity: W Guitar Wiz／F Hearing Buddy, Structured。Innovation: W NBA: Live Games & Scores／F D-Day: The Camera Soldier, Detail。Interaction: W Moonlitt／F The Outsiders, Tide Guide。Social Impact: W Primary: News in Depth／F Katha Room, Harvee。Visuals and Graphics: W Tide Guide／F Caradise, (Not Boring) Camera。
