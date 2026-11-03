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
    private var stoneNodes:[String:SKNode]=[:]
    private var decorationNodes:[String:SKNode]=[:]
    private var mapID=""
    private var previousHero:(Int,Int)?
    private var cameraTarget:CGPoint?
    private var standingTexture:SKTexture?
    private var walkingTextures:[SKTexture]=[]
    private var gaitTime:TimeInterval=0
    private var lastFrameTime:TimeInterval?
    private var lastMovingFrame:TimeInterval?
    private var animationTime:TimeInterval=0
    private var bases:[String:CampaignSprite]=[:]
    private var animations:[CampaignWorldAnimation]=[]
    private var decorations:[CampaignWorldDecoration]=[]
    private var markers:[CampaignMarker]=[]
    private var animationFrames:[String:Int]=[:]
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
        let canGlide = !changedMap && !changedSize && (distance.map {$0 <= 1} ?? false)
        if changedSize {size=newSize}
        backgroundColor=NativeAtlas.color(state.background);view?.backgroundColor=backgroundColor
        if changedMap {
            content.removeAllActions();content.removeAllChildren()
            nodes.removeAll();stoneNodes.removeAll();decorationNodes.removeAll();bases.removeAll();animationFrames.removeAll()
            mapID=state.mapId;cameraTarget=nil;standingTexture=nil;walkingTextures=[];gaitTime=0;lastMovingFrame=nil
        }
        let camera=CGPoint(x:-state.camX,y:state.height+state.camY)
        let duration=UIAccessibility.isReduceMotionEnabled ? 0:0.125
        if !canGlide {content.removeAction(forKey:"camera");content.position=camera}
        else if cameraTarget != camera {content.run(.move(to:camera,duration:duration),withKey:"camera")}
        cameraTarget=camera
        animations=state.animations;decorations=state.decorations;markers=state.markers
        let animatedIDs=Set(animations.map{$0.id})
        var visible=Set<String>()
        for (index,sprite) in state.sprites.enumerated() {
            visible.insert(sprite.id)
            let node:SKSpriteNode
            let created=nodes[sprite.id]==nil
            if let existing=nodes[sprite.id] {node=existing}
            else {node=SKSpriteNode();node.anchorPoint=CGPoint(x:0,y:1);nodes[sprite.id]=node;content.addChild(node)}
            let old=bases[sprite.id]
            let changedArt=old?.source != sprite.source || old?.sx != sprite.sx || old?.sy != sprite.sy || old?.sw != sprite.sw || old?.sh != sprite.sh
            bases[sprite.id]=sprite
            if sprite.id=="hero" {
                standingTexture=NativeAtlas.shared.texture(sprite)
                walkingTextures=NativeAtlas.shared.walker(sprite.source,row:Int(sprite.sy)/48)
                if node.action(forKey:"walk")==nil {node.texture=standingTexture}
            } else if !animatedIDs.contains(sprite.id) || created || changedArt {
                node.texture=NativeAtlas.shared.texture(sprite);animationFrames.removeValue(forKey:sprite.id)
            }
            node.size=CGSize(width:sprite.width,height:sprite.height);node.alpha=sprite.alpha;node.zPosition=CGFloat(index)
            let position=CGPoint(x:sprite.x+state.camX,y:-sprite.y-state.camY)
            if sprite.id=="hero" && !created && canGlide && moved {node.run(.move(to:position,duration:duration),withKey:"walk")}
            else if sprite.id != "hero" || created || !canGlide {node.removeAction(forKey:"walk");node.position=position;if sprite.id=="hero" {node.texture=standingTexture}}
        }
        for id in Array(nodes.keys) where !visible.contains(id) {nodes[id]?.removeFromParent();nodes.removeValue(forKey:id);bases.removeValue(forKey:id);animationFrames.removeValue(forKey:id)}
        adoptDecorations(state)
        adoptStones(state)
        previousHero=(state.heroX,state.heroY)
        animateWorld(at:animationTime)
    }
    private func adoptDecorations(_ state:CampaignWorld) {
        var visible=Set<String>()
        for decoration in decorations {
            visible.insert(decoration.id)
            let node:SKNode
            if let existing=decorationNodes[decoration.id] {node=existing}
            else {node=decoration.kind=="label" ? SKNode():SKShapeNode();decorationNodes[decoration.id]=node;content.addChild(node)}
            node.zPosition=decoration.layer=="under" ? CGFloat(state.groundCount)-0.5:CGFloat(state.overlayBase)-0.25
            if decoration.kind=="label" {
                node.zPosition=CGFloat(state.sprites.count+10)
                let label=(node.childNode(withName:"text") as? SKLabelNode) ?? SKLabelNode(fontNamed:"AvenirNext-Bold")
                if label.parent==nil {label.name="text";node.addChild(label)}
                label.fontSize=12;label.fontColor=NativeAtlas.color(decoration.color);label.text=decoration.text ?? "";label.horizontalAlignmentMode = .center;label.verticalAlignmentMode = .baseline;label.position=CGPoint(x:0,y:-14)
                let width=Double(label.frame.width)+12
                let x=max(width/2+2,min(state.width-width/2-2,decoration.x))
                let y=max(2,decoration.clampBottom == true ? min(state.height-22,decoration.y):decoration.y)
                node.position=CGPoint(x:x+state.camX,y:-y-state.camY)
                let background=(node.childNode(withName:"background") as? SKSpriteNode) ?? SKSpriteNode()
                if background.parent==nil {background.name="background";background.zPosition = -1;node.addChild(background)}
                background.color=UIColor(red:16/255,green:24/255,blue:43/255,alpha:0.92);background.anchorPoint=CGPoint(x:0.5,y:1);background.position = .zero;background.size=CGSize(width:width,height:20)
            } else if let shape=node as? SKShapeNode {
                let w=decoration.width ?? 0,h=decoration.height ?? 0
                shape.path=decoration.kind=="ellipse" ? CGPath(ellipseIn:CGRect(x:-w/2,y:-h/2,width:w,height:h),transform:nil):CGPath(rect:CGRect(x:0,y:-h,width:w,height:h),transform:nil)
                shape.fillColor=NativeAtlas.color(decoration.color).withAlphaComponent(CGFloat(decoration.alpha ?? 1))
                shape.strokeColor=decoration.stroke.map(NativeAtlas.color) ?? .clear;shape.lineWidth=CGFloat(decoration.lineWidth ?? 0)
                shape.position=CGPoint(x:decoration.x+state.camX,y:-decoration.y-state.camY)
            }
        }
        for id in Array(decorationNodes.keys) where !visible.contains(id) {decorationNodes[id]?.removeFromParent();decorationNodes.removeValue(forKey:id)}
    }
    private func adoptStones(_ state:CampaignWorld) {
        var visible=Set<String>()
        for marker in markers {
            visible.insert(marker.element)
            let node:SKNode
            if let existing=stoneNodes[marker.element] {node=existing}
            else {
                node=SKNode();stoneNodes[marker.element]=node;content.addChild(node)
                let path=CGMutablePath();path.move(to:CGPoint(x:-7,y:2));path.addLines(between:[CGPoint(x:-5,y:30),CGPoint(x:0,y:38),CGPoint(x:5,y:30),CGPoint(x:7,y:2)]);path.closeSubpath()
                let stone=SKShapeNode(path:path);stone.name="stone";stone.strokeColor=NativeAtlas.color("#1a1a26");stone.lineWidth=1;node.addChild(stone)
                let glow=SKShapeNode(ellipseOf:CGSize(width:38.4,height:16));glow.name="glow";glow.strokeColor = .clear;glow.position=CGPoint(x:0,y:4);glow.zPosition = -1;node.addChild(glow)
            }
            node.position=CGPoint(x:marker.x+state.camX,y:-marker.y-state.camY-16);node.zPosition=CGFloat(state.groundCount)-0.25
            (node.childNode(withName:"stone") as? SKShapeNode)?.fillColor=NativeAtlas.color(marker.color)
            node.childNode(withName:"stone")?.alpha=marker.lit ? 1:0.45
            (node.childNode(withName:"glow") as? SKShapeNode)?.fillColor=NativeAtlas.color(marker.color)
        }
        for id in Array(stoneNodes.keys) where !visible.contains(id) {stoneNodes[id]?.removeFromParent();stoneNodes.removeValue(forKey:id)}
    }
    private func animateWorld(at time:TimeInterval) {
        let reduced=UIAccessibility.isReduceMotionEnabled
        for animation in animations {
            guard let node=nodes[animation.id],let base=bases[animation.id] else{continue}
            let frame=reduced || animation.fps<=0 ? 0:Int(floor((time+(animation.phase ?? 0))*animation.fps)) % max(1,animation.frames)
            if animationFrames[animation.id] != frame {
                let offset=animation.offsets.flatMap {frame<$0.count ? $0[frame]:nil}
                let sprite=CampaignSprite(id:base.id,source:base.source,sx:base.sx+(offset?.first ?? Double(frame)*base.sw),sy:base.sy+(offset.flatMap {$0.count>1 ? $0[1]:nil} ?? 0),sw:base.sw,sh:base.sh,x:base.x,y:base.y,width:base.width,height:base.height,alpha:base.alpha)
                node.texture=NativeAtlas.shared.texture(sprite);animationFrames[animation.id]=frame
            }
            if let motion=animation.motion,let target=cameraTarget {
                let dy=reduced ? 0:motion=="leap" ? round(abs(sin(time*1000/180))*6):-round(sin(time*1000/250)*2)
                node.position=CGPoint(x:base.x-Double(target.x),y:-base.y-Double(target.y-size.height)+dy)
            }
        }
        for decoration in decorations {
            guard let node=decorationNodes[decoration.id] else{continue}
            if let mean=decoration.pulseMean {
                node.alpha=CGFloat(reduced ? mean:mean+(decoration.pulseAmplitude ?? 0)*sin(time*1000/max(1,decoration.pulsePeriod ?? 1000)))
            } else {node.alpha=1}
        }
        for marker in markers {
            stoneNodes[marker.element]?.childNode(withName:"glow")?.alpha=marker.lit ? CGFloat(reduced ? 0.5:0.5+0.25*sin(time*1000/300)):0
        }
    }
    override func update(_ currentTime:TimeInterval) {
        let delta=lastFrameTime.map {min(0.05,max(0,currentTime-$0))} ?? 0
        lastFrameTime=currentTime;animationTime=currentTime
        animateWorld(at:currentTime)
        guard let hero=nodes["hero"] else{return}
        guard !UIAccessibility.isReduceMotionEnabled,hero.action(forKey:"walk") != nil,walkingTextures.count==4 else {hero.texture=standingTexture;return}
        if lastMovingFrame.map({currentTime-$0>0.08}) ?? true {gaitTime=0}
        gaitTime += delta;lastMovingFrame=currentTime
        hero.texture=walkingTextures[(1+Int(gaitTime*8)) % 4]
    }
}
