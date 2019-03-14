import { SERIALIZER } from 'objio';
import { FileObjectBase, SendFileArgs, FileArgs } from './file-object';

export { SendFileArgs, FileArgs };

export interface ImageFileDesc {
  width: number;
  height: number;
  codec: string;
  pixelFmt: string;
}

export abstract class ImageFileBase extends FileObjectBase {
  protected desc: ImageFileDesc = {
    width: 0,
    height: 0,
    codec: '',
    pixelFmt: ''
  };

  getDesc(): ImageFileDesc {
    return this.desc;
  }

  setDesc(desc: ImageFileDesc) {
    this.desc = {...desc};
  }

  static TYPE_ID = 'ImageFileObject';
  static SERIALIZE: SERIALIZER = () => ({
    ...FileObjectBase.SERIALIZE(),
    desc:     { type: 'json', const: true }
  })
}
