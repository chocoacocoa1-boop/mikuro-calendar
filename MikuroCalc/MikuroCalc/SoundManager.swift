import AVFoundation

/// 全部コードで合成する可愛い効果音マネージャー（音源ファイル不要）
final class SoundManager {
    static let shared = SoundManager()

    private let engine = AVAudioEngine()
    private var players: [AVAudioPlayerNode] = []
    private var nextPlayerIndex = 0

    private let sampleRate: Double = 44_100
    private let format: AVAudioFormat

    private var digitBuffers: [AVAudioPCMBuffer] = []
    private var operatorBuffer: AVAudioPCMBuffer?
    private var equalsBuffer: AVAudioPCMBuffer?
    private var clearBuffer: AVAudioPCMBuffer?
    private var pointBuffer: AVAudioPCMBuffer?

    private init() {
        format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1)!

        // 同時押しに耐えるよう複数プレイヤーを用意
        for _ in 0..<6 {
            let player = AVAudioPlayerNode()
            engine.attach(player)
            engine.connect(player, to: engine.mainMixerNode, format: format)
            players.append(player)
        }

        buildBuffers()

        // 他アプリの音楽を止めない設定
        try? AVAudioSession.sharedInstance().setCategory(.ambient, options: [.mixWithOthers])
        try? AVAudioSession.sharedInstance().setActive(true)
        try? engine.start()
        players.forEach { $0.play() }
    }

    // MARK: - 再生

    /// 0〜9：低い音からだんだん高い「ピコッ」
    func playDigit(_ digit: Int) {
        guard digitBuffers.indices.contains(digit) else { return }
        play(digitBuffers[digit])
    }

    /// ＋−×÷：ぷにっとした「ポコッ」
    func playOperator() { play(operatorBuffer) }

    /// ＝：キラキラのアルペジオ
    func playEquals() { play(equalsBuffer) }

    /// AC：ぴゅんっと下がる音
    func playClear() { play(clearBuffer) }

    /// 小数点・その他：ちいさなクリック
    func playPoint() { play(pointBuffer) }

    private func play(_ buffer: AVAudioPCMBuffer?) {
        guard let buffer else { return }
        if !engine.isRunning {
            try? engine.start()
            players.forEach { $0.play() }
        }
        let player = players[nextPlayerIndex]
        nextPlayerIndex = (nextPlayerIndex + 1) % players.count
        player.scheduleBuffer(buffer, at: nil, options: .interrupts)
    }

    // MARK: - 波形合成

    private struct Note {
        let frequency: Double
        let start: Double      // 秒
        let duration: Double   // 秒
        let amplitude: Double
    }

    private func buildBuffers() {
        // みくろんの396Hzを基準に、メジャースケールで0→9が上がっていく🎵
        let baseFrequency = 396.0
        let majorScaleSteps: [Double] = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16]
        digitBuffers = majorScaleSteps.map { step in
            let freq = baseFrequency * pow(2, step / 12)
            return makeBuffer(notes: [Note(frequency: freq, start: 0, duration: 0.13, amplitude: 0.5)],
                              totalDuration: 0.16)
        }

        // ポコッ（2音重ね・低め）
        operatorBuffer = makeBuffer(notes: [
            Note(frequency: 330, start: 0, duration: 0.10, amplitude: 0.42),
            Note(frequency: 495, start: 0.012, duration: 0.09, amplitude: 0.30),
        ], totalDuration: 0.14)

        // キラキラ〜ん（上昇アルペジオ＋高音のきらめき）
        equalsBuffer = makeBuffer(notes: [
            Note(frequency: 792, start: 0.00, duration: 0.16, amplitude: 0.38),
            Note(frequency: 990, start: 0.07, duration: 0.16, amplitude: 0.36),
            Note(frequency: 1188, start: 0.14, duration: 0.18, amplitude: 0.34),
            Note(frequency: 1584, start: 0.21, duration: 0.30, amplitude: 0.32),
            Note(frequency: 2376, start: 0.28, duration: 0.24, amplitude: 0.14),
        ], totalDuration: 0.60)

        // ぴゅん（下降）
        clearBuffer = makeBuffer(notes: [
            Note(frequency: 660, start: 0, duration: 0.07, amplitude: 0.36),
            Note(frequency: 495, start: 0.06, duration: 0.07, amplitude: 0.32),
            Note(frequency: 396, start: 0.12, duration: 0.10, amplitude: 0.30),
        ], totalDuration: 0.26)

        // ちょん
        pointBuffer = makeBuffer(notes: [
            Note(frequency: 1320, start: 0, duration: 0.05, amplitude: 0.28),
        ], totalDuration: 0.08)
    }

    private func makeBuffer(notes: [Note], totalDuration: Double) -> AVAudioPCMBuffer {
        let frameCount = AVAudioFrameCount(totalDuration * sampleRate)
        let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount)!
        buffer.frameLength = frameCount
        let samples = buffer.floatChannelData![0]

        for i in 0..<Int(frameCount) {
            samples[i] = 0
        }

        for note in notes {
            let startFrame = Int(note.start * sampleRate)
            let noteFrames = Int(note.duration * sampleRate)
            let attackFrames = max(1, Int(0.005 * sampleRate)) // 5msのソフトアタック

            for i in 0..<noteFrames {
                let frame = startFrame + i
                guard frame < Int(frameCount) else { break }
                let t = Double(i) / sampleRate
                let progress = Double(i) / Double(noteFrames)

                // ソフトアタック＋指数減衰のエンベロープ
                let attack = min(1.0, Double(i) / Double(attackFrames))
                let decay = exp(-4.5 * progress)
                let envelope = attack * decay

                // サイン波＋ほんのり倍音で「ぷにっ」とした音色に
                let fundamental = sin(2 * .pi * note.frequency * t)
                let harmonic = 0.18 * sin(2 * .pi * note.frequency * 2 * t)
                let value = (fundamental + harmonic) * envelope * note.amplitude

                samples[frame] += Float(value)
            }
        }

        // クリップ防止
        for i in 0..<Int(frameCount) {
            samples[i] = max(-0.95, min(0.95, samples[i]))
        }
        return buffer
    }
}
