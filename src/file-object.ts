import { OBJIOItem, SERIALIZER } from 'objio';
import { CSVFileObject } from './csv-file-object';
import { FileObjImpl } from './file-obj-impl';
import { VideoFileObject } from './video-file-object';

export interface FileArgs {
  originName: string;
  originSize: number;
  mime: string;
}

export function getExt(fileName: string): string {
  const i = fileName.lastIndexOf('.');
  if (i == -1)
    return '';
  return fileName.substring(i);
}

export class FileObject extends OBJIOItem {
  protected impl: FileObjImpl;
  protected progress: number = 0;
  protected loadSize: number = 0;

  constructor(args?: FileArgs) {
    super();

    if (!args)
      return;

    const ext = getExt(args.originName).toLocaleLowerCase();
    if (ext == '.csv')
      this.impl = new CSVFileObject(args);
    else if (ext == '.mp4')
      this.impl = new VideoFileObject(args);
    else
      this.impl = new FileObjImpl(args);
  }

  getImpl<T = FileObjImpl>(): T {
    return this.impl as any as T;
  }

  getName(): string {
    return this.impl.getName();
  }

  getPath(): string {
    return this.impl.getPath();
  }

  getSize(): number {
    return this.impl.getSize();
  }

  // .png
  getExt(): string {
    return this.impl.getExt();
  }

  getMIME(): string {
    return this.impl.getMIME();
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
    'impl':       { type: 'object' },
    'loadSize':   { type: 'number' },
    'progress':   { type: 'number' }
  })
}
