// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ManaCrystalsNativeChecks",
    platforms: [.macOS(.v13), .iOS(.v17)],
    products: [.library(name: "NativeInput", targets: ["NativeInput"])],
    targets: [
        .target(name: "NativeInput", path: "ManaCrystalsPlaytest/Input"),
        .target(name: "NativeEngine", path: "ManaCrystalsPlaytest/Engine",
                resources: [.copy("battle-engine.js")],
                linkerSettings: [.linkedFramework("JavaScriptCore")]),
        .testTarget(name: "NativeInputTests", dependencies: ["NativeInput"], path: "NativeInputTests"),
        .testTarget(name: "NativeEngineTests", dependencies: ["NativeEngine"], path: "NativeEngineTests")
    ]
)
