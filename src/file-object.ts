import { OBJIOItem, SERIALIZER } from 'objio';

export interface FileArgs {
  originName: string;
  originSize: number;
  mime: string;
}

export class FileObject extends OBJIOItem {
  protected originName: string = '';
  protected originSize: number = 0;
  protected loadSize: number = 0;
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

  getPath(): string {
    return `file_${this.holder.getID()}${this.getExt()}`;
  }

  getSize(): number {
    return this.originSize;
  }

  // .png
  getExt(): string {
    const i = this.originName.lastIndexOf('.');
    if (i == -1)
      return '';
    return this.originName.substr(i);
  }

  getMime(): string {
    return this.mime;
  }

  getLoadSize(): number {
    return this.loadSize;
  }

  sendFile(file: File): Promise<any> {
    return this.holder.invokeMethod('send-file', file);
  }

  getProgress(): number {
    return this.progress;
  }

  static TYPE_ID: string = 'File';
  static SERIALIZE: SERIALIZER = () => ({
    'originName': { type: 'string' },
    'originSize': { type: 'number' },
    'loadSize': { type: 'number' },
    'mime': { type: 'string' },
    'progress': { type: 'number' }
  })
}
