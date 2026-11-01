import Foundation
import JavaScriptCore

public struct NativePiece: Decodable {
    public let name: String
    public let x: Int?, y: Int?
    public let cells: [[Int]]
    public let colors: [String]
}
public struct NativeColorTouch: Decodable {
    public let color: String
    public let sides: [String]
}
public struct NativeObstruction: Decodable {
    public let strength: Int
    public let sequence: [NativeColorTouch]?
}
public struct NativeSpell: Decodable {
    public let id: String, element: String
    public let rank: Int, mana: Int, cost: Int
}
public struct NativeEffect: Decodable {
    public let school: String, phase: String
    public let rank: Int, rows: [Int]
    public let remainingMs: Double, durationMs: Double
}
public struct BattleState: Decodable {
    public let pieceID: Int, version: Int, width: Int, height: Int, ghostY: Int
    public let ready: Bool, paused: Bool, busy: Bool
    public let status: String
    public let grid: [[String?]]
    public let obstructions: [String: NativeObstruction]
    public let active: NativePiece?
    public let next: [NativePiece]
    public let heroHP: Int, heroMaxHP: Int, lines: Int, score: Int
    public let enemyHP: Int, enemyMaxHP: Int
    public let enemyMove: String, enemyRemainingMs: Double
    public let spells: [NativeSpell]
    public let effect: NativeEffect?
    public var acceptsTouch: Bool { status == "ongoing" && !busy && (!paused || ready) }
}
private struct BattleEnvelope: Decodable {
    let ok: Bool
    let state: BattleState?
    let error: String?
}
public enum BattleEngineError: LocalizedError {
    case unavailable(String)
    public var errorDescription: String? {
        if case .unavailable(let message) = self { return message }
        return "The battle could not start."
    }
}

/// Main-thread JavaScriptCore rules. There is no HTML, WebView, server, or browser input.
public final class BattleEngine {
    private let context: JSContext
    private let dispatchFunction: JSValue
    public init() throws {
        guard let context = JSContext() else { throw BattleEngineError.unavailable("JavaScriptCore is unavailable.") }
        #if SWIFT_PACKAGE
        let resource = Bundle.module.url(forResource: "battle-engine", withExtension: "js")
        #else
        let resource = Bundle.main.url(forResource: "battle-engine", withExtension: "js")
        #endif
        guard let resource = resource else { throw BattleEngineError.unavailable("The bundled battle rules are missing.") }
        context.evaluateScript(try String(contentsOf: resource, encoding: .utf8))
        guard context.exception == nil,
              let function = context.objectForKeyedSubscript("ManaCrystalsNative")?.objectForKeyedSubscript("dispatch"),
              !function.isUndefined else {
            throw BattleEngineError.unavailable(context.exception?.toString() ?? "The battle rules could not load.")
        }
        self.context = context; self.dispatchFunction = function
    }
    @discardableResult public func send(_ command: [String: Any]) throws -> BattleState {
        let data = try JSONSerialization.data(withJSONObject: command)
        guard let json = String(data: data, encoding: .utf8) else { throw BattleEngineError.unavailable("Invalid native command.") }
        context.exception = nil
        guard let reply = dispatchFunction.call(withArguments: [json])?.toString(), context.exception == nil else {
            throw BattleEngineError.unavailable(context.exception?.toString() ?? "The battle stopped responding.")
        }
        let envelope = try JSONDecoder().decode(BattleEnvelope.self, from: Data(reply.utf8))
        guard envelope.ok, let state = envelope.state else { throw BattleEngineError.unavailable(envelope.error ?? "The battle stopped.") }
        return state
    }
}
