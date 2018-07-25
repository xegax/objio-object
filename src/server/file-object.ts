import { FileObject as FileObjectBase, FileArgs } from '../file-object';
import { SERIALIZER } from 'objio';
import { openSync, writeSync, closeSync } from 'fs';

export class FileObject extends FileObjectBase {
  constructor(args?: FileArgs) {
    super(args);

    this.holder.setMethodsToInvoke({
      'send-file': (args: {data: Buffer, offs: number}) => {
        const fd = openSync(this.getPath(), 'a+');
        writeSync(fd, args.data, 0, args.data.byteLength, args.offs);
        closeSync(fd);
        this.loadSize += args.data.byteLength;
        this.holder.save();
        return Promise.resolve();
      }
    });
  }

  getPath(): string {
    const arr = this.type.split('/');
    const t = arr.length > 1 ? arr[1] : arr[0];
    return this.holder.getFilePath(`file_${this.holder.getID()}.${t}`);
  }

  static SERIALIZE: SERIALIZER = () => ({
    ...FileObjectBase.SERIALIZE()
  })
}
