import { OBJIOArray, OBJIOItem, SERIALIZER } from 'objio';
import { ObjectBase } from './object-base';
import { FileObjectBase } from './file-object';
import { Rect, Point, Size, inRect } from '../common/point';

export interface FrameInfo {
  rect: number;
  baseX: number;
  baseY: number;
}

export class AnimationBase extends OBJIOItem {
  name: string = 'default';
  frames = Array<FrameInfo>();

  constructor(name?: string, frames?: Array<FrameInfo>) {
    super();
    this.name = name || this.name;
    this.frames = frames || this.frames;
  }

  getSize(rects: Array<Rect>): Size {
    let size: Size = { width: 0, height: 0 };
    this.frames.forEach(frame => {
      size.width = Math.max(rects[frame.rect].width, size.width);
      size.height = Math.max(rects[frame.rect].height, size.height);
    });
    return size;
  }

  static TYPE_ID = 'Animation';
  static SERIALIZE: SERIALIZER = () => ({
    name:   { type: 'string' },
    frames: { type: 'json' }
  });
}

export class SpriteSheetBase extends ObjectBase {
  protected file: FileObjectBase;
  protected rects = Array<Rect>();
  protected anim = new OBJIOArray<AnimationBase>([new AnimationBase('default', [])]);

  getImageUrl(): string {
    if (!this.file)
      return '';

    return this.file.getPath();
  }

  getRects(): Array<Rect> {
    return this.rects;
  }

  getRectsCount(): number {
    return this.rects.length;
  }

  removeRect(idx: number): boolean {
    if (!this.rects.splice(idx, 1).length)
      return false;

    this.holder.delayedNotify();
    return true;
  }

  getAnim(): OBJIOArray<AnimationBase> {
    return this.anim;
  }

  hitTest(point: Point): number {
    return this.rects.findIndex(rect => inRect(rect, point));
  }

  static TYPE_ID = 'DocSpriteSheet';
  static SERIALIZE: SERIALIZER = () => ({
    ...ObjectBase.SERIALIZE(),
    file: {type: 'object'},
    rects: {type: 'json'},
    anim: {type: 'object'}
  });
}
