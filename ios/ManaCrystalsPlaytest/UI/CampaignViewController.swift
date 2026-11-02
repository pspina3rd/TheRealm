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
        location.textColor = TomeTheme.paper; location.font = UIFontMetrics(forTextStyle:.subheadline).scaledFont(for:TomeTheme.font(15));location.adjustsFontForContentSizeCategory=true;location.numberOfLines=2
        menuButton.setImage(UIImage(systemName:"book.closed"),for:.normal);menuButton.tintColor = TomeTheme.gold
        menuButton.layer.borderColor=TomeTheme.gold.withAlphaComponent(0.65).cgColor;menuButton.layer.borderWidth=1;menuButton.layer.cornerRadius=6
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
            controller.isModalInPresentation=true;controller.modalPresentationStyle = .fullScreen
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
        direction=nil;tomeController?.resetSubmission();panelController?.resetSubmission()
        let alert=UIAlertController(title:"Campaign paused",message:error.localizedDescription,preferredStyle:.alert)
        alert.addAction(UIAlertAction(title:"OK",style:.default))
        ((tomeController as UIViewController?) ?? panelController ?? battleController ?? self).present(alert,animated:true)
    }
}

/// Campaign actions read as entries in the same in-world book as the story.
/// The table stays native so VoiceOver, large text and scrolling retain system behavior.
private final class CampaignPanelController: UITableViewController {
    private var panel:CampaignPanel
    private var headerWidth:CGFloat=0
    private var submitting=false
    private var renderedPanel:CampaignPanel?
    private var renderedOverview:CampaignOverview?
    var overview:CampaignOverview?
    var onChoice:((String)->Void)?
    init(panel:CampaignPanel) {self.panel=panel;super.init(style:.insetGrouped)}
    required init?(coder:NSCoder){fatalError("Use init(panel:)")}
    override var supportedInterfaceOrientations:UIInterfaceOrientationMask{.portrait}
    override func viewDidLoad() {
        super.viewDidLoad()
        tableView.accessibilityIdentifier="campaign-dialog"
        tableView.backgroundView=TomePaperView();tableView.backgroundColor = TomeTheme.paper
        tableView.separatorStyle = .none;tableView.estimatedRowHeight=60
        tableView.rowHeight=UITableView.automaticDimension;tableView.sectionHeaderHeight=8;tableView.sectionFooterHeight=16
        tableView.contentInset=UIEdgeInsets(top:8,left:8,bottom:16,right:8)
        tableView.indicatorStyle = .black
        update(panel)
    }
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        let width=tableView.bounds.width-tableView.adjustedContentInset.left-tableView.adjustedContentInset.right
        if abs(width-headerWidth)>0.5 {buildHeader(width:width)}
    }
    override func traitCollectionDidChange(_ previousTraitCollection:UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        if previousTraitCollection?.preferredContentSizeCategory != traitCollection.preferredContentSizeCategory {
            headerWidth=0;tableView.reloadData();view.setNeedsLayout()
        }
    }
    func resetSubmission() {submitting=false}
    private func unchanged(_ next:CampaignPanel)->Bool {
        guard let old=renderedPanel,old.title==next.title,old.text==next.text,old.actions.count==next.actions.count,
              zip(old.actions,next.actions).allSatisfy({ $0.id==$1.id && $0.label==$1.label && $0.enabled==$1.enabled }) else{return false}
        switch (renderedOverview,overview) {
        case (nil,nil):return true
        case let (a?,b?):return a.x==b.x && a.y==b.y && a.tiles==b.tiles && a.sites.count==b.sites.count && zip(a.sites,b.sites).allSatisfy({$0.x==$1.x && $0.y==$1.y && $0.name==$1.name})
        default:return false
        }
    }
    func update(_ panel:CampaignPanel) {
        submitting=false
        if isViewLoaded && unchanged(panel) {return}
        self.panel=panel;loadViewIfNeeded();renderedPanel=panel;renderedOverview=overview
        buildHeader(width:tableView.bounds.width-tableView.adjustedContentInset.left-tableView.adjustedContentInset.right)
        tableView.reloadData();tableView.setContentOffset(CGPoint(x:0,y:-tableView.adjustedContentInset.top),animated:false)
        UIAccessibility.post(notification:.screenChanged,argument:tableView.tableHeaderView?.viewWithTag(701))
    }
    private func buildHeader(width:CGFloat) {
        guard width>0 else{return};headerWidth=width
        let title=UILabel();title.tag=701;title.numberOfLines=0;title.text=panel.title;title.textAlignment = .center
        title.textColor=TomeTheme.ink;title.font=UIFontMetrics(forTextStyle:.title1).scaledFont(for:TomeTheme.font(27));title.adjustsFontForContentSizeCategory=true;title.accessibilityTraits.insert(.header)
        let rule=UIView();rule.backgroundColor=TomeTheme.gold.withAlphaComponent(0.65);rule.heightAnchor.constraint(equalToConstant:1).isActive=true;rule.isAccessibilityElement=false
        let text=UILabel();text.numberOfLines=0;text.text=panel.text;text.font=UIFontMetrics(forTextStyle:.body).scaledFont(for:TomeTheme.font(17));text.adjustsFontForContentSizeCategory=true;text.textColor=TomeTheme.ink
        let stack=UIStackView(arrangedSubviews:[title,rule,text]);stack.axis = .vertical;stack.spacing=16;stack.translatesAutoresizingMaskIntoConstraints=false
        if let overview=overview {
            let map=UIImageView(image:Self.mapImage(overview));map.contentMode = .scaleAspectFit
            map.layer.borderColor=TomeTheme.gold.cgColor;map.layer.borderWidth=1;map.layer.cornerRadius=4;map.clipsToBounds=true
            map.heightAnchor.constraint(equalTo:map.widthAnchor).isActive=true
            map.isAccessibilityElement=true;map.accessibilityLabel="Map of Sevenstones. Current position, \(overview.x), \(overview.y). North is up."
            stack.addArrangedSubview(map)
        }
        let container=UIView(frame:CGRect(x:0,y:0,width:width,height:1));container.backgroundColor = .clear;container.addSubview(stack)
        NSLayoutConstraint.activate([stack.leadingAnchor.constraint(equalTo:container.leadingAnchor,constant:28),stack.trailingAnchor.constraint(equalTo:container.trailingAnchor,constant:-28),stack.topAnchor.constraint(equalTo:container.topAnchor,constant:24),stack.bottomAnchor.constraint(equalTo:container.bottomAnchor,constant:-20)])
        container.frame.size.height=container.systemLayoutSizeFitting(CGSize(width:width,height:0),withHorizontalFittingPriority:.required,verticalFittingPriority:.fittingSizeLevel).height
        tableView.tableHeaderView=container
    }
    private static func mapImage(_ data:CampaignOverview)->UIImage {
        let format=UIGraphicsImageRendererFormat();format.scale=2
        return UIGraphicsImageRenderer(size:CGSize(width:512,height:512),format:format).image { renderer in
            let ctx=renderer.cgContext
            TomeTheme.paper.setFill();ctx.fill(CGRect(x:0,y:0,width:512,height:512))
            let colors: [Character:UIColor]=[
                "~":UIColor(red:0.34,green:0.53,blue:0.58,alpha:1),
                "T":UIColor(red:0.24,green:0.37,blue:0.26,alpha:1),
                "^":UIColor(red:0.48,green:0.45,blue:0.39,alpha:1),
                "=":UIColor(red:0.62,green:0.48,blue:0.32,alpha:1),
                "o":TomeTheme.paper,"!":UIColor(red:0.62,green:0.25,blue:0.18,alpha:1),
                "B":TomeTheme.gold,"L":UIColor(red:0.72,green:0.45,blue:0.23,alpha:1)]
            for (y,row) in data.tiles.enumerated() {for (x,tile) in row.enumerated() {
                ctx.setFillColor((colors[tile] ?? UIColor(red:0.60,green:0.65,blue:0.44,alpha:1)).cgColor);ctx.fill(CGRect(x:CGFloat(x*2),y:CGFloat(y*2),width:2,height:2))
            }}
            for site in data.sites {
                ctx.setFillColor(TomeTheme.paper.cgColor);ctx.fillEllipse(in:CGRect(x:CGFloat(site.x*2-3),y:CGFloat(site.y*2-3),width:6,height:6))
                (site.name as NSString).draw(at:CGPoint(x:CGFloat(max(0,min(390,site.x*2-15))),y:CGFloat(site.y*2+5)),withAttributes:[.font:TomeTheme.font(10),.foregroundColor:TomeTheme.ink,.backgroundColor:TomeTheme.paper.withAlphaComponent(0.92)])
            }
            let marker=CGRect(x:CGFloat(data.x*2-5),y:CGFloat(data.y*2-5),width:10,height:10)
            ctx.setFillColor(TomeTheme.gold.cgColor);ctx.fillEllipse(in:marker);ctx.setStrokeColor(TomeTheme.ink.cgColor);ctx.setLineWidth(2);ctx.strokeEllipse(in:marker)
        }
    }
    override func tableView(_ tableView:UITableView,numberOfRowsInSection section:Int)->Int {panel.actions.count}
    override func tableView(_ tableView:UITableView,cellForRowAt indexPath:IndexPath)->UITableViewCell {
        let choice=panel.actions[indexPath.row],cell=UITableViewCell(style:.default,reuseIdentifier:nil)
        cell.backgroundColor=TomeTheme.paper.withAlphaComponent(0.72)
        cell.contentView.layer.borderWidth=1;cell.contentView.layer.borderColor=TomeTheme.gold.withAlphaComponent(0.55).cgColor;cell.contentView.layer.cornerRadius=5
        cell.contentView.directionalLayoutMargins=NSDirectionalEdgeInsets(top:15,leading:18,bottom:15,trailing:18)
        cell.textLabel?.text=choice.label;cell.textLabel?.numberOfLines=0;cell.textLabel?.font=UIFontMetrics(forTextStyle:.body).scaledFont(for:TomeTheme.font(18));cell.textLabel?.adjustsFontForContentSizeCategory=true
        cell.textLabel?.textColor=choice.enabled ? TomeTheme.ink:TomeTheme.ink.withAlphaComponent(0.45)
        cell.isUserInteractionEnabled=choice.enabled;cell.accessibilityIdentifier="campaign-choice-\(indexPath.row)";cell.accessibilityTraits.insert(.button)
        if !choice.enabled {cell.accessibilityTraits.insert(.notEnabled)}
        let selected=UIView();selected.backgroundColor=TomeTheme.gold.withAlphaComponent(0.3);cell.selectedBackgroundView=selected
        cell.contentView.heightAnchor.constraint(greaterThanOrEqualToConstant:52).isActive=true
        return cell
    }
    override func tableView(_ tableView:UITableView,willSelectRowAt indexPath:IndexPath)->IndexPath? {panel.actions[indexPath.row].enabled && !submitting ? indexPath:nil}
    override func tableView(_ tableView:UITableView,didSelectRowAt indexPath:IndexPath) {
        guard !submitting,panel.actions[indexPath.row].enabled else{return}
        submitting=true;onChoice?(panel.actions[indexPath.row].id)
    }
}
