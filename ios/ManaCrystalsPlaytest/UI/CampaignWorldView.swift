import UIKit
import SpriteKit

/// Persistent render surface: map steps update retained sprites, never clear/recreate a UIKit drawing.
final class CampaignWorldView:SKView {
    private let worldScene=CampaignWorldScene(size:CGSize(width:416,height:640))
    var state:CampaignWorld? {didSet {if let state=state {worldScene.adopt(state);accessibilityValue="Column \(state.heroX), row \(state.heroY)"}}}
    var onTap:((Int,Int)->Void)?
    var onDirection:((String?)->Void)?
    override init(frame:CGRect) {
        super.init(frame:frame);preferredFramesPerSecond=60;ignoresSiblingOrder=false
        isMultipleTouchEnabled=true;isAccessibilityElement=true;accessibilityLabel="Campaign world. Tap to walk or drag and hold to move.";accessibilityIdentifier="campaign-world"
        worldScene.scaleMode = .aspectFit;presentScene(worldScene)
        let tap=UITapGestureRecognizer(target:self,action:#selector(tap(_:)))
        let pan=UIPanGestureRecognizer(target:self,action:#selector(pan(_:)));pan.maximumNumberOfTouches=1
        tap.require(toFail:pan);addGestureRecognizer(tap);addGestureRecognizer(pan)
        accessibilityCustomActions=[("Walk north","up"),("Walk south","down"),("Walk west","left"),("Walk east","right")].map {name,direction in UIAccessibilityCustomAction(name:name) {[weak self]_ in self?.onDirection?(direction);self?.onDirection?(nil);return true}}
    }
    required init?(coder:NSCoder){fatalError("Use init(frame:)")}
    func cancelMovement(){onDirection?(nil)}
    @objc private func tap(_ recognizer:UITapGestureRecognizer) {
        guard state != nil else{return}
        let point=worldScene.convertPoint(fromView:recognizer.location(in:self))
        guard worldScene.frame.contains(point) else{return}
        let tile=worldScene.tile(at:point);onTap?(tile.0,tile.1)
    }
    @objc private func pan(_ recognizer:UIPanGestureRecognizer) {
        guard recognizer.state == .began || recognizer.state == .changed,recognizer.numberOfTouches==1 else{onDirection?(nil);return}
        let delta=recognizer.translation(in:self);guard max(abs(delta.x),abs(delta.y))>=20 else{return}
        onDirection?(abs(delta.x)>abs(delta.y) ? (delta.x>0 ? "right":"left"):(delta.y>0 ? "down":"up"))
    }
}

private final class CampaignWorldScene:SKScene {
    private let content=SKNode()
    private var nodes:[String:SKSpriteNode]=[:]
    private var stoneNodes:[String:SKShapeNode]=[:]
    private var mapID=""
    private var previousHero:(Int,Int)?
    private var cameraTarget:CGPoint?
    private var standingTexture:SKTexture?
    private var walkingTextures:[SKTexture]=[]
    private var gaitTime:TimeInterval=0
    private var lastFrameTime:TimeInterval?
    private var lastMovingFrame:TimeInterval?
    override init(size:CGSize){super.init(size:size);addChild(content)}
    required init?(coder:NSCoder){fatalError("Use init(size:)")}
    func tile(at point:CGPoint)->(Int,Int) {
        let p=content.convert(point,from:self)
        return (Int(floor(p.x/32)),Int(floor(-p.y/32)))
    }
    func adopt(_ state:CampaignWorld) {
        let changedMap=mapID != state.mapId
        let newSize=CGSize(width:state.width,height:state.height)
        let changedSize=size != newSize
        let distance=previousHero.map {abs($0.0-state.heroX)+abs($0.1-state.heroY)}
        let moved=distance != nil && distance != 0
        // A normal grid step glides. A map transition, scripted relocation, or resize snaps
        // atomically to the new viewport instead of flying across unloaded terrain.
        let canGlide = !changedMap && !changedSize && (distance.map {$0 <= 1} ?? false)
        if changedSize {size=newSize}
        backgroundColor=NativeAtlas.color(state.background)
        view?.backgroundColor=backgroundColor
        if changedMap {
            content.removeAllActions();content.removeAllChildren()
            nodes.removeAll();stoneNodes.removeAll();mapID=state.mapId;cameraTarget=nil
            standingTexture=nil;walkingTextures=[];gaitTime=0;lastMovingFrame=nil
        }
        let camera=CGPoint(x:-state.camX,y:state.height+state.camY)
        let duration=UIAccessibility.isReduceMotionEnabled ? 0:0.125
        if !canGlide {
            content.removeAction(forKey:"camera");content.position=camera
        } else if cameraTarget != camera {
            content.run(.move(to:camera,duration:duration),withKey:"camera")
        }
        cameraTarget=camera
        var visible=Set<String>()
        for (index,sprite) in state.sprites.enumerated() {
            visible.insert(sprite.id)
            let node:SKSpriteNode
            let created=nodes[sprite.id]==nil
            if let existing=nodes[sprite.id] {node=existing}
            else {node=SKSpriteNode();node.anchorPoint=CGPoint(x:0,y:1);nodes[sprite.id]=node;content.addChild(node)}
            if sprite.id=="hero" {
                standingTexture=NativeAtlas.shared.texture(sprite)
                walkingTextures=NativeAtlas.shared.walker(sprite.source,row:Int(sprite.sy)/48)
                // Repeated state reads must not replace an in-flight walking frame.
                if node.action(forKey:"walk")==nil {node.texture=standingTexture}
            } else {node.texture=NativeAtlas.shared.texture(sprite)}
            node.size=CGSize(width:sprite.width,height:sprite.height)
            node.alpha=sprite.alpha;node.zPosition=CGFloat(index)
            let position=CGPoint(x:sprite.x+state.camX,y:-sprite.y-state.camY)
            if sprite.id=="hero" && !created && canGlide && moved {
                node.run(.move(to:position,duration:duration),withKey:"walk")
            } else if sprite.id != "hero" || created || !canGlide {
                node.removeAction(forKey:"walk");node.position=position;node.texture=NativeAtlas.shared.texture(sprite)
            }
            // A repeated read-only snapshot leaves an in-flight hero step alone.
        }
        for id in Array(nodes.keys) where !visible.contains(id) {nodes[id]?.removeFromParent();nodes.removeValue(forKey:id)}
        let colors:[String:UIColor]=["nature":.systemGreen,"water":.systemBlue,"earth":.systemOrange,"fire":.systemRed,"lightning":.systemYellow,"wind":.systemTeal,"arcane":.systemPurple]
        var visibleStones=Set<String>()
        for marker in state.markers {
            visibleStones.insert(marker.element)
            let stone:SKShapeNode
            if let existing=stoneNodes[marker.element] {stone=existing}
            else {stone=SKShapeNode(ellipseOf:CGSize(width:14,height:24));stoneNodes[marker.element]=stone;content.addChild(stone)}
            let color=colors[marker.element] ?? .white
            stone.fillColor=color;stone.strokeColor=color.withAlphaComponent(0.7)
            stone.alpha=marker.lit ? 1:0.55;stone.glowWidth=marker.lit ? 2:0
            stone.position=CGPoint(x:marker.x+state.camX,y:-marker.y-state.camY+4)
            stone.zPosition=CGFloat(state.sprites.count+1)
        }
        for id in Array(stoneNodes.keys) where !visibleStones.contains(id) {stoneNodes[id]?.removeFromParent();stoneNodes.removeValue(forKey:id)}
        previousHero=(state.heroX,state.heroY)
    }
    override func update(_ currentTime:TimeInterval) {
        let delta=lastFrameTime.map {min(0.05,max(0,currentTime-$0))} ?? 0
        lastFrameTime=currentTime
        guard let hero=nodes["hero"] else{return}
        guard !UIAccessibility.isReduceMotionEnabled,
              hero.action(forKey:"walk") != nil,walkingTextures.count==4 else {
            hero.texture=standingTexture
            return
        }
        // The authored sheets are four frames at 8fps, shared with the web renderer.
        // Keep the phase across adjacent grid steps; don't rush a whole cycle per tile.
        // A genuine stop starts the next walk with a visible stepping pose.
        if lastMovingFrame.map({currentTime-$0>0.08}) ?? true {gaitTime=0}
        gaitTime += delta
        lastMovingFrame=currentTime
        hero.texture=walkingTextures[(1+Int(gaitTime*8)) % 4]
    }
}
