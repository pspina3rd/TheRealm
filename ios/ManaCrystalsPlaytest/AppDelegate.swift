import UIKit

@main
final class AppDelegate: UIResponder, UIApplicationDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool { true }
}

final class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?
    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let scene=scene as? UIWindowScene else { return }
        let window=UIWindow(windowScene:scene)
        window.rootViewController=ProcessInfo.processInfo.arguments.contains("--battle-playtest") ? BattleViewController() : CampaignViewController();window.makeKeyAndVisible();self.window=window
    }
    func sceneWillResignActive(_ scene: UIScene) {
        (window?.rootViewController as? BattleViewController)?.suspend()
        (window?.rootViewController as? CampaignViewController)?.suspend()
    }
}
