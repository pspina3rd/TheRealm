import UIKit
import SpriteKit

@MainActor private final class FrameTarget: NSObject {
    weak var owner: BattleViewController?
    @objc func update(_ link: CADisplayLink) { owner?.frame(link) }
}

final class BattleViewController: UIViewController {
    private let board=NativeBoardView()
    private let scene=BattleScene()
    private let health=UILabel(), status=UILabel()
    private let preview=NextPiecesView()
    private let mana=NativeManaView()
    private var manaHeight:NSLayoutConstraint?
    private let pause=UIButton(type:.system), options=UIButton(type:.system)
    private var engine: BattleEngine?
    private let campaign: Bool
    var onCheckpoint: (() -> Void)?
    var onOptions: (() -> Void)?
    var onContinue: (() -> Void)?
    private var boardRatio: NSLayoutConstraint?
    init(campaignEngine: BattleEngine? = nil) {
        campaign = campaignEngine != nil; engine = campaignEngine
        super.init(nibName:nil,bundle:nil)
    }
    required init?(coder:NSCoder) { fatalError("Use init(campaignEngine:)") }
    func refreshCampaignState() { send(["type":"snapshot"]) }

    private var state: BattleState?
    private var gesture=BoardGesture()
    private var gesturePieceID=0
    private var clock: CADisplayLink?
    private let frameTarget=FrameTarget()
    private var lastFrame=0.0
    private var school="none", rank=1
    private var reportedError=false
    private var hudKey=""
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .portrait }
    override var preferredScreenEdgesDeferringSystemGestures: UIRectEdge { .bottom }

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor=UIColor(red:0.035,green:0.045,blue:0.085,alpha:1)
        let header=UIStackView(arrangedSubviews:[options,health,pause]);header.axis = .horizontal;header.alignment = .center;header.spacing=8
        options.setImage(UIImage(systemName:"slider.horizontal.3"),for:.normal);options.accessibilityLabel="Playtest settings"
        pause.setImage(UIImage(systemName:"pause.fill"),for:.normal);pause.accessibilityLabel="Pause"
        options.addTarget(self,action:#selector(showOptions),for:.touchUpInside)
        pause.addTarget(self,action:#selector(togglePause),for:.touchUpInside)
        for button in [options,pause] { button.tintColor = .white;button.widthAnchor.constraint(equalToConstant:44).isActive=true;button.heightAnchor.constraint(equalToConstant:44).isActive=true }
        health.textColor = .white;health.font = .monospacedDigitSystemFont(ofSize:14,weight:.semibold);health.textAlignment = .center;health.adjustsFontSizeToFitWidth=true;health.minimumScaleFactor=0.8
        status.font = .systemFont(ofSize:13,weight:.medium);status.textColor=UIColor(white:0.8,alpha:1);status.textAlignment = .center;status.numberOfLines=2
        let manaHeight=mana.heightAnchor.constraint(equalToConstant:0);manaHeight.isActive=true;self.manaHeight=manaHeight
        mana.backgroundColor = .clear
        preview.backgroundColor = .clear
        status.heightAnchor.constraint(equalToConstant:32).isActive=true
        preview.heightAnchor.constraint(equalToConstant:30).isActive=true
        let top=UIStackView(arrangedSubviews:[header,status,preview,mana]);top.axis = .vertical;top.spacing=4
        top.translatesAutoresizingMaskIntoConstraints=false;board.translatesAutoresizingMaskIntoConstraints=false
        view.addSubview(top);view.addSubview(board)
        board.isMultipleTouchEnabled=true;board.isExclusiveTouch=true;board.preferredFramesPerSecond=60
        board.accessibilityLabel="Battle board. Drag sideways to move, tap to rotate, flick down to drop."
        board.accessibilityIdentifier="battle-board"
        board.isAccessibilityElement=true
        board.accessibilityCustomActions = [("Move left",NativeAction.left),("Move right",.right),("Rotate",.rotate),("Drop",.hardDrop)].map { name,action in
            UIAccessibilityCustomAction(name:name) { [weak self] _ in
                guard let self=self,self.state?.acceptsTouch == true else{return false}
                if self.state?.ready == true {self.send(["type":"begin"])}
                self.send(["type":"input","action":action.rawValue,"pieceID":self.state?.pieceID ?? 0]);return true
            }
        }
        board.layer.cornerRadius=10;board.layer.borderWidth=1;board.layer.borderColor=UIColor(white:0.35,alpha:1).cgColor
        let safe=view.safeAreaLayoutGuide
        let preferredWidth=board.widthAnchor.constraint(equalTo:safe.widthAnchor,constant:-24);preferredWidth.priority = .defaultHigh
        let ratio=board.heightAnchor.constraint(equalTo:board.widthAnchor,multiplier:2);boardRatio=ratio
        NSLayoutConstraint.activate([
            top.topAnchor.constraint(equalTo:safe.topAnchor,constant:4),top.leadingAnchor.constraint(equalTo:safe.leadingAnchor,constant:12),top.trailingAnchor.constraint(equalTo:safe.trailingAnchor,constant:-12),
            board.topAnchor.constraint(equalTo:top.bottomAnchor,constant:10),board.centerXAnchor.constraint(equalTo:safe.centerXAnchor),
            ratio,board.bottomAnchor.constraint(lessThanOrEqualTo:safe.bottomAnchor,constant:-10),
            board.widthAnchor.constraint(lessThanOrEqualTo:safe.widthAnchor,constant:-24),preferredWidth
        ])
        scene.scaleMode = .resizeFill;board.presentScene(scene)
        board.began={ [weak self] id,point,time in
            guard let self=self, self.state?.acceptsTouch == true else { return }
            if self.state?.ready == true { self.send(["type":"begin"]) }
            self.gesturePieceID=self.state?.pieceID ?? 0
            self.gesture.cellWidth=Double(self.board.bounds.width)/Double(self.state?.width ?? 10)
            self.gesture.begin(id:id,x:Double(point.x),y:Double(point.y),time:time)
        }
        board.moved={ [weak self] id,point,time in
            guard let self=self else{return}
            if self.state?.acceptsTouch != true {self.gesture.invalidate();return}
            self.perform(self.gesture.move(id:id,x:Double(point.x),y:Double(point.y),time:time))
        }
        board.ended={ [weak self] id,point,time in
            guard let self=self else{return}
            if self.state?.acceptsTouch != true {self.gesture.cancel(id:id);return}
            self.perform(self.gesture.end(id:id,x:Double(point.x),y:Double(point.y),time:time))
        }
        board.cancelled={ [weak self] id in self?.gesture.cancel(id:id) }
        if campaign { send(["type":"snapshot"]);options.accessibilityLabel="Battle actions" } else { restart() }
        frameTarget.owner=self;let clock=CADisplayLink(target:frameTarget,selector:#selector(FrameTarget.update(_:)));clock.add(to:.main,forMode:.common);self.clock=clock
    }
    override func viewDidLayoutSubviews() {super.viewDidLayoutSubviews();scene.size=board.bounds.size;if let state=state {scene.render(state)}}
    deinit {clock?.invalidate()}

    private func restart() {
        gesture.cancelAll();lastFrame=0;reportedError=false
        do {engine=try BattleEngine();send(["type":"start","school":school,"rank":rank,"seed":Int.random(in:1...1000000)])}
        catch {fail(error)}
    }
    func frame(_ link:CADisplayLink) {
        guard state != nil else{return}
        let ms=lastFrame == 0 ? 0 : min(100,(link.timestamp-lastFrame)*1000);lastFrame=link.timestamp
        if state?.acceptsTouch == true {perform(gesture.tick(time:link.timestamp))}
        send(["type":"step","ms":ms])
    }
    private func perform(_ actions:[NativeAction]) {
        for action in actions {send(["type":"input","action":action.rawValue,"pieceID":gesturePieceID])}
        if !actions.isEmpty {onCheckpoint?()}
    }
    private func send(_ command:[String:Any]) {
        guard let engine=engine else{return}
        do {adopt(try engine.send(command))} catch {fail(error)}
    }
    private func adopt(_ next:BattleState) {
        if next.pieceID != state?.pieceID || !next.acceptsTouch {gesture.invalidate()}
        if state?.paused != next.paused {lastFrame=0}
        if next.width != state?.width {
            boardRatio?.isActive=false
            boardRatio=board.heightAnchor.constraint(equalTo:board.widthAnchor,multiplier:CGFloat(next.height)/CGFloat(next.width));boardRatio?.isActive=true
        }
        state=next
        mana.spells=next.spells
        manaHeight?.constant=next.spells.isEmpty ? 0:42
        clock?.isPaused=next.paused || (next.status != "ongoing" && !next.busy)
        scene.render(next)
        if next.paused && !next.ready {board.accessibilityValue="Paused"}
        else if let piece=next.active {board.accessibilityValue="\(piece.name), column \((piece.x ?? 0)+1), row \((piece.y ?? 0)+1)"}
        let spellKey=next.spells.map { "\($0.id):\($0.rank):\($0.mana):\($0.cost)" }.joined(separator:";")
        let nextKey=next.next.map { $0.name + $0.colors.joined() }.joined()
        let objectiveKey="\(next.effect?.school ?? ""):\(next.effect?.rank ?? 0):\(next.objective?.label ?? ""):\(next.objective?.counter ?? ""):\(next.objective?.piecesLeft ?? -1)"
        let newHUDKey="\(objectiveKey):\(next.heroHP):\(next.enemyHP):\(next.paused):\(next.ready):\(next.busy):\(next.status):\(next.lines):\(next.pausesLeft):\(spellKey):\(nextKey):\(next.enemyMove):\(Int(ceil(next.enemyRemainingMs/1000)))"
        guard newHUDKey != hudKey else{return}
        hudKey=newHUDKey
        health.text=next.enemyMaxHP > 0 ? "YOU \(next.heroHP)/\(next.heroMaxHP)   \(next.title ?? "SLIME") \(next.enemyHP)/\(next.enemyMaxHP)" : "YOU \(next.heroHP)/\(next.heroMaxHP) · \(next.title ?? "Challenge")"
        pause.setImage(UIImage(systemName:next.paused ? "play.fill":"pause.fill"),for:.normal)
        pause.accessibilityLabel=next.paused ? "Resume":"Pause"
        if campaign && next.status != "ongoing" {pause.setImage(UIImage(systemName:"checkmark"),for:.normal);pause.accessibilityLabel="Return to campaign"}
        pause.isEnabled = campaign && next.status != "ongoing" || !next.ready && next.status == "ongoing" && (next.paused || next.pausesLeft > 0)
        pause.accessibilityValue="\(next.pausesLeft) pauses remaining"
        if next.status != "ongoing" {status.text=campaign ? (next.status == "won" ? "Complete · Tap ✓ to continue":"Attempt over · Tap ✓ or correct in Battle actions") : (next.status == "won" ? "Slime defeated · Tap settings to play again":"Battle over · Tap settings to try again")}
        else if next.ready {status.text=campaign ? (next.objective?.label ?? "Drag to move · Tap to rotate · Flick ↓ to drop") : "Drag to move · Tap to rotate · Flick ↓ to drop"}
        else if next.paused {status.text="Paused"}
        else if let spell=next.spells.first {
            let name=Self.names[spell.id] ?? spell.id
            status.text="\(name) \(spell.rank) · \(spell.mana)/\(spell.cost) mana · \(next.busy ? "CASTING":"AUTO")"
        } else {status.text="\(next.enemyMove) · \(Int(ceil(next.enemyRemainingMs/1000)))s"}
        if campaign && next.status == "ongoing" && !next.ready {
            if next.paused {status.text="Paused"}
            else if let effect=next.effect {status.text="\(Self.names[effect.school] ?? effect.school) · Level \(effect.rank)"}
            else if next.objective?.label == next.title && next.enemyMaxHP>0 {status.text="\(next.enemyMove) · \(Int(ceil(next.enemyRemainingMs/1000)))s"}
            else {status.text=[next.objective?.label,next.objective?.counter,next.objective?.piecesLeft.map { "\($0) pieces left" }].compactMap{$0}.joined(separator:" · ")}
        }
        preview.pieces=next.paused && !next.ready ? [] : next.next;preview.lines=next.lines
    }
    func suspend() {gesture.cancelAll();lastFrame=0;send(["type":"pause","paused":true,"system":true]);onCheckpoint?()}
    @objc private func togglePause() {if campaign && state?.status != "ongoing" {onContinue?();return};gesture.cancelAll();send(["type":"pause","paused":!(state?.paused ?? false)])}
    @objc private func showOptions() {
        suspend()
        if campaign {onOptions?();return}
        let sheet=PlaytestOptions(school:school,rank:rank)
        sheet.onStart={ [weak self] school,rank in self?.school=school;self?.rank=rank;self?.restart() }
        let navigation=UINavigationController(rootViewController:sheet)
        navigation.modalPresentationStyle = .pageSheet
        if let presentation=navigation.sheetPresentationController {presentation.detents=[.medium(),.large()];presentation.prefersGrabberVisible=true}
        present(navigation,animated:true)
    }
    private func fail(_ error:Error) {
        gesture.cancelAll();state=nil
        guard !reportedError else{return};reportedError=true
        let alert=UIAlertController(title:"Playtest paused",message:error.localizedDescription,preferredStyle:.alert)
        alert.addAction(UIAlertAction(title:campaign ? "Return":"Try again",style:.default){[weak self]_ in guard let self=self else{return};if self.campaign {self.onOptions?()} else {self.restart()}})
        DispatchQueue.main.async { [weak self] in self?.present(alert,animated:true) }
    }
    static let names=["none":"No spells","fire":"Fire","blizzard":"Ice","quake":"Gravity","gale":"Wind","thunder":"Lightning","natureConvert":"Nature"]
}

private final class PlaytestOptions:UITableViewController {
    private let schools=["none","fire","blizzard","quake","gale","thunder","natureConvert"]
    private var school:String,rank:Int
    var onStart:((String,Int)->Void)?
    init(school:String,rank:Int){self.school=school;self.rank=rank;super.init(style:.insetGrouped)}
    required init?(coder:NSCoder){fatalError("Use init(school:rank:)")}
    override func viewDidLoad(){super.viewDidLoad();title="Native controls playtest";navigationItem.rightBarButtonItem=UIBarButtonItem(title:"Start",style:.done,target:self,action:#selector(start));navigationItem.leftBarButtonItem=UIBarButtonItem(title:"Back",style:.plain,target:self,action:#selector(close))}
    override func numberOfSections(in tableView:UITableView)->Int{2}
    override func tableView(_ tableView:UITableView,numberOfRowsInSection section:Int)->Int{section == 0 ? schools.count:4}
    override func tableView(_ tableView:UITableView,titleForHeaderInSection section:Int)->String?{section == 0 ? "Test spell · campaign progress is separate":"Learned rank"}
    override func tableView(_ tableView:UITableView,cellForRowAt indexPath:IndexPath)->UITableViewCell{
        let cell=UITableViewCell(style:.default,reuseIdentifier:nil)
        let selected=indexPath.section == 0 ? schools[indexPath.row] == school:indexPath.row+1 == rank
        cell.textLabel?.text=indexPath.section == 0 ? BattleViewController.names[schools[indexPath.row]]:"Level \(indexPath.row+1)"
        cell.accessoryType=selected ? .checkmark:.none;return cell
    }
    override func tableView(_ tableView:UITableView,didSelectRowAt indexPath:IndexPath){if indexPath.section == 0{school=schools[indexPath.row]}else{rank=indexPath.row+1};tableView.reloadData()}
    @objc private func start(){let callback=onStart,school=school,rank=rank;dismiss(animated:true){callback?(school,rank)}}
    @objc private func close(){dismiss(animated:true)}
}

private final class NativeManaView:UIView {
    var spells:[NativeSpell]=[] {didSet {setNeedsDisplay();isAccessibilityElement=true;accessibilityLabel=spells.map { "\(BattleViewController.names[$0.id] ?? $0.id) level \($0.rank), \($0.mana) of \($0.cost) mana" }.joined(separator:". ")}}
    override func draw(_ rect:CGRect) {
        guard !spells.isEmpty,let ctx=UIGraphicsGetCurrentContext() else{return}
        let colors:[String:UIColor]=["fire":.systemRed,"water":.systemBlue,"earth":.systemOrange,"wind":.systemTeal,"lightning":.systemYellow,"nature":.systemGreen,"arcane":.systemPurple]
        let width=bounds.width/CGFloat(spells.count)
        for (index,spell) in spells.enumerated() {
            let x=CGFloat(index)*width+3,w=width-6,color=colors[spell.element] ?? .white
            let title="\(BattleViewController.names[spell.id] ?? spell.id) \(spell.rank)"
            let attributes:[NSAttributedString.Key:Any]=[.font:UIFont.systemFont(ofSize:11,weight:.semibold),.foregroundColor:color]
            (title as NSString).draw(in:CGRect(x:x,y:0,width:w,height:14),withAttributes:attributes)
            ctx.setFillColor(UIColor(white:0.2,alpha:1).cgColor);ctx.fill(CGRect(x:x,y:17,width:w,height:5))
            ctx.setFillColor(color.cgColor);ctx.fill(CGRect(x:x,y:17,width:w*min(1,CGFloat(spell.mana)/CGFloat(max(1,spell.cost))),height:5))
            ("\(spell.mana)/\(spell.cost)" as NSString).draw(in:CGRect(x:x,y:25,width:w,height:13),withAttributes:[.font:UIFont.monospacedDigitSystemFont(ofSize:10,weight:.regular),.foregroundColor:UIColor.lightGray])
        }
    }
}
