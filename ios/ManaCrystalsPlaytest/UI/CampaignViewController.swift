import UIKit

/// Native campaign shell. All progression, collision, conversations and encounters use the shared rules.
final class CampaignViewController: UIViewController {
    private let world = CampaignWorldView()
    private let location = UILabel()
    private let menuButton = UIButton(type: .system)
    private var engine: BattleEngine?
    private var state: CampaignState?
    private var walker: Timer?
    private var direction: String?
    private var battleController: BattleViewController?
    private var panelController: CampaignPanelController?
    private var tomeController:TomeViewController?
    private var transitioning=false
    private var titleStack: UIStackView?
    private let saveKey = "native-campaign-v1"
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .portrait }
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red:0.035,green:0.045,blue:0.085,alpha:1)
        location.textColor = .white; location.font = .systemFont(ofSize:15,weight:.semibold);location.numberOfLines=2
        menuButton.setImage(UIImage(systemName:"line.3.horizontal"),for:.normal);menuButton.tintColor = .white
        menuButton.accessibilityLabel="Campaign menu";menuButton.accessibilityIdentifier="campaign-menu"
        menuButton.addTarget(self,action:#selector(menu),for:.touchUpInside)
        let header=UIStackView(arrangedSubviews:[location,menuButton]);header.spacing=8;header.alignment = .center
        header.translatesAutoresizingMaskIntoConstraints=false;world.translatesAutoresizingMaskIntoConstraints=false
        view.addSubview(header);view.addSubview(world)
        let safe=view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            menuButton.widthAnchor.constraint(equalToConstant:44),menuButton.heightAnchor.constraint(equalToConstant:44),
            header.leadingAnchor.constraint(equalTo:safe.leadingAnchor,constant:16),header.trailingAnchor.constraint(equalTo:safe.trailingAnchor,constant:-12),header.topAnchor.constraint(equalTo:safe.topAnchor),
            world.topAnchor.constraint(equalTo:header.bottomAnchor),world.bottomAnchor.constraint(equalTo:safe.bottomAnchor),world.leadingAnchor.constraint(equalTo:safe.leadingAnchor),world.trailingAnchor.constraint(equalTo:safe.trailingAnchor)
        ])
        world.onTap={ [weak self] x,y in self?.direction=nil;self?.send(["type":"walkTo","x":x,"y":y]) }
        world.onDirection={ [weak self] direction in
            guard let self=self,direction != self.direction else{return};self.direction=direction
            if let direction=direction { self.send(["type":"stopWalking"]);self.send(["type":"move","direction":direction]) }
        }
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--reset-campaign-ui-test") {UserDefaults.standard.removeObject(forKey:saveKey)}
        #endif
        do {engine=try BattleEngine();showTitle()} catch {fail(error)}
        walker=Timer.scheduledTimer(withTimeInterval:0.13,repeats:true) { [weak self] _ in
            guard let self=self,self.state?.mode=="world",self.state?.panel==nil,self.presentedViewController==nil else{return}
            if let direction=self.direction {self.send(["type":"move","direction":direction])}
            else if self.state?.walking==true {self.send(["type":"walkStep"])}
        }
        if let walker=walker {RunLoop.main.add(walker,forMode:.common)}
    }
    deinit {walker?.invalidate()}
    private func showTitle() {
        titleStack?.removeFromSuperview();world.isHidden=true;world.isPaused=true;menuButton.isHidden=true;location.text="Mana Crystals"
        let stack=UIStackView();stack.axis = .vertical;stack.spacing=14;stack.translatesAutoresizingMaskIntoConstraints=false
        let title=UILabel();title.text="The Book of Sevenstones";title.textColor=TomeTheme.gold;title.font=TomeTheme.font(27);title.textAlignment = .center;title.numberOfLines=2;stack.addArrangedSubview(title)
        if let saved=UserDefaults.standard.string(forKey:saveKey) {
            let button=UIButton(type:.system);button.setTitle("Continue campaign",for:.normal);button.setTitleColor(TomeTheme.paper,for:.normal);button.titleLabel?.font=TomeTheme.font(18);button.heightAnchor.constraint(equalToConstant:48).isActive=true
            button.addAction(UIAction{[weak self]_ in self?.send(["type":"load","save":saved])},for:.touchUpInside);stack.addArrangedSubview(button)
        }
        let heroes=[("Fern","Mossvale","ranger"),("Lance","Cairnwick","knight"),("Ares","Merehaven","mage"),("Vex","Bramblecross","rogue")]
        for row in 0..<2 {
            let line=UIStackView();line.axis = .horizontal;line.distribution = .fillEqually;line.spacing=12
            for item in heroes[(row*2)..<(row*2+2)] {
                guard let actor=try? engine?.heroBook(item.2).first?.actors.first else{continue}
                let button=TomeHeroButton(name:item.0,home:item.1,actor:actor);button.accessibilityIdentifier="hero-\(item.2)"
                button.addAction(UIAction{[weak self]_ in self?.showHeroBook(item.2)},for:.touchUpInside);line.addArrangedSubview(button)
            };stack.addArrangedSubview(line)
        }
        let note=UILabel();note.text="Choose a hero. Open their story.";note.textColor=TomeTheme.paper;note.font=TomeTheme.font(15);note.textAlignment = .center;stack.addArrangedSubview(note)
        view.addSubview(stack);titleStack=stack
        NSLayoutConstraint.activate([stack.centerYAnchor.constraint(equalTo:view.safeAreaLayoutGuide.centerYAnchor),stack.leadingAnchor.constraint(equalTo:view.safeAreaLayoutGuide.leadingAnchor,constant:22),stack.trailingAnchor.constraint(equalTo:view.safeAreaLayoutGuide.trailingAnchor,constant:-22)])
    }
    private func showHeroBook(_ classID:String) {
        do {
            guard let pages=try engine?.heroBook(classID),let first=pages.first else{return}
            var index=0
            func choices()->[CampaignChoice] {
                var list:[CampaignChoice]=[]
                if index>0 {list.append(CampaignChoice(id:"previous",label:"Previous page",enabled:true))}
                list.append(CampaignChoice(id:"next",label:index+1==pages.count ? "Begin adventure":"Next page",enabled:true))
                list.append(CampaignChoice(id:"close",label:"Return to heroes",enabled:true));return list
            }
            let book=TomeViewController(page:first,choices:choices())
            book.onChoice={ [weak self,weak book] action in
                guard let self=self,let book=book else{return}
                if action=="close" {book.dismiss(animated:true);return}
                if action=="previous" {index=max(0,index-1);book.update(pages[index],choices:choices());return}
                if index+1<pages.count {index+=1;book.update(pages[index],choices:choices());return}
                book.dismiss(animated:true) { [weak self] in self?.beginHero(classID) }
            }
            present(book,animated:true)
        } catch {fail(error)}
    }
    private func beginHero(_ id:String) {
        if UserDefaults.standard.string(forKey:saveKey) != nil {
            let alert=UIAlertController(title:"Start a new campaign?",message:"Your existing native campaign will be replaced.",preferredStyle:.alert)
            alert.addAction(UIAlertAction(title:"Cancel",style:.cancel));alert.addAction(UIAlertAction(title:"Start new campaign",style:.destructive){[weak self]_ in self?.send(["type":"start","classId":id])});present(alert,animated:true)
        }else{send(["type":"start","classId":id])}
    }
    @objc private func menu() {direction=nil;send(["type":"menu"])}
    private func send(_ command:[String:Any]) {
        guard let engine=engine else{return}
        do {adopt(try engine.campaign(command))} catch {fail(error)}
    }
    private func adopt(_ next:CampaignState) {
        state=next
        if let save=next.save {UserDefaults.standard.set(save,forKey:saveKey)}
        if transitioning {return}
        if let book=tomeController,next.panel?.tome==nil {
            tomeController=nil;transitioning=true
            book.dismiss(animated:false){[weak self] in self?.transitioning=false;self?.adopt(next)};return
        }
        if let page=next.panel?.tome,let panel=next.panel {
            direction=nil;world.cancelMovement();world.isPaused=true
            if let old=panelController {
                panelController=nil;transitioning=true
                old.dismiss(animated:false){[weak self] in self?.transitioning=false;self?.adopt(next)};return
            }
            if let book=tomeController {book.update(page,choices:panel.actions);return}
            let book=TomeViewController(page:page,choices:panel.actions);tomeController=book
            book.onChoice={ [weak self] id in self?.send(["type":"action","id":id]) }
            ((battleController as UIViewController?) ?? self).present(book,animated:true);return
        }
        world.isPaused=next.mode != "world"
        if next.mode=="title" {panelController?.dismiss(animated:true);panelController=nil;showTitle();return}
        titleStack?.removeFromSuperview();titleStack=nil;world.isHidden=false;menuButton.isHidden=false
        let headerText="\(next.location)\n\(next.heroName) · \(next.hp)/\(next.maxHP) HP"
        if location.text != headerText {location.text=headerText}
        if let data=next.world {world.state=data}
        if next.panel != nil || next.mode=="battle" {direction=nil}
        if next.mode != "battle",let battle=battleController {
            if let panel=panelController {
                panelController=nil;transitioning=true
                panel.dismiss(animated:false) { [weak self] in self?.transitioning=false;self?.adopt(next) };return
            }
            battleController=nil;transitioning=true
            battle.dismiss(animated:true) { [weak self] in self?.transitioning=false;self?.adopt(next) };return
        }
        if next.mode=="battle",battleController==nil,let engine=engine {
            if let panel=panelController {
                panelController=nil;transitioning=true
                panel.dismiss(animated:false) { [weak self] in self?.transitioning=false;self?.adopt(next) };return
            }
            let battle=BattleViewController(campaignEngine:engine);battle.modalPresentationStyle = .fullScreen
            battle.onCheckpoint={ [weak self] in self?.checkpoint() }
            battle.onOptions={ [weak self] in self?.send(["type":"battleMenu"]) }
            battle.onContinue={ [weak self, weak battle] in
                guard let self=self else{return}
                battle?.dismiss(animated:true) {self.battleController=nil;self.send(["type":"finishBattle"])}
            }
            battleController=battle;present(battle,animated:true);return
        }
        if let panel=next.panel {
            if let controller=panelController {controller.overview=next.overview;controller.update(panel);return}
            let controller=CampaignPanelController(panel:panel)
            controller.overview=next.overview
            controller.onChoice={ [weak self] id in self?.send(["type":"action","id":id]) }
            controller.isModalInPresentation=true;controller.modalPresentationStyle = .pageSheet
            if let sheet=controller.sheetPresentationController {sheet.detents=[.medium(),.large()];sheet.prefersGrabberVisible=false}
            panelController=controller
            ((battleController as UIViewController?) ?? self).present(controller,animated:true)
        } else if let controller=panelController {
            controller.dismiss(animated:true);panelController=nil
            battleController?.refreshCampaignState()
        }
    }
    private func checkpoint() {
        // Serialize the shared hero after native inputs and before suspension; never replace the battle controller here.
        guard let next=try? engine?.campaign(["type":"checkpoint"]) else{return}
        if let save=next.save {UserDefaults.standard.set(save,forKey:saveKey)}
    }
    func suspend() {direction=nil;world.cancelMovement();send(["type":"stopWalking"]);battleController?.suspend();checkpoint()}
    private func fail(_ error:Error) {
        direction=nil;tomeController?.resetSubmission()
        let alert=UIAlertController(title:"Campaign paused",message:error.localizedDescription,preferredStyle:.alert)
        alert.addAction(UIAlertAction(title:"OK",style:.default))
        ((tomeController as UIViewController?) ?? panelController ?? battleController ?? self).present(alert,animated:true)
    }
}

private final class CampaignPanelController: UITableViewController {
    private var panel:CampaignPanel
    var overview:CampaignOverview?
    var onChoice:((String)->Void)?
    init(panel:CampaignPanel) {self.panel=panel;super.init(style:.insetGrouped)}
    required init?(coder:NSCoder){fatalError("Use init(panel:)")}
    override func viewDidLoad() {super.viewDidLoad();tableView.accessibilityIdentifier="campaign-dialog";tableView.estimatedRowHeight=64;tableView.rowHeight=UITableView.automaticDimension;update(panel)}
    func update(_ panel:CampaignPanel) {
        self.panel=panel;loadViewIfNeeded()
        let header=UILabel();header.numberOfLines=0;header.text="\(panel.title)\n\n\(panel.text)";header.font = .preferredFont(forTextStyle:.body);header.adjustsFontForContentSizeCategory=true
        let width=max(200,view.bounds.width-40);let size=header.sizeThatFits(CGSize(width:width,height:.greatestFiniteMagnitude))
        let container=UIView(frame:CGRect(x:0,y:0,width:width+40,height:size.height+36));header.frame=CGRect(x:20,y:18,width:width,height:size.height);container.addSubview(header)
        if let overview=overview {
            let map=UIImageView(image:Self.mapImage(overview));map.contentMode = .scaleAspectFit
            map.frame=CGRect(x:20,y:container.bounds.height,width:width,height:width)
            container.addSubview(map);container.frame.size.height += width+12
        }
        tableView.tableHeaderView=container;tableView.reloadData();tableView.setContentOffset(.zero,animated:false)
        UIAccessibility.post(notification:.screenChanged,argument:header)
    }
    private static func mapImage(_ data:CampaignOverview)->UIImage {
        let format=UIGraphicsImageRendererFormat();format.scale=2
        return UIGraphicsImageRenderer(size:CGSize(width:512,height:512),format:format).image { renderer in
            let ctx=renderer.cgContext
            for (y,row) in data.tiles.enumerated() {for (x,tile) in row.enumerated() {
                let colors: [Character:UIColor]=["~":.systemBlue,"T":UIColor(red:0.16,green:0.32,blue:0.23,alpha:1),"^":.systemGray,"=":.systemBrown,"o":.lightGray,"!":.systemRed,"B":.systemYellow,"L":.systemOrange]
                ctx.setFillColor((colors[tile] ?? UIColor(red:0.48,green:0.6,blue:0.4,alpha:1)).cgColor);ctx.fill(CGRect(x:CGFloat(x*2),y:CGFloat(y*2),width:2,height:2))
            }}
            for site in data.sites {
                ctx.setFillColor(UIColor.white.cgColor);ctx.fillEllipse(in:CGRect(x:CGFloat(site.x*2-3),y:CGFloat(site.y*2-3),width:6,height:6))
                (site.name as NSString).draw(at:CGPoint(x:CGFloat(max(0,min(390,site.x*2-15))),y:CGFloat(site.y*2+5)),withAttributes:[.font:UIFont.systemFont(ofSize:10,weight:.bold),.foregroundColor:UIColor.white,.backgroundColor:UIColor.black.withAlphaComponent(0.7)])
            }
            ctx.setFillColor(UIColor.systemYellow.cgColor);ctx.fillEllipse(in:CGRect(x:CGFloat(data.x*2-4),y:CGFloat(data.y*2-4),width:8,height:8))
        }
    }
    override func tableView(_ tableView:UITableView,numberOfRowsInSection section:Int)->Int {panel.actions.count}
    override func tableView(_ tableView:UITableView,cellForRowAt indexPath:IndexPath)->UITableViewCell {
        let choice=panel.actions[indexPath.row],cell=UITableViewCell(style:.default,reuseIdentifier:nil)
        cell.textLabel?.text=choice.label;cell.textLabel?.numberOfLines=0;cell.textLabel?.font = .preferredFont(forTextStyle:.body)
        cell.textLabel?.textColor=choice.enabled ? .systemBlue:.secondaryLabel;cell.isUserInteractionEnabled=choice.enabled;cell.accessibilityIdentifier="campaign-choice-\(indexPath.row)";return cell
    }
    override func tableView(_ tableView:UITableView,didSelectRowAt indexPath:IndexPath) {onChoice?(panel.actions[indexPath.row].id)}
}

