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
        let worldShot=XCTAttachment(screenshot:app.screenshot());worldShot.name="Native opening world and authored cues";worldShot.lifetime = .keepAlways;add(worldShot)
        // Rowan is on-screen from Fern's starting position. Tap his actual map tile;
        // no debug warp or pre-earned progress is used for this handoff check.
        let worldFrame=world.frame,scale=worldFrame.width/416
        let sourceHeight=min(1280,max(320,(416*worldFrame.height/worldFrame.width).rounded()))
        let cameraY=832<=sourceHeight ? (832-sourceHeight)/2:max(0,min(832-sourceHeight,656-sourceHeight/2))
        let rowan=app.coordinate(withNormalizedOffset:.zero).withOffset(CGVector(dx:worldFrame.minX+16*scale,dy:worldFrame.minY+(400-cameraY)*scale))
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
        XCTAssertTrue(app.staticTexts["World map"].isHittable)
        let menuShot=XCTAttachment(screenshot:app.screenshot());menuShot.name="Parchment campaign menu";menuShot.lifetime = .keepAlways;add(menuShot)
        app.staticTexts["World map"].tap()
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format:"label CONTAINS %@","Provincial roads leave Mossvale by the south gate")).firstMatch.waitForExistence(timeout:5))
        // The complete accessibility label also existed when visible prose was
        // ellipsized. Verify the actual known two-line instruction layout.
        let instructions=app.staticTexts["campaign-panel-text"]
        XCTAssertGreaterThan(instructions.frame.height,32)
        let overview=app.images["campaign-panel-map"]
        XCTAssertTrue(overview.exists)
        XCTAssertEqual(overview.frame.width,overview.frame.height,accuracy:1)
        let shot=XCTAttachment(screenshot:app.screenshot());shot.name="Native campaign world map";shot.lifetime = .keepAlways;add(shot)
        let nature=app.staticTexts.containing(NSPredicate(format:"label CONTAINS %@","Nature — Hazel")).firstMatch
        app.tables["campaign-dialog"].swipeUp()
        XCTAssertTrue(nature.waitForExistence(timeout:5));nature.tap()
        XCTAssertTrue(app.staticTexts.containing(NSPredicate(format:"label CONTAINS %@","Leave Mossvale by the south gate")).firstMatch.waitForExistence(timeout:5))
        XCTAssertTrue(app.staticTexts["Walk this part of the route"].isHittable)
        let routeShot=XCTAttachment(screenshot:app.screenshot());routeShot.name="Native mentor route and south gate guidance";routeShot.lifetime = .keepAlways;add(routeShot)
        app.terminate();app.launchArguments=[];app.launch()
        XCTAssertTrue(app.buttons["Continue campaign"].waitForExistence(timeout:10));app.buttons["Continue campaign"].tap()
        XCTAssertTrue(world.waitForExistence(timeout:10))
        XCUIDevice.shared.press(.home);app.activate()
        XCTAssertTrue(world.waitForExistence(timeout:5))
    }
}


extension NativeAppUITests {
    private func reviewVisualGroup(_ group:String,expected:Int) {
        let app=XCUIApplication();app.launchArguments=["--visual-gallery","--visual-school",group];app.launch()
        let index=app.staticTexts["visual-index"],board=app.otherElements["visual-board"]
        XCTAssertTrue(index.waitForExistence(timeout:30));XCTAssertTrue(board.waitForExistence(timeout:10))
        XCTAssertEqual(app.staticTexts["visual-assets"].value as? String,"complete")
        for n in 1...expected {
            let at=NSPredicate { _,_ in (index.value as? String ?? "").hasPrefix("\(n)/\(expected)|") }
            expectation(for:at,evaluatedWith:nil);waitForExpectations(timeout:5)
            let logicalWidth=Double((board.value as? String ?? "").split(separator:"|").dropLast().last ?? "0") ?? 0
            XCTAssertGreaterThan(logicalWidth,0);XCTAssertGreaterThanOrEqual(Double(board.frame.width)/max(1,logicalWidth),24)
            XCTAssertGreaterThan(board.frame.height,480)
            let title=app.staticTexts["visual-title"].label
            XCTAssertFalse(title.isEmpty)
            let shot=XCTAttachment(screenshot:app.screenshot());shot.name="Visual \(group) \(n) \(title)";shot.lifetime = .keepAlways;add(shot)
            if n<expected {XCTAssertTrue(app.buttons["visual-next"].isEnabled);app.buttons["visual-next"].tap()}
        }
        XCTAssertFalse(app.buttons["visual-next"].isEnabled)
    }
    func testVisualFireAllFourRanks(){reviewVisualGroup("fire",expected:12)}
    func testVisualIceAllFourRanks(){reviewVisualGroup("water",expected:12)}
    func testVisualGravityAllFourRanks(){reviewVisualGroup("earth",expected:12)}
    func testVisualWindAllFourRanks(){reviewVisualGroup("wind",expected:12)}
    func testVisualLightningAllFourRanks(){reviewVisualGroup("lightning",expected:12)}
    func testVisualNatureAllFourRanks(){reviewVisualGroup("nature",expected:12)}
    func testVisualZeroSpellsObstructionsArcaneAndOrderedWeaving(){reviewVisualGroup("special",expected:39)}
}
