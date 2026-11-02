import XCTest
@testable import NativeInput

final class BoardGestureTests: XCTestCase {
    func testTapRotatesOnce() {
        var g=BoardGesture();g.begin(id:1,x:100,y:100,time:0)
        XCTAssertEqual(g.end(id:1,x:102,y:102,time:0.1),[.rotate])
        XCTAssertEqual(g.end(id:1,x:102,y:102,time:0.2),[])
    }
    func testHorizontalDragNeverBecomesADrop() {
        var g=BoardGesture();g.begin(id:1,x:100,y:100,time:0)
        XCTAssertEqual(g.move(id:1,x:160,y:105,time:0.1),[.right,.right])
        XCTAssertEqual(g.move(id:1,x:160,y:190,time:0.2),[])
        XCTAssertEqual(g.end(id:1,x:160,y:200,time:0.25),[])
    }
    func testDownwardFlickDrops() {
        var g=BoardGesture();g.begin(id:1,x:100,y:100,time:0)
        _=g.move(id:1,x:102,y:165,time:0.1)
        XCTAssertEqual(g.end(id:1,x:102,y:180,time:0.15),[.hardDrop])
    }
    func testSlowDownwardDragSoftDropsWithoutSuddenHardDrop() {
        var g=BoardGesture();g.begin(id:1,x:100,y:100,time:0)
        _=g.move(id:1,x:100,y:130,time:0.3)
        XCTAssertEqual(g.tick(time:0.35),[])
        XCTAssertEqual(g.tick(time:0.47),[.softDrop])
        XCTAssertEqual(g.tick(time:0.48),[])
        _=g.move(id:1,x:100,y:145,time:0.8)
        XCTAssertEqual(g.end(id:1,x:100,y:145,time:1),[])
    }
    func testSecondFingerCancelsUntilBothAreUp() {
        var g=BoardGesture();g.begin(id:1,x:100,y:100,time:0);g.begin(id:2,x:140,y:100,time:0.1)
        XCTAssertEqual(g.end(id:2,x:140,y:100,time:0.2),[])
        XCTAssertEqual(g.end(id:1,x:100,y:100,time:0.3),[])
        g.begin(id:3,x:100,y:100,time:0.4)
        XCTAssertEqual(g.end(id:3,x:100,y:100,time:0.5),[.rotate])
    }
    func testPieceLockSpendsTheOldTouch() {
        var g=BoardGesture();g.begin(id:1,x:100,y:100,time:0);g.invalidate()
        XCTAssertEqual(g.end(id:1,x:100,y:100,time:0.1),[])
        g.begin(id:2,x:100,y:100,time:0.2)
        XCTAssertEqual(g.end(id:2,x:100,y:100,time:0.3),[.rotate])
    }
    func testBackgroundAndSystemCancellationRecover() {
        var g=BoardGesture();g.begin(id:1,x:100,y:100,time:0);g.cancelAll()
        XCTAssertFalse(g.active)
        XCTAssertEqual(g.end(id:1,x:100,y:100,time:0.1),[])
        g.begin(id:2,x:100,y:100,time:0.2);g.cancel(id:2)
        g.begin(id:3,x:100,y:100,time:0.4)
        XCTAssertEqual(g.end(id:3,x:100,y:100,time:0.5),[.rotate])
    }
    func testLateCancellationCannotConsumeANewTouch() {
        var g=BoardGesture();g.begin(id:1,x:100,y:100,time:0);g.cancelAll()
        g.begin(id:2,x:100,y:100,time:0.2);g.cancel(id:1)
        XCTAssertEqual(g.end(id:2,x:100,y:100,time:0.3),[.rotate])
    }
    func testAmbiguousDiagonalDoesNotRotateOrDrop() {
        var g=BoardGesture();g.begin(id:1,x:100,y:100,time:0)
        XCTAssertEqual(g.move(id:1,x:125,y:125,time:0.1),[])
        XCTAssertEqual(g.end(id:1,x:125,y:125,time:0.2),[])
    }
}

extension BoardGestureTests {
    func testHoldingThenMovingOnReleaseNeverHardDrops() {
        var g=BoardGesture();g.begin(id:1,x:100,y:100,time:0)
        XCTAssertEqual(g.tick(time:0.5),[])
        _=g.move(id:1,x:102,y:170,time:0.55)
        XCTAssertEqual(g.end(id:1,x:102,y:180,time:0.58),[])
    }
    func testStationaryHoldAndSmallJitterStillRotateOnlyOnce() {
        var g=BoardGesture();g.begin(id:1,x:100,y:100,time:0)
        _=g.tick(time:0.5);_=g.move(id:1,x:106,y:110,time:0.6)
        XCTAssertEqual(g.end(id:1,x:106,y:110,time:0.7),[.rotate])
        XCTAssertEqual(g.end(id:1,x:106,y:110,time:0.8),[])
    }
    func testReleaseAccelerationAfterSoftDropCannotBecomeHardDrop() {
        var g=BoardGesture();g.begin(id:1,x:100,y:100,time:0)
        _=g.move(id:1,x:100,y:132,time:0.12)
        XCTAssertEqual(g.tick(time:0.34),[.softDrop])
        _=g.move(id:1,x:100,y:190,time:0.35)
        XCTAssertEqual(g.end(id:1,x:100,y:210,time:0.36),[])
    }
}

extension BoardGestureTests {
    func testOldFlickVelocityIsNotRefreshedByReleaseJitter() {
        var g=BoardGesture();g.begin(id:1,x:100,y:100,time:0)
        _=g.move(id:1,x:100,y:165,time:0.1)
        _=g.move(id:1,x:100,y:166,time:0.27)
        XCTAssertEqual(g.end(id:1,x:100,y:166,time:0.28),[])
    }
    func testHoldingWithoutAnimationTicksStillCannotHardDrop() {
        var g=BoardGesture();g.begin(id:1,x:100,y:100,time:0)
        _=g.move(id:1,x:100,y:190,time:0.55)
        XCTAssertEqual(g.end(id:1,x:100,y:210,time:0.58),[])
    }
    func testVerticalGestureReleasedFarSidewaysDoesNotHardDrop() {
        var g=BoardGesture();g.begin(id:1,x:100,y:100,time:0)
        _=g.move(id:1,x:100,y:165,time:0.1)
        XCTAssertEqual(g.end(id:1,x:230,y:180,time:0.15),[])
    }
    func testDuplicateBeginCannotRearmASpentFinger() {
        var g=BoardGesture();g.begin(id:1,x:100,y:100,time:0);g.invalidate()
        g.begin(id:1,x:100,y:100,time:0.2)
        XCTAssertEqual(g.end(id:1,x:100,y:100,time:0.3),[])
    }
}

extension BoardGestureTests {
    func testLongTravelThenRestAndTinyReleaseJitterNeverHardDrops() {
        var g=BoardGesture();g.begin(id:1,x:100,y:100,time:0)
        _=g.move(id:1,x:100,y:250,time:0.1)
        _=g.move(id:1,x:100,y:251,time:0.27)
        XCTAssertEqual(g.end(id:1,x:100,y:251,time:0.28),[])
    }
    func testUninterruptedQuarterSecondFlickIsNotPreemptedBySoftDropTick() {
        var g=BoardGesture();g.begin(id:1,x:100,y:100,time:0)
        _=g.move(id:1,x:100,y:130,time:0.04)
        _=g.move(id:1,x:100,y:180,time:0.10)
        _=g.move(id:1,x:100,y:225,time:0.16)
        XCTAssertEqual(g.tick(time:0.20),[])
        _=g.move(id:1,x:100,y:280,time:0.23)
        XCTAssertEqual(g.tick(time:0.24),[])
        XCTAssertEqual(g.end(id:1,x:100,y:300,time:0.25),[.hardDrop])
    }
}
