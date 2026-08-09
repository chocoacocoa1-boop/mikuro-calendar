import Foundation

/// シンプルな四則演算エンジン
struct CalculatorEngine {
    enum Operation {
        case add, subtract, multiply, divide

        var symbol: String {
            switch self {
            case .add: return "＋"
            case .subtract: return "−"
            case .multiply: return "×"
            case .divide: return "÷"
            }
        }
    }

    private(set) var display = "0"
    private var accumulator: Double?
    private var pendingOperation: Operation?
    private var isTyping = false
    private(set) var justEvaluated = false

    var pendingSymbol: String? { pendingOperation?.symbol }

    mutating func inputDigit(_ digit: Int) {
        justEvaluated = false
        if isTyping {
            guard display.count < 12 else { return }
            display = display == "0" ? String(digit) : display + String(digit)
        } else {
            display = String(digit)
            isTyping = true
        }
    }

    mutating func inputPoint() {
        justEvaluated = false
        if !isTyping {
            display = "0."
            isTyping = true
        } else if !display.contains(".") {
            display += "."
        }
    }

    mutating func setOperation(_ op: Operation) {
        justEvaluated = false
        if isTyping, pendingOperation != nil {
            evaluate()
        } else if accumulator == nil {
            accumulator = Double(display)
        }
        if accumulator == nil { accumulator = Double(display) }
        pendingOperation = op
        isTyping = false
    }

    /// 「＝」を押した。計算が実行されたら true
    @discardableResult
    mutating func equals() -> Bool {
        guard pendingOperation != nil else { return false }
        evaluate()
        pendingOperation = nil
        isTyping = false
        justEvaluated = true
        return true
    }

    mutating func clear() {
        display = "0"
        accumulator = nil
        pendingOperation = nil
        isTyping = false
        justEvaluated = false
    }

    mutating func toggleSign() {
        if display.hasPrefix("-") {
            display.removeFirst()
        } else if display != "0" {
            display = "-" + display
        }
    }

    mutating func percent() {
        if let value = Double(display) {
            display = Self.format(value / 100)
        }
    }

    private mutating func evaluate() {
        guard let op = pendingOperation,
              let lhs = accumulator,
              let rhs = Double(display) else { return }

        let result: Double
        switch op {
        case .add: result = lhs + rhs
        case .subtract: result = lhs - rhs
        case .multiply: result = lhs * rhs
        case .divide:
            guard rhs != 0 else {
                display = "エラー"
                accumulator = nil
                return
            }
            result = lhs / rhs
        }
        display = Self.format(result)
        accumulator = result
    }

    static func format(_ value: Double) -> String {
        guard value.isFinite else { return "エラー" }
        if value == value.rounded(), abs(value) < 1e12 {
            return String(format: "%.0f", value)
        }
        let formatter = NumberFormatter()
        formatter.numberStyle = .decimal
        formatter.maximumFractionDigits = 8
        formatter.usesGroupingSeparator = false
        return formatter.string(from: NSNumber(value: value)) ?? "エラー"
    }
}
