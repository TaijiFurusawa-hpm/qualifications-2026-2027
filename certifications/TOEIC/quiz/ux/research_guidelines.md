# TOEIC 模試アプリ（Capacitor/WebView）UX調査：プラットフォーム規範チェックリスト

調査日: 2026-11-19 ／ 対象: iOS・Android 両ストアで「賞を狙える品質」に達するための一次情報ベースの数値と規則
凡例: [ ] = 実装・検証チェック項目 ／ **未確認** = 一次情報で確認できていない（推測・二次情報のみ） ／ **（派生）** = 一次情報の数値から本アプリ向けに私が導いた推奨値
引用は1か所15語以内。長い引用はしていない。

## 0. 調査方法と注意
- Apple HIG の各ページは JavaScript 描画で通常の取得では本文が出ない。Apple が公開している同内容のJSON（`https://developer.apple.com/tutorials/data/design/human-interface-guidelines/<slug>.json`）から本文と数表を取得した。内容は Web 版 HIG と同一。取得時点の変更履歴に「Layout: 2026-09-09 更新」がある。
- Material Design 3 の公式サイト（m3.material.io）はSPAで本文が取得できなかった。M3 の数値は、Google 公式の `material-components-android` リポジトリのドキュメント（M3 / M3 Expressive 対応）と、Android Developers、Google アクセシビリティヘルプから取った。**m3.material.io の「Accessibility designing」「Applying easing and duration」本文そのものは未確認**。
- WCAG 2.2 は W3C 勧告本文と W3C「Understanding」から取得。JLREQ は W3C の英語版全文から取得。
- 「HIG に空状態（empty state）専用ページ」は存在しない（インデックスで確認）。空状態は Tab bars / Gestures の該当文のみ記載した。
- 日本語（CJK）専用の Apple HIG 規定は、typography / layout / accessibility 等を全文検索したが **見つからなかった**（`japan`/`CJK`/`hiragino` ヒット0）。日本語の組版は JLREQ に拠る。

---

## 1. Apple Human Interface Guidelines（iOS）

### 1.1 レイアウトとセーフエリア
出典: https://developer.apple.com/design/human-interface-guidelines/layout
- [ ] レイアウトは**サイズクラス**（compact/regular）で決める。機種や向きで決めない。画面サイズ・向き・Dynamic Island・文字サイズ・ローカライズ長さへの適応が求められる。
- [ ] 「セーフエリアを守る」: ステータスバー・Dynamic Island・ホームインジケータ・ツール/タブバーに内容が隠れないこと。背景は端まで伸ばし、操作部品・本文はセーフエリア内。
- [ ] 情報は「重要度順に上・先頭側」へ。整列・インデントで階層を示し、段階的開示（progressive disclosure）で初期表示を絞る。
- [ ] 縦横どちらの向き・どのウィンドウサイズでも壊れない（向き固定でも「サイズ変更に耐える」ことが求められている）。
- [ ] Dynamic Type 最大でレイアウトを確認: 横並びは縦積みに、1行行は複数行に伸ばす。
- 注: iPhone 17 系などの具体的セーフエリア寸法の表は取得本文に出ていない（**未確認**）。値は `env(safe-area-inset-*)` で取得し、固定値を書かない。

### 1.2 ヒットターゲット
出典: https://developer.apple.com/design/human-interface-guidelines/buttons ／ https://developer.apple.com/design/human-interface-guidelines/accessibility
- [ ] ボタンのヒット領域は**44×44 pt 以上**（HIG Buttons の一般則）。
- [ ] Accessibility の表: iOS の**既定コントロール 44×44pt／最小 28×28pt**。
- [ ] 間隔: ベゼル付き要素の周りに**約12pt**、ベゼルなし要素は**約24pt**の余白が目安。
- [ ] カスタムボタンには必ず**押下状態（press state）**を持たせる（無いと反応していないように感じる）。
- [ ] 目立つ（prominent）ボタンは1画面に**1〜2個**まで。選択肢の優先は大きさでなく**スタイル**で示す。
- [ ] ラベルは動詞始まりの短い語（例 "Add to Cart" 型）。

### 1.3 タイポグラフィ（Dynamic Type・日本語）
出典: https://developer.apple.com/design/human-interface-guidelines/typography
- [ ] iOS の**標準サイズ 17pt／最小 11pt**（カスタムフォントも同じ基準）。細字（Ultralight/Thin/Light）は避け、Regular/Medium/Semibold/Bold を使う。
- [ ] 文字サイズを**少なくとも200%まで拡大**できること（Accessibility ページの理想値）。
- [ ] 3行以上表示するときは、高さが厳しくても**詰めた行間（tight leading）を避ける**。長文・幅広カラムは行間を広めに。
- Dynamic Type（iOS 本文＝Body。pt／行送り pt）:
  - xSmall 14/19、Small 15/20、Medium 16/21、**Large（既定）17/22**、xLarge 19/24、xxLarge 21/26、xxxLarge 23/29
  - アクセシビリティ: AX1 28/34、AX2 33/40、AX3 40/48、AX4 47/56、AX5 53/62
  - 他（Large 時）: Large Title 34/41、Title1 28/34、Title2 22/28、Title3 20/25、Headline 17/22(Semibold)、Callout 16/21、Subhead 15/20、Footnote 13/18、Caption1 12/16、Caption2 11/13
- [ ] 大きい文字では「すべての語を拡大」でなく**重要な内容を優先**（例: タブのタイトルは拡大しない）。階層（相対的な差）は維持。
- [ ] 拡大時に切り詰め（truncate）を最小化。スクロール領域で本文を切らない。
- **WebView での Dynamic Type**: WebKit は `font: -apple-system-body` 等のキーワードで Dynamic Type 連動を提供（`-apple-system-headline/subheadline/caption1/caption2/footnote` ほか）。出典: https://webkit.org/blog/3709/using-the-system-font-in-web-content/ 。CSS の `px` 固定では連動しない（Capacitor 上での連動挙動の実機確認は**未確認**）。
- 日本語: Apple HIG に日本語固有の数値規定は**無い**。Apple が iOS で日本語に使うシステム書体の厳密なフォールバック順の一次情報も**未確認**（二次情報は §4 参照）。

### 1.4 色・ダークモード・コントラスト
出典: https://developer.apple.com/design/human-interface-guidelines/color ／ .../dark-mode ／ .../accessibility
- [ ] コントラスト（WCAG AA 準拠の指針）: **17pt 以下の文字は 4.5:1**、**18pt 以上は 3:1**、**太字は 3:1**（Accessibility の表）。
- [ ] システム設定「コントラストを上げる」が ON のとき、より高いコントラストの配色を提供する。ライト/ダーク**両方**で検証。
- [ ] ダークモード: 前景と背景の比は**最低 4.5:1**、カスタム色の小さい文字は**7:1 を目標**。
- [ ] ライト/ダークは**システム設定に追従**する。「アプリ独自の外観設定は用意しない」（独自トグルは二重設定になり、壊れたと誤解される）。
- [ ] 色だけで状態・正誤を示さない（形・アイコン・文言を併用）。赤緑・青橙は特に混同されやすい。
- [ ] カスタム色は「ライト・ダーク・高コントラスト」の3系統を用意。アプリが片方の外観のみでも両系統を用意する（Liquid Glass 適応のため）。
- [ ] 白背景の画像（例: Part 1 写真）はダーク時に少し暗くして「光りすぎ」を防ぐ。
- [ ] ダーク時の背景は「ベース」と「エレベート」の2段（重なるときに前面が明るい）。システム背景色を優先。

### 1.5 モーション（Reduce Motion）
出典: https://developer.apple.com/design/human-interface-guidelines/motion ／ .../accessibility
- [ ] 動きは目的があるときだけ。**頻繁に行う操作には動きを足さない**。待たせるアニメは作らない（キャンセル可能に）。
- [ ] フィードバックの動きは短く正確に。
- [ ] 動きを**唯一の伝達手段にしない**（音・触覚・テキストで補う）。
- [ ] Reduce Motion ON 時: 自動・反復アニメ（ズーム・拡縮・周辺の動き）を減らす。具体策＝ばね（バウンス）を締める／ジェスチャに直接追従させる／奥行き(z)変化を避ける／x・y・z の遷移を**フェードに置換**／ぼかしへの出入りを避ける。
- Web 側: `@media (prefers-reduced-motion: reduce)` で上記を実装（MDN: https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-motion ）。WCAG 2.3.3（AAA）は「操作で起きる動きを無効化できること」。
- [ ] 点滅は**1秒に3回以下**（WCAG 2.3.1）。

### 1.6 触覚（Haptics）— どれをいつ使うか
出典: https://developer.apple.com/design/human-interface-guidelines/playing-haptics ／ UIKit: https://developer.apple.com/documentation/uikit/uifeedbackgenerator
- 3系統（iOS）: **Notification**＝タスク/操作の結果（成功・警告・失敗）／ **Impact**＝物理的な衝突・スナップの比喩（"tap when a view snaps into place" 型）／ **Selection**＝値が切り替わっていく間（離散値の移動）。
- [ ] システムの触覚パターンは**文書化された意味どおり**に使う。意味が合わないときは別の汎用/独自パターンにする。
- [ ] 触覚は**原因と結果が1対1**で一貫させる（成功と失敗に同じ触覚を使わない）。
- [ ] 視覚・聴覚の強さ/鋭さに**合わせる**。単独でなく補完として使う。
- [ ] **使いすぎない**。頻繁だと疲れる。「意識されないが、無いと寂しい」が理想。
- [ ] 短い触覚を離散イベントに。長い触覚は意味を薄める。
- [ ] 触覚は**オプション化**（オフにできる）。触覚が無くても使えること。
- 本アプリへの当てはめ（派生）: 選択肢タップ＝Selection か Light impact／正解＝Notification Success／不正解＝Notification Error（一貫させ、連打で多用しない）／残り時間警告＝Warning を節目で1回／試験終了＝Medium impact／スクロール・通常タップには付けない。設定に「触覚」トグル。

### 1.7 サウンドと音声再生
出典: https://developer.apple.com/design/human-interface-guidelines/playing-audio
- サイレントスイッチ: サイレント時は「ユーザーが明示的に始めた音（メディア再生・アラーム等）」だけが鳴る。効果音・BGM・キー音は消えるのが期待動作。
- オーディオカテゴリ表:
  - **Playback**: 音声が本質。「**外国語を教える教育アプリ**」が例示。**サイレントスイッチに従わない**／バックグラウンド再生可。
  - Ambient: 本質でない・他アプリ音と混ざる・スイッチに従う。
  - Solo ambient: 本質でない・他の音を止める・スイッチに従う。
- [ ] **リスニング本編（Part 1–4 の音声）＝ Playback 相当**（サイレントでも鳴る）。**正解音・UI効果音＝ Ambient 相当**（サイレントなら鳴らさない）。
- [ ] 再生中にヘッドホンを外したら**即時に一時停止**。接続時は中断せず経路変更。
- [ ] 音量はシステム音量が最終決定。アプリが全体音量を勝手に変えない。システムの音量ビューを使う。
- [ ] 経路変更（AirPlay/Bluetooth）を許可。
- [ ] 中断（着信など）の種類を見て**再開を自動にするか決める**（再開可能な中断のみ自動再開）。
- [ ] 標準のオーディオ操作（コントロールセンター/ヘッドホン）の意味を**再定義しない**。独自プレイヤー操作は「システムに無い命令」（例: 任意秒スキップ、倍速）だけに限る。
- [ ] 重要な情報を**音だけ**で伝えない（音＋視覚＋触覚）。
- WebView での実際の挙動（WebKit バグ追跡）: HTML `<audio>`/`<video>` はサイレントスイッチを**無視して鳴る**／Web Audio（AudioContext）は既定 ambient 扱いでサイレント時**無音**。iOS 17 以降、`navigator.audioSession.type = "playback"` でミュートを避けられるとの報告。出典: https://bugs.webkit.org/show_bug.cgi?id=237322 ／ 仕様 https://www.w3.org/TR/audio-session/ ／ MDN https://developer.mozilla.org/en-US/docs/Web/API/AudioSession/type （MDN は **Experimental**）。バックグラウンド・着信後のミュート再発報告もあり（https://bugs.webkit.org/show_bug.cgi?id=243727 ）。実機での挙動は**未確認**（iOS 26 系での再現確認が必要）。

### 1.8 フィードバック・ローディング・起動・オンボーディング
出典: https://developer.apple.com/design/human-interface-guidelines/feedback ／ .../loading ／ .../launching ／ .../onboarding
- [ ] フィードバックは「重要度に見合った伝え方」。成功・失敗・警告・訂正機会を色・文・音・触覚の**複数経路**で（VoiceOver・消音でも届く）。
- [ ] できない操作は「なぜできないか」を示す。重要な操作の完了は確認する（頻繁な操作は不要）。
- [ ] ローディング: **すぐに何か見せる**（プレースホルダ）／待つ間も他の操作を可能に／長い待ちは進捗（確定/不確定インジケータ）。
- [ ] 起動: **即時起動**。起動画面は最初の画面と**ほぼ同じ**にして「ちらつき」を避ける。**起動画面に文字・ロゴ・広告を入れない**（ローカライズされないため）。向き・外観（ダーク/ライト）を合わせる。
- [ ] **前回の状態を復元**（スクロール位置まで）。→ 模試の中断再開に直結。
- [ ] オンボーディング: **速く・楽しく・任意**。体験させて教える（操作しながら）。文脈に応じたヒントを分散。**一度スキップしたら再表示しない**が、設定等から見返せるように。必須でない初期設定は後回しで既定値を用意。
- [ ] 権限リクエストは「必要な機能に初めて触れた時」か、理由を示せるオンボーディング内で。
- [ ] **大きなダウンロードでオンボーディングを妨げない**（必要メディアは同梱を検討）。→ 音声58フォルダ規模の同梱サイズと初回DL（App Review 4.2.3(ii): 初回に追加リソースをDLするならサイズを開示し確認）に注意。
- [ ] 空状態（空のタブ）: 「タブを無効化・非表示にせず、**なぜ空か説明**する」（Tab bars）。専用ページは HIG に無い（**未確認**扱い）。
- [ ] タブバー: ナビゲーション用（操作は toolbar）／常時表示／**ラベル付き（できれば1語）**／オーバーフロー「More」を避ける／バッジは重要情報のみ。具体的なタブ数の上限は取得本文に数値なし（**未確認**）。

### 1.9 課金・ペイウォール（買い切り300円／1回目無料）
出典: https://developer.apple.com/design/human-interface-guidelines/apple-in-app-purchase ／ https://developer.apple.com/app-store/review/guidelines/
- [ ] **先に体験させてから購入**（1回目無料はこの推奨に合致）。
- [ ] 購入UIはアプリの見た目に統合（別アプリに見えない）。商品名・説明は短く平易、**請求総額を表示**。
- [ ] **標準の購入確認シートを改変・模倣しない**。支払い不可のときは店を隠すか理由を表示。
- [ ] 評価プロンプト: 初回起動・オンボーディング中は出さない／システム提供のプロンプトを使う（**年3回まで**自動制限）／依頼間隔は**1〜2週間以上**。出典: https://developer.apple.com/design/human-interface-guidelines/ratings-and-reviews
- [ ] 審査要件 3.1.1: 機能の解放は必ずアプリ内課金（IAP）。**復元（restore）の仕組み**を用意。
- [ ] 審査要件 4.2: 「**単なるウェブサイトの再パッケージを超える機能・UI**」（本文 "elevate it beyond a repackaged website"）。
- [ ] 審査要件 5.1.1(i): プライバシーポリシーへのリンクを App Store Connect と**アプリ内の分かりやすい場所**の両方に。
- [ ] 審査要件 5.2.1: 第三者の商標を許可なく使わない（「TOEIC」は ETS の商標。アプリ名・アイコン・メタデータ・説明文の表記方針が必須。公式問題の転載をしない方針は維持）。

### 1.10 アクセシビリティ（VoiceOver 等）
出典: https://developer.apple.com/design/human-interface-guidelines/accessibility ／ .../voiceover ／ .../gestures
- [ ] 主要な要素すべてに**代替ラベル**（画像は意味のあるものだけ記述、装飾は除外）。グラフ・図表（Part 3 図表問題）は**簡潔な説明**を付ける。
- [ ] 画面ごとに一意なタイトルと見出し。関連要素は**グループ化**して読み上げ順を整える。画面内容が変わったら VoiceOver に**変化を通知**。
- [ ] 音声だけでは伝えない: **キャプション／トランスクリプト**を用意（"Transcripts" の推奨）。→ 解答後に全文スクリプトを表示。
- [ ] 音声・動画は「**自動再生しない**（操作を提供して開始・停止）」。
- [ ] 時間で自動的に消えるUIを最小化。「明示的な操作で閉じる」を優先（トースト等）。
- [ ] ジェスチャには**代替手段**（スワイプで戻す＋戻るボタン）。複雑なマルチフィンガーは避ける。
- [ ] ゲーム/難易度: 「反応時間の調整」などの難易度調整を検討（→ 試験タイマーの延長設定）。
- [ ] 任意: App Store Connect の「Accessibility Nutrition Labels」で対応状況を申告できる。

---

## 2. Material Design 3 / Android

### 2.1 タッチターゲット・間隔
出典: https://support.google.com/accessibility/android/answer/7101858 ／ https://developer.android.com/guide/topics/ui/accessibility/apps
- [ ] **48dp × 48dp 以上**（約7〜10mm）。間隔は**8dp 以上**。Compose の標準Material部品は既に満たす。独自要素は自前で保証。
- [ ] コントラスト（Android 公式）: **18sp 未満（太字は14sp未満）の文字は 4.5:1**、それ以外は 3:1。
- 注: m3.material.io の同旨ページは取得不能（**未確認**）。数値は上記公式2ページで確認。

### 2.2 タイプスケール・文字拡大
出典: https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Typography.md ／ https://developer.android.com/about/versions/14/features
- M3 ベースライン（sp）: Display 57/45/36、Headline 32/28/24、Title 22(L)・16 Medium(M)・14 Medium(S)、**Body 16(L)/14(M)/12(S)**、Label 14 Medium(L)/12 Medium(M)/11 Medium(S)。強調スケールあり。
- [ ] 長文英文（Part 7）は Body Large=16sp を下限の目安に、可読性のため 17px 前後を推奨（派生: iOS既定17ptと揃える）。
- [ ] Android 14 以降、システム文字拡大は**最大200%**・非線形。**200%でテスト**し、行高さも sp で指定（dpだと窮屈になる）。パディングを sp で指定しない。
- WebView の CSS px がシステム文字サイズに追従するか（`textZoom` 既定）は **未確認**。実機で「設定 > 文字サイズ 最大」を確認し、追従しないなら設定画面に独自の文字サイズ調整（少なくとも3段階）を提供。

### 2.3 モーション（イージングと所要時間）
出典: https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Motion.md
- 所要時間トークン: Short 50/100/150/200ms、Medium 250/300/350/400ms、Long 450/500/550/600ms、ExtraLong 700/800/900/1000ms。**移動距離・面積が大きいほど長く**。
- イージング（cubic-bezier）: Standard `0.2,0,0,1`／Standard decelerate（画面に入る）`0,0,0,1`／Standard accelerate（画面から出る）`0.3,0,1,1`／Emphasized decelerate `0.05,0.7,0.1,1`／Emphasized accelerate `0.3,0,0.8,0.15`／Linear `0,0,1,1`。
- [ ] CSS 化: `transition: transform 250ms cubic-bezier(0.2,0,0,1)`（Medium1＋Standard）を基本。入場は decelerate、退場は accelerate、短め（Short2〜Medium2＝100〜300ms）に。
- 画面遷移の具体的な標準値（例: コンテナ変形の入場/退場の所要時間）はライブラリ文書の記述が混在しており**未確認**。上のトークン範囲内で端末の体感に合わせて調整する。

### 2.4 触覚
出典: https://developer.android.com/develop/ui/views/haptics/haptics-principles
- [ ] 原則「**少ないほど良い**」。clear（鋭い）＞rich＞buzzy（鳴り続ける）。buzzy になるくらいなら**触覚なし**を選ぶ。
- [ ] 事前定義の `HapticFeedbackConstants` を優先（端末間で一貫・アクセシビリティ上も重要）。
- [ ] 頻繁な事象（スクロール等）は極小、重要な事象（送信・更新）は強めに。**強さ＝重要度×頻度の逆**。
- [ ] 良いキークリック触覚は**10〜20ms**。古い単発バイブ（`vibrate(long)`）は余韻でぶるぶるするので避ける → Capacitor の `Haptics.vibrate()`（既定300ms）は UI フィードバックに使わない。
- [ ] 視覚・音と**同期**（ずれると壊れて見える）。

### 2.5 ナビゲーション（ボトムナビ vs タブ）
出典: https://raw.githubusercontent.com/material-components/material-components-android/master/docs/components/BottomNavigation.md ／ .../Tabs.md
- [ ] **Navigation bar（ボトムナビ）は 3〜5 の目的地**。各目的地は**アイコン＋ラベル**。画面下部（親指が届く）。M3 Expressive では高さ 80dp→**64dp**、アクティブインジケータ 64→**56dp 幅**。600dp 以上では横並び項目に変わる。
- [ ] **Tabs は「画面内」のコンテンツ切替**。Primary tabs=アプリバー下の主要コンテンツ、Secondary=コンテンツ領域内の階層。高さ 48dp（インライン文字）／72dp（アイコン＋文字）。
- [ ] 使い分け（派生）: 全体のトップレベル（ホーム／模試／復習／設定）＝ボトムナビ、模試内の Part 切替＝タブ。
- [ ] 戻る操作: Capacitor の `App` プラグインで `backButton` を**リッスンすると既定の戻る動作が無効化**される。履歴が無いときは `exitApp()`、模試中は確認ダイアログ。Android 13+ の予測型戻る（predictive back）との相互作用は Capacitor 文書に記載なし（**未確認**）。出典: https://capacitorjs.com/docs/apis/app
- [ ] システムジェスチャ領域: Android 10 以降は**左右端が戻るジェスチャ、下端がホーム**。端に置いたスワイプUI（問題の左右スワイプ）は避ける。出典: https://developer.android.com/develop/ui/views/layout/edge-to-edge

### 2.6 ダークテーマ・エッジtoエッジ
出典: https://raw.githubusercontent.com/material-components/material-components-android/master/docs/theming/Dark.md ／ https://developer.android.com/develop/ui/views/layout/edge-to-edge
- [ ] ダークは**システム設定に追従**（DayNight）。有機ELで省電力の利点。
- [ ] **targetSdk 35 以上では Android 15 以降でエッジtoエッジが強制**。システムバーは透明、3ボタンナビは半透明。インセットで重なりを処理する。ステータスバー/ナビバーのアイコン色は背景に合わせる。
- [ ] 色コントラスト制御（Contrast Control）は動的カラー使用時に自動対応（Material 色役割）。ダーク背景の具体数値（例: 推奨サーフェス色）は取得できず **未確認**。

### 2.7 アクセシビリティ（TalkBack）
出典: https://developer.android.com/guide/topics/ui/accessibility/principles ／ .../apps
- [ ] すべての対話要素に**一意の**説明（contentDescription）。リスト内の各項目も一意に。「送信ボタン」でなく「送信」（役割は Role が伝える）。装飾は null。
- [ ] 見出し（heading）、ペインタイトル（一意に）、関連要素のグループ化。
- [ ] スワイプ/ドラッグだけの操作には**アクセシビリティ操作**（代替）を用意。
- [ ] 色以外の手がかり（形・文言・触覚）。
- [ ] メディア: **一時停止/停止、音量、字幕の切替**の操作を持たせ、必須情報は文字（トランスクリプト）でも提供。

---

## 3. WCAG 2.2 AA（クイズ＋音声アプリで関係が深い項目）
出典: https://www.w3.org/TR/WCAG22/ ／ Understanding: https://www.w3.org/WAI/WCAG22/Understanding/

### 3.1 数値で確認する項目
| SC | 基準（要点） | 本アプリでの運用 |
|---|---|---|
| 1.4.3 コントラスト(最小) AA | 文字 **4.5:1**、大きい文字 **3:1**（大＝18pt／太字14pt、CJK は同等サイズ）。無効状態・装飾・ロゴは対象外 | 本文・選択肢・解説は 4.5:1 以上。ライト/ダーク双方で測る |
| 1.4.11 非テキストコントラスト AA | UI部品の識別に必要な視覚情報と状態、必須のグラフィックは **3:1** | 選択肢の枠・選択状態・タイマー・進捗バー |
| 1.4.1 色の使用 A | 色だけで情報・操作・区別を示さない | 正誤は色＋○×アイコン＋文言 |
| 1.4.4 テキストのサイズ変更 AA | 支援技術なしで **200%** まで機能・内容を失わない | 200%拡大で選択肢が切れない |
| 1.4.10 リフロー AA | **320 CSS px 幅**で2方向スクロール不要（地図・表等は例外） | 小型端末・大文字で Part 7 本文が折り返す |
| 1.4.12 テキスト間隔 AA | 行間 **1.5倍**・段落後 **2倍**・字間 **0.12em**・語間 **0.16em** に上書きしても欠損しない | 固定高さ・overflow:hidden を避ける |
| 2.5.8 ターゲットサイズ(最小) AA（新） | ポインタ対象は **24×24 CSS px** 以上。小さい場合は24px円が他に交差しない間隔／同等の別操作／文中リンク等は例外 | 本アプリは **48px 以上**で常に満たす（派生） |
| 2.5.5 ターゲットサイズ(強化) AAA | **44×44 CSS px** | 参考（Apple 44pt と同値） |
| 2.4.7 フォーカス可視 AA／2.4.11 フォーカスが隠れない(最小) AA（新） | フォーカス位置が見える／固定バー等に**完全には隠れない** | 画面下の固定「次へ」バーが選択肢を隠さない |
| 2.5.1 ポインタジェスチャ A／2.5.7 ドラッグ操作 AA（新） | 複数点・軌跡ジェスチャやドラッグは**単一ポインタ（タップ）の代替**を持つ | スワイプ/ドラッグ並べ替えにボタン代替 |
| 2.5.2 ポインタキャンセル A | 実行は**アップイベント**で、中止/取消が可能（押下時に確定しない） | `touchstart` で解答確定しない。`click` を使う |
| 2.5.3 名前に含まれるラベル A | アクセシブル名に画面上の文字を含める | 「次へ」ボタンの aria-label も「次へ…」始まり |
| 1.3.4 向き AA | 縦横どちらかに固定しない（必須でない限り） | 固定する場合は理由を決める |
| 3.1.1 ページの言語 A／3.1.2 部分の言語 AA | 言語を機械可読に（`lang="ja"`、英文は `lang="en"`） | 英文パッセージに `lang="en"` → 読み上げ音声が切替わる |
| 4.1.3 ステータスメッセージ AA | 正誤・保存・残り時間などの状態を**フォーカス移動なしで**支援技術に伝える | `role=status` 等（タイマー毎秒の読み上げは避ける） |
| 2.3.1 点滅 A | **1秒に3回超**の閃光なし | 紙吹雪・点滅演出の上限 |

### 3.2 音声（1.4.2、1.2.1、1.1.1）
- **1.4.2 音声コントロール（A）**: 自動再生が**3秒を超える**なら、停止/一時停止の手段か、システム音量と独立した音量操作を提供。「自動」とは「利用者の意図した操作で始まらない再生」で、**明示ラベルのボタン**からの再生は該当しない。→ **自動再生しない／ユーザー操作で再生**を原則に（Apple HIG も同旨）。
- **1.2.1 録音のみ（A）**: 録音音声には**同等情報の代替（トランスクリプト）**。WCAG は1.2.1に「テスト」の明示例外を設けていない。
- **1.1.1 非テキスト（A）**: 「テスト/演習で、テキストにすると無効になる」非テキスト内容には**説明的な識別（記述）**のみ必要。
- 運用案（派生）: リスニング中は台本を出さず、各音声に「Part 3・会話・2人」のような**識別ラベル**を付ける（1.1.1 Test例外）。**解答後（レビュー）に全文スクリプトと日本語訳を表示**して 1.2.1 の趣旨を満たす（聴覚障害のある学習者もレビューで内容を確認できる）。再生/一時停止/音量/**再生位置**の操作を必ず付与。
- **模試の再生回数制限**（本番どおり1回）は設定で「何度でも聞ける」練習モードを併設（アクセシビリティ上の代替）。

### 3.3 時間制限（2.2.1 タイミング調整）と模試タイマーの緊張関係
2.2.1（A）の要件: コンテンツが設定する各制限時間で、次のいずれかを満たす。
1. 開始前に**オフにできる**
2. 開始前に**既定の10倍以上まで調整できる**
3. 制限前に**警告し、20秒以上の猶予で簡単な操作により延長**でき、**10回以上**延長できる
4. リアルタイムイベントで代替不可／5. **本質的（essential）**で延長すると活動が無効になる／6. 20時間超

- 取り扱いの結論（派生・要判断）: 模試の制限時間は「**本番再現（essential の主張）**」と「**練習（誰でも終了できること）**」で扱いを分ける。
  - [ ] **開始前の選択肢**を設ける: 「タイマーなし」「本番どおり」「時間延長（×1.5／×2）」（上記1・2を満たす）。W3C Understanding は「第三者が受験時間を延ばす（例: 2倍の時間）」ことを例示している（"granting double time on a test"）。
  - [ ] 既定は**練習＝タイマー表示のみ（強制終了なし）**。本番モードのみ強制終了（essential 例外を主張）。
  - [ ] 終了前の警告（残り5分／1分、視覚＋触覚＋ `role=status`）。強制終了は**保存して復元可能**に（Apple の状態復元）。
  - [ ] 一時停止を許す／許さないは設計判断。許さない本番モードでは、**電話着信などの中断時に自動で一時停止**して再開できる（中断は利用者の責任でないため）。
  - [ ] 2.2.2（A）一時停止・停止・非表示: 自動更新される情報（カウントダウン）は、**本質的**でなければ停止・非表示にできるようにする。タイマーは「非表示」に切替可能に。
  - [ ] Apple HIG（Cognitive）: 時間で自動消滅するUIを最小化し、難易度の調整（反応時間）を検討する、という推奨とも整合。
- リスニングは音声そのものの長さが進行を決める。これは「コンテンツが設定した制限時間」というより同期メディアの性質（Understanding は「同期されたコンテンツ」の扱いを別途言及）。**判断はあなた（要検討）**。

---

## 4. 日本語UIタイポグラフィ
### 4.1 一次情報（JLREQ）
出典: https://www.w3.org/TR/jlreq/ （日本語組版処理の要件）
- 字詰め: 行長は**横組みで最大40字程度**（縦組み52字）。
- **行間（line gap）**は文字サイズの**0.5em〜1.0em**が一般的。行が短ければ0.5em、**35字を超える行**は1.0em か少し詰めた程度。→ CSS の `line-height` は **1.5〜2.0**（行間0.5〜1.0emに相当）。欧文標準の行間は約1/3em（line-height 約1.33）で和文より狭い。
- 和欧混植（横組み）: 欧文は**プロポーショナル**を基本。**和文と欧文・数字の間は四分（1/4em）アキ**が慣習。欧文の語間（word space）は**約1/3em**。
- 書籍の標準文字サイズは9pt程度（最低8pt）だが、これは印刷の値。画面の最小サイズは Apple 11pt／Material Label Small 11sp／WCAG の200%拡大要件で判断する。
- WCAG 1.4.8（AAA・参考）: 本文幅は**80字以内（CJKは40字）**、**両端揃えにしない**、行間**1.5倍以上**、段落間は行間の1.5倍以上。

### 4.2 CSS 実装（対応状況は MDN BCD ＝ https://github.com/mdn/browser-compat-data による）
- [ ] `text-autospace: normal`（和欧間の自動アキ=JLREQの四分アキ）: **Chrome 140・Safari 18.4** から。古い WebView では効かないので、効かなくても崩れないこと。出典: https://raw.githubusercontent.com/mdn/browser-compat-data/main/css/properties/text-autospace.json
- [ ] `word-break: auto-phrase`（文節単位の折り返し）: **Chrome 119**。**Safari は preview 段階（安定版なし）**。iOS では効かない前提で設計（`overflow-wrap:anywhere`/`line-break:strict` との併用は **未確認**）。
- [ ] `text-wrap: balance`（見出し）: Chrome 114／Safari 17.5。`text-wrap: pretty`（本文）: Chrome 117／**Safari 26**。
- [ ] `overscroll-behavior`: Chrome 63／Safari 16。
- [ ] `lang="ja"` を `<html>` に。英文は `lang="en"`（字形選択・音声・ハイフネーションの正しさ）。

### 4.3 フォントスタック（二次情報のみ・**未確認**）
Apple/Google 公式の「日本語UIフォント規定」は見つからなかった。以下は実務上の組み合わせ（二次情報）:
`font-family: system-ui, -apple-system, "Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", "Noto Sans CJK JP", "Yu Gothic UI", Meiryo, sans-serif;`
- iOS: Hiragino Sans（W0〜W9 の10ウェイト）が日本語の標準的な選択肢。Android: Noto Sans CJK JP が標準的。**アプリへ Noto Sans JP を同梱すると端末差は消えるが容量が大きい**（サブセット化は別途検討。サイズは未確認）。
- 英文本文（問題文）: 既存は Georgia 系のセリフ。画面では**16〜17px、行間1.5〜1.6**（WCAG 1.4.8 の1.5以上と整合）で、**ライト/ダーク双方 4.5:1 以上**。携帯幅（360〜430px）−左右16px で**約40〜45字/行**になり、WCAG 1.4.8 の80字以内に収まる（派生の概算）。
- 日本語解説: **15〜16px、行間1.7〜1.8**（幅 358px で約22字/行＝短行なので JLREQ では0.5em〜0.8em 程度の行間で足りる。長い行や小さい文字は1.0em）。11pt 未満は使わない。細字ウェイトは避ける（Apple）。

### 4.4 最小サイズ（長い英文を携帯で読む）
- Apple: 既定17pt／最小11pt／細字回避。Material: Body Large 16sp が長文の既定。WCAG: 200% 拡大で機能を失わない（1.4.4）、320px リフロー（1.4.10）。
- 本アプリの推奨（派生）: **英文パッセージ 17px（既定）、設定で 15/17/19/21px の4段階**。**最小は 14px を下回らせない**。iOS の Dynamic Type 連動は `-apple-system-body` を使う案も（未検証）。

---

## 5. Capacitor / WebView 固有（ネイティブらしさを出す項目）

### 5.1 触覚（@capacitor/haptics）
出典: https://capacitorjs.com/docs/apis/haptics
- 導入: `npm install @capacitor/haptics` → `npx cap sync`。
- API: `impact({style})`（**既定 Heavy**）／`notification({type})`（既定 Success）／`vibrate({duration})`（**既定300ms**）／`selectionStart()` → `selectionChanged()` → `selectionEnd()`（`selectionChanged` は start 後のみ有効）。
- enum: ImpactStyle＝Heavy/Medium/Light。NotificationType＝Success/Warning/Error。
- 触覚エンジンの無い端末では何もせず resolve（エラーにならない）。
- [ ] **style を必ず明示**する（Heavy 既定は強すぎる）。`vibrate()` は UI 反応に使わない（Android 触覚原則: 余韻で buzzy になる）。
- [ ] 設定で ON/OFF（Apple: Make haptics optional）。呼び出しは1か所のラッパにまとめ、頻度を制限。

### 5.2 ステータスバー・システムバー・セーフエリア
出典: https://capacitorjs.com/docs/apis/status-bar ／ https://capacitorjs.com/docs/apis/system-bars ／ https://webkit.org/blog/7929/designing-websites-for-iphone-x/
- [ ] `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`。`viewport-fit=cover` で画面全域に描画し、**自分で `env(safe-area-inset-*)` を処理**する。
- [ ] 余白は `padding-left: max(16px, env(safe-area-inset-left))` のように**最小余白と併用**（縦向きでは横インセットが0になり得る）。`@supports (padding: max(0px))` で保護。`constant()` は旧式（iOS 11.2 で `env()` に置換）。
- [ ] 画面上下: 上部バー＝`padding-top: env(safe-area-inset-top)`、下部固定バー＝`padding-bottom: max(8px, env(safe-area-inset-bottom))`。
- [ ] iOS: ステータスバーのスタイルは Style.Dark（暗い背景用に明るい文字）/ Light / Default。`Info.plist` で **View controller-based status bar appearance = YES** が必要。
- [ ] Android: **Android 15 では targetSdk 35 以上でエッジtoエッジ強制。Capacitor 8 ＋ Android 16 以降は強制オプトアウトが不可**。このため `StatusBar.setBackgroundColor` / `setOverlaysWebView` は **Android 15+/16+ では効かない**。代わりに **SystemBars プラグイン**（Capacitor core 同梱）を使う。`insetsHandling`: `css`（既定。`--safe-area-inset-*` をWebViewに注入）／`native`（推奨。古いChromiumでWebViewにパディング、新しいChromiumは viewport-fit に従う）／`disable`（非推奨）。
- [ ] **WebView 140 未満では `env(safe-area-inset-*)` が正しい値を返さない**ため、Android は注入された CSS 変数（`--safe-area-inset-top` 等）を併用: `padding-top: var(--safe-area-inset-top, env(safe-area-inset-top, 0px))`（派生）。
- [ ] スプラッシュ: `launchShowDuration` 既定500ms、`launchAutoHide` 既定true、`backgroundColor` を最初の画面の色に合わせる（白フラッシュ防止）。アプリ起動後**できるだけ早く `hide()`**。Android 12+ は OS の Splash Screen API を無効化できない。出典: https://capacitorjs.com/docs/apis/splash-screen
- [ ] `ios.backgroundColor` / `android.backgroundColor`（Web ビューの背景色）をダーク/ライト起動時の色に合わせる（白い一瞬を防ぐ）。出典: https://capacitorjs.com/docs/config
- 注: 起動画面とダークモードの対応（ダーク起動時に黒い起動画面）の設定詳細は **未確認**。

### 5.3 タップ・スクロール・選択
- [ ] `-webkit-tap-highlight-color: transparent` で標準のタップ強調を消す。**非標準**（WebKit/Blink 拡張）。消した代わりに**必ず自前の `:active` 押下状態**（Apple: 無いと反応していないように感じる）。出典: https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-tap-highlight-color
- [ ] `touch-action: manipulation`: パン・ピンチは残し**ダブルタップ拡大を無効化**（click の遅延が不要になる）。出典: https://developer.mozilla.org/en-US/docs/Web/CSS/touch-action
- [ ] `overscroll-behavior: none`（または `contain`）でバウンス/プルtoリフレッシュの誤動作を防止（Safari 16+）。Capacitor の `ios.scrollEnabled` でWebビュー全体のスクロール自体を無効化も可能（本文は内側要素でスクロール）。
- [ ] `user-select: none` と `-webkit-touch-callout: none`（iOS長押しコールアウトを無効化。**非標準**）は、**ボタン・UIクローム・写真**に限定。**英文パッセージ・解説は選択可能のまま**（辞書の「調べる」やコピーは学習用途の核）。（派生）出典: https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-touch-callout
- [ ] `ios.allowsLinkPreview: false`（リンク長押しプレビュー無効）は必要時のみ。
- [ ] iOS の入力欄は**表示フォント16px未満だとフォーカス時にズームする**という報告が多いが、**一次情報は未確認**（二次のみ）。入力欄を作る場合は16px以上で実機確認。

### 5.4 キーボード
出典: https://capacitorjs.com/docs/apis/keyboard
- `resize`: none/body/native/ionic。**既定 native（iOSのみ）**。Android には「キーボードがWebViewをリサイズしない」不具合があり `resizeOnFullScreen` 回避策（Android専用）。`Keyboard.setAccessoryBarVisible`（iPhoneのみ・短いフォームは非表示推奨）。`keyboardWillShow/DidShow` は Android でほぼ同時に発火。
- 本アプリは入力欄がほぼ無い（4択）。入力欄を足すなら必ず実機で確認（**未確認**）。

### 5.5 60fps アニメーション
出典: https://web.dev/articles/rendering-performance ／ https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count
- [ ] 60Hz では1フレーム**約16.66ms**、ブラウザ処理を除くと自前の処理は**約10ms以内**。
- [ ] アニメは**`transform` と `opacity` のみ**（コンポジタだけで処理される。レイアウト・ペイントを起こさない）。`width/height/top/left/margin` をアニメしない。
- [ ] `will-change: transform` は**必要な要素にだけ**（レイヤーを増やすとメモリを食う）。
- [ ] 即時反応: 離散操作の応答は約100ms以内を目標（web.dev の目安）。INP の「良好」は200ms以下。
- [ ] `prefers-reduced-motion: reduce` でフェード等に置換（§1.5）。
- 120Hz端末でのWebView実フレームレート挙動は **未確認**。

### 5.6 iOS の音声セッション（サイレントスイッチ）
§1.7 参照。WebView 固有の実務まとめ:
- [ ] リスニング音声は **HTML `<audio>`**（サイレントでも鳴る）。Web Audio を使う場合は `navigator.audioSession.type = "playback"`（iOS 17+）を設定して検証（**実機未確認**）。
- [ ] 効果音は消音に従わせる（Ambient 相当＝Web Audio 既定のまま）。ただし他アプリの音楽を止めてよいかは設計判断。
- [ ] 無音ループで回避する方法は二次情報の回避策で、ロック画面にメディアコントロールが出る副作用がある。使わない。
- [ ] バックグラウンド再生・ロック画面操作（Media Session）の要否を決める。バックグラウンドが要るなら Info.plist `UIBackgroundModes: audio` が必要になり得る（Capacitor 側の標準対応は **未確認**）。
- [ ] 着信・他アプリ音声による中断後に音が出なくなる報告（WebKit Bug 243727）。中断→復帰テストを必須に。

### 5.7 オフラインと保存
出典: https://capacitorjs.com/docs/guides/storage ／ https://bugs.webkit.org/show_bug.cgi?id=206741
- Capacitor はWebアセットを**アプリに同梱**して読み込む → 同梱分はオフラインで使える（audio/img/data が同梱される前提）。
- [ ] **Service Worker に依存しない**: iOS の WKWebView はカスタムスキーム（capacitor://）からの Worker 読み込みを許さず、Apple の公式返答は「明示的にサポートする方法は無い」。App-Bound Domains は不安定との報告。**既存の `sw.js` は iOS ネイティブでは機能しない前提**で設計（Web 版PWAでは別に維持してよい）。（二次情報含む。公式の最新状況は **未確認**）
- [ ] **進捗・購入状態を `localStorage`/IndexedDB だけに置かない**。Capacitor 公式: 端末の空き容量が少ないと **OS が WebView の localStorage を回収**し、「IndexedDB も少なくとも iOS では同様」。→ **Capacitor Preferences（ネイティブ保存）**または SQLite を使う。
- [ ] 購入状態は常に**ストアの権利情報から復元**（「購入を復元」ボタン必須）。ローカル保存は補助。
- [ ] 初回起動直後からオフラインで動く（音声同梱）。ダウンロード式にするなら容量表示と同意（App Review 4.2.3(ii)）。

---

## 6. ストア提出前の必須リスト（Must-have before store submission）

### 6.1 両ストア共通・UX品質
- [ ] **ヒット領域 48×48px 以上＋間隔8px以上**（Apple 44pt／Google 48dp／WCAG 24px(AA)・44px(AAA) をすべて満たす値）。全ボタンに `:active` 押下状態。
- [ ] **コントラスト 4.5:1（本文）／3:1（大文字・UI部品）をライト・ダーク双方で測定**。色だけで正誤を示さない（アイコン＋文言）。
- [ ] **システムのダーク/ライトに追従**（独自外観トグルを作らない＝Apple）。コントラストを上げる設定にも対応。
- [ ] **文字拡大200%で崩れない**。英文パッセージは17px前後・行間1.5〜1.6、日本語解説は15〜16px・行間1.7〜1.8。`lang="ja"`/`lang="en"` を設定。
- [ ] **Reduce Motion 対応**（`prefers-reduced-motion`）。アニメは transform/opacity のみ。点滅は3回/秒以下。
- [ ] **触覚**: style 明示・重要イベントのみ・設定でOFF可・`vibrate()` を UI に使わない。
- [ ] **音声**: 自動再生しない／再生・一時停止・再生位置・音量の操作／解答後に全文スクリプト＋訳／**サイレントスイッチ実機テスト（iOS）**／ヘッドホン抜けで即停止／着信後の復帰。
- [ ] **模試タイマー**: 開始前に「なし／本番／延長」を選択（WCAG 2.2.1）。警告は視覚＋触覚＋ status。中断（着信・バックグラウンド）で自動保存・復元。
- [ ] **起動**: 起動画面＝最初の画面と同色（文字なし）／白フラッシュなし／前回位置を復元／初回は**オンボーディング最小・任意**／評価依頼はシステムのプロンプトを学習実績の後に。
- [ ] **セーフエリア**: `viewport-fit=cover`＋`env()`／SystemBars（Android）。ノッチ・ホームインジケータ・3ボタンナビ・ジェスチャナビ・横向きで確認。
- [ ] **VoiceOver／TalkBack で1回分の模試を完走できる**（ラベル・見出し・グルーピング・状態通知・図表の説明）。

### 6.2 Apple（App Store）
- [ ] Xcode 26 以降・iOS 26 SDK でビルド（2026-04-28 から必須）。ページ記載は「iOS 13 以上を対象（target）にすること」（2026-09-09 から。「target」の厳密な意味＝最小デプロイ先の下限と解釈、**要再確認**）。出典: https://developer.apple.com/news/upcoming-requirements/（本文を直接確認済み）
- [ ] 4.2「ウェブの再パッケージを超える」: 端末側の機能（触覚・オフライン・復元・購入）を実質備える。2.1「完成版・プレースホルダなし」。
- [ ] 3.1.1: 300円の解放はIAP（非消耗型）、**購入の復元**ボタン、請求総額の表示、標準の購入確認シートを改変しない。
- [ ] 5.1.1(i): プライバシーポリシーのリンクを ASC とアプリ内に。**プライバシーマニフェスト／Required Reason API の理由**（2024-05-01〜。プラグイン含む）。年齢レーティング質問への回答（2026-01-31〜）。
- [ ] 5.2.1: 「TOEIC」商標・公式問題の扱い（名称・アイコン・説明文）。
- [ ] 4.2.3(ii): 初回に追加DLが必要なら容量を開示して確認。

### 6.3 Google Play
- [ ] **targetSdk 36（Android 16）**（2026-08-31 以降、新規アプリ・更新に必須。延長は 2026-11-01 まで=**すでに終了**）。出典: https://developer.android.com/google/play/requirements/target-sdk
- [ ] エッジtoエッジ強制（Android 16 でオプトアウト不可）→ SystemBars／インセット処理を実機で確認。システムジェスチャ領域（左右端の戻る）に干渉する横スワイプ操作を避ける。
- [ ] **Webview スパム対策**: 「ウェブサイトのWebViewだけのアプリは webview spam として削除」。アプリならではの価値（オフライン・触覚・復元・ネイティブ購入）を示す。出典: https://android-developers.googleblog.com/2020/10/developer-tips-and-guides-common-policy.html （2020年の公式ブログ。現行ポリシー本文の取得は未達＝**未確認**）
- [ ] 戻るボタン処理（`backButton`）: 模試中は確認、トップで `exitApp`。
- [ ] 文字サイズ最大(200%)・TalkBack・ダークテーマで完走確認。

### 6.4 最後のゲート（実機）
- [ ] iPhone（ノッチ・Dynamic Island 機）と小型/大型 Android、**WebView バージョン違い（140未満含む）**で、セーフエリア・サイレント・音声中断・Dynamic Type/文字200%・ダーク・TalkBack/VoiceOver を一巡。
- [ ] 機内モードで起動→模試1回完走（音声・画像・購入復元の導線）。

---

## 7. 未確認・要追加調査（正直な空白）
1. m3.material.io の本文（Accessibility designing／Applying easing and duration／Navigation bar guidelines）— SPA で取得不能。数値は Google 公式リポジトリ/Android Developers で代替確認。
2. Apple が iOS で日本語に使うシステム書体の厳密なフォールバック順（Hiragino Sans か）— 一次情報なし。
3. iOS の入力欄16px未満ズームの公式根拠 — 一次情報なし（二次情報の一致のみ）。
4. Android WebView の文字サイズ（システム設定）追従の既定動作 — 要実機。
5. iOS 26 系での `navigator.audioSession.type`・HTML audio・サイレントスイッチの実機挙動／バックグラウンド・着信後の復帰。
6. Capacitor 8 と Android 13+ 予測型戻るの相互作用。
7. 120Hz端末での WebView のフレームレート。
8. 現行の Google Play デベロッパーポリシー本文（Minimum Functionality 全文）。
9. iOS セーフエリアの機種別寸法表（HIG 取得本文に数表なし）。`env()` で動的取得すれば不要。
10. TOEIC L&R 本番の所要時間・音声再生ルールの一次情報（本資料では未調査）。

---

## 8. 出典URL一覧
### Apple
- HIG Layout https://developer.apple.com/design/human-interface-guidelines/layout
- HIG Typography https://developer.apple.com/design/human-interface-guidelines/typography
- HIG Accessibility https://developer.apple.com/design/human-interface-guidelines/accessibility
- HIG VoiceOver https://developer.apple.com/design/human-interface-guidelines/voiceover
- HIG Color https://developer.apple.com/design/human-interface-guidelines/color
- HIG Dark Mode https://developer.apple.com/design/human-interface-guidelines/dark-mode
- HIG Motion https://developer.apple.com/design/human-interface-guidelines/motion
- HIG Playing haptics https://developer.apple.com/design/human-interface-guidelines/playing-haptics
- HIG Playing audio https://developer.apple.com/design/human-interface-guidelines/playing-audio
- HIG Feedback / Loading / Launching / Onboarding https://developer.apple.com/design/human-interface-guidelines/feedback ほか同階層
- HIG Buttons / Tab bars / Gestures / Ratings and reviews / Apple In-App Purchase / Web views（同階層）
- UIFeedbackGenerator https://developer.apple.com/documentation/uikit/uifeedbackgenerator
- App Store Review Guidelines https://developer.apple.com/app-store/review/guidelines/
- Upcoming requirements https://developer.apple.com/news/upcoming-requirements/
- WebKit: システムフォント https://webkit.org/blog/3709/using-the-system-font-in-web-content/
- WebKit: iPhone X 向け設計 https://webkit.org/blog/7929/designing-websites-for-iphone-x/
- WebKit Bug 237322（Web Audio とサイレント）https://bugs.webkit.org/show_bug.cgi?id=237322
- WebKit Bug 206741（WKWebView の Service Worker）https://bugs.webkit.org/show_bug.cgi?id=206741
### Google / Material
- Android アクセシビリティ（タッチターゲット）https://support.google.com/accessibility/android/answer/7101858
- Make apps more accessible https://developer.android.com/guide/topics/ui/accessibility/apps
- Accessibility principles https://developer.android.com/guide/topics/ui/accessibility/principles
- Haptics principles https://developer.android.com/develop/ui/views/haptics/haptics-principles
- Edge-to-edge https://developer.android.com/develop/ui/views/layout/edge-to-edge
- Android 14 features（文字200%）https://developer.android.com/about/versions/14/features
- Target API requirements https://developer.android.com/google/play/requirements/target-sdk
- Webview スパム https://android-developers.googleblog.com/2020/10/developer-tips-and-guides-common-policy.html
- Material Components Android docs https://github.com/material-components/material-components-android/tree/master/docs
### W3C / MDN
- WCAG 2.2 https://www.w3.org/TR/WCAG22/
- Understanding 2.2.1 https://www.w3.org/WAI/WCAG22/Understanding/timing-adjustable.html
- Understanding 1.4.2 https://www.w3.org/WAI/WCAG22/Understanding/audio-control.html
- Understanding 2.5.8 https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- JLREQ https://www.w3.org/TR/jlreq/
- Audio Session https://www.w3.org/TR/audio-session/
- MDN browser-compat-data https://github.com/mdn/browser-compat-data
- MDN: touch-action／-webkit-tap-highlight-color／-webkit-touch-callout／prefers-reduced-motion／AudioSession
- web.dev Rendering performance https://web.dev/articles/rendering-performance
- web.dev Compositor-only https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count
### Capacitor
- Haptics https://capacitorjs.com/docs/apis/haptics
- Status Bar https://capacitorjs.com/docs/apis/status-bar
- System Bars https://capacitorjs.com/docs/apis/system-bars
- Keyboard https://capacitorjs.com/docs/apis/keyboard
- Splash Screen https://capacitorjs.com/docs/apis/splash-screen
- App https://capacitorjs.com/docs/apis/app
- Config https://capacitorjs.com/docs/config
- Storage https://capacitorjs.com/docs/guides/storage
