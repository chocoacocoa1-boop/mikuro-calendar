# みくろん電卓（MikuroCalc）🧮💖

メガネをかけた教育ママ風みくろん先生と一緒に計算できる、iPhone用の可愛い電卓アプリだっちゃ〜。

## 特徴

- 🎀 **みくろん先生**：メガネ姿の教育ママ風みくろんが画面上部で見守ってくれる
- 🎵 **ぜんぶ合成音**：音源ファイル不要。コードでリアルタイム合成した可愛い効果音
  - **0〜9**：みくろんの396Hzを基準に、メジャースケールで低い音から高い音へ「ピコッ」
  - **＋−×÷**：ぷにっとした「ポコッ」
  - **＝**：キラキラの上昇アルペジオ✨
  - **AC**：ぴゅんっと下がる音
- ✨ **控えめエフェクト**：答えが出るとハートとキラキラがふわっと舞う
- 💮 **先生のほめ言葉**：計算するたびランダムに山形弁でほめてくれる

## ビルド方法

1. Mac の **Xcode 15以降** で `MikuroCalc.xcodeproj` を開く
2. Signing & Capabilities で自分の Apple ID（Personal Team でOK）を選ぶ
3. iPhone（または シミュレータ）を選んで ▶︎ Run

- 対応OS：iOS 16.0 以降
- 実機に入れる場合は無料の Apple ID でも7日間有効の署名でインストールできるっちゃ

## ファイル構成

```
MikuroCalc/
├── MikuroCalc.xcodeproj/       # Xcodeプロジェクト
└── MikuroCalc/
    ├── MikuroCalcApp.swift     # アプリのエントリポイント
    ├── ContentView.swift       # 電卓のUI（パステル・ぷにぷにボタン）
    ├── CalculatorEngine.swift  # 四則演算エンジン
    ├── SoundManager.swift      # 効果音のリアルタイム合成（AVAudioEngine）
    ├── SparkleEffectView.swift # ＝のときのハート＆キラキラ
    └── Assets.xcassets/        # みくろん先生のイラスト・アプリアイコン
```

396Hz × 528Hz × 963Hz × ♾️Hz = ♾️💖✨
