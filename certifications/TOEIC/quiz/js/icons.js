/* 印（アイコン）。文字の記号（⚑ ⏱ ▶ など）の代わりに埋めこみのSVGを使う。
   同梱する書体に入っていない字があるため（UX設計書 7.1-13）。すべて飾りなので aria-hidden。 */
"use strict";
const ICON_PATHS = {
  play:'<path d="M8 5.5v13l11-6.5z"/>',
  pause:'<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/>',   // まだ使っていない：再生部品の一時停止（UX設計書の音声部品）で使う
  replay:'<path d="M4.5 12a7.5 7.5 0 1 0 2.6-5.7"/><path d="M4 4.5v4.6h4.6"/>',
  speaker:'<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4.2 4.2 0 0 1 0 6M18 6.5a7.8 7.8 0 0 1 0 11"/>',
  flag:'<path d="M5.5 21V4"/><path d="M5.5 4.5h11l-2.2 4 2.2 4h-11"/>',
  flagOn:'<path d="M5.5 21V4"/><path d="M5.5 4.5h11l-2.2 4 2.2 4h-11z" fill="currentColor"/>',
  clock:'<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  x:'<path d="M6 6l12 12M18 6L6 18"/>',
  chev:'<path d="M9 6l6 6-6 6"/>',
  back:'<path d="M15 6l-6 6 6 6"/>',
  today:'<rect x="4" y="5" width="16" height="15" rx="1.5"/><path d="M4 9.5h16M8.5 3v4M15.5 3v4"/><path d="M8.5 14.5l2.2 2.2 4.6-4.6"/>',
  mock:'<path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4"/><ellipse cx="10.5" cy="12" rx="1.6" ry="1.1"/><ellipse cx="10.5" cy="16.5" rx="1.6" ry="1.1"/><path d="M14 12h2.5M14 16.5h2.5"/>',
  practice:'<path d="M4 19.5h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 16.5z"/><path d="M13.5 7.5l3 3"/>',
  vocab:'<rect x="4" y="7" width="13" height="13" rx="1.5"/><path d="M8 4h11a1 1 0 0 1 1 1v12"/><path d="M8 16l2.5-6 2.5 6M8.9 14h3.2"/>',
  chart:'<path d="M5 20V11M12 20V4M19 20v-6"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7"/>',
  lock:'<rect x="5" y="11" width="14" height="9" rx="1.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',   // まだ使っていない：鍵つきの模試（錠の印＋「未購入」）で使う
  info:'<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5.5M12 7.6v.2"/>',
  copy:'<rect x="8" y="8" width="12" height="12" rx="1.5"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
  list:'<path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01"/>',
  redo:'<path d="M19.5 12a7.5 7.5 0 1 1-2.6-5.7"/><path d="M20 4.5v4.6h-4.6"/>'
};
function icon(name, cls){ return `<svg class="ic ${cls||""}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON_PATHS[name]||""}</svg>`; }
/* 正誤の印（選択肢の右・判定の帯）。✓は check と同じ形。
   ×は x より少し内側に寄せ、2本を別の path にしている（Fx.draw が1本ずつ順に描くため） */
const MARK_OK = ICON_PATHS.check;
const MARK_NG = '<path d="M6.5 6.5l11 11"/><path d="M17.5 6.5l-11 11"/>';
