import { OBJIOItem, SERIALIZER } from 'objio';
import { StateObject } from './state-object';

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

export class FileObject extends OBJIOItem {
  protected name: string = '';
  protected size: number = 0;
  protected mime: string = '';
  protected loadSize: number = 0;
  protected state = new StateObject();

  constructor(args?: FileArgs) {
    super();

    this.holder.addEventHandler({
      onCreate: () => {
        this.state.setStateType('not configured');
        this.holder.save();
        return Promise.resolve();
      }
    });

    if (!args)
      return;

    this.name = args.name;
    this.size = args.size;
    this.mime = args.mime;
  }

  getName(): string {
    return this.name;
  }

  getPath(): string {
    return `file_${this.holder.getID()}${this.getExt()}`;
  }

  getSize(): number {
    return this.size;
  }

  // .png
  getExt(): string {
    return getExt(this.name);
  }

  getMIME(): string {
    return this.mime;
  }

  getLoadSize(): number {
    return this.loadSize;
  }

  sendFile(file: File): Promise<any> {
    return this.holder.invokeMethod('send-file', file);
  }

  getState(): StateObject {
    return this.state;
  }

  static TYPE_ID: string = 'FileObject';
  static SERIALIZE: SERIALIZER = () => ({
    'name':       { type: 'string' },
    'size':       { type: 'number' },
    'mime':       { type: 'string' },
    'loadSize':   { type: 'number' },
    'state':      { type: 'object' }
  })
}
