import Foundation

public enum NativeAction: String, Equatable {
    case left, right, rotate, softDrop, hardDrop
}

/// Native points and timestamps, independent of UIKit for interruption tests.
public struct BoardGesture {
    private enum Mode { case idle, pending, horizontal, vertical, spent }
    private var mode: Mode = .idle
    private var fingers = Set<Int>()
    private var primary: Int?
    private var startX = 0.0, startY = 0.0, startTime = 0.0
    private var lastY = 0.0, lastTime = 0.0, velocity = 0.0
    private var verticalTime = 0.0, lastDrop = -Double.infinity
    private var columns = 0
    public var cellWidth: Double = 30
    public var active: Bool { !fingers.isEmpty }
    public init() {}

    public mutating func begin(id: Int, x: Double, y: Double, time: Double) {
        fingers.insert(id)
        guard fingers.count == 1 else { mode = .spent; return }
        primary = id; mode = .pending
        startX = x; startY = y; startTime = time
        lastY = y; lastTime = time; velocity = 0; columns = 0
    }
    public mutating func move(id: Int, x: Double, y: Double, time: Double) -> [NativeAction] {
        guard primary == id else { return [] }
        if time > lastTime, abs(y - lastY) >= 2 { velocity = (y - lastY) / (time - lastTime) }
        lastY = y; lastTime = time
        let dx = x - startX, dy = y - startY
        if mode == .pending {
            if abs(dx) >= 12, abs(dx) > abs(dy) * 1.15 { mode = .horizontal }
            else if dy >= 20, dy > abs(dx) * 1.25 {
                mode = .vertical; verticalTime = time; lastDrop = -Double.infinity
            } else if dy < -20 { mode = .spent }
        }
        guard mode == .horizontal else { return [] }
        let steps = Int(floor(abs(dx) / max(1, cellWidth) + 0.4))
        let target = dx < 0 ? -steps : steps
        var actions: [NativeAction] = []
        while columns < target { columns += 1; actions.append(.right) }
        while columns > target { columns -= 1; actions.append(.left) }
        return actions
    }
    public mutating func end(id: Int, x: Double, y: Double, time: Double) -> [NativeAction] {
        guard fingers.remove(id) != nil else { return [] }
        let isPrimary = primary == id, endingMode = mode
        if fingers.isEmpty { mode = .idle; primary = nil }
        guard isPrimary else { return [] }
        if endingMode == .pending, max(abs(x - startX), abs(y - startY)) < 12 { return [.rotate] }
        guard endingMode == .vertical, y - startY >= 40 else { return [] }
        let recent = time - lastTime <= 0.1
        return time - startTime <= 0.28 || (recent && velocity >= 350) ? [.hardDrop] : []
    }
    public mutating func tick(time: Double) -> [NativeAction] {
        guard mode == .vertical, time - verticalTime >= 0.12, time - lastDrop >= 0.05 else { return [] }
        lastDrop = time
        return [.softDrop]
    }
    /// A lock or spell spends this touch; lifting cannot affect the next piece.
    public mutating func invalidate() { if mode != .idle { mode = .spent } }
    public mutating func cancel(id: Int) {
        fingers.remove(id); mode = fingers.isEmpty ? .idle : .spent
        if fingers.isEmpty { primary = nil }
    }
    public mutating func cancelAll() { fingers.removeAll(); primary = nil; mode = .idle }
}
