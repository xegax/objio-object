import { Time } from '../common/time';
import { SERIALIZER, OBJIOArray, FileSystemSimple } from 'objio';
import { MediaStream } from '../task/media-desc';
import { Rect, Size } from '../common/point';
import { ImageFileBase } from './image-file';
import { ObjectBase, ObjectBaseArgs, FSSummary } from './object-base';

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

export function getAvailablePreset(): Array<string> {
  return [
    'ultrafast',
    'superfast',
    'veryfast',
    'faster',
    'fast',
    'medium',
    'slow',
    'slower',
    'veryslow'
  ];
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
  stabilize?: boolean;
  preset?: string;
}

export interface AppendImageArgs {
  time?: number;
  trim?: Range;
  crop?: Rect;
  vflip?: boolean;
  hflip?: boolean;
  resize?: Size;
}

export interface SaveArgs extends FilterArgs {
  sourceId: string;
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

export abstract class VideoFileBase extends ObjectBase {
  protected desc: Partial<MediaFileDesc> = {};
  protected files = new OBJIOArray<VideoFileBase>();
  protected images = new OBJIOArray<ImageFileBase>();
  protected filter: FilterArgs = {};
  protected executeStartTime: number;
  protected executeTime: number;

  constructor(args?: Partial<ObjectBaseArgs>) {
    super(args);
    this.fs = new FileSystemSimple();
  }

  getSize() {
    const content = this.fs.getFileDesc('content');
    return content && content.fileSize || 0;
  }

  getFSSummary(): FSSummary {
    let summary: FSSummary = {
      size: 0,
      count: 0
    };

    this.files.getArray().forEach(file => {
      const fsm = file.getFSSummary();
      summary.size += fsm.size;
      summary.count += fsm.count;
    });

    this.images.getArray().forEach(file => {
      const fsm = file.getFSSummary();
      summary.size += fsm.size;
      summary.count += fsm.count;
    });

    summary.size += this.fs.getTotalSize();
    summary.count += this.fs.getTotalFiles();

    return summary;
  }

  getIcon() {
    return 'mp4-icon';
  }

  getEncodeTime() {
    return this.executeTime;
  }

  getEncodeStartTime() {
    return this.executeStartTime;
  }

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

  abstract save(args: SaveArgs): Promise<void>;
  abstract append(args: FilterArgs): Promise<void>;
  abstract appendImage(args: AppendImageArgs): Promise<void>;
  abstract execute(args: RemoveArgs): Promise<void>;

  abstract export(): Promise<VideoFileExportData>;

  abstract remove(args: RemoveArgs): Promise<void>;
  abstract updateDesciption(): Promise<void>;

  static TYPE_ID = 'VideoFileObject';
  static SERIALIZE: SERIALIZER = () => ({
    ...ObjectBase.SERIALIZE(),
    desc:             { type: 'json',     const: true },
    subfiles:         { type: 'json',     const: true },
    files:            { type: 'object',   const: true },
    images:           { type: 'object',   const: true },
    filter:           { type: 'json',     const: true },
    executeStartTime: { type: 'integer',  const: true },
    executeTime:      { type: 'integer',  const: true }
  })
}
