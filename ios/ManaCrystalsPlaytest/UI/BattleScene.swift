import SpriteKit
import UIKit

/// The web obstruction pulse: remaining colours cross-fade every two seconds.
/// The actual required sides and permanent sequence dots remain unambiguous.
struct NativeObstructionPulse {
    let edges:[SKSpriteNode]
    let remaining:[NativeColorTouch]
    func update(timeMs:Double) {
        guard let first=remaining.first else{return}
        let reduced=UIAccessibility.isReduceMotionEnabled
        var color=BattleScene.color(first.color)
        if !reduced && remaining.count>1 {
            let at=max(0,timeMs)/2000
            let index=Int(floor(at)).quotientAndRemainder(dividingBy:remaining.count).remainder
            let next=(index+1)%remaining.count
            let fraction=CGFloat(0.5-0.5*cos(Double.pi*at.truncatingRemainder(dividingBy:1)))
            let a=BattleScene.color(remaining[index].color).cgColor.components ?? [0,0,0,1]
            let b=BattleScene.color(remaining[next].color).cgColor.components ?? [0,0,0,1]
            color=UIColor(red:a[0]*(1-fraction)+b[0]*fraction,green:a[1]*(1-fraction)+b[1]*fraction,blue:a[2]*(1-fraction)+b[2]*fraction,alpha:1)
        }
        let alpha:CGFloat=reduced ? 1:CGFloat(0.75+0.25*sin(timeMs*Double.pi/1000))
        for edge in edges {edge.color=color;edge.alpha=alpha}
    }
}

final class BattleScene: SKScene {
    private let boardLayer = SKNode()
    private let effectLayer = NativeSpellEffects()
    private let pieceLayer=SKNode(),sealLayer=SKNode(),badgeLayer=SKNode()
    private var previousKey = ""
    private var pieceGlows:[SKShapeNode]=[]
    private var obstructionPulses:[NativeObstructionPulse]=[]
    private var cueKey=""
    private var sealIcon:SKSpriteNode?
    private var badgeIcons:[(node:SKSpriteNode,baseY:CGFloat,bobs:Bool)]=[]
    private static var sharedTextures:[String:SKTexture]=[:]

    override func didMove(to view: SKView) {
        backgroundColor = NativeAtlas.color("#0a0c17")
        addChild(boardLayer); addChild(effectLayer)
        effectLayer.zPosition = 20
        isUserInteractionEnabled = false
    }

    func render(_ state: BattleState) {
        if state.paused && !state.ready {
            boardLayer.removeAllChildren();effectLayer.isHidden=true;obstructionPulses=[];cueKey="";previousKey="paused";return
        }
        let obstacleKey = state.obstructions.keys.sorted().map { key in
            let strength = state.obstructions[key]?.strength ?? 0
            let obstruction=state.obstructions[key]
            let colors=obstruction?.sequence?.map { "\($0.color):\($0.sides.joined(separator:","))" }.joined(separator:";") ?? ""
            return "\(key):\(strength):\(obstruction?.step ?? 0):\(colors)"
        }.joined(separator: ";")
        let key = "\(size)|\(state.grid)|\(String(describing:state.active))|\(state.ghostY)|\(obstacleKey)|\(state.paused)|\(state.ready)|\(String(describing:state.tags))|\(String(describing:state.visible))|\(String(describing:state.verb))|\(state.objective?.piecesLeft ?? -1)"
        if key != previousKey {
            previousKey = key; boardLayer.removeAllChildren();obstructionPulses=[];pieceGlows=[];cueKey=""
            pieceLayer.removeAllChildren();sealLayer.removeAllChildren();badgeLayer.removeAllChildren()
            pieceLayer.zPosition=5;sealLayer.zPosition=2;badgeLayer.zPosition=10
            boardLayer.addChild(pieceLayer);boardLayer.addChild(sealLayer);boardLayer.addChild(badgeLayer)
            let cell = size.width / CGFloat(state.width)
            drawZones(state,cell:cell)
            for row in 0..<state.height {
                for column in 0..<state.width {
                    let rect = CGRect(x: CGFloat(column) * cell, y: size.height - CGFloat(row + 1) * cell, width: cell, height: cell)
                    let outline = SKShapeNode(rect:rect.insetBy(dx:cell/60,dy:cell/60))
                    outline.strokeColor=NativeAtlas.color("#1d2238");outline.lineWidth=cell/30
                    boardLayer.addChild(outline)
                    let visible=state.visible.flatMap {row<$0.count && column<$0[row].count ? $0[row][column]:nil} ?? true
                    if let color = state.grid[row][column],visible {
                        let pulse=Self.drawBlock(color,obstruction:state.obstructions["\(column),\(row)"],at:rect,timeMs:state.visualTimeMs,into:boardLayer)
                        if let pulse=pulse {obstructionPulses.append(pulse)}
                        if state.verb?.verb=="plant",let zones=state.verb?.params.zones,column<zones.count,zones[column]==color {
                            Self.icon("herb",at:webRect(CGFloat(column*30+9),CGFloat(row*30+8),12,12,scale:cell/30),into:boardLayer)
                        }
                    }
                    if state.visible != nil,state.grid[row][column] != nil,state.grid.firstIndex(where:{column<$0.count && $0[column] != nil})==row {
                        let rim=SKShapeNode(rect:rect.insetBy(dx:cell/15,dy:cell/15));rim.strokeColor=NativeAtlas.color("#d8dff5");rim.lineWidth=cell/30;boardLayer.addChild(rim)
                    }
                    if visible,let tags=state.tags,row < tags.count,column < tags[row].count,let tag=tags[row][column] {
                        drawTag(tag,at:rect)
                    }
                }
            }
            if let piece = state.active, (!state.paused || state.ready) {
                for (index, offset) in piece.cells.enumerated() where offset.count == 2 {
                    let column = (piece.x ?? 0) + offset[0]
                    let ghostRow = state.ghostY + offset[1]
                    let row = (piece.y ?? 0) + offset[1]
                    let color = piece.colors[index]
                    if ghostRow >= 0 { crystal(color, at: CGRect(x: CGFloat(column)*cell, y:size.height-CGFloat(ghostRow+1)*cell,width:cell,height:cell), opacity:0.18) }
                    if row >= 0 && piece.recolored == true {
                        let rect=CGRect(x:CGFloat(column)*cell,y:size.height-CGFloat(row+1)*cell,width:cell,height:cell)
                        let glow=SKShapeNode(rect:rect.insetBy(dx:cell/10,dy:cell/10),cornerRadius:cell/8)
                        glow.strokeColor=Self.color(color);glow.fillColor=Self.color(color).withAlphaComponent(0.08);glow.lineWidth=cell/15;glow.zPosition = -1
                        pieceLayer.addChild(glow);pieceGlows.append(glow)
                    }
                    if row >= 0 { crystal(color, at: CGRect(x:CGFloat(column)*cell,y:size.height-CGFloat(row+1)*cell,width:cell,height:cell),opacity:1) }
                }
            }
        }
        let timeMs=state.visualTimeMs
        let shake=state.feedback.last(where:{$0.kind=="shake" && $0.target=="board"})
        let dx:CGFloat = UIAccessibility.isReduceMotionEnabled ? 0 : shake.map { CGFloat(sin(timeMs/18)*5*max(0,1-$0.elapsedMs/max(1,$0.durationMs)))*size.width/CGFloat(state.width*30) } ?? 0
        boardLayer.position.x=dx;effectLayer.position.x=dx
        for glow in pieceGlows {glow.glowWidth=size.width/CGFloat(state.width)*(UIAccessibility.isReduceMotionEnabled ? 0.33 : 0.33+0.2*CGFloat(sin(timeMs/120)))}
        for pulse in obstructionPulses {pulse.update(timeMs:timeMs)}
        drawSealAndBadges(state,timeMs:timeMs)
        effectLayer.isHidden=false
        boardLayer.isHidden=effectLayer.render(state,size:size,timeMs:state.visualTimeMs)
    }

    /// All scene geometry uses the web board's 30px logical cell coordinates.
    private func webRect(_ x:CGFloat,_ y:CGFloat,_ width:CGFloat,_ height:CGFloat,scale:CGFloat)->CGRect {
        CGRect(x:x*scale,y:size.height-(y+height)*scale,width:width*scale,height:height*scale)
    }
    @discardableResult private func fill(_ rect:CGRect,_ color:UIColor,into parent:SKNode)->SKSpriteNode {
        let node=SKSpriteNode(color:color,size:rect.size);node.anchorPoint = .zero;node.position=rect.origin;parent.addChild(node);return node
    }
    private func text(_ value:String,x:CGFloat,y:CGFloat,size:CGFloat,color:UIColor,centered:Bool=false,outlined:Bool=false,scale:CGFloat,into parent:SKNode) {
        let label=SKLabelNode(fontNamed:UIFont.boldSystemFont(ofSize:size*scale).fontName)
        label.fontSize=size*scale;label.fontColor=color;label.horizontalAlignmentMode=centered ? .center:.left;label.verticalAlignmentMode = .baseline
        label.position=CGPoint(x:x*scale,y:self.size.height-y*scale)
        if outlined {label.attributedText=NSAttributedString(string:value,attributes:[.font:UIFont.boldSystemFont(ofSize:size*scale),.foregroundColor:color,.strokeColor:NativeAtlas.color("#10132a"),.strokeWidth: -20])}
        else {label.text=value}
        parent.addChild(label)
    }
    private func drawZones(_ state:BattleState,cell:CGFloat) {
        let k=cell/30,width=CGFloat(state.width*30),height=CGFloat(state.height*30)
        switch state.verb?.verb {
        case "plant":
            let limit=max(1,state.verb?.params.pieceLimit ?? state.objective?.piecesLeft ?? 1)
            let left=state.objective?.piecesLeft ?? limit
            let dayGone=max(0,min(1,1-Double(left)/Double(limit)))
            let sun=SKShapeNode(circleOfRadius:8*k);sun.position=CGPoint(x:(9+CGFloat(dayGone)*(width-18))*k,y:size.height-14*k)
            sun.fillColor=NativeAtlas.color(dayGone>0.85 ? "#ff9a3c":"#f5d77b");sun.strokeColor = .clear;boardLayer.addChild(sun)
            let zones=state.verb?.params.zones ?? []
            for (column,color) in zones.enumerated() {if let color=color {
                fill(webRect(CGFloat(column*30),0,30,height,scale:k),Self.color(color).withAlphaComponent(37/255),into:boardLayer)
                fill(webRect(CGFloat(column*30+8),height-5,14,3,scale:k),Self.color(color),into:boardLayer)
            }}
            for column in stride(from:0,to:state.width,by:2) {
                let bed=column<zones.count && zones[column] != nil
                text(bed ? "BED":"PATH",x:CGFloat((column+1)*30),y:38,size:11,color:NativeAtlas.color(bed ? "#9eeeb4":"#8b91a5"),centered:true,scale:k,into:boardLayer)
            }
        case "build":
            for area in state.verb?.params.outline ?? [] where area.cols.count==2 && area.rows.count==2 {
                let rect=webRect(CGFloat(area.cols[0]*30),CGFloat((state.height-area.rows[1])*30),CGFloat((area.cols[1]-area.cols[0]+1)*30),CGFloat((area.rows[1]-area.rows[0]+1)*30),scale:k)
                fill(rect,Self.color("cyan").withAlphaComponent(26/255),into:boardLayer)
                let path=CGPath(rect:rect.insetBy(dx:k,dy:k),transform:nil).copy(dashingWithPhase:0,lengths:[6*k,4*k])
                let outline=SKShapeNode(path:path);outline.strokeColor=NativeAtlas.color("#a6edfa");outline.lineWidth=2*k;boardLayer.addChild(outline)
            }
            if let spare=state.verb?.params.spare,spare.cols.count==2,spare.rows.count==2 {
                let rect=webRect(CGFloat(spare.cols[0]*30+1),CGFloat((state.height-spare.rows[1])*30+1),CGFloat((spare.cols[1]-spare.cols[0]+1)*30-2),CGFloat((spare.rows[1]-spare.rows[0]+1)*30-2),scale:k)
                let outline=SKShapeNode(rect:rect);outline.strokeColor=NativeAtlas.color("#b89b75");outline.lineWidth=2*k;boardLayer.addChild(outline)
            }
        case "dig":
            if let lip=state.verb?.params.lip {
                let path=CGMutablePath();path.move(to:CGPoint(x:0,y:CGFloat(lip)*cell));path.addLine(to:CGPoint(x:size.width,y:CGFloat(lip)*cell))
                let line=SKShapeNode(path:path);line.strokeColor=NativeAtlas.color("#e6bb8d");line.lineWidth=3*k;boardLayer.addChild(line)
            }
        default:break
        }
    }
    private func drawTag(_ tag:String,at rect:CGRect) {
        let k=rect.width/30
        func point(_ x:CGFloat,_ y:CGFloat)->CGPoint {CGPoint(x:rect.minX+x*k,y:rect.maxY-y*k)}
        switch tag {
        case "target":
            let outline=SKShapeNode(rect:CGRect(x:rect.minX+5*k,y:rect.minY+5*k,width:20*k,height:20*k));outline.strokeColor=NativeAtlas.color("#7fd4ff");outline.lineWidth=4*k;boardLayer.addChild(outline)
            fill(CGRect(x:rect.minX+11*k,y:rect.minY+2*k,width:8*k,height:26*k),NativeAtlas.color("#c2efff"),into:boardLayer)
        case "protected":Self.icon("mushroom",at:CGRect(x:rect.minX+3*k,y:rect.minY+3*k,width:24*k,height:24*k),into:boardLayer)
        case "hazard","spore":
            for (x,y) in [(8,9),(20,12),(13,22)] {
                let mark=SKShapeNode(circleOfRadius:3*k);mark.position=point(CGFloat(x),CGFloat(y));mark.fillColor=NativeAtlas.color(tag=="spore" ? "#d3ff9c":"#d095ff");mark.strokeColor = .clear;boardLayer.addChild(mark)
            }
        case "ridge":
            let path=CGMutablePath();path.move(to:point(3,24));path.addLine(to:point(15,7));path.addLine(to:point(27,24))
            let mark=SKShapeNode(path:path);mark.strokeColor=NativeAtlas.color("#bd9260");mark.lineWidth=3*k;boardLayer.addChild(mark)
        default:break
        }
    }
    private func drawSealAndBadges(_ state:BattleState,timeMs:Double) {
        let k=size.width/CGFloat(state.width*30),height=CGFloat(state.height*30)
        let reduced=UIAccessibility.isReduceMotionEnabled
        let sealKey=state.seal.map {"\($0.column):\($0.pieces)"} ?? ""
        let key="\(size)|\(sealKey)|\(state.slowPieces ?? 0)|\(state.hastePieces ?? 0)|\(Int(ceil((state.quickenMs ?? 0)/1000)))"
        if key != cueKey {
        cueKey=key;sealLayer.removeAllChildren();badgeLayer.removeAllChildren();sealIcon=nil;badgeIcons=[]
        if let seal=state.seal,seal.column>=0,seal.column<state.width {
            let x=CGFloat(seal.column*30)
            fill(webRect(x,0,30,height,scale:k),UIColor(red:120/255,green:132/255,blue:160/255,alpha:0.38),into:sealLayer)
            let path=CGMutablePath()
            for y in stride(from:-30,to:Int(height),by:14) {
                var sx=x,sy=CGFloat(y+30),ex=x+30,ey=CGFloat(y)
                guard sy>0,ey<height else{continue}
                if sy>height {sx += sy-height;sy=height}
                if ey<0 {ex += ey;ey=0}
                path.move(to:CGPoint(x:sx*k,y:size.height-sy*k));path.addLine(to:CGPoint(x:ex*k,y:size.height-ey*k))
            }
            let hatches=SKShapeNode(path:path);hatches.strokeColor=UIColor(red:200/255,green:210/255,blue:230/255,alpha:0.35);hatches.lineWidth=2*k;sealLayer.addChild(hatches)
            let rim=SKShapeNode(rect:webRect(x+1,1,28,height-2,scale:k));rim.strokeColor=NativeAtlas.color("#b9c6d8");rim.lineWidth=k;sealLayer.addChild(rim)
            sealIcon=Self.icon("lock",at:webRect(x+3,6,24,24,scale:k),into:sealLayer)
            text(String(seal.pieces),x:x+10,y:54,size:15,color:.white,outlined:true,scale:k,into:sealLayer)
        }
        var badges:[(String,Int)]=[]
        if let slow=state.slowPieces,slow>0 {badges.append(("wind",slow))}
        if let haste=state.hastePieces,haste>0 {badges.append(("haste",haste))}
        if let quicken=state.quickenMs,quicken>0 {badges.append(("hourglass",Int(ceil(quicken/1000))))}
        let right=state.seal.map {$0.column>=state.width-2 ? CGFloat($0.column*30):CGFloat(state.width*30)} ?? CGFloat(state.width*30)
        for (i,badge) in badges.enumerated() {
            let x=right-52,y=CGFloat(8+i*34)
            fill(webRect(x-4,y-2,52,30,scale:k),NativeAtlas.color("#10132a").withAlphaComponent(0.8),into:badgeLayer)
            let icon=Self.icon(badge.0,at:webRect(x,y,24,24,scale:k),into:badgeLayer)
            badgeIcons.append((icon,icon.position.y,badge.0 != "wind"))
            text(String(badge.1),x:x+30,y:y+20,size:15,color:.white,outlined:true,scale:k,into:badgeLayer)
        }
        }
        sealIcon?.position.y=size.height-(30+(reduced ? 0:CGFloat(sin(timeMs/200)*2)))*k
        for badge in badgeIcons {badge.node.position.y=badge.baseY-(badge.bobs && !reduced ? CGFloat(sin(timeMs/90)*2)*k:0)}
    }

    private func crystal(_ name:String,at rect:CGRect,opacity:CGFloat) {
        Self.drawBlock(name,at:rect,opacity:opacity,into:pieceLayer)
    }

    /// Draw the same cached, web-generated faces in the board, previews and spell traces.
    /// Only the current requirement's sides pulse; dots preserve the full remaining sequence.
    @discardableResult static func drawBlock(_ color:String,obstruction:NativeObstruction?=nil,at rect:CGRect,opacity:CGFloat=1,timeMs:Double=0,into parent:SKNode)->NativeObstructionPulse? {
        let asset:String
        if let obstruction=obstruction {asset="stone-\(max(1,min(3,obstruction.strength)))"}
        else {asset="crystal-\(color)\(color != "neutral" && color != "stone" && rect.width>=24 ? "-rune":"")"}
        let container=SKNode();container.position=rect.origin;container.alpha=opacity;parent.addChild(container)
        let face=SKSpriteNode(texture:sharedTexture(asset,pixels:30));face.anchorPoint = .zero;face.size=rect.size;container.addChild(face)
        guard let obstruction=obstruction else{return nil}
        let k=rect.width/30
        func box(_ x:CGFloat,_ y:CGFloat,_ width:CGFloat,_ height:CGFloat,_ color:UIColor)->SKSpriteNode {
            let node=SKSpriteNode(color:color,size:CGSize(width:width*k,height:height*k));node.anchorPoint = .zero
            node.position=CGPoint(x:x*k,y:rect.height-(y+height)*k);container.addChild(node);return node
        }
        let strength=max(0,obstruction.strength),pipWidth=CGFloat(strength*5-2)
        for i in 0..<strength {
            let x=floor((30-pipWidth)/2)+CGFloat(i*5)
            _=box(x-1,12,5,6,NativeAtlas.color("#272532"))
            _=box(x,13,3,3,NativeAtlas.color("#f6f2e7"))
        }
        let remaining=Array((obstruction.sequence ?? []).dropFirst(max(0,obstruction.step ?? 0)))
        guard let first=remaining.first else{return nil}
        var edges:[SKSpriteNode]=[]
        for side in first.sides {
            switch side {
            case "top":edges.append(box(1,1,28,3,Self.color(first.color)))
            case "bottom":edges.append(box(1,26,28,3,Self.color(first.color)))
            case "left":edges.append(box(1,1,3,28,Self.color(first.color)))
            case "right":edges.append(box(26,1,3,28,Self.color(first.color)))
            default:break
            }
        }
        for (i,touch) in remaining.enumerated() {_=box(CGFloat(4+i*5),22,3,3,Self.color(touch.color))}
        let pulse=NativeObstructionPulse(edges:edges,remaining:remaining);pulse.update(timeMs:timeMs);return pulse
    }

    @discardableResult static func icon(_ name:String,at rect:CGRect,opacity:CGFloat=1,into parent:SKNode)->SKSpriteNode {
        let node=SKSpriteNode(texture:sharedTexture("icon-\(name)",pixels:12));node.anchorPoint = .zero;node.position=rect.origin;node.size=rect.size;node.alpha=opacity;parent.addChild(node);return node
    }
    private static func sharedTexture(_ name:String,pixels:Int)->SKTexture {
        if let cached=sharedTextures[name] {return cached}
        guard let image=NativeAtlas.shared.image("native-visuals/\(name).png",x:0,y:0,width:pixels,height:pixels) else {
            preconditionFailure("Missing bundled web visual: \(name).png")
        }
        let texture=SKTexture(image:image);texture.filteringMode = .nearest;sharedTextures[name]=texture;return texture
    }

    static func color(_ name: String) -> UIColor {
        let hex: UInt32
        switch name {
        case "red": hex=0xFF7C9B
        case "blue": hex=0x7296FF
        case "cyan": hex=0x61D9E8
        case "green": hex=0x72E6A2
        case "gold": hex=0xF6D365
        case "orange": hex=0xFFAD69
        case "violet": hex=0xBD91FF
        case "neutral": hex=0xB8C1CB
        default: hex=0x6B6577
        }
        return UIColor(red:CGFloat((hex>>16)&255)/255,green:CGFloat((hex>>8)&255)/255,blue:CGFloat(hex&255)/255,alpha:1)
    }
}

final class NativeBoardView: SKView {
    var began: ((Int,CGPoint,Double)->Void)?
    var moved: ((Int,CGPoint,Double)->Void)?
    var ended: ((Int,CGPoint,Double)->Void)?
    var cancelled: ((Int)->Void)?
    private var identifiers: [ObjectIdentifier:Int] = [:]
    private var nextIdentifier = 0
    private func identifier(_ touch: UITouch) -> Int {
        let key=ObjectIdentifier(touch)
        if let value=identifiers[key] { return value }
        nextIdentifier += 1;identifiers[key]=nextIdentifier;return nextIdentifier
    }
    override func touchesBegan(_ touches:Set<UITouch>,with event:UIEvent?) {
        for touch in touches { began?(identifier(touch),touch.location(in:self),touch.timestamp) }
    }
    override func touchesMoved(_ touches:Set<UITouch>,with event:UIEvent?) {
        for touch in touches { moved?(identifier(touch),touch.location(in:self),touch.timestamp) }
    }
    override func touchesEnded(_ touches:Set<UITouch>,with event:UIEvent?) {
        for touch in touches { ended?(identifier(touch),touch.location(in:self),touch.timestamp);identifiers.removeValue(forKey:ObjectIdentifier(touch)) }
    }
    override func touchesCancelled(_ touches:Set<UITouch>,with event:UIEvent?) {
        for touch in touches { cancelled?(identifier(touch));identifiers.removeValue(forKey:ObjectIdentifier(touch)) }
    }
}
