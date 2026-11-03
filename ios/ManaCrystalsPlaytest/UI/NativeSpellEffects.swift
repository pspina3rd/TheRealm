import SpriteKit
import UIKit

/// The native counterpart of drawAutoSpell: the resolver supplies every cell's
/// original, spell-effect and settled position. No spell invents a random target.
final class NativeSpellEffects: SKNode {
    private let background = SKNode(), blocks = SKNode(), decoration = SKNode()
    private var blockNodes: [String: SKNode] = [:]
    private var blockKeys: [String: String] = [:]
    private var pulses: [String: NativeObstructionPulse] = [:]
    private var masks: [String: SKSpriteNode] = [:]
    private var shapes: [String: SKShapeNode] = [:]
    private var icons: [String: SKSpriteNode] = [:]
    private var textures: [String: SKTexture] = [:]
    private var usedBlocks = Set<String>(), usedShapes = Set<String>(), usedIcons = Set<String>()
    private var geometryKey = ""
    private var canvas = CGSize.zero
    private var unit: CGFloat = 1
    private var clock: Double = 0

    override init() {
        super.init()
        background.zPosition = -1; blocks.zPosition = 1; decoration.zPosition = 3
        addChild(background); addChild(blocks); addChild(decoration)
    }
    required init?(coder: NSCoder) { fatalError("Use init()") }

    /// Returns true only when a traced spell owns the board's intermediate image.
    @discardableResult func render(_ state: BattleState, size: CGSize, timeMs: Double) -> Bool {
        canvas = size; unit = size.width / CGFloat(max(1, state.width) * 30); clock = timeMs
        usedBlocks.removeAll(keepingCapacity: true)
        usedShapes.removeAll(keepingCapacity: true)
        usedIcons.removeAll(keepingCapacity: true)
        background.isHidden = true
        var replacesBoard = false
        if let effect = state.effect, !effect.character {
            let replace = effect.phase == "effect" || effect.source == "weave"
            replacesBoard = replace
            if replace { boardBackground(state) }
            if effect.phase == "effect" { animate(effect, state: state) }
            else if effect.source == "weave" {
                drawGrid(effect.phase == "target" ? effect.before : effect.after, prefix: "weave")
                drawWaitingPiece(state)
            }
            drawTarget(effect, state: state)
        }
        // The web's traced replacement clears ordinary board feedback first.
        // Keep clear flashes from obscuring the spell's cell-by-cell explanation.
        if !replacesBoard { drawTelegraphs(state); drawFeedback(state) }
        sweep()
        return replacesBoard
    }

    private func point(_ x: CGFloat, _ y: CGFloat) -> CGPoint {
        CGPoint(x: x * unit, y: canvas.height - y * unit)
    }
    private func rect(_ x: CGFloat, _ y: CGFloat, _ width: CGFloat, _ height: CGFloat) -> CGRect {
        CGRect(x: x * unit, y: canvas.height - (y + height) * unit, width: width * unit, height: height * unit)
    }
    private func color(_ element: String) -> UIColor {
        let names = ["fire":"red", "water":"blue", "earth":"orange", "wind":"cyan", "lightning":"gold", "nature":"green", "arcane":"violet"]
        return BattleScene.color(names[element] ?? element)
    }
    private func hex(_ value: String) -> UIColor { NativeAtlas.color(value) }
    private func shape(_ id: String, _ path: CGPath, stroke: UIColor = .clear, fill: UIColor = .clear, width: CGFloat = 2, alpha: CGFloat = 1) {
        usedShapes.insert(id)
        let node: SKShapeNode
        if let old = shapes[id] { node = old }
        else { node = SKShapeNode(); shapes[id] = node; decoration.addChild(node) }
        node.path = path; node.strokeColor = stroke; node.fillColor = fill
        node.lineWidth = width * unit; node.alpha = alpha; node.isAntialiased = false
    }
    private func box(_ id: String, _ r: CGRect, stroke: UIColor = .clear, fill: UIColor = .clear, width: CGFloat = 2, alpha: CGFloat = 1) {
        shape(id, CGPath(rect: r, transform: nil), stroke: stroke, fill: fill, width: width, alpha: alpha)
    }
    private func icon(_ id: String, name: String, x: CGFloat, y: CGFloat, scale: CGFloat = 1, alpha: CGFloat = 1) {
        usedIcons.insert(id)
        if textures[name] == nil,
           let image = NativeAtlas.shared.image("native-visuals/icon-\(name).png", x: 0, y: 0, width: 12, height: 12) {
            let texture = SKTexture(image: image); texture.filteringMode = .nearest; textures[name] = texture
        }
        let node: SKSpriteNode
        if let old = icons[id] { node = old }
        else { node = SKSpriteNode(); node.anchorPoint = CGPoint(x: 0, y: 1); icons[id] = node; decoration.addChild(node) }
        node.texture = textures[name]; node.size = CGSize(width: 12 * scale * unit, height: 12 * scale * unit)
        node.position = point(x, y); node.alpha = alpha
    }
    private func obstructionKey(_ obstruction: NativeObstruction?) -> String {
        guard let obstruction = obstruction else { return "" }
        return "\(obstruction.strength):\(obstruction.step ?? 0):" + (obstruction.sequence ?? []).map { "\($0.color):\($0.sides.joined(separator: ","))" }.joined(separator: ";")
    }
    private func block(_ id: String, cell: String?, at position: [CGFloat], obstruction: NativeObstruction?, alpha: CGFloat = 1, reveal: CGFloat = 1) {
        guard let cell = cell, position.count == 2, alpha > 0 else { return }
        usedBlocks.insert(id)
        let node: SKNode
        if let old = blockNodes[id] { node = old }
        else { node = SKCropNode(); blockNodes[id] = node; blocks.addChild(node) }
        let key = "\(cell):\(unit):\(obstructionKey(obstruction))"
        if blockKeys[id] != key {
            node.removeAllChildren()
            pulses[id] = BattleScene.drawBlock(cell, obstruction: obstruction, at: CGRect(x: 0, y: 0, width: 30 * unit, height: 30 * unit), timeMs: clock, into: node)
            blockKeys[id] = key
        }
        node.zPosition = id.hasPrefix("waiting:") ? 1 : 0
        node.position = CGPoint(x: position[0] * 30 * unit, y: canvas.height - (position[1] + 1) * 30 * unit)
        node.alpha = max(0, min(1, alpha)); pulses[id]?.update(timeMs: clock)
        if let crop = node as? SKCropNode {
            if reveal < 1 {
                let mask: SKSpriteNode
                if let old = masks[id] { mask = old }
                else { mask = SKSpriteNode(color: .white, size: .zero); mask.anchorPoint = .zero; masks[id] = mask }
                mask.size = CGSize(width: 30 * unit, height: 30 * unit * max(0, reveal))
                crop.maskNode = mask
            } else { crop.maskNode = nil }
        }
    }
    private func at(_ position: [Int]?) -> [CGFloat]? {
        guard let position = position, position.count == 2 else { return nil }
        return position.map(CGFloat.init)
    }
    private func obstruction(_ snapshot: NativeMagicState, at position: [CGFloat]) -> NativeObstruction? {
        snapshot.obstructions["\(Int(position[0].rounded())),\(Int(position[1].rounded()))"]
    }
    private func drawGrid(_ snapshot: NativeMagicState, prefix: String) {
        for (y, row) in snapshot.grid.enumerated() {
            for (x, cell) in row.enumerated() {
                block("\(prefix):\(x):\(y)", cell: cell, at: [CGFloat(x), CGFloat(y)], obstruction: snapshot.obstructions["\(x),\(y)"])
            }
        }
    }
    private func boardBackground(_ state: BattleState) {
        background.isHidden = false
        let key = "\(state.width):\(state.height):\(canvas)"
        guard geometryKey != key else { return }; geometryKey = key
        background.removeAllChildren()
        let fill = SKShapeNode(rect: CGRect(origin: .zero, size: canvas))
        fill.fillColor = hex("#0a0c17"); fill.strokeColor = .clear; background.addChild(fill)
        let lines = CGMutablePath()
        for x in 0...state.width { lines.move(to: point(CGFloat(x * 30) + 0.5, 0)); lines.addLine(to: point(CGFloat(x * 30) + 0.5, CGFloat(state.height * 30))) }
        for y in 0...state.height { lines.move(to: point(0, CGFloat(y * 30) + 0.5)); lines.addLine(to: point(CGFloat(state.width * 30), CGFloat(y * 30) + 0.5)) }
        let grid = SKShapeNode(path: lines); grid.strokeColor = hex("#1d2238"); grid.lineWidth = unit; grid.isAntialiased = false; background.addChild(grid)
    }
    private func drawWaitingPiece(_ state: BattleState) {
        guard let piece = state.active else { return }
        for (index, offset) in piece.cells.enumerated() where offset.count == 2 && index < piece.colors.count {
            let x = (piece.x ?? 0) + offset[0], y = (piece.y ?? 0) + offset[1]
            if y >= 0 { block("waiting:\(index)", cell: piece.colors[index], at: [CGFloat(x), CGFloat(y)], obstruction: nil) }
        }
    }

    private func animate(_ effect: NativeEffect, state: BattleState) {
        let progress = CGFloat(max(0, min(1, 1 - effect.remainingMs / max(1, effect.durationMs))))
        let first = progress < 0.7
        let p = first ? min(1, progress / 0.6) : min(1, (progress - 0.7) / 0.3)
        let reduced = UIAccessibility.isReduceMotionEnabled
        let snapshot = first ? effect.effectState : effect.after
        for (index, actor) in effect.visual.enumerated() {
            let from = at(first ? actor.from : actor.effectAt), to = at(first ? actor.effectAt : actor.to)
            let old = first ? actor.before : actor.effectCell, next = first ? actor.effectCell : actor.after
            guard let origin = from ?? to else { continue }
            let destination = to ?? origin
            let ease: CGFloat = reduced ? 1 : (effect.element == "earth" || !first ? p * p : 1 - (1 - p) * (1 - p))
            let position = [origin[0] + (destination[0] - origin[0]) * ease, origin[1] + (destination[1] - origin[1]) * ease]
            let oldObstruction = obstruction(effect.before, at: origin)
            let effectObstruction = obstruction(effect.effectState, at: destination)
            let strengthChanged = first && from != nil && oldObstruction?.strength != obstruction(effect.effectState, at: origin)?.strength
            let conversion = first && oldObstruction != nil && (effect.element == "lightning" || effect.element == "nature") && (old != next || strengthChanged)
            let id = "actor:\(index)"
            if conversion, let oldObstruction = oldObstruction {
                let strikes = effect.rank >= 3 ? 2 : 1
                let impacts: [CGFloat] = strikes == 2 ? [0.25, 0.7] : [0.45]
                let landed = impacts.filter { p >= $0 }.count
                if landed >= min(strikes, oldObstruction.strength) {
                    block(id, cell: next, at: destination, obstruction: effectObstruction)
                } else {
                    let intermediate = NativeObstruction(strength: max(1, oldObstruction.strength - landed), sequence: oldObstruction.sequence, step: oldObstruction.step)
                    block(id, cell: old, at: origin, obstruction: intermediate)
                }
            } else if (old != next || strengthChanged), old != nil, next != nil {
                block(id + ":old", cell: old, at: origin, obstruction: obstruction(first ? effect.before : effect.effectState, at: origin), alpha: 1 - p)
                block(id, cell: next, at: position, obstruction: obstruction(snapshot, at: destination), alpha: p)
            } else {
                let opacity = to == nil ? 1 - p : (from == nil ? p : 1)
                block(id, cell: next ?? old, at: position, obstruction: obstruction(snapshot, at: destination), alpha: opacity)
            }
            if first && !reduced {
                actorDecoration(effect, actor: actor, index: index, origin: origin, position: position, from: from, to: to, p: p)
            }
        }
        drawWaitingPiece(state)
    }

    private func actorDecoration(_ effect: NativeEffect, actor: NativeVisualBlock, index: Int, origin: [CGFloat], position: [CGFloat], from: [CGFloat]?, to: [CGFloat]?, p: CGFloat) {
        let x = origin[0] * 30, y = origin[1] * 30, tint = color(effect.element), id = "effect:\(index)"
        let old = actor.before, next = actor.effectCell
        let changedStrength = obstruction(effect.before, at: origin)?.strength != obstruction(effect.effectState, at: origin)?.strength
        let impacts: [CGFloat] = effect.rank >= 3 ? [0.25, 0.7] : [0.45]
        if effect.element == "fire", old != nil, next == nil {
            for i in 0..<3 {
                let lift = (p * 28 + CGFloat(i * 9)).truncatingRemainder(dividingBy: 30)
                icon(id + ":flame:\(i)", name: "fire", x: x + 3 + CGFloat(i * 7), y: y + 15 - lift, alpha: 1 - p * 0.65)
            }
        } else if effect.element == "lightning", old == "stone", from != nil, changedStrength,
                  impacts.contains(where: { p >= $0 - 0.1 && p < $0 + 0.12 }) {
            let top = CGFloat(effect.rows.min() ?? 0) * 30
            let path = CGMutablePath(); path.move(to: point(x + 17, max(top, y - 40)))
            path.addLine(to: point(x + 9, y + 7)); path.addLine(to: point(x + 19, y + 7)); path.addLine(to: point(x + 12, y + 25))
            shape(id + ":bolt", path, stroke: tint)
        } else if effect.element == "nature", old == "stone", from != nil, changedStrength || old != next {
            let vine = CGMutablePath(); vine.move(to: point(x + 3, y + 28))
            vine.addQuadCurve(to: point(x + 25, y + 28 - p * 25), control: point(x + 4, y + 28 - p * 35))
            shape(id + ":vine", vine, stroke: tint)
            icon(id + ":leaf", name: "nature", x: x + 8, y: y + 18 - p * 15, alpha: p)
            for (hit, impact) in impacts.enumerated() {
                let wave = (p - impact + 0.12) / 0.3
                if wave >= 0 && wave <= 1 {
                    let radius = (4 + wave * 12) * unit
                    let circle = CGPath(ellipseIn: CGRect(x: point(x + 15, y + 15).x - radius, y: point(x + 15, y + 15).y - radius, width: 2 * radius, height: 2 * radius), transform: nil)
                    shape(id + ":conversion:\(hit)", circle, stroke: tint, alpha: 1 - wave)
                }
            }
        } else if effect.element == "water", from == nil, to != nil {
            // Match the web's bottom-up reveal over its faint neutral ghost.
            block(id + ":ice-grow", cell: "neutral", at: origin, obstruction: nil, reveal: p)
            let frost = CGMutablePath()
            let segments: [[CGFloat]] = [[6,15,24,15],[15,6,15,24],[9,9,21,21]]
            for segment in segments {
                frost.move(to: point(x + segment[0], y + segment[1])); frost.addLine(to: point(x + segment[2], y + segment[3]))
            }
            shape(id + ":frost", frost, stroke: tint)
        } else if effect.element == "wind", let from = from, let to = to, from[0] != to[0] {
            let sign: CGFloat = to[0] > from[0] ? 1 : -1
            for i in 0..<3 {
                let gust = CGMutablePath(); gust.move(to: point(position[0] * 30 + 15 - sign * 25, y + 8 + CGFloat(i * 7)))
                gust.addQuadCurve(to: point(position[0] * 30 + 15 + sign * 16, y + 8 + CGFloat(i * 7)), control: point(position[0] * 30 + 15, y + CGFloat(i * 7)))
                shape(id + ":gust:\(i)", gust, stroke: tint)
            }
        } else if effect.element == "earth", let from = from, let to = to, from[1] != to[1] {
            let falling = CGMutablePath()
            for i in 0..<3 { falling.move(to: point(x + 7 + CGFloat(i * 8), position[1] * 30 - 18)); falling.addLine(to: point(x + 7 + CGFloat(i * 8), position[1] * 30 - 3)) }
            shape(id + ":fall", falling, stroke: tint, alpha: 0.55)
        }
    }

    private func drawTarget(_ effect: NativeEffect, state: BattleState) {
        guard let top = effect.rows.min(), let bottom = effect.rows.max() else { return }
        let tint = color(effect.element), width = CGFloat(state.width * 30)
        box("target:span", rect(1, CGFloat(top * 30 + 1), width - 2, CGFloat((bottom - top + 1) * 30 - 2)), stroke: tint)
        let ticks = CGMutablePath()
        for row in top...bottom {
            let y = CGFloat(row * 30 + 15)
            ticks.move(to: point(1, y)); ticks.addLine(to: point(7, y))
            ticks.move(to: point(width - 7, y)); ticks.addLine(to: point(width - 1, y))
        }
        shape("target:ticks", ticks, stroke: tint)
        for tier in 1...4 { box("target:rank:\(tier)", rect(CGFloat(8 + (tier - 1) * 7), CGFloat(top * 30 + 4), 5, 4), fill: tier <= effect.rank ? tint : hex("#38415b"), width: 0) }
        guard effect.phase == "target" else { return }
        for (index, actor) in effect.visual.enumerated() {
            let from = at(actor.from), to = at(actor.effectAt)
            guard let position = from ?? to else { continue }
            let changed = actor.before != actor.effectCell || actor.from != actor.effectAt || (from != nil && obstruction(effect.before, at: position)?.strength != obstruction(effect.effectState, at: position)?.strength)
            if changed {
                box("target:actor:\(index)", rect(position[0] * 30 + 3, position[1] * 30 + 3, 24, 24), stroke: tint)
                icon("target:icon:\(index)", name: effect.element, x: position[0] * 30 + 9, y: position[1] * 30 + 9)
            }
        }
    }
    private func drawTelegraphs(_ state: BattleState) {
        let alpha: CGFloat = UIAccessibility.isReduceMotionEnabled ? 0.85 : CGFloat(0.65 + 0.25 * sin(clock / 180))
        for (index, warning) in (state.telegraphs ?? []).enumerated() {
            if warning.kind == "cells" {
                for (cell, at) in (warning.cells ?? []).enumerated() where at.count == 2 {
                    box("warning:\(index):\(cell)", rect(CGFloat(at[0] * 30 + 3), CGFloat(at[1] * 30 + 3), 24, 24), stroke: hex("#fff1bb"), alpha: alpha)
                }
            } else if warning.kind == "rows" {
                box("warning:\(index):rows", rect(0, CGFloat(state.height * 30 - 4), CGFloat(state.width * 30), 4), fill: hex("#e9b673"), width: 0, alpha: alpha)
            }
        }
    }
    private func drawFeedback(_ state: BattleState) {
        for feedback in state.feedback {
            guard feedback.elapsedMs >= 0, feedback.durationMs > 0, feedback.elapsedMs < feedback.durationMs,
                  feedback.target == nil || feedback.target == "board" else { continue }
            let p = CGFloat(feedback.elapsedMs / feedback.durationMs), id = "feedback:\(feedback.id)"
            if feedback.kind == "flashRows" {
                // A row-local clearing cue; never a full-screen white flash.
                let rows = feedback.rows ?? [], colors = feedback.colors ?? []
                for (index, row) in rows.enumerated() {
                    let tint = index < colors.count ? hex(colors[index]) : .white
                    let grow = (p * 10).rounded()
                    box(id + ":row:\(index)", rect(0, CGFloat(row * 30) - grow, CGFloat(state.width * 30), 30 + grow * 2), fill: p < 0.25 ? .white : tint, width: 0, alpha: UIAccessibility.isReduceMotionEnabled ? 0.2 * (1 - p) : 1 - p)
                }
            } else if feedback.kind == "flashCells" {
                for (index, cell) in (feedback.cells ?? []).enumerated() where cell.count == 2 {
                    box(id + ":cell:\(index)", rect(CGFloat(cell[0] * 30), CGFloat(cell[1] * 30), 30, 30), fill: hex("#e6ecff"), width: 0, alpha: (1 - p) * (UIAccessibility.isReduceMotionEnabled ? 0.2 : 1))
                }
            } else if feedback.kind == "icon", let name = feedback.icon {
                let scale: CGFloat = UIAccessibility.isReduceMotionEnabled ? 3 : (p < 0.15 ? 3 + ((1 - p / 0.15) * 2).rounded() : 3)
                let size = 12 * scale
                let y = feedback.row.map { CGFloat($0 * 30 + 15) } ?? 90
                icon(id + ":icon", name: name, x: (CGFloat(state.width * 30) - size) / 2, y: y - size / 2 - (UIAccessibility.isReduceMotionEnabled ? 0 : p * 50), scale: scale, alpha: p < 0.7 ? 1 : (1 - p) / 0.3)
            }
        }
    }
    private func sweep() {
        for key in Array(blockNodes.keys) where !usedBlocks.contains(key) { blockNodes.removeValue(forKey: key)?.removeFromParent(); blockKeys.removeValue(forKey: key); pulses.removeValue(forKey: key); masks.removeValue(forKey: key) }
        for key in Array(shapes.keys) where !usedShapes.contains(key) { shapes.removeValue(forKey: key)?.removeFromParent() }
        for key in Array(icons.keys) where !usedIcons.contains(key) { icons.removeValue(forKey: key)?.removeFromParent() }
    }
}
