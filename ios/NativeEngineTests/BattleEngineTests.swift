import XCTest
@testable import NativeEngine

final class BattleEngineTests:XCTestCase {
    func testBundledRulesLoadInApplesJavaScriptCoreWithoutBrowserAPIs() throws {
        let engine=try BattleEngine()
        let state=try engine.send(["type":"start","school":"none","rank":1,"seed":73])
        XCTAssertTrue(state.ready);XCTAssertTrue(state.paused)
        XCTAssertEqual(state.width,10);XCTAssertEqual(state.height,20)
        XCTAssertTrue(state.spells.isEmpty);XCTAssertNotNil(state.active)
        let idle=try engine.send(["type":"step","ms":100])
        XCTAssertEqual(idle.active?.y,state.active?.y);XCTAssertEqual(idle.enemyHP,state.enemyHP)
    }
    func testEveryBaseSchoolAndAllFourRanksDecode() throws {
        let engine=try BattleEngine()
        for school in ["fire","blizzard","quake","gale","thunder","natureConvert"] {
            for rank in 1...4 {
                let state=try engine.send(["type":"start","school":school,"rank":rank,"seed":73])
                XCTAssertEqual(state.spells.count,1);XCTAssertEqual(state.spells.first?.rank,rank)
                XCTAssertEqual(state.spells.first?.mana,0)
            }
        }
    }
    func testOldPieceCommandsCannotMoveTheNextPiece() throws {
        let engine=try BattleEngine()
        let first=try engine.send(["type":"start","seed":73])
        try engine.send(["type":"begin"])
        let next=try engine.send(["type":"input","action":"hardDrop","pieceID":first.pieceID])
        XCTAssertNotEqual(next.pieceID,first.pieceID)
        let unchanged=try engine.send(["type":"input","action":"left","pieceID":first.pieceID])
        XCTAssertEqual(unchanged.active?.x,next.active?.x)
    }
    func testBackgroundPauseCannotRotateOrAdvanceEnemy() throws {
        let engine=try BattleEngine()
        _=try engine.send(["type":"start","seed":73]);try engine.send(["type":"begin"])
        let paused=try engine.send(["type":"pause","paused":true,"system":true])
        XCTAssertEqual(paused.pausesLeft,3)
        let ignored=try engine.send(["type":"input","action":"rotate","pieceID":paused.pieceID])
        let later=try engine.send(["type":"step","ms":10000])
        XCTAssertEqual(ignored.active?.cells,paused.active?.cells)
        XCTAssertEqual(later.enemyRemainingMs,paused.enemyRemainingMs)
    }
}

extension BattleEngineTests {
    func testCampaignOpensAllFourHometownsWithoutBrowserAPIs() throws {
        let engine=try BattleEngine()
        for (hero,home) in [("ranger","mossvale"),("knight","redrockVillage"),("mage","glasswaterVillage"),("rogue","thornwoodVillage")] {
            var state=try engine.campaign(["type":"start","classId":hero])
            XCTAssertEqual(state.mapId,home);XCTAssertEqual(state.mode,"world")
            XCTAssertFalse(state.world?.sprites.isEmpty ?? true)
            for _ in 0..<30 {
                guard let choice=state.panel?.actions.first(where:{$0.label=="Next page" || $0.label=="Return to the world"}) ?? state.panel?.actions.first else{break}
                state=try engine.campaign(["type":"action","id":choice.id])
            }
            XCTAssertNil(state.panel)
            let saved=try engine.campaign(["type":"checkpoint"])
            XCTAssertNotNil(saved.save)
            let restored=try engine.campaign(["type":"load","save":try XCTUnwrap(saved.save)])
            XCTAssertEqual(restored.mapId,home);XCTAssertEqual(restored.heroName,state.heroName)
        }
    }
}
