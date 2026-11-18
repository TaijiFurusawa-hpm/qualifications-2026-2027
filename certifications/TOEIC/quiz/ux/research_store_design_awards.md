# ストア・デザイン賞の受賞アプリから抽出したUXパターン（TOEIC模試＋単語アプリ向け）

調査日：2026-11-19 ／ 方針：一次情報（賞の公式ページ・Google公式ブログ・ストア掲載・公的デザインシステム）を優先。ログインなし。
引用は賞側の文言のみ（1件15語以内）。**確度ラベル**：【公式】＝賞・運営の公式ページで確認／【公式※】＝公式ページだが取得できたのは要約のみ／【PR転載】＝受賞企業のプレスリリースが審査コメントを転載（賞の原文は未照合）／【ストア】＝ストア掲載のスクリーンショット・説明文を直接確認／未確認＝検索スニペットのみ、または取得不能。

---

## 0. 先に結論（調査で分かったこと）

1. **Google Play「ベスト オブ」は、ほぼ「受賞理由」を書かない。** 日本版（2021〜2025）のGoogle公式ブログは受賞作の一覧と受賞者コメントだけで、Google側の講評は無い。グローバル版も「ベストアプリ」など上位4件にしか1行説明がない。→ 「なぜ選ばれたか」はストア掲載の中身から読むしかない。
2. **学習アプリでの日本の受賞は「楽しさに包んだ継続設計」型。** 自己改善／自己成長部門 大賞：2023 ファンタスピーク（ディズニーで英語）、2025 Langaku（マンガで英語）。グッドデザイン賞（GDA）の審査コメントは「学習意欲を引き出す」「つまずきフォロー」「操作性」「少し背伸びできる仕掛け」で、**問題量や網羅性は評価語に出てこない**。
3. **TOEIC対策アプリでの受賞は、今回見た範囲では見つからない**（Google Play日本版2021〜2025、GDA 2021〜2026）。ただし検索網羅は部分的＝**未確認**。
4. 公式ページから**講評を読めた**のはGoogleのMaterial Design Awards 2019（design.google）とApple Design Awards（参考）。MDA 2021は報道（9to5google）経由でm3.material.io原文は未照合。GDAの受賞ページ（g-mark.org）はJS描画で本文が取れず、iFは403、Webbyは審査コメント自体が非公開 → 該当箇所は【PR転載】または未確認と明記。
5. 日本語UIの数値基準は、**デジタル庁デザインシステムの公式値**が一番使える（本文16px以上、行間1.5倍以上〜1.7、字間0.02em）。

---

## 1. 受賞作一覧（賞／年／アプリ／評価の要点／URL）

### 1-A. Google Play ベスト オブ（グローバル）
| 賞 | 年 | アプリ | 賞側の説明（≤15語） | URL | 確度 |
|---|---|---|---|---|---|
| Best App ／ Personal Growth | 2021 | Balance | "encourages people to find their center through personalized meditations" | https://blog.google/products-and-platforms/platforms/google-play/google-plays-best-of-2021/ | 【公式※】 |
| Best for Personal Growth | 2021 | Clementine, Uptime | 部門説明のみ（個別説明なし） | 同上 | 【公式※】 |
| Best Apps for Good | 2021 | Empathy, Mentor Spaces, Speechify | 個別説明なし | 同上 | 【公式※】 |
| Best App | 2022 | Dream by WOMBO | "create a beautiful piece of art from just a quick text description" | https://blog.google/products-and-platforms/platforms/google-play/google-plays-best-apps-and-games-of-2022/ | 【公式※】 |
| Best for Personal Growth | 2022 | Breathwrk（佳作：Duolingo ABC, Ukulele by Yousician ほか） | 個別説明なし。学習系は佳作止まり | 同上 | 【公式※】 |
| Best Apps for Good | 2022 | The STIGMA App | 個別説明なし | 同上 | 【公式※】 |
| Best App | 2023 | Imprint: Learn Visually | "bite-sized lessons that use visual storytelling to bring concepts to life" | https://blog.google/products-and-platforms/platforms/google-play/google-play-best-apps-games-2023/ | 【公式※】 |
| Best for Personal Growth | 2023 | Voidpet Garden: Mental Health | 個別説明なし（Imprintが佳作という二次情報あり＝未確認） | 同上 | 【公式※】 |
| Best App for Good | 2023 | AWorld（ActNow支援） | 個別説明なし | 同上 | 【公式※】 |
| Best App | 2024 | Partiful | "intuitive design and fresh twist on invite creation" | https://blog.google/products-and-platforms/platforms/google-play/google-play-best-apps-games-2024/ | 【公式※】 |
| Best for Personal Growth | 2024 | UpStudy（カメラ数学ソルバー。日本語版なし） | 個別説明なし。「Best for Good」カテゴリはこの年なし | 同上 ／ https://gigazine.net/gsc_news/en/20241119-google-play-best-app-2024 | 【公式※】 |
| Best App ／ Personal Growth | 2025 | Focus Friend（Hank Green） | "a simple yet effective tool that helps you stay present" | https://blog.google/products-and-platforms/platforms/google-play/best-apps-games-2025/ | 【公式※】 |
| Best Hidden Gem | 2025 | Pingo AI Language Learning | 個別説明なし（機能は第三者掲載のみ＝会話練習・即時フィードバック・サブスク必須） | 同上 | 【公式※】 |
| Best for Families | 2025 | ABCmouse 2 | 個別説明なし | 同上 | 【公式※】 |
| APAC Personal Growth | 2025 | Langaku（日本）、Riliv（インドネシア） | Langaku＝"learn English through popular comics, with tap-to-translate dictionaries" の趣旨（Google要約。引用は意訳） | https://blog.google/company-news/inside-google/around-the-globe/google-asia/google-play-best-2025/ | 【公式※】 |

注：「Best for Good」は2021〜2023のみ確認。2024・2025のグローバル記事にはこのカテゴリが無い。

### 1-B. Google Play ベスト オブ（日本）
日本版ブログに**Google側の講評は無い**（受賞者コメントのみ）。「評価の要点」は受賞者コメントまたはストア掲載。

| 年 | 部門 | アプリ | 要点 | URL | 確度 |
|---|---|---|---|---|---|
| 2021 | 自己改善 大賞／部門賞 | 寝たまんまヨガ／Endel, NewsPicks | 学習系の受賞なし | https://news.mynavi.jp/article/20211130-2208905/ ／ https://blog.google/intl/ja-jp/products/android-chrome-play/2021_11_google-play-2021/ | 報道＋【公式※】 |
| 2022 | 自己改善 大賞／部門賞 | あすけん／LINE CLOVA Note, **スタディサプリ 中学講座** | 部門賞に学習アプリ（講評なし）。Google公式ブログ取得では大賞表記が食い違うため、報道（Impress）を採用 | https://k-tai.watch.impress.co.jp/docs/news/1460519.html ／ https://blog.google/intl/ja-jp/products/android-chrome-play/2022_12_google-play-2022/ | 要照合（大賞の表記）＝未確認 |
| 2023 | 自己改善 大賞 | **ディズニー ファンタスピーク**（アルク） | 「聞くだけ」から始められる。無料で続けられる学習ポイント（ジュエル）。受賞者コメントは利用者数の言及のみ | https://blog.google/intl/ja-jp/products/android-chrome-play/google-play-2023/ ／ https://www.alc.co.jp/2025/06/17/706 | 【公式※】＋企業記事 |
| 2023 | 隠れた名作 部門賞／優れたAI 部門賞 | スタディサプリENGLISH for KIDS／AI英会話スピークバディ | 講評なし | 同上 | 【公式※】 |
| 2024 | 自己成長 大賞 | あんさんぶるトレーニング!!（運動系。学習ではない） | 学習系の受賞なし。ベストアプリ＝マンガワン | https://blog.google/intl/ja-jp/products/android-chrome-play/google-play-bestof2024/ | 【公式※】 |
| 2025 | 自己成長 大賞 | **Langaku（ランガク）**（Mantra） | 受賞者コメント「好きなマンガを読むうちに自然と英語力を伸ばせる」。ストアは日本語キャプション中心（4章で分析） | https://blog.google/intl/ja-jp/products/android-chrome-play/googleplay-best-of-2025/ ／ https://www.appbank.net/2025/11/20/iphone-news/2868388.php | 【公式※】＋【ストア】 |
| 2026 | — | — | 本日時点で日本の2026年版は検索に出ない（未発表の可能性）＝未確認 | — | 未確認 |

### 1-C. Google Material Design Awards
最後に確認できた開催は2021年。2022年以降の開催は**未確認**。

| 賞 | 年 | アプリ | 賞側の説明（≤15語） | URL | 確度 |
|---|---|---|---|---|---|
| Experience | 2019 | **Scripts**（Language Drops。文字の書き方学習） | "an ingenious solution to the challenge of learning new writing systems" | https://design.google/library/material-design-awards-2019 | 【公式※】 |
| Innovation | 2019 | Reflectly | "artfully executed motion choreography" | 同上 | 【公式※】 |
| Theming | 2019 | Ruff | "An expressive brand identity executed with Material Theming" | 同上 | 【公式※】 |
| Universality | 2019 | Trip.com | "excellent travel-booking experience for its global audience" | 同上 | 【公式※】 |
| Motion | 2021 | Post-it | "replicating the feeling of crumpling up a Post-it Note" | https://9to5google.com/2021/12/16/2021-material-design-award-winners/ | 【公式※】（m3.material.io の原文は本文が取れず未照合） |
| Dark theme | 2021 | Meetly | "comprehensive application of colors across the interface" | 同上 | 同上 |
| Large screen | 2021 | Todoist | "bottom sheets in Todoist respond to screen size" | 同上 | 同上 |

### 1-D. グッドデザイン賞（日本）学習系
g-mark.org の受賞ページは本文がJS描画で取得できなかった（見出しのみ）。審査コメントは**受賞企業のPRが転載したもの**で、g-mark原文との照合は未了。

| 年度 | 受賞対象 | 審査コメント（≤15語相当の抜粋） | URL | 確度 |
|---|---|---|---|---|
| 2021 | スピークバディ（AI英会話） | 「少し背伸びできるようなモチベーション向上の仕掛けが随所に」／「レベルチェックやカリキュラム提案なども充実」 | https://www.g-mark.org/gallery/winners/9e5f04f3-803d-11ed-af7e-0242ac130002 ／ https://resemom.jp/release/prtimes/20211020/75827.html | 【PR転載】 |
| 2022 | Study Cast（ベネッセ。自習室×学習記録） | 「仮想の『自習室』とも言えるサービスデザイン」 | https://resemom.jp/release/prtimes/20221007/89065.html | 【PR転載】 |
| 2022 | AI StLike（ベネッセ×PKSHA） | 「まるで先生が個別に出題してくれているかのように」感じる「つまずきフォロー設計」 | 同上 | 【PR転載】 |
| 2024 | 旺文社 受験生のための英検カコモン（過去問＋AI採点） | 評価は「学習者に合わせた効率」「ライティング・スピーキング対策の精度」「操作性」（要約。原文引用なし） | https://www.g-mark.org/gallery/winners/20595 ／ https://xexeq.jp/blogs/media/topics15945 | 第三者記事の要約＝一部未確認 |
| 2024 | スタディサプリ 小学・中学講座 | 受賞の事実のみ。審査コメントは未確認 | https://digitalpr.jp/r/97031 | 未確認 |
| 2026 | Habee（JT。習慣化アプリ） | 「ピアサポート環境をデザインすることで解決する作品」 | https://koubo.jp/article/131263 | 【PR転載】 |
| 2025 | 学習アプリの受賞 | 今回の検索では確認できず | — | 未確認 |

### 1-E. 海外デザイン賞（iF／Red Dot／Webby／Apple）
| 賞 | 年 | 対象 | 内容 | URL | 確度 |
|---|---|---|---|---|---|
| Red Dot: Brands & Communication Design | 2020 | EF Hello（英語学習アプリ） | ページ記載：チャット形式で語彙・会話・文法を学ぶ。"familiar chat patterns" を使い送信・音声・添付が簡単。**審査コメントはページに無い** | https://www.red-dot.org/de/project/ef-hello-49238 | 【公式】 |
| iF Design Award | 2021 | EF Hello | 検索スニペットでは「ゲーム化やマスコットではなく、学習と現実の英語使用のギャップを埋める」。**ifdesign.comは403で原文取得不可** | https://ifdesign.com/en/winner-ranking/project/ef-hello/315400 | 未確認 |
| iF Design Award | 2024・2025 | 学習・語彙アプリ | 該当を見つけられず（サイトが403） | — | 未確認 |
| Webby（Apps & Software: Learning & Education） | 2025 | Struggly「Redefining math learning—one struggle at a time」 | 受賞ページに説明文なし。製品ページより：「ヒントは答えを教えずに促す」「間違いを学びの一部にする」 | https://winners.webbyawards.com/2025/apps-software/software-services-platforms/learning-education/341264/redefining-math-learningone-struggle-at-a-time ／ https://forthejury.struggly.com | 受賞【公式】、UI詳細は未確認 |
| Webby | 2024／2023 | StarWriter（Honoree）／Student Apps（Nominee） | 勝者ではない。説明なし | https://winners.webbyawards.com/2024/apps-software/software-services-platforms/learning-education/284383/starwriter | 【公式】 |
| Apple Design Awards（参考） | 2025 | CapWords（Delight and Fun 受賞）、Vocabulary（Visuals and Graphics 最終候補）、Speechify（Inclusivity 受賞） | CapWords："Learn the name of a thing by taking a picture of it."／Vocabulary：「clean visuals, modern typography, and subtle haptics」／Speechify：Dynamic Type・VoiceOver対応が評価軸 | https://developer.apple.com/design/awards/2025/ ／ https://apps.apple.com/story/id1808994124 ／ https://developer.apple.com/articles/capwords | 【公式※】 |
| Apple Design Awards（参考） | 2023 | Duolingo（Delight and Fun） | 要約経由では「delight and fun have always been central」。一次ページの本文照合は未了 | https://developer.apple.com/design/awards/2023/ | 未確認（要約経由） |

---

## 2. 受賞作ページ・ストア画像から読み取った具体パターン（観察メモ）

直接見たもの：Langaku、スピークバディ、Study Cast のApp Store日本語ページのスクショ（各6枚）。ファンタスピークはApp Storeページを取得できずスクショ未確認（テキスト情報のみ）。

- **Langaku**（https://apps.apple.com/jp/app/id1575690768）：1枚1主張の大見出し「マンガを読むだけの本格英語学習」「タップで日本語切り替え」「読み方を調整できる！」。左下に安心コピー「わからなくても安心！」。表示モードのラベルは「読み方 全て英語／読み方 バランス」（英日の割合を段階調整）。レビュー引用の吹き出し「英語を勉強している感じは皆無です」。実績バッジ（集英社公認、100作品以上）。説明文より：英語コマ数の4段階調整、AI辞書、読了語数の確認、「ウォーミングアップ（読む前のキーフレーズ予習）」。無料は1日1話、有料プランあり。
- **スピークバディ**（https://apps.apple.com/jp/app/id1129621266）：「気軽に楽しもう、英会話。」「AI診断で自分に合うレベルから始められる！」「1回5分〜で無理なく続けやすい」。レベル到達画面「Level 3 入門／飛行機で隣になった外国人に自己紹介できるレベル！」。デイリーレポートに種別メニュー（単語／リスニング／会話／英作文／フリートーク）と項目別★3・ハイスコア・達成率リング。フィードバック画面は誤り語を取り消し線にして正しい語を緑で示し「練習する」ボタン、発音・イントネーションのグラフ。おすすめシーンに「おすすめ」バッジと「悩まなくて大丈夫！」。※「No.1」「500万DL」は企業の自己申告（注釈付き）。
- **Study Cast**（https://apps.apple.com/jp/app/id1474049638）：大きなカウントダウン（例 09:48:48）と少数のボタン（教科変更／AI質問／休憩／終了）。学習記録は中央ドーナツ（全期間の学習時間、連続日数、累計日数）＋教科別の横棒、タブ「全期間／月間／週間／日間」、切替ラベル「期間別／教科別／教材別」。AI質問は「ヒント」を先に出し「まずは自分で考えてみよう！」と段階で見せる。「1人でもOK」の選択肢。

---

## 3. パターン20件と TOEIC アプリへの適用

凡例：領域＝リスニング／模試（時間制）／解答後フィードバック／復習（誤答）／単語（間隔反復）／進捗／解放・課金。
各項目の最後に「根拠」を出典つきで示す。適用案は調査者の提案（推論を含む）。

### P1. 「今日の1手」を主ボタンにする
- 根拠：スピークバディ（AI診断→おすすめ表示）、GDA 2021「カリキュラム提案」【PR転載】、GDA 2026 Habee「習慣化は難しい」問題を設計で解く【PR転載】。
- 適用【進捗・全体】：ホーム最上段に「今日の1セット（約5分）」を1枚だけ置く。現行は長い1画面に全機能が同格（current_audit.md 観察1）。次回の模試・復習件数・単語件数は2番手に下げる。

### P2. レベル診断と、到達点を言葉にする
- 根拠：スピークバディの診断とLevel到達画面（"自己紹介できるレベル"）【ストア】。GDA 2021「レベルチェック」【PR転載】。
- 適用【単語】：6段階（〜400/〜500/〜600/730/860/900+）の各段に「この段を終えると、Part 5の語彙問題で〜が読める」など**できること**を1行で書く。初回は10問の診断で開始段を提案し、段の完了時に到達画面を出す。スコア換算は断定せず「目安」と書く。

### P3. 所要時間を先に見せる
- 根拠：スピークバディ「1回5分〜」【ストア】、Imprint "bite-sized lessons"【公式※】。
- 適用【単語・Part練習】：開始前に「10語・約3分」「Part 5・10問・約6分」と表示。**模試だけ**は「2時間（途中で中断・再開可）」を明示。

### P4. つまずく場所に、短く誠実な安心コピー
- 根拠：Langaku「わからなくても安心！」、スピークバディ「悩まなくて大丈夫！」【ストア】。Struggly「間違いを学びの一部に」（製品ページ）。
- 適用【解答後・復習】：誤答直後に「間違えた問題は復習リストに入りました」程度の事実ベースの1行。励まし文句は連打しない（現行の倫理方針「罪悪感をあおらない」に整合）。

### P5. 情報を段階で開く（日本語・スクリプト・ヒント）
- 根拠：Langaku「タップで日本語切り替え」と英日割合の調整【ストア】。Study Cast「ヒント→まずは自分で考えてみよう」【ストア】。Scripts は背景画像を記憶の手がかりにした【公式※】。
- 適用【リスニング・単語】：Part 3/4の解答後は「音声のみ → 英文スクリプト → 日本語訳」を行ごとにタップで開く。単語は見出し語→例文→和訳→同義語の順に隠す。練習モードのみヒント（根拠の行番号）を1段出せる。

### P6. リスニング再生のコントロールを揃える
- 根拠：ファンタスピーク（テキスト表示／非表示・速度変更・まとめ聞き）【企業記事】、スピークバディ（再生速度調整、多様なアクセント）【ストア説明】。Part 3の音声進行表示が無い（current_audit.md 観察5）。
- 適用【リスニング】：シークバー＋残り時間、0.75/1.0/1.25倍、行タップでその行だけ再生。**模試モードでは速度変更とシークを無効**にして本番どおりにする。

### P7. 正誤の「手応え」を、動き・音・触覚で（練習モードのみ）
- 根拠：Scripts「小さなアニメーションと触覚で正しい書き方を強化」【公式※】、CapWords「sound, touch, sight cues」（Apple記事）、Vocabulary「subtle haptics」。
- 適用【単語・Part練習】：正解＝短いチェック表示＋軽い触覚、誤答＝揺れは使わず色とアイコンで示す（色だけに頼らない）。模試モードは解答中フィードバックを出さない。設定で音・触覚をオフ可。

### P8. 誤答は「差分」で見せる
- 根拠：スピークバディのフィードバック（誤りを取り消し線、正しい語を緑）【ストア】。
- 適用【解答後】：選んだ選択肢と正解を並べ、本文の根拠文をハイライト。SPEC の解説3要素（根拠→言い換え→ひっかけ）を**縦の3ブロック**に分け、ひっかけは種別ラベル（例：言い換え不一致）で短く。

### P9. つまずきフォロー＝同種の問題をもう一度出す
- 根拠：AI StLike「つまずきフォロー設計」が個別出題に感じられる点を評価【PR転載】。
- 適用【復習】：誤答したら、同じtag（品詞／動詞の形 等）の別問題を翌日に1問差し込む。復習画面は「問題の山」ではなく「今日の復習 N問」。**オフラインでも可能**（端末内の記録のみで実現）。

### P10. 分野別特訓に「並べ替え」を付ける
- 根拠：英検カコモン「でる順／難しい順／易しい順」の並べ替えとフィルタ【第三者記事】。
- 適用【復習・Part練習】：Part練習の一覧をtag別に絞り込み、並びを「やさしい順／難しい順／苦手順」に切替。苦手順は自分の正答率から作る（頻度データは自作問題なので「でる順」は使わない）。

### P11. 進捗＝総量＋内訳（ドーナツ＋棒）
- 根拠：Study Cast（総学習時間、連続日数、教科別棒、期間タブ）【ストア】。英検カコモン（総合評価、技能別・大問別の正答率グラフ）【第三者記事】。
- 適用【進捗】：上段に「累計N日／連続N日／直近の正答率」、下段にPart別の正答率の棒。期間タブ（週／月／全期間）。**予想スコアは範囲表示＋「目安」注記**（誇大に見せない）。

### P12. セット単位の小さな到達感（★・ハイスコア・達成率）
- 根拠：スピークバディのデイリーレポート（★3、HIGH-SCORE、達成率リング）【ストア】。
- 適用【進捗・単語】：Part練習のセットごとに★1〜3（正答率の帯で）。単語は語単位の「覚えた」状態数を段のリングで示す。連続日数の途切れは責めない表示（リセットより「再開しました」）。

### P13. 模試のタイマーと「本番／練習」2モード
- 根拠：Study Cast の大きなカウントダウンと少数のボタン、「1人でもOK」【ストア】。Focus Friend の「離れるとキャラが悲しむ」設計（ストアは第三者記述のため、罪悪感型なので**採用しない**）。
- 適用【模試】：セクション残り時間を大きく固定表示、Part 5〜7はペース目安（例：Part 5は1問約20秒）をさりげなく。中断は「保存して終了」で再開可能と明記。練習モードは一時停止・ヒント可、本番モードは不可。偽の緊急性（点滅・煽り）は使わない。

### P14. 無料の1回目は「実物」、課金提示は成績画面の後
- 根拠：英検カコモン＝最新1回分の過去問とAI採点が無料、24時間体験のあと無料会員へ（PR TIMES一次）。Langaku＝1日1話無料。スピークバディ＝3日間体験【ストア】。Imprint のペイウォールはレビューで評判が割れる（第三者＝未確認）。
- 適用【解放・課金】：無料の模試1回を最後まで受けさせ、**成績画面の直後に1回だけ**「2〜10回目を開く（300円・買い切り・追加課金なし）」を表示。ロック中の回は内容（問題数・所要時間・Part構成）を見せる。「購入の復元」を常設。アカウント不要・端末内記録なので「機種変更時は復元で解放」を明記。

### P15. ストアのスクショは「1枚1主張・大きな日本語・実績」
- 根拠：Langaku／スピークバディ／Study Cast の各6枚（見出しは短い日本語1文、強調語に色、機能バッジ、ユーザーの声）【ストア】。
- 適用【解放・課金】：スクショ5〜6枚を「本番と同じ200問・2時間」「解答のたびに根拠がわかる」「聞き取れなかった行だけ再生」「苦手だけを翌日出す」「1回目無料／全10回300円」の順に。数値は自社で検証できるものだけ（「No.1」等の自己申告は載せない）。商標注記は入れる（7章）。

### P16. 日本語タイポグラフィ：公式値を土台にする
- 根拠：デジタル庁デザインシステム：本文16px以上、行間1.5倍以上（本文標準は160〜175%）、16px本文で字間0.02em、見出しは行間140〜150%・太字（https://design.digital.go.jp/dads/foundations/typography/）【公式】。
- 適用【解答後・長文】：解説（80〜140字）は16px／行間1.7、Part 7の長文は文字サイズを3段（標準／大／特大）で可変。英語の見出し語はセリフ体（現行の良い点）を保ち、日本語は和文ゴシック。**英語本文の行間は日本語より詰める**など言語別に調整する（実機確認が必要＝未確認）。

### P17. ダークテーマは「全面」に一貫適用
- 根拠：Meetly "comprehensive application of colors across the interface"、Ruff のlight/dark/black＋文字サイズ調整【公式※】。
- 適用【全体】：Part 1の白黒写真・図表・色付きハイライトまで暗色版を用意。長文の夜間学習を想定。ダーク時にイラストや写真だけ明るく浮かないよう彩度・輝度を調整（Meetlyの暗背景イラスト処理に倣う）。

### P18. 大画面・適応レイアウト（Part 7の重なり対策）
- 根拠：Todoist "bottom sheets ... respond to screen size"、タブレットで追加のプレビュー領域を使う【公式※】。
- 適用【模試・Part 7】：スマホは「文書は固定せず、設問はボトムシートで上げ下げ」、タブレット・横向きは左に文書・右に設問の2ペイン。**現行のスクロール時に文書が設問と重なる不具合（current_audit.md 観察6）**は、文書を貼り付けにしない構造で解消できる。

### P19. 物理のたとえに合う、控えめなモーション
- 根拠：Post-it "replicating the feeling of crumpling up a Post-it Note"【公式※】、Reflectly "artfully executed motion choreography"【公式※】、CapWords の確認ステップ＋マイクロアニメで待ち時間を感じさせない（Apple記事）。
- 適用【模試・解答後】：マークシート風の塗りつぶし、ページめくり、セット完了時の短い遷移。各200〜300ms程度、OSの「視差効果を減らす」設定に従う（数値は目安＝未検証）。

### P20. アクセシビリティを基礎に置く
- 根拠：Speechify（Inclusivity受賞）はDynamic TypeとVoiceOver対応が評価の中心（Apple要約）【公式※】。
- 適用【リスニング・全体】：Part 3/4に全スクリプトを用意（聴覚障害・騒音環境）、選択肢にVoiceOverラベル、色以外で正誤を示す、文字拡大に耐える折返し。Capacitor（WebView）でiOSのDynamic Type連動が効くかは**未確認・要実機**。

### 領域別の早見表
| 領域 | 主に効くパターン |
|---|---|
| リスニング練習 | P5, P6, P20 |
| 時間制の模試 | P3, P13, P18, P19 |
| 解答後フィードバック | P4, P5, P7, P8, P16 |
| 誤答の復習 | P9, P10, P8 |
| 単語（間隔反復） | P2, P3, P5, P7, P12 |
| 進捗 | P1, P11, P12 |
| 解放・課金 | P14, P15 |

---

## 4. 日本市場の固有事項

### 4-A. タイポグラフィと密度
- 公式値：本文16px以上、行間1.5倍以上（標準1.6〜1.75）、16px本文に字間0.02em、見出しは行間1.4〜1.5・太字。日本語と英語は同じ文字数でも幅が違うため、見出しの折返しを許し、ボタン幅を文字数だけで決めない（デジタル庁DSの考え方）。https://design.digital.go.jp/dads/foundations/typography/ 【公式】
- GoogleのMaterial 2の言語対応ページに「CJKは行間を余分に取る」旨があるとする検索結果は出たが、ページ本文は取得できず**未確認**。Appleの最小文字サイズ（iOSで11pt）も検索スニペットのみ＝**未確認**。
- 観察（ストア画像）：日本の学習アプリは**1画面の情報量が多く、太字・色付き強調・キャラクター**を使う（スピークバディ、Study Cast、Langaku）。対して海外の受賞例EF Helloは「ゲーム化やマスコットではなく」（iF掲載の要旨＝未確認）。→ 本アプリは「品質を静かに見せる」路線が差別化になり得るが、**これは推論**（ユーザー調査なし）。

### 4-B. コピーのトーン
- 観察：短い命令・誘いの文末（「〜しよう」「〜できる！」）、安心の言い切り（「悩まなくて大丈夫！」「わからなくても安心！」）、「無理なく続けやすい」、感嘆符は小見出しで使い本文では使わない（ストア画像より）。
- 適用：模試・解説は「です・ます」で事実中心、励ましは1行まで。出題の指示文はETS文面を使えない（SPEC）ため独自の短文にし、「〜を選びましょう」のように統一する。

### 4-C. 価格感・課金モデル
- 周辺の価格（参考）：英検カコモン 1か月1,800円／12か月18,000円、最新1回分は無料（PR TIMES）。Langaku 年間プラン15,800円（アプリ内課金一覧）。ファンタスピーク PRO 月3,300円／年19,800円（App Store掲載。旧版の表示は別価格）。
- 本アプリの「300円・買い切り・1回目無料」は市場でも極端に安い。**「買い切り・追加課金なし」を最初の画面で明示**し、自動更新と誤解されないよう（Langaku・スピークバディはサブスク）「解約の手順」を不要だと伝える。

### 4-D. 受験系アプリの注記
- 英検カコモンは「日本英語検定協会の承認・推奨を受けていない」「AI採点の結果はユーザー自身が確認・判断」を明記（PR TIMES）。本アプリの「TOEIC is a registered trademark of ETS. This product is not endorsed or approved by ETS.」の方針（SPEC/current_audit）と同型。起動時と設定の2か所、ストア説明にも入れる。

### 4-E. 受賞の傾向（Google Play日本）
- 学習アプリで大賞に届いたのは、**エンタメ素材（ディズニー、マンガ）で英語を学ばせる**2件。TOEIC対策アプリは今回見た範囲で受賞なし（検索網羅は部分的＝未確認）。
- 部門名は2023「自己改善」→2024以降「自己成長」と変わった。社会貢献部門は日本版独自（2022ピリカ、2023 TABETE、2024 メルカリ ハロ）。
- GDAは「加点法」で「社会を良くしようとする姿勢」を見る、と審査ユニット総評（2024）にある（https://www.g-mark.org/learn/past-awards/gda-2024/review ＝検索結果の記述のみで原文照合は未了）。

---

## 5. 検証の限界・次の一手

- **未取得**：g-mark.org の各受賞ページ本文（JS描画）、ifdesign.com（403）、Google Play 「ベスト オブ」ページの説明文、Material Design Awards 2021 の m3.material.io 原文、Apple HIG／Material 2 の日本語記述、ファンタスピークのスクショ。
- **一次確認が取れていない引用**：スピークバディ・Study Cast・AI StLike・Habee の審査コメント（企業PR転載）。数字や文言を成果物に使う前に、g-mark.org の受賞ページを手で開いて照合する（引用作法）。
- **推論**：パターンごとの「適用」欄、4-Aの「静かに見せる路線」、モーション時間の目安。
- **次の候補**：（1）g-mark.org を手元ブラウザで開き、上記4件のコメント原文とGDA 2025の学習系受賞を確認、（2）TOEIC対策の主要アプリ（スクショ・課金構成）をストアで比較、（3）Part 7 の2ペイン／ボトムシート案を現行index.htmlで試作。
