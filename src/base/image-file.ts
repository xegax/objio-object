import { SERIALIZER, FileSystemSimple } from 'objio';
import { ObjectBase } from './object-base';

export interface ImageFileDesc {
  width: number;
  height: number;
  codec: string;
  pixelFmt: string;
}

export abstract class ImageFileBase extends ObjectBase {
  protected desc: ImageFileDesc = {
    width: 0,
    height: 0,
    codec: '',
    pixelFmt: ''
  };

  constructor() {
    super();
    this.fs = new FileSystemSimple();
  }

  getDesc(): ImageFileDesc {
    return this.desc;
  }

  setDesc(desc: ImageFileDesc) {
    this.desc = {...desc};
  }

  getPath(key?: string) {
    return this.fs.getPath(key);
  }

  static TYPE_ID = 'ImageFileObject';
  static SERIALIZE: SERIALIZER = () => ({
    ...ObjectBase.SERIALIZE(),
    desc:     { type: 'json', const: true }
  })
}
