# 学習アプリUXリサーチ（TOEIC模試＋単語アプリ再設計用）

調査日: 2026-11-19 ／ 対象アプリ: 買い切り¥300（初回模試無料）・オフライン・アカウントなし・Part1–7練習／200問120分模試（音声つき）／誤答復習／単語（SRS）／統計

**章の対応**：依頼の(1)アプリ別メモ＝第1章／(2)パターン28件＝第4章／(3)真似しないこと＝第5章／(4)未解決の問い＝第6章。第2章（学習科学）・第3章（課金・倫理ガイド）は根拠資料。

## 0. 調査の方法と限界（先に読む）

- 一次情報のみ使用：企業ブログ、公式ヘルプ、公式ストア掲載（App Store、一部Google Play）、公式ドキュメント、査読論文・公的機関資料。ログインなし、個人情報なしで検索。
- **取得できなかったもの**：Quizlet公式ヘルプ・Elevateサポート・abceedヘルプ（Zendesk）は403で本文取得不可。AppleのHIG（人間インターフェースガイドライン）の本文も取得できず。これらは「検索結果の要約のみ」と明記し、**未確認**を付けた。
- **ストアのスクリーンショット**は画像として確認できたもの（abceed／スタディサプリ／Santa）のみ記述。これは広告用画像で、実機UIと違う可能性がある。Android側の画像は未確認。
- 効果の数値（％）は企業が自社で出した値。第三者検証なし。
- 引用は15語以内。

---

## 1. アプリ別パターンメモ

### 1-1. Duolingo

| 論点 | 事実（出典） |
|---|---|
| ストリークの設計 | 連続日数は「1日1レッスン完了」で伸びる。日目標とストリークを**分離**したA/Bで、14日後継続率+3.3%、毎日ストリーク中の学習者+10.5%。最高強度の日目標の人ほどストリークを持ちにくかった。結論「習慣のハードルを下げる方が重要」。https://blog.duolingo.com/improving-the-streak/ |
| ストリーク演出 | 延長時のアニメ追加で、新規学習者の7日後継続が+1.7%。2日→3日は+50%の伸びに感じるが、長くなると「失う損失」が効く、と設計側が説明。https://blog.duolingo.com/how-duolingo-streak-builds-habit/ |
| 余裕（フリーズ） | 最大2つまで先に装備でき、日次アクティブ+0.38%で休みを増やさなかった。ただしゲーム内通貨での補充も売っている（400ジェム）。同上 |
| 普遍的な表現 | 「炎」の比喩が文化を超えて通じない新規ユーザーがいた。マイルストーンはフェニックス変身アニメ＋共有カード。https://blog.duolingo.com/streak-milestone-design-animation/ |
| ウィジェット | 表示は「今日やったか／連続何日か」だけ。他の統計は足さない。ただしDuoの表情が時間とともに「焦る」。https://blog.duolingo.com/widget-feature/ |
| 通知 | プッシュを乱発せず連続記録に投資する方針。https://blog.duolingo.com/product-principles/ ／文面はバンディット（試行して成績の良い文面を選ぶ手法）で選択、新鮮さ効果は薄れるので最近見た文面を下げる。https://blog.duolingo.com/hi-its-duo-the-ai-behind-the-meme/ |
| セッション長 | 「短いレッスン」のテストは学習の代理指標（TSLW）を**下げた**。セッション数や総時間は誤解を生むので、新概念に使った時間を重く数える指標に変えた。リーダーボードは元々熱心な人の時間だけ増やした。https://blog.duolingo.com/time-spent-learning-well/ |
| 間違い復習 | 練習タブに「Mistakes」。開始前に「このセットで復習する間違い◯問」と件数を見せる。https://blog.duolingo.com/guide-to-duolingo-practice-hub/ ／レッスン末尾にも間違いを再出題し、そこではエネルギーを消費しない。https://blog.duolingo.com/duolingo-energy/ |
| ハート／エネルギー | 間違いごとにハート減少は「初心者を特に苛立たせる」（初心者が途中で尽きる確率2倍）。エネルギーは連続正解で回復、広告視聴かジェムで補充。https://blog.duolingo.com/duolingo-energy/ ＝**間違いに罰を与える設計は自社も見直した**。 |
| 適応難度 | 全問正解なら最後の問題をより難しいものに差し替え。誤答は復習に回す。望ましい困難の考え方。https://blog.duolingo.com/keeping-you-at-the-frontier-of-learning-with-adaptive-lessons/ |
| リスニング | スピーカー、**亀ボタン（ゆっくり再生）**、何度でも再生。ユニット序盤は文字つき、徐々に文字なしへ（足場かけ→除去）。アクセシビリティ設定でリスニング自体をオフにできる。https://blog.duolingo.com/covering-all-the-bases-duolingos-approach-to-listening-skills/ |
| ホーム再設計 | 一本道＋間隔反復の理屈。結果の数値は記載なし（根拠は学習科学の説明のみ）。https://blog.duolingo.com/new-duolingo-home-screen-design/ |
| フィードバック音・アニメ | **未確認**：正誤音の設計意図を述べた一次ブログは見つからず。キャラの音声同期アニメの技術記事（https://blog.duolingo.com/world-character-visemes/）はあるが、正誤演出の根拠ではない。 |

### 1-2. Brilliant
- 「学ぶ＝解く」。動画なし、全部インタラクティブ（検索結果で確認した公式ページ要約）。誤答時のカスタムフィードバック。https://brilliant.org/llms.txt （内容は検索要約経由、**未確認**）
- App Store説明は「答えを渡さない」誘導型。https://apps.apple.com/us/app/-/id913335252 ストア上の購入項目は金額のみで期間不明。オフラインの記載なし（**未確認**）。
- 「6倍効果的」は同社の宣伝で根拠未確認。レビュー（非公式）には「復習ツールが弱い」「ストリーク回復の仕組み」への言及。
- 取り入れる点：正誤を即告げず、ヒントを段階的に出す設計。ただし本アプリの**模試ではやらない**（練習モードの解説にだけ応用）。

### 1-3. Speak
- Learn→Practice→Apply の3段。誤りは「正しい形を文脈で示し、もう一度やらせる」。https://www.speak.com/blog/how-speak-reinvents-language-learning
- 正確さの訂正は流暢さの**後**に回す（不安を下げて続けさせるため、と同社説明）。
- 「最初の10秒以内に話し始める」。＝最初の価値までの距離を短く。
- 取り入れる点：誤答→**自分でもう一度解く**→解説、の順（5-1参照）。

### 1-4. Anki / AnkiMobile
- 回答ボタン：Again／Hard／Good／Easy。**各ボタンに次回までの間隔を表示**。Goodが80–95%、Againは5–20%が目安。https://docs.ankiweb.net/studying.html
- デッキ画面：今日の New／Learning／To Review の件数。延滞はその分を考慮して間隔を決め、休んだ後に「最初からやり直し」にならない。同上
- 1日の上限（新規／復習）。復習上限は「ピークをならす」ため。https://docs.ankiweb.net/deck-options.html
- FSRS：希望保持率（既定90%）が最重要の設定。上げるほど復習量が急増するので97%未満に。同上。アルゴリズムの概要はhttps://docs.ankiweb.net/faqs/what-spaced-repetition-algorithm（取得がタイムアウト、**未確認**）。
- 統計：Future Due（今後の復習件数の予測）、Calendar、True Retention（実際の正答率）、回答ボタン比率。https://docs.ankiweb.net/stats.html
- AnkiMobile：**買い切り$24.99、サブスクなし、同期は無料・任意**、メディアは端末内、データは共有されない。https://apps.apple.com/us/app/ankimobile-flashcards/id373493387 ＝本アプリの「買い切り・オフライン・アカウントなし」に最も近いビジネスモデル。

### 1-5. Quizlet（Learn）
- 公式ヘルプとブログは403で本文取得不可。検索結果の要約による：Learnは正解が続くと記述式など難しい形式が増え、テスト日を入力すると計画を立てる。5問連続正解でストリーク開始。無料は一部ラウンドのみ。**未確認**（再確認要）。https://help.quizlet.com/hc/en-us/articles/360030841732-Studying-on-Quizlet
- App Store掲載：Learn、Practice Tests、Spaced Repetition、Retention Insights。Plusは$9.99／$44.99。Learnは有料との利用者レビューあり。https://apps.apple.com/us/app/quizlet-ai-powered-flashcards/id546473125
- 取り入れる点：**試験日を入れると逆算する**（本アプリでは任意入力）。

### 1-6. Elevate
- App Store掲載：40以上のゲーム、毎日のワークアウトは**3〜5ゲームを自分で選ぶ**、週次レポート、カレンダー、適応難度。無料7日トライアルあり。https://apps.apple.com/app/id875063456
- 無料版は「サインアップ後にXをタップ」で入れるとの記載あり（掲載者かレビューか判別できず**未確認**）。隠れた無料導線は透明性の面で真似しない。
- 公式のデザイン記事は見つからず。EPQ（総合スコア）の旧レビューは第三者（**未確認**）。

### 1-7. Headspace / Calm（穏やかな動機づけ）
- Headspace公式ヘルプ：リマインダーは**時間と頻度**を選ぶ、カレンダー連携は任意。https://help.headspace.com/hc/en-us/articles/115008276788-How-can-I-set-up-Reminders ／「マインドフルモーメント」は別の通知でオプトイン。Apple Watchの呼吸リマインドもオプトアウト可。
- Calm公式ヘルプ：リマインダーは時刻と**曜日**を選ぶ。ストリークは瞑想とスリープストーリーのみ数え、音楽は数えない。**抜けた日を履歴から後から追加でき、ストリークが再計算される**。https://support.calm.com/hc/en-us/articles/360008704893-How-to-Correct-a-Broken-Streak
- Headspaceのオンボーディング（目的・時間帯を聞く）は第三者のMedium記事でのみ確認（公式ではない、**未確認**）。App Store掲載には具体的なオンボーディング記述なし。https://apps.apple.com/us/app/headspace-sleep-meditation/id493145008
- 取り入れる点：通知は**ユーザーが時刻・曜日を決める**。失敗を責めずに履歴を直せる。

### 1-8. abceed（日本）
- 公式：無料プランは音声（倍速・シャッフル・区間リピート）、**自動採点マークシート**、学習時間の計測。Proに予測スコア、問題レコメンド、オンライン模試。Pro月額は公式サイト¥1,983〜（掲載が古い可能性）／App Store¥3,300（1か月）・¥8,000（3か月）・¥23,800（1年）。https://www.abceed.com/ ／ https://apps.apple.com/jp/app/abceed-toeic-%E8%8B%B1%E6%A4%9C-%E8%8B%B1%E4%BC%9A%E8%A9%B1%E5%AF%BE%E7%AD%96/id1060016132
- オンライン模試（ヘルプ記事の検索要約、本文は403のため**要再確認**）：30問（約15分）／50問／100問／200問（約120分）の4種。結果は予測スコアにリアルタイム反映。誤差の目安は30問で±100点、200問で±70点。トライアル中は30問の模試のみ。推奨は「毎日おすすめ問題＋週1回模試」。https://globeejphelp.zendesk.com/hc/ja/articles/4402355781529
- 画像確認（App Store広告画像）：模試画面は上部に「あと100問」、中央に説明文（LISTENING TEST）。結果は「予測スコア865（目標600）」とL/Rの横バー、「総合評価A+」、Part別にS/A/B/A-の**文字グレード＋バー**、赤い「次へ」ボタン。学習画面には「わからない」ボタンと語句ポップアップ。
- 弱点：「MY単語帳」に知らない語を自動登録し再出題（リリースノート／説明文）。「弱点分析」という語の明記は公式ページになし。
- オフライン：記載なし（**未確認**）。

### 1-9. スタディサプリENGLISH TOEIC（日本）
- 公式：関正生講師の講義約580本（1本約5分、1.5倍・2倍速）、実戦問題**20回分**（Part別）、ディクテーション／シャドーイング、学習時間グラフ、**学習忘れ防止通知**、連続学習記録、Wi-Fiで事前DLしてオフライン学習。https://eigosapuri.jp/toeic/
- 料金：月額¥3,278／6か月¥18,348／12か月¥32,736（公式）。7日間無料体験→自動更新。https://eigosapuri.jp/toeic/ ／ App Store：¥3,700／¥18,000／¥32,400、**途中解約・残期間の返金不可**、アプリ退会だけでは更新は止まらず設定アプリからの解約が必要。https://apps.apple.com/jp/app/toeic-l-r%E3%83%86%E3%82%B9%E3%83%88%E5%AF%BE%E7%AD%96-%E3%82%B9%E3%82%BF%E3%83%87%E3%82%A3%E3%82%B5%E3%83%97%E3%83%AAenglish/id1256890650
- 画像確認（App Store広告画像）：
  - 「約4分でスコア予測」。結果は**幅**で表示「中級 605〜730点」、注記「あくまで目安であり、実際のスコアとは異なる可能性があります」。
  - 問題演習：ヘッダー「1/5問」、**カウントダウンのタイマーバー**、解答後「解答と解説」パネル（「正解です。」→写真→再生ボタン「最初から」＋**速度セレクタ（遅い）**→正解選択肢＋和訳→解説）、**「後で復習する」チェック**、「次へ」。
  - 単語チェック：「9/10問」、5分タイマー、スピーカーアイコン。
  - 継続の仕掛け：紙吹雪、「Excellent!」、1か月チャレンジの「Congratulations」バッジ。
- 公式サイト本文には「スコア予測」「模試」の記述なし（App Store画像には「約4分でスコア予測」あり）。レビュー（非公式）には「オフラインでは使えない機能がある」「解説動画の読み込みが遅い」。

### 1-10. Santa（Riiid／アルク）
- App Store：無料ダウンロード、約3分のAI診断でスコア予測（精度95%以上は同社表記）、苦手Part分析と学習提案。購入項目は1週間¥4,900、1か月¥1,900〜¥5,980、1年¥11,800／¥14,800、**「実戦模擬試験パッケージ」¥1,500（単品）**。https://apps.apple.com/jp/app/toeic-%E5%AF%BE%E7%AD%96%E3%81%AA%E3%82%89santa%E3%82%A2%E3%83%AB%E3%82%AF-ai%E5%AD%A6%E7%BF%92%E3%81%A7%E3%82%B9%E3%82%B3%E3%82%A2up/id1148006701
- 画像確認：スコアダイヤル（730、LC380／RC350、目標850）、Part別棒グラフ（自分vs基準群）、スキルのレーダー、**「苦手な概念TOP 9」（Part別）**、「今日の学習 2 of 6」、問題画面に経過時間（00:07）、AIチャットで誤答の理由を質問。広告は「毎日30分で平均160点UP」だが注記は「効果には個人差があります」。**同社の自己申告**。
- 公式の学術資料（EdNet）：設問は**バンドル**（共通の本文・写真・音声）単位で、バンドル内は全問解答。ログに**音声の再生／一時停止、選択肢の消去（eliminate_choice）、経過時間**。https://ar5iv.labs.arxiv.org/html/1912.03072
- Riiid自身のA/B（新規ユーザー）：診断結果に**レーダーチャートを足すと課金転換が5.25%→6.26%**、結果ページ全体の改良で転換+11.07%。ただし学習成果・継続率は未測定、有意差検定なし、著者は同社所属。https://ar5iv.labs.arxiv.org/html/2009.08976
- 30日間返金保証、スコア保証プランは報道・リリース要約のみ（**未確認**）。

### 1-11. 価格・ペイウォールの位置（日本のTOEICアプリ比較）

| アプリ | 無料でできること | ペイウォールの位置 | 価格形態 |
|---|---|---|---|
| abceed | 音声、マークシート採点、学習時間計測、AI英会話の試用 | 模試・予測スコア・レコメンドに到達した時点（機能で区切る） | 月額サブスク（¥1,983〜／¥3,300） |
| スタサプ | アプリ無料DL、7日間無料体験 | 体験終了で自動課金（最初から課金前提） | 月額／6・12か月パック |
| Santa | 3分診断、一部の問題（範囲はレビュー情報のみ、**未確認**） | 診断結果の後（Riiid論文のA/B設計から推定。画面遷移の実機確認は未） | 期間課金＋模試パック¥1,500（単品） |
| **本アプリ案** | **初回模試1回分を丸ごと** | **模試1の結果を見た直後** | **¥300買い切り（10回分）** |

---

## 2. 学習科学の根拠（信頼できる出典のみ）

| 概念 | 要点 | 出典 | 本アプリへの含意 |
|---|---|---|---|
| 想起練習（テスト効果） | テストは再学習より長期保持を高める（短期は再学習が良いこともある） | Roediger & Karpicke 2006（Psychological Science）／Dunlosky et al. 2013（Educ Psychol Rev）は「練習テスト」「分散学習」を有用度**高**と評価 | 誤答復習は「解説を読む」でなく「もう一度解く」。 |
| 分散学習 | 最適な間隔は、保持させたい期間が長いほど広がる。1週間後のテストなら間隔は保持期間の20〜40%、1年後なら5〜10% | Cepeda et al. 2006（317実験）／2008（Psychological Science）。https://pubmed.ncbi.nlm.nih.gov/16719566/ | 試験日までの残りで復習間隔を変える（例：残り4週なら数日おき）。**個別の最適値は未確認** |
| 複数回の成功した想起＋日をまたぐ | 想起が複数回成功し、それが数日にまたがると最も強い | Rawson, Dunlosky & Sciartelli 2013（検索要約経由、**未確認**） | 単語は1日で詰めず、翌日以降に再出題。 |
| 望ましい困難 | 学習を遅く感じさせる条件（間隔、テスト、混合）が長期保持を高める。成績と学習は別物 | Bjork 1994。https://www.psychologicalscience.org/observer/desirable-difficulties | 即座の正答率を上げる演出より、定着を優先。 |
| インターリーブ | 7年生の算数の無作為化で、混合練習の1か月後テスト61% vs ブロック38%（d=0.83） | Rohrer et al. 2020（J Educ Psychol）。https://www.gwern.net/doc/psychology/spaced-repetition/2019-rohrer.pdf | 復習をPart／タグ混在で出す選択肢。**英語（TOEIC）への転移は未確認** |
| フィードバックの時期 | 結果は**混在**。39研究中、遅延が優位16／即時が優位12／差なし11。大学38クラスのManyClasses 1でも差ほぼ0（効果量0.002） | Smith & Kimball 2010の整理／ManyClasses 1（NYU IFP要約）。https://ifp.nyu.edu/2021/journal-article-abstracts/manyclasses-1-assessing-the-generalizable-effect-of-immediate-feedback-versus-delayed-feedback-across-many-college-classes/ | どちらでもよいなら、**模試は本番どおり終了後**、練習は即時に。文脈で決める。 |
| テスト不安 | 想起練習のクラスで72%が「試験前に緊張が減った」（自己申告）。一方、低リスクの小テストの方が最終成績が良かったとの研究もあり、不安の強い学生は自己テストを避けがち | Agarwal et al. 2014（JARMAC）／Hinze & Rapp 2014／Liu et al. 2024（いずれも検索要約経由、**未確認**） | 練習モードは低リスク感（得点を煽らない）。模試は「本番」と明示し切り分ける。 |
| 外的報酬の弊害 | 有形の報酬は内発的動機を**かなり損なう** | Deci, Koestner & Ryan 1999（Psychological Bulletin）。https://pmc.ncbi.nlm.nih.gov/articles/PMC2731358 （要約のみ確認） | コイン・宝箱・ガチャは入れない。 |

---

## 3. 倫理的エンゲージメントと購入まわりの公式ガイド

### 3-1. Apple
- 全機能解放は**アプリ内課金**で。3.1.1「復元の仕組みを用意する」。https://developer.apple.com/app-store/review/guidelines/
- 3.1.2：購読前に何が得られるかを明確に説明（買い切りは対象外だが姿勢の参考）。同上
- 3.2.2(x)：評価・レビュー・他アプリのDLを機能利用の条件にしてはならない。同上
- 4.5.4：プッシュは**明示的なオプトインなしにプロモーション目的で使わない**、アプリ内でオプトアウト手段を設ける。同上
- WWDC22「プロアクティブ復元」：起動時に`Transaction.updates`の監視と`Transaction.currentEntitlements`の確認を、購入ボタンを出す**前**に行う。対象は非消耗型を含む。「購入を復元」ボタンは**残す**（別のApple IDなど例外用）。https://developer.apple.com/videos/play/wwdc2022/110404/
- HIGの課金ページ本文は取得できず（**未確認**）。

### 3-2. Google Play
- 価格・条件を明確かつ正確に表示。アプリ内の価格はPlay課金画面の価格と一致（Payments policy §6）。https://support.google.com/googleplay/android-developer/answer/9858738
- Billing：アプリ起動・前面化のたびに`queryPurchasesAsync`で購入を再照会（ネットワーク切断、複数端末、保留購入に対応）。購入は**3日以内にacknowledge**しないと自動返金・権利取消。https://developer.android.com/google/play/billing/integrate
- 一方、買い切りを復元するUIボタンの要否はPlay側の記述なし（本アプリのUX上は両OS共通でボタンを置くのが安全）。

### 3-3. ダークパターン（公的資料）
- FTC等の国際調査（2024）：642のサブスク系サイト／アプリの**約76%**が少なくとも1つのダークパターン。多いのは「隠す・遅らせる（sneaking）」と「選択の誘導（interface interference）」。https://www.ftc.gov/news-events/news/press-releases/2024/07/ftc-icpen-gpen-announce-results-review-use-dark-patterns-affecting-subscription-services-privacy
- 消費者庁 新未来創造戦略本部（ICPRC）調査資料（2025年3月、**研究者個人の見解で庁の公式見解ではない**）：類型に**感情のゆさぶり／執拗な繰り返し／キャンセル困難／事前選択／隠れ定期購入／カウントダウンタイマー・期間限定**など。https://www.caa.go.jp/policies/future/icprc/research_010/assets/caa_futurer101_0407_01.pdf
- 特定商取引法の最終確認画面規制（2021改正）は検索要約のみ確認（**未確認**）。買い切りでも「何が手に入り、いくらか」を最終画面に出す。

---

## 4. 具体パターン（本アプリでの期待効果順）

凡例：影響＝高/中/低、工数＝S/M/L。根拠欄の【推論】は出典なしの設計判断。

### ティアS（最優先）

| # | パターン | 影響する画面・導線 | 影響/工数 | 根拠 |
|---|---|---|---|---|
| 1 | **模試モードは本番どおり「静か」にする**：音声は1回、一時停止なし、途中採点なし、紙吹雪・効果音・連続記録の表示なし。解答はマークシート風。結果は終了後にまとめて | 模試（200問）実施中全般 | 高/M | IIBC公式：リスニングは音声1回、マークシート。https://www.iibc-global.org/toeic/test/lr/about/format.html ／abceedは自動採点マークシートを無料で提供 |
| 2 | **解放の提示は「模試1の結果」の直後**。1画面に「10回分・¥300・1回きり・復元できる」を並べる。タイマー・限定・事前選択・「やめる」を小さくする表示は禁止 | 結果画面→解放シート | 高/S | Santaは診断結果の後が課金入口。Riiidの結果ページ改善でA/B転換+11%（自社値）。Apple 3.1.2、Play §6、CAA類型 |
| 3 | **起動時に権利を自動照会、設定と解放シートに「購入を復元」を常設**。アカウント不要。購入済みなら購入ボタンは出さない | 起動、設定、解放シート | 高/M | WWDC22、Play Billing（起動時に再照会）、AnkiMobile（アカウント不要・買い切り） |
| 4 | **スコアは幅＋「目安」注記＋自作模試である旨**。L/RとPart別を併記。点数1つだけ出さない | 結果画面、統計 | 高/S | スタサプ画像「605〜730点」＋免責／abceedは誤差±70〜100点を明示（検索要約）。本アプリの換算表は未較正（→未解決の問い） |
| 5 | **誤答の自動収集→復習セット**。開始前に「復習◯問」と件数を表示。罰（ハート等）なし | ホーム、結果→復習、復習画面 | 高/M | Duolingo Practice Hub、Duolingo Energy（復習はコスト0） |
| 6 | **復習は「もう一度解く→解説」の順**。解説を先に見せない。自分で再解答してから正解と根拠 | 誤答復習の1問ごと | 高/S | 想起練習（Roediger & Karpicke）、Speakの「正しい形を示して再挑戦」 |
| 7 | **単語SRSの4段階ボタン＋次回間隔の表示**（「わからない／あいまい／わかった／簡単」＋「明日」「4日後」）。標準は「わかった」。 | 単語学習 | 高/M | Anki公式（Good 80–95%）。間隔の見える化 |
| 8 | **単語の1日の上限と「明日の復習予定」**：新規10語／日（変更可）、復習上限、延滞は赤で責めず自動調整 | 単語ホーム、単語設定 | 高/M | Anki（上限は負荷をならす、延滞を間隔計算に反映、Future Due） |
| 9 | **練習モードの音声操作**：再生／最初から／速度（遅い・標準・速い）、スクリプトは解答後に表示（足場かけ） | Part1–4練習 | 高/S | スタサプ画像（再生＋速度）、abceed（倍速・区間リピート）、Duolingo（亀ボタン・足場かけ）。模試では封印 |
| 10 | **解説の構造を固定**：判定→正解→（Part1–4は）スクリプト＋和訳→解説（根拠／言い換え／ひっかけ）→「後で復習」→次へ | 練習・復習の解説 | 高/S | スタサプ画像。SPECの解説形式（根拠・言い換え・ひっかけ）と一致 |

### ティアA

| # | パターン | 画面・導線 | 影響/工数 | 根拠 |
|---|---|---|---|---|
| 11 | **弱点＝タグ別正答率＋最小回答数のしきい値**（例：回答数不足は「データ不足」）＋「この弱点を10問」ワンタップ | 統計、ホーム | 高/M | Santa「苦手な概念TOP 9」、abceedのレコメンド、SPECのtag設計。しきい値は【推論】 |
| 12 | **継続の記録は「ゆるく」**：1セットで1日カウント、日目標とは別、休息日を許容、**抜けた日を後から足せる**、課金で救済しない | ホーム、統計 | 中/S | Duolingo（分離で継続+）、Calm（履歴追加で再計算）。損失回避の煽りは使わない（3章） |
| 13 | **通知は任意・1日1回まで・時刻と曜日を本人が決める**・最初の価値体験（模試1か最初の単語セッション）の後にオプトイン依頼・文言は事実のみ | 設定、初回完了後 | 中/S | Headspace／Calmのヘルプ、Apple 4.5.4、Duolingo「通知を乱発しない」 |
| 14 | **オンボーディングは2問だけ**：目標スコア・受験日（どちらもスキップ可）→すぐ最初の問題へ | 初回起動 | 中/S | Speak「10秒以内」、Quizlet（試験日入力）、Santa（3分診断）。Headspaceの目的質問は第三者のみ（未確認） |
| 15 | **模試開始前の準備画面**：イヤホンで確認する音声サンプル、所要時間（約120分）、通知オフ案内、「途中でやめた場合の扱い」を明記 | 模試開始前 | 中/S | IIBCの所要時間（約2時間）。確認音声は【推論】 |
| 16 | **間隔をあけた再出題を誤答問題にも**：誤答は翌日→数日後→1週間後など、受験日までの残りで間隔を調整 | 復習スケジューラ、ホーム | 中/M | Cepeda 2006/2008、Dunlosky 2013。具体間隔は未確認 |
| 17 | **復習は既定で「混合」**（Part・タグを混ぜる）。「Part別だけ」も選べる | 復習設定 | 中/S | Rohrer 2020（算数。英語への転移は未確認）、Bjork |
| 18 | **模試一覧**：状態（未／途中／済＋スコア幅）。ロック回も構成・所要時間は見せ、解放ボタンは固定位置に1つだけ。隠しの無料導線は作らない | 模試選択 | 中/S | abceedの機能区切り、Santaの模試パック単品、Elevate（隠れた無料導線）は反面教師 |
| 19 | **単語6レベルの進捗**：各レベルの 新／学習中／習得 件数。**任意の配置テスト**で既知語を飛ばす | 単語ホーム | 中/M | Anki Card Counts、Duolingo適応難度、Elevate適応 |
| 20 | **所要時間のペース診断**：Part別の使用時間と目安を結果に表示（特にPart7で時間切れの傾向） | 結果、統計 | 中/S | IIBC（リーディング75分）、EdNetは経過時間を記録。目安値は【推論】 |

### ティアB

| # | パターン | 画面・導線 | 影響/工数 | 根拠 |
|---|---|---|---|---|
| 21 | **セッションは小さすぎず**：Part練習は5／10／20問から選択。「1回3分から」を入口にしつつ短くしすぎない | Part練習の開始 | 中/S | Duolingo（短縮が学習の代理指標を悪化）、スタサプ「1回3分から」 |
| 22 | **誤答中の単語を単語帳に追加**（Part5・7で間違えた語を単語SRSへ） | 解説→単語 | 中/L | abceed「MY単語帳」。問題と単語の紐づけ（content整備）が必要、実現性**未確認** |
| 23 | **選択肢の取消線（消去）操作** | Part3–7 | 低/S | EdNetが`eliminate_choice`を記録＝実在する行動。効果は未確認 |
| 24 | **バンドルUI**：Part3・4は3問ずつ、Part6は4問、Part7は本文を固定して設問をスクロール／切替。バンドル内の全問解答を促す | Part3/4/6/7 | 中/M | EdNet（バンドルは全問解答）、IIBC構成、SPEC |
| 25 | **正誤の表示は静かに**：色＋触覚＋短いアニメ（目安300ms以内）、効果音は既定オフ、文言は穏やか（「惜しい」「次は…」） | 練習の1問ごと | 中/S | Duolingoの正誤演出は一次根拠未確認。リスニング音声と競合するため音はオフが妥当【推論】 |
| 26 | **節目の演出はセッション終了後に1回だけ** | 練習・復習の終了画面 | 低/S | Duolingoの節目アニメ（+1.7%は自社値）、スタサプの紙吹雪。模試中は禁止（3章） |
| 27 | **統計は最小**：スコア幅の推移、Part別正答率、ペース、単語の実際の定着率、学習カレンダー | 統計 | 中/M | Anki統計（True Retention、Calendar、Future Due） |
| 28 | **試験日からの逆算**：「あと◯日・1日◯分」。入力は任意、押し付けない | ホーム | 低/S | Quizlet（試験日入力、未確認）、Santaの目標スコア表示 |

---

## 5. 真似しないこと

### 5-1. ダークパターン・搾取的な設計
1. **損失を煽る演出**：Duolingoウィジェットの「焦る」キャラ、連続記録の途切れを強調する通知。消費者庁調査の「感情のゆさぶり」「執拗な繰り返し」に当たりうる。
2. **学習行為への罰**：ハート／エネルギーで間違いにコストを課す。Duolingo自身が初心者の苛立ちを認めている。
3. **ストリーク救済の課金**（ジェム400でフリーズ補充、Brilliantの「回復」）。
4. **ペイウォール周りの操作**：カウントダウン、「本日限り」、事前選択された上位プラン、「いいえ、結構です」型の文言、閉じるボタンの縮小、最終確認画面の後のアップセル。FTC／消費者庁の類型と一致。
5. **自動更新を前提にした導線・解約しにくさ**（スタサプ：退会だけでは更新が止まらない、途中解約の返金なし）。本アプリは買い切りなので不要だが、「購入済みか不明」な状態を作らない。
6. **隠された無料導線**（Elevateの「Xを押すと無料版」とされる記述。未確認）や、評価・レビューを機能利用の条件にすること（Apple 3.2.2(x)で禁止）。
7. **根拠のない成績訴求**：「平均160点UP」「精度95%」など。Santaの値は自己申告で、広告には「個人差」の注記が付く。本アプリは自作・未較正なので**公式スコアの予測と受け取れる表現は避ける**。
8. **有形の報酬（コイン、宝箱、ガチャ）**：Deci 1999で内発的動機を損なうと報告。
9. **リーダーボード・ランキング**：Duolingoでも、既に熱心な人の時間しか増やさなかった（TSLWブログ）。アカウントなしの方針にも反する。

### 5-2. 模試中に集中を壊す演出（絶対に入れない）
- 効果音、紙吹雪、バッジ、「Excellent!」などの途中称賛（スタサプの演出は練習用の画面）
- 1問ごとの正誤表示、連続正解カウント、XP
- 途中の購入誘導・通知バナー・レビュー依頼
- 残り時間以外のカウンター（連続日数、ランキング）
- 本番に無い機能（音声の巻き戻し・一時停止・速度変更）。必要なら**練習モードに分離**する

### 5-3. 通知・個人情報
- 初回起動での通知許諾要求（Apple 4.5.4の趣旨とも合わない）。
- 売上の最適化を目的にした通知文面の自動チューニング（Duolingoのバンディット）。本アプリは**少数・固定の穏やかな文言**でよい。
- 学習履歴の外部送信（AnkiMobileの「データは共有されない」が理想形）。

---

## 6. 未解決の問い

1. **スコア換算**：自作模試に、公式TOEICの換算表を使ってよいか。法的（ETS／IIBCの商標・出題）と統計的（未較正）の両面。幅の出し方（±いくつか）をどう決めるか。→ 実測データ（自分や協力者の公式スコアとの比較）がない。
2. **模試の中断ルール**：本番どおり「一時停止不可」か、電話着信などで一時停止を許すか。許す場合の表示（「練習扱い」にするか）。
3. **「Appleの配信形態」**：現在のアプリはPWA（index.html／sw.js／manifest）。ストア配信にはラッパーとアプリ内課金が必要。Appleの「Webサイトをアプリ化しただけ」の審査基準（4.2）は今回本文を確認できず（**未確認**）。
4. **¥300の価格点**と、Google Playのacknowledge（3日）運用。端末移行時の復元がApple IDだけに依存して問題ないか。Family Sharingを許可するか（AnkiMobileは対応と記載）。
5. **SRSのアルゴリズム**：FSRSの既定パラメータを固定で使うか、単純なLeitner方式で十分か。6レベルの語彙数が小さい場合の効果は**未確認**。オフライン・無アカウントでの個人最適化は不可。
6. **弱点タグのしきい値**：何問から「弱点」と言ってよいか。誤判定を避けるための最小サンプル数は出典なし。
7. **音声の運用**：イヤホン抜けや着信割り込みの扱い、バックグラウンド再生、音声ダウンロード容量（200問分）とオフライン保証。
8. **フィードバック音・アニメ**：Duolingoの正誤演出の根拠は一次情報が見つからず**未確認**。本アプリのパターン25は設計判断。
9. **Quizlet／Elevate／abceedヘルプの原典**：403で取得できず、検索要約のみ。後日、ブラウザで原典確認が必要。
10. **アクセシビリティ**：時間制限のある模試の延長設定、Dynamic Type、VoiceOver。Appleの基準は今回未確認。
11. **ストアのスクリーンショット（Android）と実機UI**：広告画像と実機の差。実機での確認（無料範囲内）が必要。
12. **実ユーザー調査**：通勤中・イヤホン・片手操作が中心か。Part別／模試／単語の使用比率。この文書は競合分析で、**自アプリの利用者データは含まない**。

---

## 7. 参照した主な出典一覧

- Duolingo: https://blog.duolingo.com/improving-the-streak/ ／ https://blog.duolingo.com/how-duolingo-streak-builds-habit/ ／ https://blog.duolingo.com/streak-milestone-design-animation/ ／ https://blog.duolingo.com/widget-feature/ ／ https://blog.duolingo.com/product-principles/ ／ https://blog.duolingo.com/hi-its-duo-the-ai-behind-the-meme/ ／ https://blog.duolingo.com/time-spent-learning-well/ ／ https://blog.duolingo.com/guide-to-duolingo-practice-hub/ ／ https://blog.duolingo.com/duolingo-energy/ ／ https://blog.duolingo.com/keeping-you-at-the-frontier-of-learning-with-adaptive-lessons/ ／ https://blog.duolingo.com/covering-all-the-bases-duolingos-approach-to-listening-skills/ ／ https://blog.duolingo.com/new-duolingo-home-screen-design/
- Speak: https://www.speak.com/blog/how-speak-reinvents-language-learning
- Anki: https://docs.ankiweb.net/studying.html ／ https://docs.ankiweb.net/deck-options.html ／ https://docs.ankiweb.net/stats.html ／ https://apps.apple.com/us/app/ankimobile-flashcards/id373493387
- Brilliant: https://apps.apple.com/us/app/-/id913335252
- Quizlet: https://apps.apple.com/us/app/quizlet-ai-powered-flashcards/id546473125
- Elevate: https://apps.apple.com/app/id875063456
- Headspace／Calm: https://help.headspace.com/hc/en-us/articles/115008276788-How-can-I-set-up-Reminders ／ https://support.calm.com/hc/en-us/articles/360008704893-How-to-Correct-a-Broken-Streak ／ https://apps.apple.com/us/app/headspace-sleep-meditation/id493145008
- abceed: https://www.abceed.com/ ／ App Store id1060016132 ／ https://globeejphelp.zendesk.com/hc/ja/articles/4402355781529（検索要約）
- スタサプ: https://eigosapuri.jp/toeic/ ／ App Store id1256890650
- Santa: App Store id1148006701 ／ https://ar5iv.labs.arxiv.org/html/1912.03072 ／ https://ar5iv.labs.arxiv.org/html/2009.08976
- TOEIC形式: https://www.iibc-global.org/toeic/test/lr/about/format.html
- Apple: https://developer.apple.com/app-store/review/guidelines/ ／ https://developer.apple.com/videos/play/wwdc2022/110404/
- Google: https://support.google.com/googleplay/android-developer/answer/9858738 ／ https://developer.android.com/google/play/billing/integrate
- ダークパターン: FTC 2024（上記URL）／ 消費者庁ICPRC（上記URL）
- 学習科学: Cepeda 2006 https://pubmed.ncbi.nlm.nih.gov/16719566/ ／ Bjork https://www.psychologicalscience.org/observer/desirable-difficulties ／ Rohrer 2020（上記）／ ManyClasses 1（上記）／ Deci 1999（上記）
