import SwiftUI

struct ContentView: View {
    @State private var engine = CalculatorEngine()
    @State private var sparkleTrigger = 0
    @State private var praise = "きょうも いっしょに けいさん がんばるべ〜🌿"

    private static let praises = [
        "んだねぇ、よくできました♡",
        "すごいべ〜！はなまる💮",
        "なんもなんも、かんぺきだっちゃ✨",
        "その調子だべ〜📖",
        "えらいえらい♡ 396点満点！",
    ]

    // パステルカラー
    private let pink = Color(red: 1.0, green: 0.62, blue: 0.89)      // #ff9de2
    private let deepPink = Color(red: 1.0, green: 0.42, blue: 0.68)  // #ff6bae
    private let lavender = Color(red: 0.87, green: 0.82, blue: 1.0)
    private let cream = Color(red: 1.0, green: 0.97, blue: 0.99)

    var body: some View {
        ZStack {
            // ゆめかわグラデーション背景
            LinearGradient(
                colors: [pink.opacity(0.55), lavender.opacity(0.7), cream],
                startPoint: .top, endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 14) {
                mikuroHeader
                displayPanel
                buttonGrid
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)

            // ＝のときのキラキラ（画面全体・タッチは透過）
            SparkleEffectView(trigger: sparkleTrigger)
        }
    }

    // MARK: - みくろん先生

    private var mikuroHeader: some View {
        VStack(spacing: 8) {
            Image("MikuroMama")
                .resizable()
                .scaledToFill()
                .frame(height: 190, alignment: .top)
                .frame(maxWidth: .infinity)
                .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 24, style: .continuous)
                        .stroke(Color.white.opacity(0.8), lineWidth: 3)
                )
                .shadow(color: deepPink.opacity(0.25), radius: 10, y: 4)

            // 先生のひとこと
            Text(praise)
                .font(.system(size: 14, weight: .medium, design: .rounded))
                .foregroundColor(deepPink)
                .padding(.horizontal, 14)
                .padding(.vertical, 7)
                .background(
                    Capsule().fill(Color.white.opacity(0.85))
                )
                .shadow(color: pink.opacity(0.3), radius: 4, y: 2)
                .animation(.spring(response: 0.4), value: praise)
        }
    }

    // MARK: - 表示部

    private var displayPanel: some View {
        HStack {
            if let symbol = engine.pendingSymbol {
                Text(symbol)
                    .font(.system(size: 24, weight: .bold, design: .rounded))
                    .foregroundColor(deepPink.opacity(0.6))
            }
            Spacer()
            Text(engine.display)
                .font(.system(size: 46, weight: .bold, design: .rounded))
                .foregroundColor(Color(red: 0.45, green: 0.25, blue: 0.45))
                .lineLimit(1)
                .minimumScaleFactor(0.4)
        }
        .padding(.horizontal, 22)
        .frame(height: 84)
        .background(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .fill(Color.white.opacity(0.9))
                .shadow(color: pink.opacity(0.35), radius: 8, y: 3)
        )
    }

    // MARK: - ボタン

    private var buttonGrid: some View {
        Grid(horizontalSpacing: 10, verticalSpacing: 10) {
            GridRow {
                funcKey("AC") { engine.clear(); praise = "リセットだべ〜🌿"; SoundManager.shared.playClear() }
                funcKey("±") { engine.toggleSign(); SoundManager.shared.playPoint() }
                funcKey("％") { engine.percent(); SoundManager.shared.playPoint() }
                opKey("÷", .divide)
            }
            GridRow {
                digitKey(7); digitKey(8); digitKey(9)
                opKey("×", .multiply)
            }
            GridRow {
                digitKey(4); digitKey(5); digitKey(6)
                opKey("−", .subtract)
            }
            GridRow {
                digitKey(1); digitKey(2); digitKey(3)
                opKey("＋", .add)
            }
            GridRow {
                digitKey(0, wide: true)
                pointKey
                equalsKey
            }
        }
    }

    private func digitKey(_ digit: Int, wide: Bool = false) -> some View {
        CalcButton(
            label: String(digit),
            textColor: Color(red: 0.5, green: 0.3, blue: 0.5),
            background: Color.white.opacity(0.92),
            wide: wide
        ) {
            engine.inputDigit(digit)
            SoundManager.shared.playDigit(digit)
        }
    }

    private func opKey(_ label: String, _ op: CalculatorEngine.Operation) -> some View {
        CalcButton(
            label: label,
            textColor: .white,
            background: deepPink.opacity(0.85)
        ) {
            engine.setOperation(op)
            SoundManager.shared.playOperator()
        }
    }

    private func funcKey(_ label: String, action: @escaping () -> Void) -> some View {
        CalcButton(
            label: label,
            textColor: deepPink,
            background: lavender.opacity(0.9),
            action: action
        )
    }

    private var pointKey: some View {
        CalcButton(
            label: "．",
            textColor: Color(red: 0.5, green: 0.3, blue: 0.5),
            background: Color.white.opacity(0.92)
        ) {
            engine.inputPoint()
            SoundManager.shared.playPoint()
        }
    }

    private var equalsKey: some View {
        CalcButton(
            label: "＝",
            textColor: .white,
            background: LinearGradient(
                colors: [deepPink, pink],
                startPoint: .topLeading, endPoint: .bottomTrailing
            )
        ) {
            if engine.equals() {
                SoundManager.shared.playEquals()
                sparkleTrigger += 1
                praise = Self.praises.randomElement()!
            } else {
                SoundManager.shared.playPoint()
            }
        }
    }
}

// MARK: - ぷにぷにボタン

private struct CalcButton<Background: ShapeStyle>: View {
    let label: String
    let textColor: Color
    let background: Background
    var wide: Bool = false
    let action: () -> Void

    @State private var pressed = false

    init(label: String, textColor: Color, background: Background,
         wide: Bool = false, action: @escaping () -> Void) {
        self.label = label
        self.textColor = textColor
        self.background = background
        self.wide = wide
        self.action = action
    }

    var body: some View {
        Button {
            action()
            withAnimation(.spring(response: 0.15, dampingFraction: 0.45)) {
                pressed = true
            }
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.12) {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.5)) {
                    pressed = false
                }
            }
        } label: {
            Text(label)
                .font(.system(size: 26, weight: .bold, design: .rounded))
                .foregroundColor(textColor)
                .frame(maxWidth: .infinity)
                .frame(height: 60)
                .background(
                    RoundedRectangle(cornerRadius: 20, style: .continuous)
                        .fill(background)
                        .shadow(color: Color(red: 1.0, green: 0.42, blue: 0.68).opacity(0.25),
                                radius: 5, y: 3)
                )
                .scaleEffect(pressed ? 0.92 : 1.0)
        }
        .buttonStyle(.plain)
        .if(wide) { $0.gridCellColumns(2) }
    }
}

private extension View {
    @ViewBuilder
    func `if`<Content: View>(_ condition: Bool, transform: (Self) -> Content) -> some View {
        if condition { transform(self) } else { self }
    }
}

#Preview {
    ContentView()
}
