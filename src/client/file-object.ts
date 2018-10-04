import { SERIALIZER } from 'objio';
import { ObjectBase } from '../server/object-base';
import { SendFileArgs } from './files-container';

export interface FileArgs {
  name: string;
  size: number;
  mime: string;
}

export function getExt(fileName: string): string {
  const i = fileName.lastIndexOf('.');
  if (i == -1)
    return '';
  return fileName.substring(i);
}

export class FileObject extends ObjectBase {
  protected origName: string = '';
  protected size: number = 0;
  protected mime: string = '';
  protected loadSize: number = 0;

  constructor(args?: FileArgs) {
    super();

    if (!args)
      return;

    this.origName = this.name = args.name;
    this.size = args.size;
    this.mime = args.mime;
  }

  getOriginName() {
    return this.origName;
  }

  getFileName(): string {
    return `file_${this.holder.getID()}${this.getExt()}`;
  }

  getPath(): string {
    return this.holder.getPublicPath(this.getFileName());
  }

  getSize(): number {
    return this.size;
  }

  // .png
  getExt(): string {
    return getExt(this.origName);
  }

  getMIME(): string {
    return this.mime;
  }

  getLoadSize(): number {
    return this.loadSize;
  }

  sendFile(args: SendFileArgs): Promise<any> {
    return this.holder.invokeMethod({ method: 'send-file', args: args.file, onProgress: args.onProgress });
  }

  sendFileByForm(args: SendFileArgs): Promise<any> {
    return this.holder.invokeMethod({ method: 'send-file-form', args: args.file, onProgress: args.onProgress });
  }

  static TYPE_ID: string = 'FileObject';
  static SERIALIZE: SERIALIZER = () => ({
    ...ObjectBase.SERIALIZE(),
    'origName':   { type: 'string' },
    'size':       { type: 'number' },
    'mime':       { type: 'string' },
    'loadSize':   { type: 'number' }
  })
}
