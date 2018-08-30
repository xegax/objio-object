import * as React from 'react';
import { OBJIOItem, SERIALIZER } from 'objio';
import { StateObject } from '../server/state-object';
import { ClientView } from './client-class';
import { FileObjectView } from '../view/file-object-view';

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
  protected origName: string = '';
  protected name: string = '';
  protected size: number = 0;
  protected mime: string = '';
  protected loadSize: number = 0;
  protected state = new StateObject();

  constructor(args?: FileArgs) {
    super();

    if (!args)
      return;

    this.origName = this.name = args.name;
    this.size = args.size;
    this.mime = args.mime;
    this.state.setStateType('not configured');
  }

  getName(): string {
    return this.name;
  }

  getOriginName() {
    return this.origName;
  }

  setName(name: string): void {
    if (name == this.name)
      return;

    this.name = name;
    this.holder.save();
    this.holder.delayedNotify();
  }

  getPath(): string {
    return this.holder.getFilePath(`file_${this.holder.getID()}${this.getExt()}`);
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

  sendFile(file: File): Promise<any> {
    return this.holder.invokeMethod('send-file', file);
  }

  getState(): StateObject {
    return this.state;
  }

  static TYPE_ID: string = 'FileObject';
  static SERIALIZE: SERIALIZER = () => ({
    'name':       { type: 'string' },
    'origName':   { type: 'string' },
    'size':       { type: 'number' },
    'mime':       { type: 'string' },
    'loadSize':   { type: 'number' },
    'state':      { type: 'object' }
  })

  static getClientViews(): Array<ClientView> {
    return [
      {
        view: (props: {model: FileObject} ) => <FileObjectView {...props} />
      }
    ];
  }
}
