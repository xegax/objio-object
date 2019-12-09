import { Time } from '../common/time';
import { FileObjectBase, SendFileArgs } from './file-object';
import { SERIALIZER, OBJIOArray } from 'objio';
import { MediaStream } from '../task/media-desc';
import { Rect, Size } from '../common/point';
import { ImageFileBase } from './image-file';

export { SendFileArgs };

export interface VideoFileExportData {
  cuts: Array<{ name: string, filter: FilterArgs }>;
}

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
  resize?: Size;
  reverse?: boolean;
  fps?: number;
  speed?: number;
  hflip?: boolean;
  vflip?: boolean;
  noaudio?: boolean;
}

export interface AppendImageArgs {
  time?: number;
  trim?: Range;
  crop?: Rect;
  vflip?: boolean;
  hflip?: boolean;
  resize?: Size;
}

export interface ExecuteArgs {
  filter?: FilterArgs;
  id?: string;
  name?: string;
}

export interface RemoveArgs {
  objId: string;
  removeContent?: boolean;
}

export abstract class VideoFileBase extends FileObjectBase {
  protected desc: Partial<MediaFileDesc> = {};
  protected files = new OBJIOArray<VideoFileBase>();
  protected images: OBJIOArray<ImageFileBase>;
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

  getImages() {
    return this.images ? this.images.getArray() : [];
  }

  getObjFolder() {
    return `obj_${this.holder.getID()}`;
  }

  getFrameSize(): Size {
    const size: Size = { width: 0, height: 0 };
    this.desc.streamArr && this.desc.streamArr.some(desc => {
      if (!desc.video)
        return false;

      size.width = desc.video.width;
      size.height = desc.video.height;
      return true;
    });

    return size;
  }

  findFile(id: string): VideoFileBase | ImageFileBase {
    let idx = this.files.find(item => item.holder.getID() == id);
    if (idx != -1)
      return this.files.get(idx);

    idx = this.images.find(item => item.holder.getID() == id);
    return this.images.get(idx);
  }

  abstract save(args: FilterArgs): Promise<void>;
  abstract append(args: FilterArgs): Promise<void>;
  abstract appendImage(args: AppendImageArgs): Promise<void>;
  abstract execute(args: RemoveArgs): Promise<void>;
  
  abstract export(): Promise<VideoFileExportData>;

  abstract remove(args: RemoveArgs): Promise<void>;
  abstract updateDesciption(): Promise<void>;

  static TYPE_ID = 'VideoFileObject';
  static SERIALIZE: SERIALIZER = () => ({
    ...FileObjectBase.SERIALIZE(),
    desc:     { type: 'json', const: true },
    subfiles: { type: 'json', const: true },
    files:    { type: 'object', const: true },
    images:   { type: 'object', const: true },
    filter:   { type: 'json', const: true },
    executeStartTime: { type: 'integer', const: true },
    executeTime: { type: 'integer', const: true }
  })
}
