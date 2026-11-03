import XCTest
@testable import NativeEngine

final class NativeVisualBoundaryTests:XCTestCase {
    func testObstructionDecodeRetainsTheCurrentStepAndItsActualSides() throws {
        let json = #"{"strength":3,"step":1,"sequence":[{"color":"red","sides":["left"]},{"color":"green","sides":["top","right","bottom","left"]}]}"#
        let obstruction = try JSONDecoder().decode(NativeObstruction.self,from:Data(json.utf8))
        let step = try XCTUnwrap(obstruction.step)
        XCTAssertEqual(step,1)
        let current = try XCTUnwrap(obstruction.sequence?[step])
        XCTAssertEqual(current.color,"green")
        XCTAssertEqual(current.sides,["top","right","bottom","left"])
        XCTAssertEqual(obstruction.strength,3)
    }

    func testEffectDecodeRetainsBothStatesAndTheWeavingStage() throws {
        let json = #"""
        {
          "school":"natureConvert","element":"nature","phase":"effect","character":false,
          "source":"weave","index":2,"total":2,"rank":3,"rows":[0],
          "remainingMs":400,"durationMs":900,
          "before":{"grid":[["stone",null]],"obstructions":{"0,0":{"strength":2,"step":1,"sequence":[{"color":"red","sides":["left"]},{"color":"green","sides":["right"]}]}}},
          "effectState":{"grid":[["neutral",null]],"obstructions":{}},
          "after":{"grid":[["neutral",null]],"obstructions":{}},
          "visual":[{"from":[0,0],"effectAt":[0,0],"to":[0,0],"before":"stone","effectCell":"neutral","after":"neutral"}]
        }
        """#
        let effect = try JSONDecoder().decode(NativeEffect.self,from:Data(json.utf8))
        XCTAssertEqual(effect.source,"weave")
        XCTAssertEqual(effect.index,2);XCTAssertEqual(effect.total,2)
        XCTAssertEqual(effect.rank,3);XCTAssertEqual(effect.rows,[0])
        XCTAssertEqual(effect.before.grid[0][0],"stone")
        XCTAssertEqual(effect.before.obstructions["0,0"]?.step,1)
        XCTAssertEqual(effect.effectState.grid[0][0],"neutral")
        XCTAssertTrue(effect.effectState.obstructions.isEmpty)
        XCTAssertEqual(effect.after.grid[0][0],"neutral")
        let actor = try XCTUnwrap(effect.visual.first)
        XCTAssertEqual(actor.from,[0,0]);XCTAssertEqual(actor.effectAt,[0,0]);XCTAssertEqual(actor.to,[0,0])
        XCTAssertEqual(actor.before,"stone");XCTAssertEqual(actor.effectCell,"neutral");XCTAssertEqual(actor.after,"neutral")
        XCTAssertFalse(effect.character)
    }

    func testNullableEndpointsDistinguishGrowthFromRemoval() throws {
        let growth = #"{"from":null,"to":[2,3],"effectAt":[2,3],"before":null,"effectCell":"neutral","after":"neutral"}"#
        let added = try JSONDecoder().decode(NativeVisualBlock.self,from:Data(growth.utf8))
        XCTAssertNil(added.from);XCTAssertNil(added.before)
        XCTAssertEqual(added.effectAt,[2,3]);XCTAssertEqual(added.effectCell,"neutral")
        XCTAssertEqual(added.to,[2,3]);XCTAssertEqual(added.after,"neutral")
        let removal = #"{"from":[2,3],"to":null,"effectAt":null,"before":"red","effectCell":null,"after":null}"#
        let removed = try JSONDecoder().decode(NativeVisualBlock.self,from:Data(removal.utf8))
        XCTAssertEqual(removed.from,[2,3]);XCTAssertEqual(removed.before,"red")
        XCTAssertNil(removed.effectAt);XCTAssertNil(removed.effectCell)
        XCTAssertNil(removed.to);XCTAssertNil(removed.after)
    }
}
