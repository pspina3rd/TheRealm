import UIKit
import SpriteKit

/// Reuse atlas regions across world frames and book scenes; never reload artwork per step.
final class NativeAtlas {
    static let shared=NativeAtlas()
    private var images:[String:CGImage]=[:]
    private var textures:[String:SKTexture]=[:]
    func image(_ source:String,x:Int,y:Int,width:Int,height:Int)->UIImage? {
        if images[source]==nil,let url=Bundle.main.resourceURL?.appendingPathComponent("assets/\(source)") {images[source]=UIImage(contentsOfFile:url.path)?.cgImage}
        guard let crop=images[source]?.cropping(to:CGRect(x:x,y:y,width:width,height:height)) else{return nil}
        return UIImage(cgImage:crop)
    }
    func texture(_ sprite:CampaignSprite)->SKTexture? {
        let key="\(sprite.source):\(sprite.sx):\(sprite.sy):\(sprite.sw):\(sprite.sh)"
        if let texture=textures[key] {return texture}
        guard let image=image(sprite.source,x:Int(sprite.sx),y:Int(sprite.sy),width:Int(sprite.sw),height:Int(sprite.sh)) else{return nil}
        let texture=SKTexture(image:image);texture.filteringMode = .nearest;textures[key]=texture;return texture
    }
    func walker(_ source:String,row:Int=0)->[SKTexture] {
        (0..<4).compactMap { index in
            let key="\(source):walker:\(row):\(index)"
            if let texture=textures[key] {return texture}
            guard let image=image(source,x:index*48,y:row*48,width:48,height:48) else{return nil}
            let texture=SKTexture(image:image);texture.filteringMode = .nearest;textures[key]=texture;return texture
        }
    }
    static func color(_ hex:String)->UIColor {
        let number=UInt32(hex.trimmingCharacters(in:CharacterSet(charactersIn:"#")),radix:16) ?? 0x101521
        return UIColor(red:CGFloat((number>>16)&255)/255,green:CGFloat((number>>8)&255)/255,blue:CGFloat(number&255)/255,alpha:1)
    }
}
