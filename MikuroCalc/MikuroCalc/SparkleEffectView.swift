import SwiftUI

/// 「＝」のときに出る控えめなハート＆キラキラエフェクト
struct SparkleEffectView: View {
    /// 値が変わるたびにエフェクトが発動する
    let trigger: Int

    @State private var particles: [Particle] = []

    struct Particle: Identifiable {
        let id = UUID()
        let symbol: String
        let x: CGFloat        // 0〜1（横位置の割合）
        let size: CGFloat
        let rotation: Double
        let driftX: CGFloat
        let riseY: CGFloat
        let delay: Double
        let color: Color
    }

    private static let symbols = ["heart.fill", "sparkle", "star.fill", "heart.fill", "sparkles"]
    private static let colors: [Color] = [
        Color(red: 1.0, green: 0.42, blue: 0.68),   // #ff6bae
        Color(red: 1.0, green: 0.62, blue: 0.89),   // #ff9de2
        Color(red: 0.77, green: 0.70, blue: 1.0),   // ラベンダー
        Color(red: 1.0, green: 0.80, blue: 0.42),   // 星のゴールド
    ]

    var body: some View {
        GeometryReader { geo in
            ZStack {
                ForEach(particles) { particle in
                    ParticleView(particle: particle, containerSize: geo.size)
                }
            }
        }
        .allowsHitTesting(false)
        .onChange(of: trigger) { _ in
            spawnParticles()
        }
    }

    private func spawnParticles() {
        var newParticles: [Particle] = []
        for _ in 0..<12 {
            newParticles.append(Particle(
                symbol: Self.symbols.randomElement()!,
                x: CGFloat.random(in: 0.08...0.92),
                size: CGFloat.random(in: 10...20),
                rotation: Double.random(in: -25...25),
                driftX: CGFloat.random(in: -24...24),
                riseY: CGFloat.random(in: 60...130),
                delay: Double.random(in: 0...0.18),
                color: Self.colors.randomElement()!
            ))
        }
        particles = newParticles

        // 1.4秒後にお片づけ
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.4) {
            particles.removeAll()
        }
    }
}

private struct ParticleView: View {
    let particle: SparkleEffectView.Particle
    let containerSize: CGSize

    @State private var animate = false

    var body: some View {
        Image(systemName: particle.symbol)
            .font(.system(size: particle.size))
            .foregroundColor(particle.color)
            .rotationEffect(.degrees(animate ? particle.rotation : 0))
            .opacity(animate ? 0 : 0.9)
            .scaleEffect(animate ? 1.0 : 0.3)
            .position(
                x: containerSize.width * particle.x + (animate ? particle.driftX : 0),
                y: containerSize.height * 0.75 - (animate ? particle.riseY : 0)
            )
            .onAppear {
                withAnimation(.easeOut(duration: 1.1).delay(particle.delay)) {
                    animate = true
                }
            }
    }
}
