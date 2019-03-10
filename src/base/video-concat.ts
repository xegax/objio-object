import { OBJIOArray, SERIALIZER } from 'objio';
import { VideoFileBase } from './video-file';
import { FileObjectBase } from './file-object';
export { VideoFileBase };

export interface OBJIDArgs {
  id: string;
}

export abstract class VideoConcatBase extends FileObjectBase {
  constructor() {
    super({
      name: 'video-list.mp4',
      size: 0,
      mime: 'video/mp4'
    });
    this.origName = 'video-list.mp4';
  }

  protected list = new OBJIOArray<VideoFileBase>();

  abstract append(args: OBJIDArgs): Promise<void>;
  abstract remove(args: OBJIDArgs): Promise<void>;
  abstract execute(): Promise<void>;
  getList(): Array<VideoFileBase> {
    return this.list.getArray();
  }

  static TYPE_ID = 'VideoConcat';
  static SERIALIZE: SERIALIZER = () => ({
    ...FileObjectBase.SERIALIZE(),
    list: { type: 'object' }
  })
}
