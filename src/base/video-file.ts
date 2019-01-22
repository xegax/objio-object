import { Time } from '../common/time';
import { FileObjectBase, SendFileArgs } from './file-object';
import { SERIALIZER, OBJIOArray } from 'objio';

export { SendFileArgs };

export interface VideoFileDesc {
  duration: Time;
  width: number;
  height: number;
  frameRate: number;
  codec: string;
}

export interface Subfile {
  name: string;
  id: string;
  desc: Partial<VideoFileDesc>;
  split?: SplitArgs;
}

export interface SplitArgs {
  startSec: number;
  endSec: number;
}

export interface SplitId {
  id: string;
}

export abstract class VideoFileBase extends FileObjectBase {
  protected desc: Partial<VideoFileDesc> = {};
  protected subfiles = Array<Subfile>();

  getDesc(): Partial<VideoFileDesc> {
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

  abstract split(args: SplitArgs): Promise<void>;
  abstract removeSplit(args: SplitId): Promise<void>;

  static TYPE_ID = 'VideoFileObject';
  static SERIALIZE: SERIALIZER = () => ({
    ...FileObjectBase.SERIALIZE(),
    desc:     { type: 'json', const: true },
    subfiles: { type: 'json', const: true }
  })
}
