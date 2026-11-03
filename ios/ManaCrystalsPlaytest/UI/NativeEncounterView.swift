import UIKit

/// The same pixel art and elemental colours used by the web battle renderer.
enum NativeBattleArt {
    static let elements=["fire":"red","water":"blue","lightning":"gold","nature":"green","earth":"orange","arcane":"violet","wind":"cyan"]
    static let hex=["cyan":"#61d9e8","gold":"#f6d365","violet":"#bd91ff","green":"#72e6a2","red":"#ff7c9b","blue":"#7296ff","orange":"#ffad69","stone":"#6b6577","neutral":"#b8c1cb"]
    static func color(_ element:String)->UIColor {NativeAtlas.color(hex[elements[element] ?? element] ?? "#aeb6d7")}
    static func icon(_ name:String)->UIImage? {NativeAtlas.shared.image("native-visuals/icon-\(name).png",x:0,y:0,width:12,height:12)}
    static func crystal(_ name:String)->UIImage? {NativeAtlas.shared.image("native-visuals/crystal-\(name).png",x:0,y:0,width:30,height:30)}
    static func text(_ text:String,in rect:CGRect,size:CGFloat=11,color:UIColor=NativeAtlas.color("#aeb6d7"),alignment:NSTextAlignment = .left) {
        let paragraph=NSMutableParagraphStyle();paragraph.alignment=alignment;paragraph.lineBreakMode = .byTruncatingTail
        (text as NSString).draw(in:rect,withAttributes:[.font:UIFont.monospacedDigitSystemFont(ofSize:size,weight:.semibold),.foregroundColor:color,.paragraphStyle:paragraph])
    }
}

/// A compact version of the web phone stage. It is read-only: board gestures and
/// the existing two toolbar actions retain all touch space.
final class NativeEncounterView:UIView {
    private var state:BattleState?
    private var crops:[String:UIImage]=[:]
    override init(frame:CGRect){super.init(frame:frame);isOpaque=false;isAccessibilityElement=true;accessibilityIdentifier="battle-stage";isUserInteractionEnabled=false}
    required init?(coder:NSCoder){fatalError("Use init(frame:)")}
    override var intrinsicContentSize:CGSize {CGSize(width:240,height:72)}
    func adopt(_ next:BattleState) {
        state=next
        let title=next.title ?? "Challenge"
        let action=next.stage?.showMove == true ? next.enemyMove:"Preparing"
        accessibilityLabel=next.enemyMaxHP>0 ? "\(title). Hero HP \(next.heroHP) of \(next.heroMaxHP). Opponent HP \(next.enemyHP) of \(next.enemyMaxHP). \(action).":"\(title). Hero HP \(next.heroHP) of \(next.heroMaxHP). \(next.objective?.counter ?? "")"
        if let cast=next.stage?.feedback.last(where:{$0.kind=="opponentCast"}) {accessibilityLabel=(accessibilityLabel ?? "")+" Arcane \(cast.element ?? "arcane"), level \(cast.rank ?? 1), targeting opponent."}
        setNeedsDisplay()
    }
    private func image(_ actor:NativeStageActor)->UIImage? {
        let key="\(actor.source):\(actor.sx):\(actor.sy):\(actor.sw):\(actor.sh)"
        if let cached=crops[key]{return cached}
        guard let image=NativeAtlas.shared.image(actor.source,x:Int(actor.sx),y:Int(actor.sy),width:Int(actor.sw),height:Int(actor.sh)) else{return nil}
        crops[key]=image;return image
    }
    private func portrait(_ actor:NativeStageActor?,center:CGPoint,maxSize:CGSize,alpha:CGFloat=1,offset:CGFloat=0,tint:String?=nil) {
        guard let actor=actor,let picture=image(actor),actor.sw>0,actor.sh>0 else{return}
        let scale=min(maxSize.width/CGFloat(actor.sw),maxSize.height/CGFloat(actor.sh))
        let w=CGFloat(actor.sw)*scale,h=CGFloat(actor.sh)*scale
        var art=picture
        if let tint=tint {
            let key="tint:\(actor.source):\(actor.sx):\(actor.sy):\(actor.sw):\(actor.sh):\(tint)"
            if let cached=crops[key] {art=cached} else {
                let format=UIGraphicsImageRendererFormat();format.scale=1
                art=UIGraphicsImageRenderer(size:picture.size,format:format).image { renderer in
                    let bounds=CGRect(origin:.zero,size:picture.size)
                    renderer.cgContext.interpolationQuality = .none;picture.draw(in:bounds)
                    renderer.cgContext.setBlendMode(.color);NativeBattleArt.color(tint).setFill();renderer.cgContext.fill(bounds)
                    picture.draw(in:bounds,blendMode:.destinationIn,alpha:1)
                };crops[key]=art
            }
        }
        art.draw(in:CGRect(x:round(center.x-w/2+offset),y:round(center.y-h),width:w,height:h),blendMode:.normal,alpha:alpha)
    }
    private func meter(_ rect:CGRect,ratio:CGFloat,color:UIColor) {
        NativeAtlas.color("#090b15").setFill();UIBezierPath(rect:rect.insetBy(dx:-1,dy:-1)).fill()
        color.setFill();UIBezierPath(rect:CGRect(x:rect.minX,y:rect.minY,width:rect.width*max(0,min(1,ratio)),height:rect.height)).fill()
    }
    override func draw(_ rect:CGRect) {
        guard let state=state,let ctx=UIGraphicsGetCurrentContext() else{return}
        ctx.interpolationQuality = .none
        let stage=state.stage,w=bounds.width,h=bounds.height,baseline=h-3
        let left:CGFloat=stage?.ally == nil ? 38:56,right=max(left+24,w-51),centerWidth=right-left
        let hero=CGPoint(x:18,y:baseline),enemy=CGPoint(x:w-24,y:baseline)
        NativeAtlas.color("#1d2238").setFill();ctx.fill(CGRect(x:0,y:baseline,width:w,height:1))
        let feedback=stage?.feedback ?? []
        func shake(_ target:String)->CGFloat {
            guard !UIAccessibility.isReduceMotionEnabled,let hit=feedback.last(where:{$0.kind=="shake" && $0.target==target}) else{return 0}
            return CGFloat(sin(hit.elapsedMs/16)*3*max(0,1-hit.elapsedMs/max(1,hit.durationMs)))
        }
        let defeated=feedback.last(where:{$0.kind=="defeat"})
        let enemyAlpha=defeated.map{CGFloat(max(0,1-$0.elapsedMs/max(1,$0.durationMs)))} ?? 1
        portrait(stage?.hero,center:hero,maxSize:CGSize(width:34,height:38),offset:shake("hero"))
        var allyPoint=CGPoint(x:42,y:baseline)
        if !UIAccessibility.isReduceMotionEnabled,let toss=feedback.last(where:{$0.kind=="toss"}) {allyPoint.y -= CGFloat(sin(min(1,toss.elapsedMs/400)*Double.pi)*7)}
        if let element=stage?.allyElement,stage?.ally != nil {
            ctx.setFillColor(NativeBattleArt.color(element).withAlphaComponent(0.5).cgColor)
            ctx.fillEllipse(in:CGRect(x:allyPoint.x-13,y:baseline-6,width:26,height:8))
        }
        portrait(stage?.ally,center:allyPoint,maxSize:CGSize(width:30,height:36))
        portrait(stage?.opponent,center:enemy,maxSize:CGSize(width:51,height:58),alpha:enemyAlpha,offset:shake("enemy"),tint:stage?.tint)
        NativeBattleArt.text(state.title ?? "Challenge",in:CGRect(x:left,y:0,width:centerWidth,height:15),size:12,color:.white,alignment:.center)
        if state.enemyMaxHP>0 {
            let hp=CGFloat(state.enemyHP)/CGFloat(max(1,state.enemyMaxHP))
            meter(CGRect(x:left,y:18,width:centerWidth,height:5),ratio:hp,color:NativeAtlas.color(hp>0.5 ? "#6ff08f":hp>0.25 ? "#f5d77b":"#ff5c7a"))
            NativeBattleArt.text("\(state.enemyHP)/\(state.enemyMaxHP)",in:CGRect(x:left,y:26,width:centerWidth,height:12),size:10,alignment:.right)
            let duration=max(1,stage?.enemyActionMs ?? 1),progress=1-state.enemyRemainingMs/duration
            var gaugeColor=NativeAtlas.color(progress>0.8 ? "#ff5c7a":"#f5d77b")
            if !UIAccessibility.isReduceMotionEnabled && (feedback.contains{$0.kind=="rush"}) {gaugeColor = .white}
            meter(CGRect(x:left+14,y:42,width:max(1,centerWidth-14),height:4),ratio:CGFloat(max(0,progress)),color:gaugeColor)
            if progress<0 {meter(CGRect(x:left+14,y:42,width:max(1,centerWidth-14),height:4),ratio:CGFloat(min(1,-progress)),color:NativeBattleArt.color("water"))}
            NativeBattleArt.icon(stage?.showMove == true ? (stage?.moveIcon ?? "hourglass"):"hourglass")?.draw(in:CGRect(x:left,y:38,width:12,height:12))
            var ix=left
            for (list,mark) in [(stage?.weakness ?? [],"weak"),(stage?.resistance ?? [],"resist")] where !list.isEmpty {
                guard ix+12<right else{break};NativeBattleArt.icon(mark)?.draw(in:CGRect(x:ix,y:54,width:10,height:10));ix += 11
                for element in list where ix+10<=right {NativeBattleArt.icon(element)?.draw(in:CGRect(x:ix,y:54,width:10,height:10));ix += 11}
                ix += 4
            }
        } else {drawObjective(state.objective,in:CGRect(x:left,y:18,width:centerWidth,height:45))}
        // The hero's own health remains legible beside the portrait, independent
        // of the opponent's HP and action gauge.
        meter(CGRect(x:2,y:17,width:30,height:3),ratio:CGFloat(state.heroHP)/CGFloat(max(1,state.heroMaxHP)),color:NativeAtlas.color("#6ff08f"))
        NativeBattleArt.text("\(state.heroHP)",in:CGRect(x:0,y:3,width:34,height:12),size:10,color:NativeAtlas.color("#6ff08f"),alignment:.center)
        if let element=stage?.shieldElement {ctx.setStrokeColor(NativeBattleArt.color(element).cgColor);ctx.setLineWidth(2);ctx.strokeEllipse(in:CGRect(x:enemy.x-22,y:baseline-55,width:44,height:54))}
        for (i,status) in (stage?.statuses ?? []).enumerated() {
            let x=status.target=="hero" ? CGFloat(i%2)*17:bounds.width-15-CGFloat(i%3)*17
            NativeBattleArt.icon(status.icon)?.draw(in:CGRect(x:x,y:status.target=="hero" ? 23:1,width:12,height:12))
            NativeBattleArt.text(String(status.count),in:CGRect(x:x+8,y:status.target=="hero" ? 31:9,width:12,height:10),size:8,color:.white)
        }
        if let effect=state.effect,effect.character {drawArcane(effect,hero:CGPoint(x:hero.x,y:baseline-20),enemy:CGPoint(x:enemy.x,y:baseline-29),context:ctx)}
        var floatOffsets:[String:Int]=[:]
        for item in feedback {
            let target=item.target ?? "enemy",offset=floatOffsets[target,default:0]
            if item.kind=="float" {floatOffsets[target]=offset+1}
            drawFeedback(item,hero:CGPoint(x:hero.x,y:baseline-25),enemy:CGPoint(x:enemy.x,y:baseline-32),floatOffset:CGFloat(offset*10),context:ctx)
        }
    }
    private func drawObjective(_ goal:NativeObjective?,in rect:CGRect) {
        guard let goal=goal else{return}
        if let price=goal.price {
            let colors=[NativeAtlas.color("#6ff08f").cgColor,NativeAtlas.color("#f5d77b").cgColor,NativeAtlas.color("#ff5c7a").cgColor] as CFArray
            if let gradient=CGGradient(colorsSpace:CGColorSpaceCreateDeviceRGB(),colors:colors,locations:[0,0.5,1]),let ctx=UIGraphicsGetCurrentContext(){ctx.saveGState();ctx.clip(to:CGRect(x:rect.minX,y:rect.minY+4,width:rect.width,height:7));ctx.drawLinearGradient(gradient,start:CGPoint(x:rect.minX,y:0),end:CGPoint(x:rect.maxX,y:0),options:[]);ctx.restoreGState()}
            let p=max(0,min(1,(price.value-price.min)/max(0.001,price.max-price.min))),x=rect.minX+rect.width*CGFloat(p)
            UIColor.white.setFill();UIBezierPath(rect:CGRect(x:x-1,y:rect.minY,width:2,height:15)).fill()
            NativeBattleArt.text("\(Int((price.value*100).rounded()))%",in:CGRect(x:rect.minX,y:rect.minY+17,width:rect.width,height:14),color:.white,alignment:.center)
        } else if let crystals=goal.crystals,!crystals.isEmpty {
            let rowH=min(14,rect.height/CGFloat(crystals.count))
            for (i,crystal) in crystals.enumerated() {
                let y=rect.minY+CGFloat(i)*rowH;NativeBattleArt.icon(crystal.element)?.draw(in:CGRect(x:rect.minX,y:y,width:12,height:12))
                meter(CGRect(x:rect.minX+16,y:y+3,width:max(1,rect.width-16),height:6),ratio:CGFloat(crystal.have)/CGFloat(max(1,crystal.want)),color:NativeBattleArt.color(crystal.element))
            }
        } else if let lines=goal.lines {
            let gap:CGFloat=3,count=max(1,lines.want),width=min(22,(rect.width-CGFloat(count-1)*gap)/CGFloat(count))
            for i in 0..<count { (i<lines.have ? NativeBattleArt.color("wind"):NativeAtlas.color("#2a2f4d")).setFill();UIBezierPath(rect:CGRect(x:rect.minX+CGFloat(i)*(width+gap),y:rect.minY+5,width:max(1,width),height:8)).fill() }
        } else if let score=goal.score {meter(CGRect(x:rect.minX,y:rect.minY+4,width:rect.width,height:7),ratio:CGFloat(score.have)/CGFloat(max(1,score.want)),color:NativeAtlas.color("#f5d77b"));NativeBattleArt.text("\(score.have)/\(score.want)",in:CGRect(x:rect.minX,y:rect.minY+15,width:rect.width,height:12),alignment:.right)}
        else if let lamps=goal.lamps {for (i,lamp) in lamps.enumerated(){let x=rect.minX+CGFloat(i)*16;guard x+12<=rect.maxX else{break};NativeBattleArt.icon(lamp.element)?.draw(in:CGRect(x:x,y:rect.minY,width:12,height:12),blendMode:.normal,alpha:lamp.lit ? 1:0.22)}}
        else {meter(CGRect(x:rect.minX,y:rect.minY+4,width:rect.width,height:7),ratio:CGFloat(goal.progress ?? 0),color:NativeBattleArt.color("wind"))}
        if let rival=goal.rival {let height:CGFloat=25,width:CGFloat=22,x=rect.maxX-width,y=rect.maxY-height;NativeAtlas.color("#090b15").setFill();UIBezierPath(rect:CGRect(x:x,y:y,width:width,height:height)).fill();for row in 0..<max(0,rival.top){(row<rival.rows ? NativeAtlas.color("#c6a2ef"):NativeAtlas.color("#303650")).setFill();UIBezierPath(rect:CGRect(x:x+2,y:y+height-2-CGFloat(row+1)*height/CGFloat(max(1,rival.top)),width:width-4,height:max(1,height/CGFloat(max(1,rival.top))-1))).fill()}}
    }
    private func drawArcane(_ effect:NativeEffect,hero:CGPoint,enemy:CGPoint,context ctx:CGContext) {
        let color=NativeAtlas.color("#c193ff");ctx.setStrokeColor(color.cgColor);ctx.setFillColor(color.cgColor);ctx.setLineWidth(1.5)
        ctx.strokeEllipse(in:CGRect(x:enemy.x-15,y:enemy.y-20,width:30,height:40));NativeBattleArt.icon("arcane")?.draw(in:CGRect(x:enemy.x-6,y:enemy.y-21,width:12,height:12))
        rankPips(effect.rank,element:"arcane",at:CGPoint(x:enemy.x-8,y:enemy.y+22),context:ctx)
        guard effect.phase=="effect" else{return}
        ctx.move(to:enemy);ctx.addQuadCurve(to:hero,control:CGPoint(x:(enemy.x+hero.x)/2,y:enemy.y-18));ctx.strokePath()
        guard !UIAccessibility.isReduceMotionEnabled else{return}
        let p=1-effect.remainingMs/max(1,effect.durationMs)
        for i in 0..<5 {let t=(p+Double(i)/5).truncatingRemainder(dividingBy:1),x=enemy.x+(hero.x-enemy.x)*CGFloat(t),y=enemy.y+(hero.y-enemy.y)*CGFloat(t)-CGFloat(sin(t*Double.pi)*12);ctx.fillEllipse(in:CGRect(x:x-1,y:y-1,width:2,height:2))}
    }
    private func rankPips(_ rank:Int,element:String,at origin:CGPoint,context ctx:CGContext) {
        ctx.saveGState();defer{ctx.restoreGState()}
        for tier in 1...4 {ctx.setFillColor((tier<=rank ? NativeBattleArt.color(element):NativeAtlas.color("#38415b")).cgColor);ctx.fill(CGRect(x:origin.x+CGFloat(tier-1)*4.5,y:origin.y,width:3,height:2))}
    }
    private func drawOpponentCast(_ item:NativeFeedback,hero:CGPoint,enemy:CGPoint,context ctx:CGContext) {
        let element=item.element ?? "arcane",p=max(0,min(1,item.elapsedMs/max(1,item.durationMs)))
        let color=NativeBattleArt.color(element)
        ctx.saveGState();ctx.setAlpha(CGFloat(1-p*0.4));ctx.setStrokeColor(color.cgColor);ctx.setFillColor(color.cgColor);ctx.setLineWidth(1.5)
        ctx.strokeEllipse(in:CGRect(x:enemy.x-15,y:enemy.y-20,width:30,height:40))
        NativeBattleArt.icon(element)?.draw(in:CGRect(x:enemy.x-6,y:enemy.y-21,width:12,height:12))
        rankPips(item.rank ?? 1,element:element,at:CGPoint(x:enemy.x-8,y:enemy.y+22),context:ctx)
        ctx.move(to:hero);ctx.addQuadCurve(to:enemy,control:CGPoint(x:(hero.x+enemy.x)/2,y:enemy.y-18));ctx.strokePath()
        if !UIAccessibility.isReduceMotionEnabled {for i in 0..<5 {let t=(p+Double(i)/5).truncatingRemainder(dividingBy:1),x=hero.x+(enemy.x-hero.x)*CGFloat(t),y=hero.y+(enemy.y-hero.y)*CGFloat(t)-CGFloat(sin(t*Double.pi)*12);ctx.fillEllipse(in:CGRect(x:x-1,y:y-1,width:2,height:2))}}
        ctx.restoreGState()
    }
    private func drawFeedback(_ item:NativeFeedback,hero:CGPoint,enemy:CGPoint,floatOffset:CGFloat,context ctx:CGContext) {
        guard item.target != "board" else{return}
        let p=max(0,min(1,item.elapsedMs/max(1,item.durationMs))),at=item.target=="hero" ? hero:enemy
        switch item.kind {
        case "opponentCast":drawOpponentCast(item,hero:hero,enemy:enemy,context:ctx)
        case "float":
            let lift:UIOffset=UIOffset(horizontal:0,vertical:UIAccessibility.isReduceMotionEnabled ? 0:CGFloat(p*16))
            ctx.saveGState();ctx.setAlpha(CGFloat(1-p));NativeBattleArt.text(item.text ?? "",in:CGRect(x:at.x-28,y:at.y-20-lift.vertical-floatOffset,width:56,height:18),size:13,color:NativeAtlas.color(item.color ?? "#ffffff"),alignment:.center);ctx.restoreGState()
        case "icon","face","toss":
            if let icon=item.icon {NativeBattleArt.icon(icon)?.draw(in:CGRect(x:at.x-8,y:at.y-24-(UIAccessibility.isReduceMotionEnabled ? 0:CGFloat(p*12)),width:16,height:16),blendMode:.normal,alpha:CGFloat(1-p*p))}
        case "vfx":portrait(item.sprite,center:CGPoint(x:at.x,y:at.y+23),maxSize:CGSize(width:58,height:58))
        case "banner","beat":
            if let text=item.text {NativeBattleArt.text(text,in:CGRect(x:3,y:bounds.height-15,width:bounds.width-6,height:14),size:10,color:NativeAtlas.color("#ffe5ad"),alignment:.center)}
        default:break
        }
    }
}

/// Preview cells use the exact shared gem faces, not flat coloured squares.
final class NextPiecesView:UIView {
    var pieces:[NativePiece]=[]{didSet{if pieces != oldValue{setNeedsDisplay()}}}
    var lines=0{didSet{if lines != oldValue{setNeedsDisplay()}}}
    override var intrinsicContentSize:CGSize{CGSize(width:240,height:30)}
    override func draw(_ rect:CGRect){
        guard let ctx=UIGraphicsGetCurrentContext() else{return};ctx.interpolationQuality = .none
        NativeBattleArt.text("NEXT",in:CGRect(x:3,y:8,width:36,height:14),size:10)
        let available=max(1,bounds.width-112),slot=min(50,available/CGFloat(max(1,pieces.count)))
        for (index,piece) in pieces.enumerated(){let cell:CGFloat=8,minX=piece.cells.compactMap{$0.first}.min() ?? 0,minY=piece.cells.compactMap{$0.last}.min() ?? 0
            for (i,offset) in piece.cells.enumerated() where offset.count==2 && i<piece.colors.count {NativeBattleArt.crystal(piece.colors[i])?.draw(in:CGRect(x:43+CGFloat(index)*slot+CGFloat(offset[0]-minX)*cell,y:6+CGFloat(offset[1]-minY)*cell,width:cell,height:cell))}}
        NativeBattleArt.text("LINES \(lines)",in:CGRect(x:bounds.width-70,y:8,width:68,height:14),size:10,alignment:.right)
    }
}
