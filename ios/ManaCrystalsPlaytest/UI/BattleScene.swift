import SpriteKit
import UIKit

final class BattleScene: SKScene {
    private let boardLayer = SKNode()
    private let effectLayer = SKNode()
    private var previousKey = ""

    override func didMove(to view: SKView) {
        backgroundColor = UIColor(red: 0.035, green: 0.045, blue: 0.085, alpha: 1)
        addChild(boardLayer); addChild(effectLayer)
        effectLayer.zPosition = 20
        isUserInteractionEnabled = false
    }

    func render(_ state: BattleState) {
        if state.paused && !state.ready {
            boardLayer.removeAllChildren();effectLayer.removeAllChildren();previousKey="paused";return
        }
        let obstacleKey = state.obstructions.keys.sorted().map { key in
            let strength = state.obstructions[key]?.strength ?? 0
            let colors = state.obstructions[key]?.sequence?.map { $0.color }.joined(separator: ",") ?? ""
            return "\(key):\(strength):\(colors)"
        }.joined(separator: ";")
        let key = "\(size)|\(state.grid)|\(String(describing:state.active))|\(state.ghostY)|\(obstacleKey)|\(state.paused)|\(state.ready)|\(String(describing:state.tags))"
        if key != previousKey {
            previousKey = key; boardLayer.removeAllChildren()
            let cell = size.width / CGFloat(state.width)
            if let zones=state.verb?.params.zones {
                for (column,color) in zones.enumerated() {
                    guard let color=color else{continue}
                    let band=SKShapeNode(rect:CGRect(x:CGFloat(column)*cell,y:0,width:cell,height:size.height))
                    band.fillColor=Self.color(color).withAlphaComponent(0.12);band.strokeColor = .clear;boardLayer.addChild(band)
                }
            }
            for area in state.verb?.params.outline ?? [] where area.cols.count==2 && area.rows.count==2 {
                let rect=CGRect(x:CGFloat(area.cols[0])*cell,y:CGFloat(area.rows[0]-1)*cell,width:CGFloat(area.cols[1]-area.cols[0]+1)*cell,height:CGFloat(area.rows[1]-area.rows[0]+1)*cell)
                let outline=SKShapeNode(rect:rect.insetBy(dx:1,dy:1));outline.strokeColor = .cyan;outline.lineWidth=2;outline.fillColor=UIColor.cyan.withAlphaComponent(0.07);boardLayer.addChild(outline)
            }
            if let lip=state.verb?.params.lip {
                let line=SKShapeNode(rect:CGRect(x:0,y:CGFloat(lip)*cell,width:size.width,height:2));line.fillColor = .systemOrange;line.strokeColor = .clear;boardLayer.addChild(line)
            }
            for row in 0..<state.height {
                for column in 0..<state.width {
                    let rect = CGRect(x: CGFloat(column) * cell, y: size.height - CGFloat(row + 1) * cell, width: cell, height: cell)
                    let outline = SKShapeNode(rect: rect.insetBy(dx: 0.5, dy: 0.5))
                    outline.strokeColor = UIColor(white: 0.18, alpha: 0.6); outline.lineWidth = 0.5
                    boardLayer.addChild(outline)
                    if let color = state.grid[row][column] {
                        crystal(color, at: rect, opacity: 1)
                        if let obstacle = state.obstructions["\(column),\(row)"] {
                            let number = SKLabelNode(fontNamed: "AvenirNext-Bold")
                            number.text = String(obstacle.strength); number.fontSize = max(12, cell * 0.48)
                            number.position = CGPoint(x: rect.midX, y: rect.midY); number.verticalAlignmentMode = .center
                            number.zPosition = 4; boardLayer.addChild(number)
                            if let colors = obstacle.sequence, let requiredColor = colors.first?.color {
                                let edge = SKShapeNode(rect: rect.insetBy(dx: 3, dy: 3), cornerRadius: 3)
                                edge.strokeColor = Self.color(requiredColor); edge.lineWidth = 3; edge.zPosition = 3
                                boardLayer.addChild(edge)
                            }
                        }
                    }
                    if let tags=state.tags,row < tags.count,column < tags[row].count,let tag=tags[row][column] {
                        let mark=SKShapeNode(rect:rect.insetBy(dx:cell*0.2,dy:cell*0.2),cornerRadius:3)
                        mark.strokeColor=tag=="target" ? .systemYellow : (tag=="protected" ? .systemTeal : tag=="ridge" ? .systemBrown : .systemPurple);mark.lineWidth=2;mark.zPosition=5;boardLayer.addChild(mark)
                    }
                }
            }
            if let piece = state.active, (!state.paused || state.ready) {
                for (index, offset) in piece.cells.enumerated() where offset.count == 2 {
                    let column = (piece.x ?? 0) + offset[0]
                    let ghostRow = state.ghostY + offset[1]
                    let row = (piece.y ?? 0) + offset[1]
                    let color = piece.colors[index]
                    if ghostRow >= 0 { crystal(color, at: CGRect(x: CGFloat(column)*cell, y:size.height-CGFloat(ghostRow+1)*cell,width:cell,height:cell), opacity:0.16) }
                    if row >= 0 { crystal(color, at: CGRect(x:CGFloat(column)*cell,y:size.height-CGFloat(row+1)*cell,width:cell,height:cell),opacity:1) }
                }
            }
        }
        effectLayer.removeAllChildren()
        let cell=size.width/CGFloat(state.width)
        for warning in state.telegraphs ?? [] {
            for spot in warning.cells ?? [] where spot.count==2 {
                let rect=CGRect(x:CGFloat(spot[0])*cell,y:size.height-CGFloat(spot[1]+1)*cell,width:cell,height:cell).insetBy(dx:2,dy:2)
                let mark=SKShapeNode(rect:rect,cornerRadius:3);mark.strokeColor = .systemPurple;mark.lineWidth=2;mark.fillColor=UIColor.systemPurple.withAlphaComponent(0.12);effectLayer.addChild(mark)
            }
            if let rows=warning.rows,rows>0 {
                let band=SKShapeNode(rect:CGRect(x:0,y:0,width:size.width,height:CGFloat(rows)*cell));band.fillColor=UIColor.systemPurple.withAlphaComponent(0.12);band.strokeColor = .systemPurple;effectLayer.addChild(band)
            }
        }
        if let effect = state.effect { drawEffect(effect, state: state) }
    }

    private func crystal(_ name: String, at rect: CGRect, opacity: CGFloat) {
        let r = rect.insetBy(dx: 1.5, dy: 1.5), bevel = r.width * 0.17
        let path = CGMutablePath()
        path.move(to: CGPoint(x:r.minX+bevel,y:r.minY))
        path.addLines(between:[CGPoint(x:r.maxX-bevel,y:r.minY),CGPoint(x:r.maxX,y:r.minY+bevel),CGPoint(x:r.maxX,y:r.maxY-bevel),CGPoint(x:r.maxX-bevel,y:r.maxY),CGPoint(x:r.minX+bevel,y:r.maxY),CGPoint(x:r.minX,y:r.maxY-bevel),CGPoint(x:r.minX,y:r.minY+bevel)])
        path.closeSubpath()
        let face = SKShapeNode(path:path)
        face.fillColor=Self.color(name);face.strokeColor=UIColor(white:0.05,alpha:0.8);face.lineWidth=1.5;face.alpha=opacity
        boardLayer.addChild(face)
        let inset = SKShapeNode(rect:r.insetBy(dx:4,dy:4),cornerRadius:3)
        inset.fillColor=UIColor(white:1,alpha:0.08);inset.strokeColor=UIColor(white:1,alpha:0.35);inset.lineWidth=1;inset.alpha=opacity
        boardLayer.addChild(inset)
        let shine = SKShapeNode()
        let line=CGMutablePath();line.move(to:CGPoint(x:r.minX+bevel,y:r.maxY-3));line.addLine(to:CGPoint(x:r.maxX-bevel,y:r.maxY-3))
        shine.path=line;shine.strokeColor=UIColor(white:1,alpha:0.55);shine.lineWidth=2;shine.alpha=opacity;boardLayer.addChild(shine)
    }

    private func drawEffect(_ effect: NativeEffect, state: BattleState) {
        let cell = size.width / CGFloat(state.width)
        let progress = CGFloat(1 - effect.remainingMs / max(1, effect.durationMs))
        let colors: [String: String] = ["fire":"red","blizzard":"blue","quake":"orange","gale":"cyan","thunder":"gold","natureConvert":"green"]
        let color=Self.color(colors[effect.school] ?? "violet")
        for row in effect.rows {
            let y=size.height-CGFloat(row+1)*cell
            let band=SKShapeNode(rect:CGRect(x:0,y:y,width:size.width,height:cell))
            band.fillColor=color.withAlphaComponent(effect.phase == "target" ? 0.12 : 0.24)
            band.strokeColor=color.withAlphaComponent(0.65);band.lineWidth=1;effectLayer.addChild(band)
            for i in 0..<min(10, max(3,effect.rank*2)) {
                let x=CGFloat(i+1)*size.width/CGFloat(min(10,max(3,effect.rank*2))+1)
                let path=CGMutablePath()
                switch effect.school {
                case "fire":
                    path.move(to:CGPoint(x:x-5,y:y));path.addQuadCurve(to:CGPoint(x:x+3,y:y+cell),control:CGPoint(x:x+12*progress,y:y+cell*0.55));path.addLine(to:CGPoint(x:x+6,y:y+cell*0.2))
                case "blizzard":
                    path.move(to:CGPoint(x:x-6,y:y+cell/2));path.addLine(to:CGPoint(x:x+6,y:y+cell/2));path.move(to:CGPoint(x:x,y:y+cell/2-8));path.addLine(to:CGPoint(x:x,y:y+cell/2+8))
                case "gale":
                    let shift=progress*cell
                    path.move(to:CGPoint(x:x-10+shift,y:y+cell/2));path.addLine(to:CGPoint(x:x+7+shift,y:y+cell/2));path.addLine(to:CGPoint(x:x+2+shift,y:y+cell/2+5))
                case "thunder":
                    path.move(to:CGPoint(x:x,y:y+cell));path.addLine(to:CGPoint(x:x-5,y:y+cell/2));path.addLine(to:CGPoint(x:x+5,y:y+cell/2));path.addLine(to:CGPoint(x:x,y:y))
                case "natureConvert":
                    path.move(to:CGPoint(x:x,y:y));path.addQuadCurve(to:CGPoint(x:x+5,y:y+cell),control:CGPoint(x:x-15,y:y+cell*0.6))
                default:
                    let down=progress*cell
                    path.move(to:CGPoint(x:x,y:y+cell-down));path.addLine(to:CGPoint(x:x,y:y+cell/2-down));path.addLine(to:CGPoint(x:x-4,y:y+cell/2+4-down));path.move(to:CGPoint(x:x,y:y+cell/2-down));path.addLine(to:CGPoint(x:x+4,y:y+cell/2+4-down))
                }
                let stroke=SKShapeNode(path:path);stroke.strokeColor=color;stroke.lineWidth=2.5;stroke.glowWidth=effect.phase == "target" ? 0 : 2
                effectLayer.addChild(stroke)
            }
        }
    }

    static func color(_ name: String) -> UIColor {
        let hex: UInt32
        switch name {
        case "red": hex=0xF37967
        case "blue": hex=0x6DBAFF
        case "cyan": hex=0x70DFEA
        case "green": hex=0x79DB9E
        case "gold": hex=0xF2CE74
        case "orange": hex=0xD8A074
        case "violet": hex=0xB59AE8
        case "neutral": hex=0xB6B8C5
        default: hex=0x666B80
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


final class NextPiecesView: UIView {
    var pieces: [NativePiece] = [] { didSet { if pieces != oldValue { setNeedsDisplay() } } }
    var lines = 0 { didSet { if lines != oldValue { setNeedsDisplay() } } }
    override var intrinsicContentSize: CGSize { CGSize(width:240,height:30) }
    override func draw(_ rect: CGRect) {
        let attributes: [NSAttributedString.Key:Any] = [.font:UIFont.monospacedSystemFont(ofSize:12,weight:.medium),.foregroundColor:UIColor.lightGray]
        ("NEXT" as NSString).draw(at:CGPoint(x:4,y:8),withAttributes:attributes)
        for (index,piece) in pieces.enumerated() {
            for (cell,offset) in piece.cells.enumerated() where offset.count == 2 {
                let r=CGRect(x:CGFloat(46+index*44+offset[0]*6),y:CGFloat(4+offset[1]*6),width:5,height:5)
                BattleScene.color(piece.colors[cell]).setFill();UIBezierPath(roundedRect:r,cornerRadius:1).fill()
            }
        }
        ("LINES \(lines)" as NSString).draw(at:CGPoint(x:bounds.width-68,y:8),withAttributes:attributes)
    }
}
