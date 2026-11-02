import Foundation

public enum NativeAction: String, Equatable {
    case left, right, rotate, softDrop, hardDrop
}

/// Native points and timestamps, independent of UIKit for interruption tests.
public struct BoardGesture {
    private enum Mode { case idle, pending, held, horizontal, vertical, softVertical, spent }
    private var mode: Mode = .idle
    private var fingers = Set<Int>()
    private var primary: Int?
    private var startX = 0.0, startY = 0.0, startTime = 0.0
    private var lastY = 0.0, lastTime = 0.0, velocity = 0.0
    private var lastMeaningfulVelocityTime = -Double.infinity
    private var verticalTime = 0.0, lastDrop = -Double.infinity
    private var columns = 0
    private var maxTravel = 0.0, verticalBegan = 0.0
    private var softDropped = false
    public var cellWidth: Double = 30
    public var active: Bool { !fingers.isEmpty }
    public init() {}

    public mutating func begin(id: Int, x: Double, y: Double, time: Double) {
        guard fingers.insert(id).inserted else {return}
        guard fingers.count == 1 else { mode = .spent; return }
        primary = id; mode = .pending
        startX = x; startY = y; startTime = time
        lastY = y; lastTime = time; velocity = 0; columns = 0
        maxTravel=0;softDropped=false;verticalBegan=0;lastMeaningfulVelocityTime = -Double.infinity
    }
    public mutating func move(id: Int, x: Double, y: Double, time: Double) -> [NativeAction] {
        guard primary == id else { return [] }
        // A pause spends the fast-flick interpretation, even without display-link ticks.
        if mode == .vertical && time-lastMeaningfulVelocityTime > 0.12 {mode = .softVertical}
        if time > lastTime, abs(y-lastY) >= 2 {
            velocity=(y-lastY)/(time-lastTime);lastMeaningfulVelocityTime=time
        }
        lastY = y; lastTime = time
        let dx = x - startX, dy = y - startY
        maxTravel=max(maxTravel,max(abs(dx),abs(dy)))
        if mode == .pending && time-startTime >= 0.22 {mode = .held}
        if mode == .pending || mode == .held {
            if abs(dx) >= max(18,cellWidth*0.55), abs(dx) > abs(dy)*1.35 {mode = .horizontal}
            else if dy >= max(28,cellWidth*0.9), dy > abs(dx)*1.5 {
                let wasHeld=mode == .held
                mode = wasHeld ? .softVertical:.vertical
                verticalTime=time;verticalBegan=time;lastDrop = -Double.infinity
            } else if dy < -24 {mode = .spent}
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
        if endingMode == .pending || endingMode == .held, max(maxTravel,max(abs(x-startX),abs(y-startY))) <= 16 { return [.rotate] }
        guard endingMode == .vertical, !softDropped, verticalBegan-startTime <= 0.22, y-startY >= max(48,cellWidth*1.6) else { return [] }
        let duration=time-startTime
        let recent=time-lastMeaningfulVelocityTime <= 0.1
        let dy=y-startY,dx=x-startX
        // Release jitter cannot revive an old downward velocity after the finger rests.
        let deliberateTravel=duration>0 && dy/duration >= 500 && dy>abs(dx)*1.35
        return duration <= 0.32 && recent && velocity >= 600 && deliberateTravel ? [.hardDrop]:[]
    }
    public mutating func tick(time: Double) -> [NativeAction] {
        if mode == .pending && time-startTime >= 0.22 {mode = .held}
        if mode == .vertical && time-lastMeaningfulVelocityTime > 0.12 {mode = .softVertical}
        // Do not turn an uninterrupted, deliberate 0.25-second flick into a soft drop
        // merely because a display frame arrived before the release event.
        if mode == .vertical && time-startTime <= 0.32 {return []}
        guard mode == .vertical || mode == .softVertical, time-verticalTime >= 0.16, time-lastDrop >= 0.08 else {return []}
        softDropped=true;lastDrop=time
        return [.softDrop]
    }
    /// A lock or spell spends this touch; lifting cannot affect the next piece.
    public mutating func invalidate() { if mode != .idle { mode = .spent } }
    public mutating func cancel(id: Int) {
        guard fingers.remove(id) != nil else { return }
        mode = fingers.isEmpty ? .idle : .spent
        if fingers.isEmpty { primary = nil }
    }
    public mutating func cancelAll() { fingers.removeAll(); primary = nil; mode = .idle }
}
