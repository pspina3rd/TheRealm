import XCTest

@MainActor
final class NativeAppUITests: XCTestCase {
    func testNativeBoardGesturesAndBackgroundRecovery() {
        let app=XCUIApplication();app.launch()
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
