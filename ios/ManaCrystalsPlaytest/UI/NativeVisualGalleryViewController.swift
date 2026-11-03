import UIKit
import SpriteKit

/// Developer-only visual acceptance surface. Uses the real renderer and real
/// resolver previews, never a saved campaign or a special drawing implementation.
final class NativeVisualGalleryViewController:UIViewController {
    private let board=SKView(),scene=BattleScene(size:CGSize(width:300,height:600))
    private let stage=NativeEncounterView(),mana=NativeManaView(),preview=NextPiecesView()
    private let titleLabel=UILabel(),indexLabel=UILabel(),assetLabel=UILabel()
    private let previous=UIButton(type:.system),next=UIButton(type:.system)
    private var fixtures:[NativeVisualFixture]=[]
    private var position=0
    private var ratio:NSLayoutConstraint?
    override var supportedInterfaceOrientations:UIInterfaceOrientationMask{.portrait}
    override func viewDidLoad() {
        super.viewDidLoad();view.backgroundColor=NativeAtlas.color("#0a0c17")
        titleLabel.numberOfLines=2;titleLabel.textColor = .white;titleLabel.font = .systemFont(ofSize:13,weight:.semibold);titleLabel.accessibilityIdentifier="visual-title"
        indexLabel.textColor=NativeAtlas.color("#f6d365");indexLabel.font = .monospacedDigitSystemFont(ofSize:10,weight:.regular);indexLabel.accessibilityIdentifier="visual-index"
        assetLabel.textColor=NativeAtlas.color("#72e6a2");assetLabel.font = .systemFont(ofSize:9);assetLabel.accessibilityIdentifier="visual-assets"
        previous.setTitle("Previous",for:.normal);previous.accessibilityIdentifier="visual-previous";previous.addTarget(self,action:#selector(back),for:.touchUpInside)
        next.setTitle("Next",for:.normal);next.accessibilityIdentifier="visual-next";next.addTarget(self,action:#selector(forward),for:.touchUpInside)
        let navigation=UIStackView(arrangedSubviews:[previous,indexLabel,next]);navigation.distribution = .equalSpacing;navigation.heightAnchor.constraint(equalToConstant:44).isActive=true
        stage.heightAnchor.constraint(equalToConstant:72).isActive=true;preview.heightAnchor.constraint(equalToConstant:30).isActive=true;mana.heightAnchor.constraint(equalToConstant:42).isActive=true
        let header=UIStackView(arrangedSubviews:[titleLabel,assetLabel,stage,preview,mana]);header.axis = .vertical;header.spacing=2
        header.translatesAutoresizingMaskIntoConstraints=false;navigation.translatesAutoresizingMaskIntoConstraints=false;board.translatesAutoresizingMaskIntoConstraints=false
        view.addSubview(header);view.addSubview(board);view.addSubview(navigation)
        let safe=view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            header.topAnchor.constraint(equalTo:safe.topAnchor),header.leadingAnchor.constraint(equalTo:safe.leadingAnchor,constant:16),header.trailingAnchor.constraint(equalTo:safe.trailingAnchor,constant:-16),
            navigation.leadingAnchor.constraint(equalTo:safe.leadingAnchor,constant:16),navigation.trailingAnchor.constraint(equalTo:safe.trailingAnchor,constant:-16),navigation.bottomAnchor.constraint(equalTo:safe.bottomAnchor),
            board.topAnchor.constraint(equalTo:header.bottomAnchor,constant:3),board.bottomAnchor.constraint(lessThanOrEqualTo:navigation.topAnchor,constant:-3),board.centerXAnchor.constraint(equalTo:safe.centerXAnchor),board.widthAnchor.constraint(lessThanOrEqualTo:safe.widthAnchor,constant:-24)
        ])
        let width=board.widthAnchor.constraint(equalTo:safe.widthAnchor,constant:-24);width.priority = .defaultHigh;width.isActive=true
        board.accessibilityIdentifier="visual-board";board.isAccessibilityElement=true;board.isUserInteractionEnabled=false
        scene.scaleMode = .resizeFill;board.presentScene(scene)
        do {
            fixtures=try BattleEngine().visualFixtures()
            let arguments=ProcessInfo.processInfo.arguments
            if let at=arguments.firstIndex(of:"--visual-school"),at+1<arguments.count {fixtures=fixtures.filter{$0.group==arguments[at+1]}}
            let root=Bundle.main.resourceURL!.appendingPathComponent("assets/native-visuals")
            let data=try Data(contentsOf:root.appendingPathComponent("manifest.json"))
            let manifest=try JSONSerialization.jsonObject(with:data) as? [String:Any]
            let assets=(manifest?["assets"] as? [String:Any]) ?? [:]
            let loaded=assets.keys.filter{UIImage(contentsOfFile:root.appendingPathComponent("\($0).png").path) != nil}.count
            assetLabel.text="Shared art: \(loaded)/\(assets.count)";assetLabel.accessibilityValue=loaded==assets.count && loaded>0 ? "complete":"missing"
            show()
        } catch {titleLabel.text=error.localizedDescription;indexLabel.text="ERROR"}
    }
    override func viewDidLayoutSubviews(){super.viewDidLayoutSubviews();scene.size=board.bounds.size;if !fixtures.isEmpty{scene.render(fixtures[position].state)}}
    @objc private func back(){if position>0{position-=1;show()}}
    @objc private func forward(){if position+1<fixtures.count{position+=1;show()}}
    private func show(){
        guard !fixtures.isEmpty else{titleLabel.text="No visual fixtures";return}
        let fixture=fixtures[position]
        ratio?.isActive=false
        ratio=board.heightAnchor.constraint(equalTo:board.widthAnchor,multiplier:CGFloat(fixture.state.height)/CGFloat(fixture.state.width));ratio?.isActive=true
        titleLabel.text=fixture.title;indexLabel.text="\(position+1)/\(fixtures.count)"
        indexLabel.accessibilityValue="\(position+1)/\(fixtures.count)|\(fixture.id)"
        board.accessibilityValue="\(fixture.id)|\(fixture.state.effect?.element ?? "none")|\(fixture.state.effect?.rank ?? 0)|\(fixture.state.effect?.phase ?? "board")|\(fixture.state.width)|\(fixture.state.height)"
        stage.adopt(fixture.state);mana.spells=fixture.state.spells;preview.pieces=fixture.state.next;preview.lines=fixture.state.lines
        previous.isEnabled=position>0;next.isEnabled=position+1<fixtures.count;view.layoutIfNeeded();scene.size=board.bounds.size;scene.render(fixture.state)
    }
}
