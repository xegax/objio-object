import { Time } from '../common/time';
import { FileObjectBase, SendFileArgs } from './file-object';
import { SERIALIZER, OBJIOArray } from 'objio';
import { MediaStream } from '../task/media-desc';
import { Rect } from '../common/point';

export { SendFileArgs };

export interface MediaFileDesc {
  duration: Time;
  streamArr: Array<MediaStream>;
}

export interface Range {
  from: number;
  to: number;
}

export interface FilterArgs {
  trim?: Range;
  crop?: Rect;
  reverse?: boolean;
}

export interface ExecuteArgs {
  filter?: FilterArgs;
  id?: string;
  name?: string;
}

export interface FileId {
  id: string;
}

export abstract class VideoFileBase extends FileObjectBase {
  protected desc: Partial<MediaFileDesc> = {};
  protected files = new OBJIOArray<VideoFileBase>();
  protected filter: FilterArgs = {};
  protected executeStartTime: number;
  protected executeTime: number;

  getFilter(): FilterArgs {
    return this.filter;
  }

  getDesc(): Partial<MediaFileDesc> {
    return this.desc;
  }

  getFiles() {
    return this.files.getArray();
  }

  getObjFolder() {
    return `obj_${this.holder.getID()}`;
  }

  findFile(id: string): VideoFileBase {
    const idx = this.files.find(item => item.holder.getID() == id);
    return this.files.get(idx);
  }

  abstract save(args: FilterArgs): Promise<void>;
  abstract append(args: FilterArgs): Promise<void>;
  abstract execute(args: FileId): Promise<void>;

  abstract remove(args: FileId): Promise<void>;
  abstract updateDesciption(): Promise<void>;

  static TYPE_ID = 'VideoFileObject';
  static SERIALIZE: SERIALIZER = () => ({
    ...FileObjectBase.SERIALIZE(),
    desc:     { type: 'json', const: true },
    subfiles: { type: 'json', const: true },
    files:    { type: 'object', const: true },
    filter:   { type: 'json', const: true },
    executeStartTime: { type: 'integer', const: true },
    executeTime: { type: 'integer', const: true }
  })
}
