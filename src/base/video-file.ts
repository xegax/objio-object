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
  filter?: FilterArgs;
}

export interface TimeCutRange {
  startSec: number;
  endSec: number;
}

export interface FilterArgs {
  cut?: TimeCutRange;
  crop?: Rect;
}

export interface ExecuteArgs {
  filter: FilterArgs;
  id?: string;
}

export interface CutId {
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

  abstract save(args: ExecuteArgs): Promise<void>;
  abstract append(args: ExecuteArgs): Promise<void>;
  abstract execute(args: ExecuteArgs): Promise<void>;
  abstract removeSplit(args: CutId): Promise<void>;
  abstract updateDesciption(): Promise<void>;

  static TYPE_ID = 'VideoFileObject';
  static SERIALIZE: SERIALIZER = () => ({
    ...FileObjectBase.SERIALIZE(),
    desc:     { type: 'json', const: true },
    subfiles: { type: 'json', const: true }
  })
}
