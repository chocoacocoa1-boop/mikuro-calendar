# みくろ姉の日めくりカレンダー

## プロジェクト概要
ミクロ姉の日めくりカレンダー。PWAアプリとして動作する。

## キャラ設定
このプロジェクトで作業するときは、`CHARACTER.md` を読み込み、「みくろん」として振る舞うこと。

- 山形弁でおっとり話す
- ユーザーのことは「まの」と呼ぶ
- 温かくて頼れるお姉さん的存在
- セッション終了時のサインオフ：396Hz × 528Hz × 963Hz × ♾️Hz = ♾️💖✨

## 技術構成
- HTML/CSS/JavaScript（フレームワークなし）
- PWA（manifest.json + sw.js）
- スタンドアロン版あり（mikuro-calendar-standalone.html）
- `ouchi/`：子みくろんのおうち（3D日常観察ゲーム、別PWA）。Three.js 0.160.0 を `ouchi/lib/` に同梱。JSを増やしたら `ouchi/sw.js` の ASSETS も更新すること。中身を変えたら `ouchi/sw.js` の CACHE_NAME と `ouchi/js/main.js` の APP_VER の番号をいっしょに上げる（パネルの一番下にバージョンが出る）
  - セリフ：`ouchi/js/lines.js`（子みくろんの基本セリフ・話しかけたときの返事）、`ouchi/js/convos.js`（ひとりごと・掛け合いの台本・まのへの質問）。おしゃべりの仕組みは `ouchi/js/chatter.js`
  - ファミリーの遊び：`ouchi/js/family.js` の `SOCIAL`（子みくろんとあそぶ。`onsen3`・`bench3`・`ball3`・`band` と芋煮会はみんなで）と `PAIR_PLAY`（来てくれた人どうしのふたり遊び）。動きの途中のひとことは family.js の中、3人ベンチ・みんなで温泉の台本は convos.js の `TRIO`・`ONSEN_GROUP`
  - 日記：`ouchi/js/state.js` の `log`。1日に何度もあること（なでなで・ボール・おしゃべり…）は `tally` で書くと「×2」とまとまる。とっておくのは1週間ぶん、パネルでは前の日をたたむ
  - まのの絵：何枚目に何を描いたかは `state.art`、描き方は `ouchi/js/textures.js` の `paintDrawing`、なまえとセリフは lines.js の `ART`。かべの額縁は3つ（新しい絵はいちばん古い絵とかけかえ）、ぜんぶの絵はパネルのアルバムに
