import UIKit
import SpriteKit

/// The same paper, binding and ink are shared by the character book, story and campaign menus.
enum TomeTheme {
    static let ink=UIColor(red:0.20,green:0.14,blue:0.10,alpha:1)
    static let gold=UIColor(red:0.72,green:0.53,blue:0.25,alpha:1)
    static let paper=UIColor(red:0.94,green:0.88,blue:0.73,alpha:1)
    static func font(_ size:CGFloat)->UIFont {UIFont(name:"Georgia",size:size) ?? .systemFont(ofSize:size)}
}
final class TomePaperView:UIView {
    override func draw(_ rect:CGRect) {
        guard let ctx=UIGraphicsGetCurrentContext() else{return}
        UIColor(red:0.12,green:0.075,blue:0.05,alpha:1).setFill();ctx.fill(bounds)
        let paper=bounds.insetBy(dx:8,dy:8)
        ctx.setShadow(offset:CGSize(width:0,height:3),blur:8,color:UIColor.black.withAlphaComponent(0.45).cgColor)
        TomeTheme.paper.setFill();UIBezierPath(roundedRect:paper,cornerRadius:9).fill();ctx.setShadow(offset:.zero,blur:0,color:nil)
        TomeTheme.gold.withAlphaComponent(0.6).setStroke();UIBezierPath(roundedRect:paper.insetBy(dx:7,dy:7),cornerRadius:5).stroke()
        ctx.setStrokeColor(TomeTheme.ink.withAlphaComponent(0.16).cgColor);ctx.setLineWidth(1)
        for x in [CGFloat(22),CGFloat(26)] {ctx.move(to:CGPoint(x:x,y:20));ctx.addLine(to:CGPoint(x:x,y:bounds.height-20));ctx.strokePath()}
        // Quiet paper fibers and a folded corner; these never animate during world movement.
        ctx.setStrokeColor(TomeTheme.ink.withAlphaComponent(0.025).cgColor)
        stride(from:CGFloat(24),to:bounds.height-20,by:7).forEach {y in ctx.move(to:CGPoint(x:32,y:y));ctx.addLine(to:CGPoint(x:bounds.width-20,y:y));ctx.strokePath()}
        let corner=UIBezierPath();corner.move(to:CGPoint(x:bounds.width-30,y:bounds.height-10));corner.addLine(to:CGPoint(x:bounds.width-10,y:bounds.height-30));corner.addLine(to:CGPoint(x:bounds.width-10,y:bounds.height-10));corner.close();TomeTheme.gold.withAlphaComponent(0.25).setFill();corner.fill()
    }
}

final class TomeViewController:UIViewController {
    private let heading=UILabel(),setting=UILabel(),speaker=UILabel(),body=UILabel(),caption=UILabel()
    private let art=SKView(),buttons=UIStackView(),pageNumber=UILabel()
    private let illustration=TomeIllustration()
    private var page:TomePage,choices:[CampaignChoice]
    private var submitting=false,turning=false
    var onChoice:((String)->Void)?
    init(page:TomePage,choices:[CampaignChoice]){self.page=page;self.choices=choices;super.init(nibName:nil,bundle:nil);modalPresentationStyle = .fullScreen;isModalInPresentation=true}
    required init?(coder:NSCoder){fatalError("Use init(page:choices:)")}
    override var supportedInterfaceOrientations:UIInterfaceOrientationMask{.portrait}
    override func loadView(){view=TomePaperView();view.accessibilityIdentifier="tome-view"}
    override func viewDidLoad(){
        super.viewDidLoad()
        heading.font=UIFontMetrics(forTextStyle:.title2).scaledFont(for:TomeTheme.font(25));heading.adjustsFontForContentSizeCategory=true;heading.textColor=TomeTheme.ink;heading.textAlignment = .center;heading.numberOfLines=0
        setting.font=UIFontMetrics(forTextStyle:.caption1).scaledFont(for:TomeTheme.font(13));setting.adjustsFontForContentSizeCategory=true;setting.textColor=TomeTheme.ink.withAlphaComponent(0.65);setting.textAlignment = .center;setting.numberOfLines=0
        speaker.font=UIFontMetrics(forTextStyle:.headline).scaledFont(for:TomeTheme.font(17));speaker.adjustsFontForContentSizeCategory=true;speaker.textColor=TomeTheme.ink;speaker.numberOfLines=0
        body.font=UIFontMetrics(forTextStyle:.body).scaledFont(for:TomeTheme.font(18));body.textColor=TomeTheme.ink;body.backgroundColor = .clear;body.numberOfLines=0;body.adjustsFontForContentSizeCategory=true
        caption.font = .preferredFont(forTextStyle:.caption1);caption.numberOfLines=0;caption.adjustsFontForContentSizeCategory=true;caption.textColor=TomeTheme.ink.withAlphaComponent(0.7)
        pageNumber.font=TomeTheme.font(12);pageNumber.textColor=TomeTheme.ink.withAlphaComponent(0.55);pageNumber.textAlignment = .center;pageNumber.isAccessibilityElement=false
        art.allowsTransparency=true;art.backgroundColor = .clear;art.isUserInteractionEnabled=false;art.accessibilityIdentifier="tome-illustration";art.preferredFramesPerSecond=30;illustration.scaleMode = .aspectFit;art.presentScene(illustration)
        buttons.axis = .vertical;buttons.spacing=5
        let stack=UIStackView(arrangedSubviews:[heading,setting,art,speaker,body,caption,buttons,pageNumber]);stack.axis = .vertical;stack.spacing=9;stack.translatesAutoresizingMaskIntoConstraints=false
        let scroll=UIScrollView();scroll.translatesAutoresizingMaskIntoConstraints=false;view.addSubview(scroll);scroll.addSubview(stack)
        let safe=view.safeAreaLayoutGuide
        NSLayoutConstraint.activate([
            scroll.leadingAnchor.constraint(equalTo:safe.leadingAnchor,constant:35),scroll.trailingAnchor.constraint(equalTo:safe.trailingAnchor,constant:-24),scroll.topAnchor.constraint(equalTo:safe.topAnchor,constant:16),scroll.bottomAnchor.constraint(equalTo:safe.bottomAnchor,constant:-14),
            stack.leadingAnchor.constraint(equalTo:scroll.contentLayoutGuide.leadingAnchor),stack.trailingAnchor.constraint(equalTo:scroll.contentLayoutGuide.trailingAnchor),stack.topAnchor.constraint(equalTo:scroll.contentLayoutGuide.topAnchor),stack.bottomAnchor.constraint(equalTo:scroll.contentLayoutGuide.bottomAnchor),stack.widthAnchor.constraint(equalTo:scroll.frameLayoutGuide.widthAnchor),
            art.heightAnchor.constraint(equalTo:art.widthAnchor,multiplier:230.0/320.0),body.heightAnchor.constraint(greaterThanOrEqualToConstant:35)
        ])
        NotificationCenter.default.addObserver(self,selector:#selector(motionChanged),name:UIAccessibility.reduceMotionStatusDidChangeNotification,object:nil)
        apply(page,choices:choices,turn:false)
    }
    deinit{NotificationCenter.default.removeObserver(self)}
    private func restoreActionStates(){for (view,choice) in zip(buttons.arrangedSubviews,choices){(view as? UIButton)?.isEnabled=choice.enabled}}
    func resetSubmission(){submitting=false;turning=false;buttons.isUserInteractionEnabled=true;restoreActionStates()}
    @objc private func motionChanged(){illustration.show(page)}
    func update(_ page:TomePage,choices:[CampaignChoice]) {
        if self.page.id==page.id && zip(self.choices,choices).allSatisfy({pair in pair.0.id==pair.1.id && pair.0.enabled==pair.1.enabled && pair.0.label==pair.1.label}) && self.choices.count==choices.count {return}
        let turn=self.page.id != page.id;self.page=page;self.choices=choices;submitting=false;loadViewIfNeeded();apply(page,choices:choices,turn:turn)
    }
    private func apply(_ page:TomePage,choices:[CampaignChoice],turn:Bool){
        let set={ [self] in heading.text=page.title;setting.text=page.setting;speaker.text=page.speaker;body.text=page.dialogue;caption.text=page.caption;caption.isHidden=page.caption.isEmpty;illustration.show(page);art.isAccessibilityElement=true;art.accessibilityLabel=page.actionDescription.isEmpty ? "Illustration: \(page.setting)":page.actionDescription;pageNumber.text="✦  \(page.id.split(separator:":").last.flatMap{Int($0)}.map{String($0+1)} ?? "")  ✦" }
        if turn && !UIAccessibility.isReduceMotionEnabled {
            turning=true;buttons.isUserInteractionEnabled=false
            UIView.transition(with:art,duration:0.28,options:[.transitionFlipFromRight,.allowAnimatedContent],animations:set){[weak self]_ in self?.turning=false;self?.buttons.isUserInteractionEnabled=true;self?.restoreActionStates()}
        }else{set();turning=false;buttons.isUserInteractionEnabled=true}
        buttons.arrangedSubviews.forEach{$0.removeFromSuperview()}
        for choice in choices {
            let button=UIButton(type:.system);button.setTitle(choice.label,for:.normal);button.titleLabel?.font=UIFontMetrics(forTextStyle:.body).scaledFont(for:TomeTheme.font(16));button.titleLabel?.adjustsFontForContentSizeCategory=true;button.titleLabel?.numberOfLines=0;button.setTitleColor(TomeTheme.ink,for:.normal);button.isEnabled=choice.enabled && !turning;button.alpha=choice.enabled ? 1:0.4
            button.heightAnchor.constraint(greaterThanOrEqualToConstant:44).isActive=true;button.layer.borderColor=TomeTheme.gold.withAlphaComponent(0.6).cgColor;button.layer.borderWidth=1;button.layer.cornerRadius=4
            button.addAction(UIAction{[weak self]_ in guard let self=self,!self.submitting,!self.turning else{return};self.submitting=true;self.onChoice?(choice.id)},for:.touchUpInside);buttons.addArrangedSubview(button)
        }
        UIAccessibility.post(notification:.screenChanged,argument:heading)
    }
}

/// Authored scene actions use the same licensed atlas sprites as the world. No stage directions are printed.
private final class TomeIllustration:SKScene {
    private let atlas=NativeAtlas.shared
    private var actors:[String:SKSpriteNode]=[:]
    private var actorOrder:[SKSpriteNode]=[]
    override init(size:CGSize){super.init(size:size);backgroundColor = .clear}
    convenience init(){self.init(size:CGSize(width:320,height:230))}
    required init?(coder:NSCoder){fatalError("Use init(size:)")}
    private var animate:Bool{!UIAccessibility.isReduceMotionEnabled}
    private func rectangle(_ rect:CGRect,_ color:UIColor)->SKShapeNode{let node=SKShapeNode(rect:rect);node.fillColor=color;node.strokeColor = .clear;addChild(node);return node}
    private func stamp(_ source:String,_ sx:Int,_ sy:Int,_ w:Int,_ h:Int,_ x:CGFloat,_ y:CGFloat,_ scale:CGFloat=1)->SKSpriteNode {
        let data=CampaignSprite(id:"book",source:source,sx:Double(sx),sy:Double(sy),sw:Double(w),sh:Double(h),x:0,y:0,width:Double(w),height:Double(h),alpha:1)
        let node=SKSpriteNode(texture:atlas.texture(data));node.anchorPoint = .zero;node.position=CGPoint(x:x,y:y);node.size=CGSize(width:CGFloat(w)*scale,height:CGFloat(h)*scale);addChild(node);return node
    }
    private func person(_ actor:TomeActor,_ x:CGFloat,_ y:CGFloat,_ scale:CGFloat=1.5)->SKSpriteNode {
        let node=stamp(actor.source,Int(actor.sx),Int(actor.sy),Int(actor.sw),Int(actor.sh),x,y,scale)
        if animate {if actor.walker {let frames=atlas.walker(actor.source);if !frames.isEmpty {node.run(.repeatForever(.sequence([.wait(forDuration:1.6),.animate(with:frames,timePerFrame:0.16),.wait(forDuration:0.8)])))}}else{node.run(.repeatForever(.sequence([.scaleY(to:1.025,duration:1.2),.scaleY(to:1,duration:1.2)])))}}
        actors[actor.id]=node;actorOrder.append(node);return node
    }
    private func crystal(_ point:CGPoint,_ color:UIColor)->SKShapeNode {
        let path=CGMutablePath();path.move(to:CGPoint(x:0,y:20));path.addLines(between:[CGPoint(x:9,y:5),CGPoint(x:6,y:-16),CGPoint(x:-6,y:-16),CGPoint(x:-9,y:5)]);path.closeSubpath()
        let node=SKShapeNode(path:path);node.position=point;node.fillColor=color;node.strokeColor=color.withAlphaComponent(0.5);node.glowWidth=3;addChild(node);return node
    }
    private func lamp(_ x:CGFloat,_ lit:Bool=true)->SKShapeNode {
        _=rectangle(CGRect(x:x-2,y:32,width:4,height:48),NativeAtlas.color("#65503b"))
        let node=SKShapeNode(ellipseOf:CGSize(width:13,height:17));node.position=CGPoint(x:x,y:85);node.fillColor=lit ? NativeAtlas.color("#ffd68c"):NativeAtlas.color("#493d40");node.strokeColor=TomeTheme.gold;node.glowWidth=lit ? 5:0;addChild(node);return node
    }
    private func house(_ x:CGFloat,_ closed:Bool=true){
        let s:CGFloat=0.55;_=stamp("elvgames/tiles/village.png",864,708,128,156,x,44+32*s,s)
        _=stamp("elvgames/tiles/village.png",864,464,128,32,x,44,s)
        _=stamp("elvgames/tiles/village.png",0,280,32,38,x+35,44,s)
        if closed {_=rectangle(CGRect(x:x+10,y:48,width:15,height:15),NativeAtlas.color("#413c36"))}
    }
    private func item(_ color:UIColor,_ x:CGFloat=154,_ y:CGFloat=92)->SKShapeNode {let node=SKShapeNode(rectOf:CGSize(width:18,height:13),cornerRadius:2);node.position=CGPoint(x:x,y:y);node.fillColor=color;node.strokeColor=TomeTheme.gold;addChild(node);return node}
    func show(_ page:TomePage){
        removeAllActions();removeAllChildren();actors=[:];actorOrder=[]
        let night=["stones","dim","breath","slacken","sleep","moonlight","ward","contain","transform"].contains(page.action)
        _=rectangle(CGRect(x:0,y:0,width:320,height:230),NativeAtlas.color(night ? "#17253d":"#9cae98"))
        _=rectangle(CGRect(x:0,y:0,width:320,height:42),NativeAtlas.color(night ? "#35424c":"#526b46"))
        if page.action=="stones" || page.action=="dim" || page.action=="moonlight" || page.action=="ward" || page.action=="contain" {
            let colors:[UIColor]=[.systemGreen,.systemBlue,.systemOrange,.systemRed,.systemYellow,.systemTeal,.systemPurple]
            for i in 0..<7 {let angle=CGFloat(i)*CGFloat.pi*2/7;let stone=crystal(CGPoint(x:160+cos(angle)*100,y:114+sin(angle)*53),colors[i]);if !animate && page.action=="dim" {stone.alpha=i==6 ? 0.08:0.25}else if animate && page.action=="dim" {stone.run(.sequence([.wait(forDuration:i==6 ? 0.3:1.1),.fadeAlpha(to:i==6 ? 0.08:0.25,duration:1)]))}else if animate{stone.run(.repeatForever(.sequence([.fadeAlpha(to:0.55,duration:1.4),.fadeAlpha(to:1,duration:1.4)])))}}
            if page.action=="contain" {_=rectangle(CGRect(x:85,y:50,width:150,height:2),TomeTheme.paper);let glow=item(.systemPurple,160,65);if animate{glow.run(.repeatForever(.sequence([.moveBy(x:50,y:50,duration:0.8),.moveBy(x:-50,y:-50,duration:0.8)])))}}
            return
        }
        if page.environment=="village" && ["dawn","road","recovery"].contains(page.action) {house(15,page.action != "recovery");house(123,page.action != "recovery");house(230,page.action != "recovery");for x in [CGFloat(95),CGFloat(220)]{let glow=lamp(x,false);if animate{glow.run(.sequence([.wait(forDuration:x/150),.run{glow.fillColor=NativeAtlas.color("#ffd68c");glow.glowWidth=5}]))}else{glow.fillColor=NativeAtlas.color("#ffd68c");glow.glowWidth=5}}}
        var ordered=page.actors
        if page.action=="portrait" {ordered.sort{a,b in a.name==page.speaker && b.name != page.speaker}}
        else {let priority=[page.subject,page.target].compactMap{$0};ordered.sort{a,b in (priority.firstIndex(of:a.id) ?? 99) < (priority.firstIndex(of:b.id) ?? 99)}}
        let cast=ordered.prefix(page.action=="portrait" ? 2:3)
        for (i,actor) in cast.enumerated(){_=person(actor,CGFloat(28+i*94),42,page.action=="portrait" ? 2:1.4)}
        let subject=page.subject.flatMap{actors[$0]}
        let target=page.target.flatMap{actors[$0]}
        switch page.action {
        case "dawn","road","recovery": if let first=subject,animate {first.run(.moveBy(x:55,y:0,duration:2.6))}
        case "well":
            _=stamp("elvgames/tiles/village.png",386,164,62,88,180,36,1)
            let bucket=item(.systemPurple,211,63);if animate{bucket.run(.sequence([.moveBy(x:0,y:54,duration:1.6),.wait(forDuration:1)]))}else{bucket.position.y += 54}
        case "courier": if let courier=subject,animate{let landing=courier.position;courier.position=CGPoint(x:310,y:220);courier.run(.move(to:landing,duration:1.4))};_=item(TomeTheme.paper,160,100)
        case "letter","record","diagram": let sheet=item(TomeTheme.paper,160,110);sheet.setScale(2);for i in 0..<4{_=rectangle(CGRect(x:145,y:102+i*4,width:28,height:1),TomeTheme.ink.withAlphaComponent(0.5))};if animate&&page.action=="letter"{sheet.run(.repeatForever(.sequence([.rotate(byAngle:0.03,duration:0.3),.rotate(byAngle:-0.03,duration:0.3)])))}
        case "gift":
            let from=CGPoint(x:(subject?.position.x ?? 190)+30,y:95),to=CGPoint(x:(target?.position.x ?? 50)+30,y:90)
            let gift:SKNode
            if page.id=="campaignRecovery:2" {
                let cup=SKShapeNode(rectOf:CGSize(width:15,height:13),cornerRadius:3);cup.fillColor=TomeTheme.paper;cup.strokeColor=TomeTheme.gold;cup.position=from
                let handle=SKShapeNode(ellipseOf:CGSize(width:7,height:9));handle.position=CGPoint(x:9,y:0);handle.strokeColor=TomeTheme.gold;handle.fillColor = .clear;cup.addChild(handle);addChild(cup);gift=cup
            }else{gift=crystal(from,.systemPurple)}
            if animate{gift.run(.move(to:to,duration:1.6))}else{gift.position=to}
        case "breath":
            if let wyrm=subject,page.subject=="moonWyrm" {wyrm.size=CGSize(width:wyrm.size.width*1.5,height:wyrm.size.height*1.5)}
            let shade=rectangle(CGRect(x:0,y:0,width:320,height:230),UIColor.black.withAlphaComponent(0.45));if animate{shade.run(.repeatForever(.sequence([.fadeAlpha(to:0.3,duration:1.8),.fadeAlpha(to:0.9,duration:1.8)])))}
        case "slacken","sleep":
            if let sleeper=subject {sleeper.zRotation = -0.2;if animate{sleeper.run(.group([.rotate(toAngle:-0.65,duration:1.8),.moveBy(x:0,y:-15,duration:1.8)]))}else{sleeper.zRotation = -0.65;sleeper.position.y -= 15}}
            let bed=rectangle(CGRect(x:180,y:38,width:90,height:14),TomeTheme.paper.withAlphaComponent(0.8));if subject==nil&&animate{bed.run(.repeatForever(.sequence([.scaleY(to:1.08,duration:1.5),.scaleY(to:1,duration:1.5)])))}
        case "tracks":for i in 0..<7{_=rectangle(CGRect(x:130+i*12,y:58+i*12,width:5,height:9),NativeAtlas.color("#25313e"))}
        case "lantern","signal","bells":let glow=lamp(165);if animate&&page.action != "lantern"{glow.run(.repeatForever(.sequence([.fadeAlpha(to:0.4,duration:0.6),.fadeAlpha(to:1,duration:0.6),.wait(forDuration:0.8)])))}
        case "descend","lift","beam":
            for i in 0..<5{_=rectangle(CGRect(x:185,y:40+i*16,width:90,height:5),TomeTheme.gold.withAlphaComponent(0.7))}
            let platform=rectangle(CGRect(x:180,y:110,width:100,height:9),NativeAtlas.color("#71523c"));if animate{platform.run(.moveBy(x:0,y:page.action=="descend" ? -60:60,duration:2))}else{platform.position.y += page.action=="descend" ? -60:60}
        case "water":let water=rectangle(CGRect(x:0,y:25,width:320,height:27),UIColor.systemBlue.withAlphaComponent(0.5));if animate{water.run(.moveBy(x:0,y:page.action=="water" ? -20:18,duration:2))}else{water.position.y += page.action=="water" ? -20:18}
        case "steam":
            for index in 0..<5 {
                let puff=SKShapeNode(ellipseOf:CGSize(width:CGFloat(20+index*3),height:CGFloat(14+index*2)));puff.position=CGPoint(x:180+CGFloat(index*9),y:55+CGFloat(index*12));puff.fillColor=UIColor(white:0.9,alpha:0.4);puff.strokeColor = .clear;addChild(puff)
                if animate {let origin=puff.position;puff.run(.repeatForever(.sequence([.moveBy(x:8,y:40,duration:1.4),.fadeOut(withDuration:0.5),.run{puff.position=origin;puff.alpha=1}])))}
            }
        case "gate","blockade":let gate=rectangle(CGRect(x:208,y:40,width:18,height:160),NativeAtlas.color("#4b454b"));if animate{gate.position.y=150;gate.run(.moveTo(y:0,duration:1.2))}
        case "transfer","supplies","tools","repair":let crate=item(TomeTheme.gold,180,75);crate.setScale(2);if animate{crate.run(.moveBy(x:-70,y:0,duration:1.8))}else{crate.position.x -= 70}
        case "reach","release":if let actor=subject,animate {actor.run(.sequence([.moveBy(x:24,y:0,duration:0.7),.wait(forDuration:0.6),.moveBy(x:page.action=="release" ? -24:0,y:0,duration:0.7)]))}
        case "duel":if animate {subject?.run(.moveBy(x:40,y:0,duration:0.8));target?.run(.moveBy(x:-30,y:0,duration:0.8))}else{subject?.position.x += 40;target?.position.x -= 30};_=rectangle(CGRect(x:159,y:50,width:3,height:65),TomeTheme.paper)
        case "retreat":if animate {subject?.run(.moveTo(x:380,duration:2))}else{subject?.position.x=380}
        case "seven":for i in 0..<7{_=crystal(CGPoint(x:45+i*38,y:160),[UIColor.systemRed,.systemBlue,.systemOrange,.systemTeal,.systemYellow,.systemGreen,.systemPurple][i])}
        case "transform":if let actor=subject {actor.color = .systemPurple;actor.colorBlendFactor=0.65;if animate{actor.run(.group([.scale(to:1.8,duration:2),.moveBy(x:0,y:30,duration:2)]))}else{actor.setScale(1.8);actor.position.y += 30}}
        default:break
        }
    }
}

/// Sprite, name and hometown are one touch target; no text-only character selection list.
final class TomeHeroButton:UIControl {
    init(name:String,home:String,actor:TomeActor) {
        super.init(frame:.zero);isAccessibilityElement=true;accessibilityLabel="\(name) · \(home)";accessibilityTraits = .button
        backgroundColor=UIColor(red:0.13,green:0.105,blue:0.08,alpha:1);layer.borderColor=TomeTheme.gold.cgColor;layer.borderWidth=1;layer.cornerRadius=9
        let sprite=UIImageView();sprite.contentMode = .scaleAspectFit;sprite.layer.magnificationFilter = .nearest
        let frames=(0..<4).compactMap{NativeAtlas.shared.image(actor.source,x:$0*48,y:0,width:48,height:48)}
        sprite.image=frames.first;if !UIAccessibility.isReduceMotionEnabled{sprite.animationImages=frames;sprite.animationDuration=1.2;sprite.startAnimating()}
        let label=UILabel();label.text=name;label.textColor=TomeTheme.paper;label.font=TomeTheme.font(19);label.textAlignment = .center
        let town=UILabel();town.text=home;town.textColor=TomeTheme.gold;town.font=TomeTheme.font(12);town.textAlignment = .center
        let stack=UIStackView(arrangedSubviews:[sprite,label,town]);stack.axis = .vertical;stack.spacing=4;stack.isUserInteractionEnabled=false;stack.translatesAutoresizingMaskIntoConstraints=false;addSubview(stack)
        NSLayoutConstraint.activate([heightAnchor.constraint(equalToConstant:154),sprite.heightAnchor.constraint(equalToConstant:86),stack.leadingAnchor.constraint(equalTo:leadingAnchor,constant:8),stack.trailingAnchor.constraint(equalTo:trailingAnchor,constant:-8),stack.topAnchor.constraint(equalTo:topAnchor,constant:10),stack.bottomAnchor.constraint(equalTo:bottomAnchor,constant:-10)])
    }
    required init?(coder:NSCoder){fatalError("Use init(name:home:actor:)")}
    override var isHighlighted:Bool {didSet{alpha=isHighlighted ? 0.7:1}}
}
