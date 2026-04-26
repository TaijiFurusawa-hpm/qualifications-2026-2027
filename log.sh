#!/bin/bash
# 論述対策 1日1問ログ記録スクリプト
# Usage: ./log.sh
set -e

cd "$(dirname "$0")"

PROGRESS_FILE="certifications/キャリアコンサルタント/progress.md"
MARKER="<!-- DAILY_LOG_INSERT -->"

if [ ! -f "$PROGRESS_FILE" ]; then
  echo "❌ Error: $PROGRESS_FILE が見つかりません"
  exit 1
fi

if ! grep -qF "$MARKER" "$PROGRESS_FILE"; then
  echo "❌ Error: 挿入マーカー '$MARKER' が見つかりません"
  exit 1
fi

TODAY=$(date +"%Y/%-m/%-d")

echo "==== 📝 論述対策 1日1問 ログ ===="
echo ""
read -rp "📅 日付（Enterで今日 → ${TODAY}）: " DATE
DATE="${DATE:-$TODAY}"
read -rp "📚 過去問の年度・回（例: 第31回 問1）: " QUESTION
read -rp "⏱️  所要時間（例: 25分）: " DURATION
read -rp "💭 所感・気づき（1行）: " NOTE

QUESTION="${QUESTION:--}"
DURATION="${DURATION:--}"
NOTE="${NOTE:-}"

NEW_ROW="| ${DATE} | ${QUESTION} | ${DURATION} | ${NOTE} |"

tmp=$(mktemp)
awk -v marker="$MARKER" -v new_row="$NEW_ROW" '
  $0 == marker { print new_row; print marker; next }
  { print }
' "$PROGRESS_FILE" > "$tmp" && mv "$tmp" "$PROGRESS_FILE"

echo ""
echo "✅ 追加完了:"
echo "   $NEW_ROW"
echo ""

read -rp "🚀 git commit & push しますか？ (y/N): " yn
case "$yn" in
  [Yy]* )
    git add "$PROGRESS_FILE"
    git commit -m "log: 論述対策 ${DATE} ${QUESTION}"
    git push
    echo "✨ push 完了"
    ;;
  * )
    echo "💾 ファイル更新済み（git未コミット）"
    ;;
esac
