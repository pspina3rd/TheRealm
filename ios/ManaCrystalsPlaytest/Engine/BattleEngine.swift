import Foundation
import JavaScriptCore

public struct NativePiece: Decodable, Equatable {
    public let name: String
    public let x: Int?, y: Int?
    public let cells: [[Int]]
    public let colors: [String]
    public let recolored: Bool?
}
public struct NativeColorTouch: Decodable {
    public let color: String
    public let sides: [String]
}
public struct NativeObstruction: Decodable {
    public let strength: Int
    public let sequence: [NativeColorTouch]?
    public let step: Int?
}
public struct NativeSpell: Decodable {
    public let id: String, element: String
    public let rank: Int, mana: Int, cost: Int
}
public struct NativeEffect: Decodable {
    public let school: String, phase: String
    public let element: String, character: Bool
    public let source: String?
    public let index: Int, total: Int
    public let before: NativeMagicState, effectState: NativeMagicState, after: NativeMagicState
    public let visual: [NativeVisualBlock]
    public let rank: Int, rows: [Int]
    public let remainingMs: Double, durationMs: Double
}
public struct NativeMagicState: Decodable { public let grid:[[String?]], obstructions:[String:NativeObstruction] }
public struct NativeVisualBlock: Decodable {
    public let from:[Int]?, to:[Int]?, effectAt:[Int]?
    public let before:String?, after:String?, effectCell:String?
}
public struct NativeStageActor:Decodable {public let source:String;public let sx:Double,sy:Double,sw:Double,sh:Double}
public struct NativeStageStatus:Decodable {public let target:String,icon:String;public let count:Int;public let name:String?,badge:String?}
public struct NativeFeedback:Decodable {
    public let id:Int,kind:String
    public let target:String?,text:String?,color:String?,icon:String?,effect:String?,element:String?,face:String?,beat:String?,direction:String?
    public let rank:Int?,technique:String?
    public let row:Int?,rows:[Int]?,colors:[String]?,cells:[[Int]]?,elements:[String]?
    public let sprite:NativeStageActor?
    public let elapsedMs:Double,durationMs:Double
}
public struct NativeBattleStage:Decodable {
    public let hero:NativeStageActor?,opponent:NativeStageActor?,ally:NativeStageActor?
    public let enemyActionMs:Double
    public let weakness:[String],resistance:[String],statuses:[NativeStageStatus],feedback:[NativeFeedback]
    public let showMove:Bool,moveIcon:String?,shieldElement:String?
}
public struct NativeSeal:Decodable {public let column:Int,pieces:Int}
public struct BattleState: Decodable {
    public let battleID:String
    public let visualTimeMs:Double
    public let stage:NativeBattleStage?
    public let feedback:[NativeFeedback]
    public let seal:NativeSeal?
    public let slowPieces:Int?,hastePieces:Int?,fogPieces:Int?
    public let quickenMs:Double?,ruleID:String?
    public let visible:[[Bool]]?
    public let pieceID: Int, version: Int, width: Int, height: Int, ghostY: Int
    public let ready: Bool, paused: Bool, busy: Bool
    public let status: String
    public let title: String?
    public let objective: NativeObjective?
    public let canCorrect: Bool?
    public let tags: [[String?]]?
    public let verb: NativeVerb?
    public let telegraphs: [NativeTelegraph]?
    public let grid: [[String?]]
    public let obstructions: [String: NativeObstruction]
    public let active: NativePiece?
    public let next: [NativePiece]
    public let heroHP: Int, heroMaxHP: Int, lines: Int, score: Int, pausesLeft: Int
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

public struct CampaignChoice: Decodable { public let id: String, label: String; public let enabled: Bool }
public struct CampaignPanel: Decodable { public let title: String, text: String; public let actions: [CampaignChoice]; public let tome:TomePage? }
public struct CampaignSprite: Decodable {
    public let id: String, source: String
    public let sx: Double, sy: Double, sw: Double, sh: Double
    public let x: Double, y: Double, width: Double, height: Double, alpha: Double
}
public struct CampaignMarker: Decodable { public let x: Double, y: Double; public let element: String,color:String; public let lit: Bool }
public struct CampaignWorldAnimation:Decodable {
    public let id:String,frames:Int,fps:Double
    public let phase:Double?,offsets:[[Double]]?,motion:String?
}
public struct CampaignWorldDecoration:Decodable {
    public let id:String,kind:String,layer:String,color:String
    public let x:Double,y:Double,width:Double?,height:Double?,alpha:Double?,lineWidth:Double?
    public let stroke:String?,text:String?,clampBottom:Bool?
    public let pulseMean:Double?,pulseAmplitude:Double?,pulsePeriod:Double?
}
public struct CampaignWorld: Decodable {
    public let mapId:String, background:String
    public let width: Double, height: Double, camX: Double, camY: Double
    public let heroX: Int, heroY: Int
    public let sprites: [CampaignSprite]
    public let markers: [CampaignMarker]
    public let animations:[CampaignWorldAnimation],decorations:[CampaignWorldDecoration]
    public let groundCount:Int,overlayBase:Int
}
public struct CampaignState: Decodable {
    public let mode: String, mapId: String, location: String, heroName: String
    public let hp: Int, maxHP: Int
    public let walking: Bool
    public let panel: CampaignPanel?
    public let overview: CampaignOverview?
    public let world: CampaignWorld?
    public let save: String?
}
private struct CampaignEnvelope: Decodable { let ok: Bool; let state: CampaignState?; let error: String? }
extension BattleEngine {
    public func campaign(_ command: [String:Any]) throws -> CampaignState {
        let data = try JSONSerialization.data(withJSONObject: command)
        guard let json=String(data:data,encoding:.utf8) else { throw BattleEngineError.unavailable("Invalid campaign command.") }
        context.exception=nil
        guard let function=context.objectForKeyedSubscript("ManaCrystalsNative")?.objectForKeyedSubscript("campaignDispatch"), !function.isUndefined,
              let reply=function.call(withArguments:[json])?.toString(), context.exception == nil else {
            throw BattleEngineError.unavailable(context.exception?.toString() ?? "The campaign rules are missing.")
        }
        let envelope=try JSONDecoder().decode(CampaignEnvelope.self,from:Data(reply.utf8))
        guard envelope.ok,let state=envelope.state else { throw BattleEngineError.unavailable(envelope.error ?? "The campaign could not continue.") }
        return state
    }
}

public struct NativeObjective: Decodable {
    public let label: String
    public let counter: String?
    public let piecesLeft: Int?
    public let progress:Double?
    public let crystals:[NativeObjectiveCrystal]?
    public let score:NativeTally?,lines:NativeTally?,price:NativePrice?
    public let lamps:[NativeLamp]?,rival:NativeRival?
}
public struct NativeObjectiveCrystal:Decodable {public let element:String;public let have:Int,want:Int}
public struct NativeTally:Decodable {public let have:Int,want:Int}
public struct NativePrice:Decodable {public let value:Double,min:Double,max:Double}
public struct NativeLamp:Decodable {public let element:String,lit:Bool}
public struct NativeRival:Decodable {public let rows:Int,top:Int,pending:Int,secondsLeft:Int}
public struct NativeArea: Decodable { public let cols: [Int], rows: [Int] }
public struct NativeVerbParams: Decodable {
    public let zones: [String?]?
    public let outline: [NativeArea]?
    public let spare: NativeArea?
    public let lip: Int?
    public let pieceLimit:Int?
}
public struct NativeVerb: Decodable { public let verb: String; public let params: NativeVerbParams }

public struct CampaignSite:Decodable { public let x:Int,y:Int; public let name:String }
public struct CampaignOverview:Decodable { public let tiles:[String]; public let x:Int,y:Int; public let sites:[CampaignSite] }

public struct NativeTelegraph:Decodable {
    public let kind:String
    public let cells:[[Int]]?
    public let rows:Int?
    public let leadPieces:Int
}

public struct TomeActor:Decodable { public let id:String,name:String,source:String; public let sx:Double,sy:Double,sw:Double,sh:Double;public let walker:Bool }
public struct TomePage:Decodable {public let id:String,title:String,setting:String,action:String,dialogue:String,speaker:String,caption:String,actionDescription:String;public let subject:String?,target:String?,environment:String?;public let actors:[TomeActor]}
extension BattleEngine {
    public func heroBook(_ classID:String)throws->[TomePage] {
        context.exception=nil
        guard let json=context.objectForKeyedSubscript("ManaCrystalsNative")?.objectForKeyedSubscript("heroBookJSON")?.call(withArguments:[classID])?.toString(),context.exception==nil else{throw BattleEngineError.unavailable("The character book could not open.")}
        return try JSONDecoder().decode([TomePage].self,from:Data(json.utf8))
    }
}

public struct NativeVisualFixture:Decodable {public let id:String,title:String,group:String;public let progress:Double;public let state:BattleState}
extension BattleEngine {
    public func visualFixtures() throws -> [NativeVisualFixture] {
        context.exception=nil
        guard let json=context.objectForKeyedSubscript("ManaCrystalsNative")?.objectForKeyedSubscript("visualFixturesJSON")?.call(withArguments:[])?.toString(),context.exception==nil else {throw BattleEngineError.unavailable("Visual fixture generation failed: \(context.exception?.toString() ?? "missing export")")}
        return try JSONDecoder().decode([NativeVisualFixture].self,from:Data(json.utf8))
    }
}
