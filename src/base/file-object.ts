import { SERIALIZER } from 'objio';
import { ObjectBase } from './object-base';

export interface FileArgs {
  name: string;
  size: number;
  mime: string;
}

export interface SendFileArgs {
  file: File;
  onProgress?(value: number): void;
}

export function getExt(fileName: string): string {
  const i = fileName.lastIndexOf('.');
  if (i == -1)
    return '';
  return fileName.substring(i);
}

export abstract class FileObjectBase extends ObjectBase {
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

  getOriginName(ext?: string) {
    if (ext == null)
      return this.origName;

    const i = this.origName.lastIndexOf('.');
    if (i == -1)
      return this.origName + ext;

    return this.origName.substr(0, i) + ext;
  }

  getFileName(ext?: string): string {
    return `file_${this.holder.getID()}${ ext || this.getExt()}`;
  }

  getPath(ext?: string): string {
    return this.holder.getPublicPath(this.getFileName(ext));
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

  abstract onFileUploaded(userId: string): Promise<void>;
  abstract sendFile(args: SendFileArgs): Promise<any>;

  static TYPE_ID: string = 'FileObject';
  static SERIALIZE: SERIALIZER = () => ({
    ...ObjectBase.SERIALIZE(),
    'origName':   { type: 'string' },
    'size':       { type: 'number' },
    'mime':       { type: 'string' },
    'loadSize':   { type: 'number' }
  })
}
