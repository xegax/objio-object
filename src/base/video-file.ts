import { Time } from '../common/time';
import { FileObjectBase, SendFileArgs } from './file-object';
import { SERIALIZER } from 'objio';
import { MediaStream } from '../task/media-desc';
import { Rect } from '../common/point';

export { SendFileArgs };

export interface MediaFileDesc {
  duration: Time;
  streamArr: Array<MediaStream>;
}

export interface Subfile {
  name: string;
  id: string;
  desc: Partial<MediaFileDesc>;
  execArgs?: ExecuteArgs;
}

export interface TimeCutRange {
  startSec: number;
  endSec: number;
}

export interface ExecuteArgs {
  timeCut?: TimeCutRange;
  frameCut?: Rect;
}

export interface SplitId {
  id: string;
}

export abstract class VideoFileBase extends FileObjectBase {
  protected desc: Partial<MediaFileDesc> = {};
  protected subfiles = Array<Subfile>();

  getDesc(): Partial<MediaFileDesc> {
    return this.desc;
  }

  getSubfiles() {
    return this.subfiles;
  }

  getObjFolder() {
    return `obj_${this.holder.getID()}`;
  }

  getSubfilesFolder() {
    return this.holder.getPublicPath(this.getObjFolder());
  }

  getSubfilePath(file: Subfile) {
    return this.getSubfilesFolder() + '/' + file.id + '.mp4';
  }

  findCutById(id: string): Subfile {
    return this.subfiles.find(item => item.id == id);
  }

  abstract execute(args: ExecuteArgs): Promise<void>;
  abstract removeSplit(args: SplitId): Promise<void>;
  abstract updateDesciption(): Promise<void>;

  static TYPE_ID = 'VideoFileObject';
  static SERIALIZE: SERIALIZER = () => ({
    ...FileObjectBase.SERIALIZE(),
    desc:     { type: 'json', const: true },
    subfiles: { type: 'json', const: true }
  })
}
