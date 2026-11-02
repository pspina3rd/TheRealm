import XCTest

@MainActor
final class NativeAppUITests: XCTestCase {
    func testNativeBoardGesturesAndBackgroundRecovery() {
        let app=XCUIApplication();app.launchArguments=["--battle-playtest"];app.launch()
        let board=app.otherElements["battle-board"]
        XCTAssertTrue(board.waitForExistence(timeout:10))
        board.tap()
        func column() -> Int {
            let value=board.value as? String ?? ""
            let digits=value.components(separatedBy:"column ").last?.components(separatedBy:",").first ?? ""
            return Int(digits) ?? -1
        }
        let before=column();XCTAssertGreaterThan(before,0)
        let start=board.coordinate(withNormalizedOffset:CGVector(dx:0.55,dy:0.3))
        let end=board.coordinate(withNormalizedOffset:CGVector(dx:0.3,dy:0.3))
        start.press(forDuration:0.05,thenDragTo:end)
        XCTAssertLessThan(column(),before)
        let oldPiece=(board.value as? String ?? "").components(separatedBy:",").first
        board.swipeDown(velocity:.fast)
        let changed=NSPredicate { _,_ in (board.value as? String ?? "").components(separatedBy:",").first != oldPiece }
        expectation(for:changed,evaluatedWith:nil);waitForExpectations(timeout:5)
        XCUIDevice.shared.press(.home);app.activate()
        XCTAssertTrue(app.buttons["Resume"].waitForExistence(timeout:5))
        app.buttons["Resume"].tap();board.tap()
        XCTAssertTrue(app.buttons["Pause"].exists)
        let shot=XCTAttachment(screenshot:app.screenshot());shot.name="Native iPhone board";shot.lifetime = .keepAlways;add(shot)
    }
}


extension NativeAppUITests {
    func testCampaignOpeningMovementMenuAndRelaunch() {
        let app=XCUIApplication();app.launchArguments=["--reset-campaign-ui-test"];app.launch()
        let start=app.buttons["Begin as Fern · Mossvale"]
        XCTAssertTrue(start.waitForExistence(timeout:15));start.tap()
        for _ in 0..<20 {
            let dialog=app.tables["campaign-dialog"]
            if !dialog.waitForExistence(timeout:1) {break}
            let first=dialog.cells["campaign-choice-0"]
            if !first.exists {break};first.tap()
        }
        let world=app.otherElements["campaign-world"]
        XCTAssertTrue(world.waitForExistence(timeout:10))
        // Rowan is on-screen from Fern's starting position. Tap his actual map tile;
        // no debug warp or pre-earned progress is used for this handoff check.
        let worldFrame=world.frame,scale=min(worldFrame.width/416,worldFrame.height/640)
        let rowan=app.coordinate(withNormalizedOffset:.zero).withOffset(CGVector(dx:worldFrame.minX+(worldFrame.width-416*scale)/2+16*scale,dy:worldFrame.minY+(worldFrame.height-640*scale)/2+208*scale))
        rowan.tap()
        XCTAssertTrue(app.tables["campaign-dialog"].waitForExistence(timeout:15))
        let begin=app.staticTexts["Begin"];XCTAssertTrue(begin.waitForExistence(timeout:5));begin.tap()
        XCTAssertTrue(app.otherElements["battle-board"].waitForExistence(timeout:10))
        app.buttons["Battle actions"].tap()
        let leave=app.staticTexts["Leave before starting"];XCTAssertTrue(leave.waitForExistence(timeout:5));leave.tap()
        let backToWorld=NSPredicate {_,_ in world.isHittable}
        expectation(for:backToWorld,evaluatedWith:nil);waitForExpectations(timeout:5)
        let before=world.value as? String
        let origin=world.coordinate(withNormalizedOffset:CGVector(dx:0.5,dy:0.55))
        let end=world.coordinate(withNormalizedOffset:CGVector(dx:0.5,dy:0.8))
        origin.press(forDuration:0.1,thenDragTo:end)
        let moved=NSPredicate {_,_ in world.value as? String != before}
        expectation(for:moved,evaluatedWith:nil);waitForExpectations(timeout:5)
        app.buttons["campaign-menu"].tap()
        XCTAssertTrue(app.tables["campaign-dialog"].waitForExistence(timeout:5))
        app.staticTexts["World map"].tap()
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format:"label CONTAINS %@","Reach the stones through Mossvale")).firstMatch.waitForExistence(timeout:5))
        let shot=XCTAttachment(screenshot:app.screenshot());shot.name="Native campaign world map";shot.lifetime = .keepAlways;add(shot)
        app.terminate();app.launchArguments=[];app.launch()
        XCTAssertTrue(app.buttons["Continue campaign"].waitForExistence(timeout:10));app.buttons["Continue campaign"].tap()
        XCTAssertTrue(world.waitForExistence(timeout:10))
        XCUIDevice.shared.press(.home);app.activate()
        XCTAssertTrue(world.waitForExistence(timeout:5))
    }
}
