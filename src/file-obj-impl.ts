import { OBJIOItem, SERIALIZER } from 'objio';
import { FileArgs, getExt } from './file-object';

export class FileObjImpl extends OBJIOItem {
  protected originName: string = '';
  protected originSize: number = 0;
  protected mime: string = '';
  protected progress: number = 0;

  constructor(args?: FileArgs) {
    super();

    if (!args)
      return;

    this.originName = args.originName;
    this.originSize = args.originSize;
    this.mime = args.mime;
  }

  getName(): string {
    return this.originName;
  }

  getSize(): number {
    return this.originSize;
  }

  getPath(): string {
    return `file_${this.holder.getID()}${this.getExt()}`;
  }

  getExt(): string {
    return getExt(this.originName);
  }

  getMIME(): string {
    return this.mime;
  }

  getProgress(): number {
    return this.progress;
  }

  static TYPE_ID = 'FileObjectImplBase';
  static SERIALIZE: SERIALIZER = () => ({
    'originName': { type: 'string' },
    'originSize': { type: 'number' },
    'mime':       { type: 'string' },
    'progress':   { type: 'number' }
  })
}
