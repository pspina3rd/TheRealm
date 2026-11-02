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
        let start=app.buttons["hero-ranger"]
        XCTAssertTrue(start.waitForExistence(timeout:15));start.tap()
        XCTAssertTrue(app.buttons["Next page"].waitForExistence(timeout:5))
        app.buttons["Return to heroes"].tap()
        XCTAssertTrue(start.waitForExistence(timeout:5));XCTAssertFalse(app.buttons["Continue campaign"].exists)
        start.tap();app.buttons["Next page"].tap();app.buttons["Begin adventure"].tap()
        let skip=app.buttons["Skip scene"];XCTAssertTrue(skip.waitForExistence(timeout:10))
        app.buttons["Next page"].tap();app.buttons["Next page"].tap()
        XCTAssertTrue(app.staticTexts["Sleep."].waitForExistence(timeout:5))
        let bookShot=XCTAttachment(screenshot:app.screenshot());bookShot.name="In-world story tome";bookShot.lifetime = .keepAlways;add(bookShot)
        skip.tap()
        let world=app.otherElements["campaign-world"]
        XCTAssertTrue(world.waitForExistence(timeout:10))
        // Rowan is on-screen from Fern's starting position. Tap his actual map tile;
        // no debug warp or pre-earned progress is used for this handoff check.
        let worldFrame=world.frame,scale=min(worldFrame.width/416,worldFrame.height/640)
        let rowan=app.coordinate(withNormalizedOffset:.zero).withOffset(CGVector(dx:worldFrame.minX+(worldFrame.width-416*scale)/2+16*scale,dy:worldFrame.minY+(worldFrame.height-640*scale)/2+208*scale))
        rowan.tap()
        XCTAssertTrue(app.buttons["Begin"].waitForExistence(timeout:15))
        let begin=app.staticTexts["Begin"];XCTAssertTrue(begin.waitForExistence(timeout:5));begin.tap()
        XCTAssertTrue(app.otherElements["battle-board"].waitForExistence(timeout:10))
        app.buttons["Battle actions"].tap()
        let leave=app.staticTexts["Leave before starting"];XCTAssertTrue(leave.waitForExistence(timeout:5));leave.tap()
        let backToWorld=NSPredicate {_,_ in world.isHittable}
        expectation(for:backToWorld,evaluatedWith:nil);waitForExpectations(timeout:5)
        let before=world.value as? String
        let origin=world.coordinate(withNormalizedOffset:CGVector(dx:0.5,dy:0.55))
        let end=world.coordinate(withNormalizedOffset:CGVector(dx:0.5,dy:0.8))
        origin.press(forDuration:0.1,thenDragTo:end,withVelocity:.slow,thenHoldForDuration:0.5)
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
